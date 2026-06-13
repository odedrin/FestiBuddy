import type { CurveShape, StopwatchType } from '@/types/models';

// ---------------------------------------------------------------------------
// Easing helpers
// ---------------------------------------------------------------------------

/** Map a normalised progress t ∈ [0,1] through an easing curve → [0,1] */
function applyShape(t: number, shape: CurveShape): number {
  const c = Math.max(0, Math.min(1, t)); // clamp
  switch (shape) {
    case 'linear':
      return c;
    case 'easeIn':
      return c * c;
    case 'easeOut':
      return 1 - (1 - c) * (1 - c);
    case 'sigmoid': {
      // Logistic curve normalised so f(0)=0 and f(1)=1
      const k = 10;
      const raw = 1 / (1 + Math.exp(-k * (c - 0.5)));
      const lo = 1 / (1 + Math.exp(k * 0.5));
      const hi = 1 / (1 + Math.exp(-k * 0.5));
      return (raw - lo) / (hi - lo);
    }
  }
}

// ---------------------------------------------------------------------------
// Core evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate f_type(elapsedMs).
 *
 * Returns the value of a stopwatch of the given type at elapsed time
 * `elapsedMs` milliseconds since it was started.
 */
export function evaluate(type: StopwatchType, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;

  const {
    onsetDuration: d1,
    comeupDuration: d2,
    peakDuration: d3,
    offsetDuration: d4,
    peakValue,
    onsetEndFraction,
    onsetShape,
    comeupShape,
    offsetShape,
  } = type;

  const t1 = d1;
  const t2 = t1 + d2;
  const t3 = t2 + d3;
  const t4 = t3 + d4;

  if (elapsedMs >= t4) return 0;

  const midValue = peakValue * onsetEndFraction;

  if (elapsedMs < t1) {
    // Onset: 0 → midValue
    const p = d1 > 0 ? elapsedMs / d1 : 1;
    return midValue * applyShape(p, onsetShape);
  }

  if (elapsedMs < t2) {
    // Comeup: midValue → peakValue
    const p = d2 > 0 ? (elapsedMs - t1) / d2 : 1;
    return midValue + (peakValue - midValue) * applyShape(p, comeupShape);
  }

  if (elapsedMs < t3) {
    // Peak: constant
    return peakValue;
  }

  // Offset: peakValue → 0
  const p = d4 > 0 ? (elapsedMs - t3) / d4 : 1;
  return peakValue * (1 - applyShape(p, offsetShape));
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/** Total cycle duration of a type in milliseconds */
export function totalDuration(type: StopwatchType): number {
  return (
    type.onsetDuration +
    type.comeupDuration +
    type.peakDuration +
    type.offsetDuration
  );
}

export type Phase = 'onset' | 'comeup' | 'peak' | 'offset' | 'done' | 'pending';

/** Which phase a stopwatch is in at elapsedMs */
export function currentPhase(type: StopwatchType, elapsedMs: number): Phase {
  if (elapsedMs <= 0) return 'pending';
  const t1 = type.onsetDuration;
  const t2 = t1 + type.comeupDuration;
  const t3 = t2 + type.peakDuration;
  const t4 = t3 + type.offsetDuration;
  if (elapsedMs >= t4) return 'done';
  if (elapsedMs >= t3) return 'offset';
  if (elapsedMs >= t2) return 'peak';
  if (elapsedMs >= t1) return 'comeup';
  return 'onset';
}

/** Fraction of total duration elapsed, clamped to [0,1] */
export function progressFraction(type: StopwatchType, elapsedMs: number): number {
  const total = totalDuration(type);
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, elapsedMs / total));
}

/** Format milliseconds as HH:MM:SS */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = m.toString().padStart(2, '0');
  const ss = s.toString().padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// ---------------------------------------------------------------------------
// Inverse solvers for Plan Mode
// ---------------------------------------------------------------------------

/**
 * Given that we want the stopwatch to be at `targetValue` **during its offset
 * phase** exactly when the clock reads `targetClockMs`, compute the
 * `startTime` (absolute ms) at which the stopwatch should have been started.
 *
 * Uses binary search — works for all CurveShape variants without analytical
 * inversion. Returns `null` if `targetValue` is outside the offset phase
 * range (0 < targetValue < peakValue).
 */
export function solveStartForOffsetValue(
  type: StopwatchType,
  targetValue: number,
  targetClockMs: number,
): number | null {
  if (targetValue <= 0 || targetValue >= type.peakValue) return null;
  const t3 = type.onsetDuration + type.comeupDuration + type.peakDuration;
  const t4 = t3 + type.offsetDuration;
  // offset phase is monotonically decreasing: value(t3)=peakValue, value(t4)=0
  let lo = t3;
  let hi = t4;
  for (let i = 0; i < 64; i++) {
    const mid = (lo + hi) / 2;
    if (evaluate(type, mid) > targetValue) lo = mid; // need more elapsed
    else hi = mid;                                    // too much elapsed
  }
  const elapsed = (lo + hi) / 2;
  return targetClockMs - elapsed;
}

/**
 * Compute the `startTime` (absolute ms) such that the peak phase begins
 * exactly at `peakClockMs`. Peak phase begins at elapsed = onset + comeup.
 */
export function solveStartForPeakAt(
  type: StopwatchType,
  peakClockMs: number,
): number {
  return peakClockMs - (type.onsetDuration + type.comeupDuration);
}

/**
 * Returns milliseconds remaining in the current phase.
 * Returns 0 if done. Negative (time until start) for pending.
 */
export function phaseRemainingMs(type: StopwatchType, elapsedMs: number): number {
  const t1 = type.onsetDuration;
  const t2 = t1 + type.comeupDuration;
  const t3 = t2 + type.peakDuration;
  const t4 = t3 + type.offsetDuration;
  if (elapsedMs <= 0) return 0;          // pending — not started
  if (elapsedMs < t1) return t1 - elapsedMs;   // onset
  if (elapsedMs < t2) return t2 - elapsedMs;   // comeup
  if (elapsedMs < t3) return t3 - elapsedMs;   // peak
  if (elapsedMs < t4) return t4 - elapsedMs;   // offset
  return 0;                                      // done
}

/** Format milliseconds as a human-readable duration string, e.g. "1h 20m" */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60_000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
