/**
 * useInteractionGuard
 *
 * Wraps startStopwatch with an interaction check.
 * If the type being started is a substance and has interactions with currently
 * active substances, it surfaces a warning instead of starting immediately.
 *
 * handleStart returns true if a warning was triggered (timer NOT yet started),
 * false if the timer was started immediately (no warning needed).
 * Callers use the return value to decide whether to close a modal, etc.
 */

import { useCallback, useState } from 'react';
import { getActiveInteractions } from '@/constants/interactions';
import { useStopwatch } from '@/store/StopwatchContext';
import { type WarningPair } from '@/components/InteractionWarningModal';
import type { StopwatchType } from '@/types/models';

interface GuardResult {
  /** Returns true if a warning was shown (timer held), false if started directly. */
  handleStart: (typeId: string) => boolean;
  pendingType: StopwatchType | null;
  warningPairs: WarningPair[];
  /** Call when user confirms "Start anyway". Starts the timer; does NOT close any modal. */
  onConfirm: () => void;
  /** Call when user cancels the warning. */
  onCancel: () => void;
}

export function useInteractionGuard(): GuardResult {
  const { state, startStopwatch } = useStopwatch();

  const [pendingType, setPendingType]   = useState<StopwatchType | null>(null);
  const [warningPairs, setWarningPairs] = useState<WarningPair[]>([]);

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

    startStopwatch(typeId);
    return false; // started directly — caller may close its modal
  }, [state, startStopwatch]);

  const onConfirm = useCallback(() => {
    if (pendingType) startStopwatch(pendingType.id);
    setPendingType(null);
    setWarningPairs([]);
  }, [pendingType, startStopwatch]);

  const onCancel = useCallback(() => {
    setPendingType(null);
    setWarningPairs([]);
  }, []);

  return { handleStart, pendingType, warningPairs, onConfirm, onCancel };
}
