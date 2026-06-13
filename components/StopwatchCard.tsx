import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  currentPhase,
  formatElapsed,
  formatDuration,
  progressFraction,
  totalDuration,
} from '@/engine/curveEngine';
import { effectiveElapsed } from '@/store/StopwatchContext';
import type { ActiveStopwatch, StopwatchType } from '@/types/models';

// DisplayMode is kept as a type alias for backward compat with any remaining
// imports, but it is no longer used to branch card rendering.
export type DisplayMode = 'value' | 'time';

interface Props {
  stopwatch: ActiveStopwatch;
  type: StopwatchType;
  currentTime: number;
  onStop: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onEditStart: (id: string) => void;
  isDark: boolean;
  /** @deprecated ignored — always renders in Time mode */
  displayMode?: DisplayMode;
}

const PHASE_LABELS: Record<string, string> = {
  pending: 'Pending',
  onset: 'Onset',
  comeup: 'Comeup',
  peak: 'Peak ◆',
  offset: 'Offset',
  done: 'Done',
};

export function StopwatchCard({
  stopwatch,
  type,
  currentTime,
  onStop,
  onPause,
  onResume,
  onEditStart,
  isDark,
}: Props) {
  const elapsed = effectiveElapsed(stopwatch, currentTime);
  const phase = currentPhase(type, elapsed);
  const progress = progressFraction(type, elapsed);
  const isPaused = stopwatch.pausedAt !== undefined;

  const total = totalDuration(type);
  const onsetW = type.onsetDuration / total;
  const comeupW = type.comeupDuration / total;
  const peakW = type.peakDuration / total;

  const textColor = isDark ? '#ECEDEE' : '#11181C';
  const subColor = isDark ? '#9BA1A6' : '#687076';
  const cardBg = isDark ? '#1E2022' : '#F5F5F7';
  const borderColor = isDark ? '#2A2D2F' : '#E5E5EA';
  const pausedOverlay = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';

  return (
    <View style={[
      styles.card,
      { backgroundColor: isPaused ? pausedOverlay : cardBg, borderColor },
      isPaused && { opacity: 0.8 },
    ]}>
      {/* Color bar on the left */}
      <View style={[styles.colorBar, { backgroundColor: type.color, opacity: isPaused ? 0.4 : 1 }]} />

      <View style={styles.body}>
        {/* Top row: type name + elapsed/total + action buttons */}
        <View style={styles.topRow}>
          <View style={styles.nameBlock}>
            <Text style={[styles.typeName, { color: type.color, opacity: isPaused ? 0.6 : 1 }]}>
              {type.name}
              {isPaused ? ' ⏸' : ''}
            </Text>
            {stopwatch.label ? (
              <Text style={[styles.label, { color: subColor }]}>{stopwatch.label}</Text>
            ) : null}
          </View>

          {/* Elapsed / Total — tap to edit start time */}
          <TouchableOpacity style={styles.valueBlock} onPress={() => onEditStart(stopwatch.id)}>
            <Text style={[styles.valueText, { color: textColor }]}>
              {formatElapsed(elapsed)}
            </Text>
            <Text style={[styles.valueUnit, { color: subColor }]}>
              {' '}/ {formatDuration(total)}
            </Text>
            <Text style={[styles.editIcon, { color: subColor }]}>✎</Text>
          </TouchableOpacity>

          {/* Pause / Resume */}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: isDark ? '#2A2D2F' : '#E5E5EA' }]}
            onPress={() => isPaused ? onResume(stopwatch.id) : onPause(stopwatch.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.actionIcon, { color: subColor }]}>
              {isPaused ? '▶' : '⏸'}
            </Text>
          </TouchableOpacity>

          {/* Stop */}
          <TouchableOpacity
            style={styles.stopBtn}
            onPress={() => onStop(stopwatch.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.stopIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Middle row: phase pill */}
        <View style={styles.midRow}>
          <View style={[styles.phasePill, { borderColor: type.color }]}>
            <Text style={[styles.phaseText, { color: type.color }]}>
              {PHASE_LABELS[phase] ?? phase}
            </Text>
          </View>
        </View>

        {/* Progress track (segmented bar) */}
        <View style={styles.track}>
          <View style={[styles.segment, { width: `${onsetW * 100}%`, backgroundColor: type.color, opacity: 0.3 }]} />
          <View style={[styles.segment, { width: `${comeupW * 100}%`, backgroundColor: type.color, opacity: 0.6 }]} />
          <View style={[styles.segment, { width: `${peakW * 100}%`, backgroundColor: type.color, opacity: 1 }]} />
          <View style={[styles.segment, { flex: 1, backgroundColor: type.color, opacity: 0.35 }]} />
          <View
            style={[
              styles.cursor,
              { left: `${progress * 100}%` as any, backgroundColor: isDark ? '#fff' : '#000' },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    marginBottom: 10,
    overflow: 'hidden',
  },
  colorBar: {
    width: 4,
  },
  body: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameBlock: {
    flex: 1,
  },
  typeName: {
    fontSize: 15,
    fontWeight: '600',
  },
  label: {
    fontSize: 12,
    marginTop: 1,
  },
  valueBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(128,128,128,0.08)',
  },
  editIcon: {
    fontSize: 11,
    opacity: 0.6,
    marginLeft: 2,
  },
  valueText: {
    fontSize: 18,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
  },
  valueUnit: {
    fontSize: 12,
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 11,
    fontWeight: '700',
  },
  stopBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(128,128,128,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopIcon: {
    fontSize: 11,
    color: '#888',
    fontWeight: '700',
  },
  midRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phasePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  phaseText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  track: {
    height: 10,
    borderRadius: 5,
    flexDirection: 'row',
    overflow: 'hidden',
    position: 'relative',
  },
  segment: {
    height: '100%',
  },
  cursor: {
    position: 'absolute',
    top: -3,
    width: 2,
    height: 16,
    borderRadius: 1,
    marginLeft: -1,
  },
});
