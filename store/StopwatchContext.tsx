import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { evaluate, totalDuration } from '@/engine/curveEngine';
import { DEFAULT_TYPES } from '@/constants/defaultTypes';
import type { ActiveStopwatch, Plan, PlannedEntry, StopwatchType } from '@/types/models';

const STORAGE_KEY = 'festibud_state';

// ---------------------------------------------------------------------------
// ID generator
// ---------------------------------------------------------------------------

let _counter = 0;
function genId(): string {
  return `${Date.now()}-${(++_counter).toString(36)}`;
}

// ---------------------------------------------------------------------------
// Effective elapsed helper
// ---------------------------------------------------------------------------

/** Returns the real elapsed ms for a stopwatch, subtracting any paused time. */
export function effectiveElapsed(sw: ActiveStopwatch, now: number): number {
  const base = sw.pausedAt !== undefined ? sw.pausedAt : now;
  return base - sw.startTime - (sw.totalPausedMs ?? 0);
}

// ---------------------------------------------------------------------------
// State & actions
// ---------------------------------------------------------------------------

export interface AppState {
  types: StopwatchType[];
  activeStopwatches: ActiveStopwatch[];
  favoriteTypeIds: string[];
  plans: Plan[];
}

type Action =
  | { type: 'HYDRATE'; payload: AppState }
  | { type: 'ADD_TYPE'; payload: StopwatchType }
  | { type: 'UPDATE_TYPE'; payload: StopwatchType }
  | { type: 'DELETE_TYPE'; payload: string }
  | { type: 'START_STOPWATCH'; payload: { typeId: string; label?: string } }
  | { type: 'STOP_STOPWATCH'; payload: string }
  | { type: 'PAUSE_STOPWATCH'; payload: { id: string; now: number } }
  | { type: 'RESUME_STOPWATCH'; payload: { id: string; now: number } }
  | { type: 'UPDATE_STOPWATCH_START'; payload: { id: string; newStartTime: number } }
  | { type: 'TOGGLE_FAVORITE'; payload: string }
  | { type: 'CLEANUP_STALE'; payload: number }
  // Plans
  | { type: 'ADD_PLAN'; payload: Plan }
  | { type: 'RENAME_PLAN'; payload: { id: string; name: string } }
  | { type: 'DELETE_PLAN'; payload: string }
  | { type: 'ADD_PLAN_ENTRY'; payload: { planId: string; entry: PlannedEntry } }
  | { type: 'REMOVE_PLAN_ENTRY'; payload: { planId: string; entryId: string } }
  | { type: 'UPDATE_PLAN_ENTRY'; payload: { planId: string; entry: PlannedEntry } };

const DEFAULT_PLAN: Plan = { id: 'plan-default', name: 'My Plan', entries: [] };

const INITIAL_STATE: AppState = {
  types: DEFAULT_TYPES,
  activeStopwatches: [],
  favoriteTypeIds: [],
  plans: [DEFAULT_PLAN],
};

function reducer(rawState: AppState, action: Action): AppState {
  // Guard against stale hot-reload state missing newer fields
  const state: AppState = {
    ...rawState,
    favoriteTypeIds: rawState.favoriteTypeIds ?? [],
    plans: rawState.plans ?? [DEFAULT_PLAN],
  };
  switch (action.type) {
    case 'HYDRATE':
      return action.payload;

    case 'ADD_TYPE':
      return { ...state, types: [...state.types, action.payload] };

    case 'UPDATE_TYPE':
      return {
        ...state,
        types: state.types.map(t => t.id === action.payload.id ? action.payload : t),
      };

    case 'DELETE_TYPE':
      return {
        ...state,
        types: state.types.filter(t => t.id !== action.payload),
        activeStopwatches: state.activeStopwatches.filter(sw => sw.typeId !== action.payload),
        favoriteTypeIds: state.favoriteTypeIds.filter(id => id !== action.payload),
        plans: state.plans.map(p => ({
          ...p,
          entries: p.entries.filter(e => e.typeId !== action.payload),
        })),
      };

    case 'START_STOPWATCH':
      return {
        ...state,
        activeStopwatches: [
          ...state.activeStopwatches,
          {
            id: genId(),
            typeId: action.payload.typeId,
            startTime: Date.now(),
            label: action.payload.label,
          },
        ],
      };

    case 'STOP_STOPWATCH':
      return {
        ...state,
        activeStopwatches: state.activeStopwatches.filter(sw => sw.id !== action.payload),
      };

    case 'PAUSE_STOPWATCH':
      return {
        ...state,
        activeStopwatches: state.activeStopwatches.map(sw =>
          sw.id === action.payload.id && sw.pausedAt === undefined
            ? { ...sw, pausedAt: action.payload.now }
            : sw,
        ),
      };

    case 'RESUME_STOPWATCH':
      return {
        ...state,
        activeStopwatches: state.activeStopwatches.map(sw => {
          if (sw.id !== action.payload.id || sw.pausedAt === undefined) return sw;
          const addedPause = action.payload.now - sw.pausedAt;
          return {
            ...sw,
            pausedAt: undefined,
            totalPausedMs: (sw.totalPausedMs ?? 0) + addedPause,
          };
        }),
      };

    case 'UPDATE_STOPWATCH_START':
      return {
        ...state,
        activeStopwatches: state.activeStopwatches.map(sw =>
          sw.id === action.payload.id
            ? { ...sw, startTime: action.payload.newStartTime, pausedAt: undefined, totalPausedMs: 0 }
            : sw,
        ),
      };

    case 'TOGGLE_FAVORITE': {
      const id = action.payload;
      const isFav = state.favoriteTypeIds.includes(id);
      return {
        ...state,
        favoriteTypeIds: isFav
          ? state.favoriteTypeIds.filter(f => f !== id)
          : [...state.favoriteTypeIds, id],
      };
    }

    case 'CLEANUP_STALE': {
      const now = action.payload;
      const MS_24H = 24 * 60 * 60 * 1000;
      return {
        ...state,
        activeStopwatches: state.activeStopwatches.filter(sw => {
          const type = state.types.find(t => t.id === sw.typeId);
          if (!type) return false;
          const elapsed = effectiveElapsed(sw, now);
          const total = totalDuration(type);
          if (elapsed < total) return true; // still running
          // Approximate wall-clock time when comedown ended
          const endedAt = sw.startTime + (sw.totalPausedMs ?? 0) + total;
          return now - endedAt < MS_24H;
        }),
      };
    }

    case 'ADD_PLAN':
      return { ...state, plans: [...state.plans, action.payload] };

    case 'RENAME_PLAN':
      return {
        ...state,
        plans: state.plans.map(p =>
          p.id === action.payload.id ? { ...p, name: action.payload.name } : p,
        ),
      };

    case 'DELETE_PLAN':
      return {
        ...state,
        plans: state.plans.length > 1
          ? state.plans.filter(p => p.id !== action.payload)
          : state.plans,
      };

    case 'ADD_PLAN_ENTRY':
      return {
        ...state,
        plans: state.plans.map(p =>
          p.id === action.payload.planId
            ? { ...p, entries: [...p.entries, action.payload.entry] }
            : p,
        ),
      };

    case 'REMOVE_PLAN_ENTRY':
      return {
        ...state,
        plans: state.plans.map(p =>
          p.id === action.payload.planId
            ? { ...p, entries: p.entries.filter(e => e.id !== action.payload.entryId) }
            : p,
        ),
      };

    case 'UPDATE_PLAN_ENTRY':
      return {
        ...state,
        plans: state.plans.map(p =>
          p.id === action.payload.planId
            ? {
                ...p,
                entries: p.entries.map(e =>
                  e.id === action.payload.entry.id ? action.payload.entry : e,
                ),
              }
            : p,
        ),
      };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export interface StopwatchContextValue {
  state: AppState;
  startStopwatch: (typeId: string, label?: string) => void;
  stopStopwatch: (id: string) => void;
  pauseStopwatch: (id: string) => void;
  resumeStopwatch: (id: string) => void;
  updateStopwatchStartTime: (id: string, newStartTime: number) => void;
  addType: (type: Omit<StopwatchType, 'id'>) => void;
  updateType: (type: StopwatchType) => void;
  deleteType: (id: string) => void;
  getTypeById: (id: string) => StopwatchType | undefined;
  evaluateSum: (atTime?: number) => number;
  toggleFavorite: (typeId: string) => void;
  // Plans
  addPlan: (name: string) => void;
  renamePlan: (id: string, name: string) => void;
  deletePlan: (id: string) => void;
  addPlanEntry: (planId: string, typeId: string, targetTime: number) => void;
  removePlanEntry: (planId: string, entryId: string) => void;
  updatePlanEntry: (planId: string, entry: PlannedEntry) => void;
}

const StopwatchContext = createContext<StopwatchContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function StopwatchProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted state on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          const saved = JSON.parse(raw) as Partial<AppState>;
          const builtInIds = new Set(DEFAULT_TYPES.map(t => t.id));
          const customTypes = (saved.types ?? []).filter(t => !builtInIds.has(t.id));

          // Migrate plan entries: convert legacy offsetMinutes → targetTime
          const nowMs = Date.now();
          const migratedPlans = (saved.plans ?? []).map(p => ({
            ...p,
            entries: (p.entries ?? []).map((e: any) => ({
              id: e.id,
              typeId: e.typeId,
              targetTime: e.targetTime ?? (nowMs + (e.offsetMinutes ?? 0) * 60_000),
            })),
          }));

          dispatch({
            type: 'HYDRATE',
            payload: {
              ...INITIAL_STATE,
              ...saved,
              types: [...DEFAULT_TYPES, ...customTypes],
              plans: migratedPlans.length > 0 ? migratedPlans : INITIAL_STATE.plans,
            },
          });
        } catch {
          // Corrupted storage — fall back to defaults silently
        }
      }
      setHydrated(true);
    });
  }, []);

  // Persist state whenever it changes (skip until hydration is done)
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  // Auto-cleanup: stop stopwatches done >24h ago
  useEffect(() => {
    if (!hydrated) return;
    const id = setInterval(() => {
      dispatch({ type: 'CLEANUP_STALE', payload: Date.now() });
    }, 60_000); // check every minute
    return () => clearInterval(id);
  }, [hydrated]);

  const startStopwatch = useCallback((typeId: string, label?: string) => {
    dispatch({ type: 'START_STOPWATCH', payload: { typeId, label } });
  }, []);

  const stopStopwatch = useCallback((id: string) => {
    dispatch({ type: 'STOP_STOPWATCH', payload: id });
  }, []);

  const pauseStopwatch = useCallback((id: string) => {
    dispatch({ type: 'PAUSE_STOPWATCH', payload: { id, now: Date.now() } });
  }, []);

  const resumeStopwatch = useCallback((id: string) => {
    dispatch({ type: 'RESUME_STOPWATCH', payload: { id, now: Date.now() } });
  }, []);

  const updateStopwatchStartTime = useCallback((id: string, newStartTime: number) => {
    dispatch({ type: 'UPDATE_STOPWATCH_START', payload: { id, newStartTime } });
  }, []);

  const addType = useCallback((type: Omit<StopwatchType, 'id'>) => {
    dispatch({ type: 'ADD_TYPE', payload: { ...type, id: genId() } });
  }, []);

  const updateType = useCallback((type: StopwatchType) => {
    dispatch({ type: 'UPDATE_TYPE', payload: type });
  }, []);

  const deleteType = useCallback((id: string) => {
    dispatch({ type: 'DELETE_TYPE', payload: id });
  }, []);

  const getTypeById = useCallback(
    (id: string) => state.types.find(t => t.id === id),
    [state.types],
  );

  const evaluateSum = useCallback(
    (atTime: number = Date.now()) =>
      state.activeStopwatches.reduce((sum, sw) => {
        const type = state.types.find(t => t.id === sw.typeId);
        if (!type) return sum;
        const elapsed = effectiveElapsed(sw, atTime);
        return sum + evaluate(type, elapsed);
      }, 0),
    [state.activeStopwatches, state.types],
  );

  const toggleFavorite = useCallback((typeId: string) => {
    dispatch({ type: 'TOGGLE_FAVORITE', payload: typeId });
  }, []);

  const addPlan = useCallback((name: string) => {
    dispatch({ type: 'ADD_PLAN', payload: { id: genId(), name, entries: [] } });
  }, []);

  const renamePlan = useCallback((id: string, name: string) => {
    dispatch({ type: 'RENAME_PLAN', payload: { id, name } });
  }, []);

  const deletePlan = useCallback((id: string) => {
    dispatch({ type: 'DELETE_PLAN', payload: id });
  }, []);

  const addPlanEntry = useCallback((planId: string, typeId: string, targetTime: number) => {
    dispatch({
      type: 'ADD_PLAN_ENTRY',
      payload: { planId, entry: { id: genId(), typeId, targetTime } },
    });
  }, []);

  const removePlanEntry = useCallback((planId: string, entryId: string) => {
    dispatch({ type: 'REMOVE_PLAN_ENTRY', payload: { planId, entryId } });
  }, []);

  const updatePlanEntry = useCallback((planId: string, entry: PlannedEntry) => {
    dispatch({ type: 'UPDATE_PLAN_ENTRY', payload: { planId, entry } });
  }, []);

  if (!hydrated) return null;

  return (
    <StopwatchContext.Provider value={{
      state,
      startStopwatch, stopStopwatch, pauseStopwatch, resumeStopwatch, updateStopwatchStartTime,
      addType, updateType, deleteType, getTypeById, evaluateSum,
      toggleFavorite,
      addPlan, renamePlan, deletePlan,
      addPlanEntry, removePlanEntry, updatePlanEntry,
    }}>
      {children}
    </StopwatchContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useStopwatch(): StopwatchContextValue {
  const ctx = useContext(StopwatchContext);
  if (!ctx) throw new Error('useStopwatch must be used inside <StopwatchProvider>');
  return ctx;
}
