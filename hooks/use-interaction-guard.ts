/**
 * useInteractionGuard
 *
 * Wraps startStopwatch with two independent checks, each with its own
 * warning UI. At most one is ever pending at a time — interaction check
 * takes priority when both would apply:
 *
 * 1. Interaction check — if the type being started is a substance and has
 *    interactions with currently active substances, surfaces
 *    InteractionWarningModal via `pendingType` / `warningPairs`.
 * 2. Redose check — if the type being started already has an active instance
 *    that hasn't reached its peak phase yet (still in onset or comeup),
 *    surfaces RedoseWarningModal via `redosePendingType` / `redoseRemainingMs`.
 *
 * handleStart returns true if a warning was triggered (timer NOT yet started),
 * false if the timer was started immediately (no warning needed).
 * Callers use the return value to decide whether to close a modal, etc.
 */

import { useCallback, useState } from 'react';
import { getActiveInteractions } from '@/constants/interactions';
import { useStopwatch, effectiveElapsed } from '@/store/StopwatchContext';
import { type WarningPair } from '@/components/InteractionWarningModal';
import { currentPhase, msUntilPeak } from '@/engine/curveEngine';
import type { StopwatchType } from '@/types/models';

interface GuardResult {
  /** Returns true if a warning was shown (timer held), false if started directly. */
  handleStart: (typeId: string) => boolean;
  // Interaction warning (InteractionWarningModal)
  pendingType: StopwatchType | null;
  warningPairs: WarningPair[];
  // Redose warning (RedoseWarningModal)
  redosePendingType: StopwatchType | null;
  redoseRemainingMs: number;
  /** Call when user confirms "Start anyway" / "Redose anyway". Starts the timer; does NOT close any modal. */
  onConfirm: () => void;
  /** Call when user cancels the warning. */
  onCancel: () => void;
}

export function useInteractionGuard(): GuardResult {
  const { state, startStopwatch } = useStopwatch();

  const [pendingType, setPendingType]     = useState<StopwatchType | null>(null);
  const [warningPairs, setWarningPairs]   = useState<WarningPair[]>([]);
  const [redosePendingType, setRedosePendingType] = useState<StopwatchType | null>(null);
  const [redoseRemainingMs, setRedoseRemainingMs] = useState(0);

  const handleStart = useCallback((typeId: string): boolean => {
    const type = state.types.find(t => t.id === typeId);
    if (!type) return false;

    if (type.isSubstance && state.showInteractionWarnings) {
      // Deduplicate and exclude the type being started (matches plan.tsx logic)
      const activeSubstanceIds = [
        ...new Set(
          state.activeStopwatches
            .map(sw => state.types.find(t => t.id === sw.typeId))
            .filter((t): t is StopwatchType => !!t?.isSubstance)
            .map(t => t.id)
            .filter(id => id !== typeId),
        ),
      ];

      if (activeSubstanceIds.length > 0) {
        const rawPairs = getActiveInteractions([typeId, ...activeSubstanceIds])
          .filter(p => p.idA === typeId || p.idB === typeId)
          .filter(p => !p.interaction.status.startsWith('Low Risk'));

        if (rawPairs.length > 0) {
          // Deduplicate pairs by canonical key (belt-and-suspenders)
          const seen = new Set<string>();
          const pairs: WarningPair[] = [];
          for (const p of rawPairs) {
            const key = [p.idA, p.idB].sort().join('+');
            if (!seen.has(key)) {
              seen.add(key);
              pairs.push({
                nameA: state.types.find(t => t.id === p.idA)?.name ?? p.idA,
                nameB: state.types.find(t => t.id === p.idB)?.name ?? p.idB,
                interaction: p.interaction,
              });
            }
          }
          setPendingType(type);
          setWarningPairs(pairs);
          return true; // warning shown — caller should NOT close its modal yet
        }
      }
    }

    // Redose check — applies to any type (not just substances): warn if an
    // active instance of this exact type hasn't reached peak yet.
    if (state.showRedoseWarnings) {
      const now = Date.now();
      let soonestToPeak: number | null = null;
      for (const sw of state.activeStopwatches) {
        if (sw.typeId !== typeId) continue;
        const elapsed = effectiveElapsed(sw, now);
        const phase = currentPhase(type, elapsed);
        if (phase !== 'onset' && phase !== 'comeup') continue;
        const remaining = msUntilPeak(type, elapsed);
        if (soonestToPeak === null || remaining < soonestToPeak) soonestToPeak = remaining;
      }
      if (soonestToPeak !== null) {
        setRedosePendingType(type);
        setRedoseRemainingMs(soonestToPeak);
        return true; // warning shown — caller should NOT close its modal yet
      }
    }

    startStopwatch(typeId);
    return false; // started directly — caller may close its modal
  }, [state, startStopwatch]);

  const onConfirm = useCallback(() => {
    if (pendingType) startStopwatch(pendingType.id);
    else if (redosePendingType) startStopwatch(redosePendingType.id);
    setPendingType(null);
    setWarningPairs([]);
    setRedosePendingType(null);
    setRedoseRemainingMs(0);
  }, [pendingType, redosePendingType, startStopwatch]);

  const onCancel = useCallback(() => {
    setPendingType(null);
    setWarningPairs([]);
    setRedosePendingType(null);
    setRedoseRemainingMs(0);
  }, []);

  return {
    handleStart,
    pendingType, warningPairs,
    redosePendingType, redoseRemainingMs,
    onConfirm, onCancel,
  };
}
