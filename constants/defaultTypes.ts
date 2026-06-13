/**
 * Pre-made stopwatch types.
 *
 * This is the single source of truth for all type definitions.
 * To add or change types, edit this file.
 *
 * Both types use:
 *   - peakValue = 100  (i.e. the function ranges from 0 to 100)
 *   - all linear curve shapes
 *   - a constant peak phase
 */

import type { StopwatchType } from '@/types/models';

const MIN = 60_000; // 1 minute in ms

/** Colour palette for user-created custom types */
export const TYPE_COLORS = [
  '#FF6B6B', '#FF8E53', '#FFEAA7', '#96CEB4',
  '#4ECDC4', '#45B7D1', '#6C5CE7', '#DDA0DD',
  '#F1948A', '#82E0AA', '#85C1E9', '#F7DC6F',
];

export const DEFAULT_TYPES: StopwatchType[] = [
  {
    id: 'preset-quick',
    name: 'Quick',
    color: '#FF6B6B',
    //
    //  Timeline (total 2 h):
    //    0 – 15 min  onset   (0 → 35%)
    //   15 – 30 min  comeup  (35 → 100%)
    //   30 – 60 min  peak    (100%)
    //   60 – 120 min offset  (100 → 0%)
    //
    onsetDuration:  15 * MIN,
    comeupDuration: 15 * MIN,
    peakDuration:   30 * MIN,
    offsetDuration: 60 * MIN,
    peakValue: 100,
    onsetEndFraction: 0.35,   // onset ends at 35% of peak
    onsetShape:  'linear',
    comeupShape: 'linear',
    offsetShape: 'linear',
    isBuiltIn: true,
  },
  {
    id: 'preset-extended',
    name: 'Extended',
    color: '#4ECDC4',
    //
    //  Timeline (total 5 h):
    //    0  – 30 min  onset   (0 → 25%)
    //   30  – 90 min  comeup  (25 → 100%)
    //   90  – 180 min peak    (100%)
    //  180  – 300 min offset  (100 → 0%)
    //
    onsetDuration:  30 * MIN,
    comeupDuration: 60 * MIN,
    peakDuration:   90 * MIN,
    offsetDuration: 120 * MIN,
    peakValue: 100,
    onsetEndFraction: 0.25,   // onset ends at 25% of peak
    onsetShape:  'linear',
    comeupShape: 'linear',
    offsetShape: 'linear',
    isBuiltIn: true,
  },
];
