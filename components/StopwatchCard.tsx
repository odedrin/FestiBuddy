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
import type { InteractionStatus } from '@/constants/interactions';
import { INTERACTION_COLOR } from '@/constants/interactions';

// DisplayMode is kept as a type alias for backward compat with any remaining
// imports, but it is no longer used to branch card rendering.
export type DisplayMode = 'value' | 'time';

interface Props {
  stopwatch: ActiveStopwatch;
  type: StopwatchType;
  currentTime: number;
  onStop: (id: string) => void;
  onEditStart: (id: string) => void;
  isDark: boolean;
  /** Worst interaction status this stopwatch has with any other active substance. */
  warningStatus?: InteractionStatus;
  /** Whether the card is in multi-select mode. */
  isSelected?: boolean;
  isSelectMode?: boolean;
  onLongPress?: (id: string) => void;
  onPress?: (id: string) => void;
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

const WARNING_LABEL: Record<InteractionStatus, string> = {
  Dangerous: '⚠ Dangerous',
  Unsafe: '⚠ Unsafe',
  Caution: '⚠ Caution',
  'Low Risk & Decrease': '↓ Low Risk',
  'Low Risk & No Synergy': '• Low Risk',
  'Low Risk & Synergy': '✦ Synergy',
};

export function StopwatchCard({
  stopwatch,
  type,
  currentTime,
  onStop,
  onEditStart,
  isDark,
  warningStatus,
  isSelected = false,
  isSelectMode = false,
  onLongPress,
  onPress,
}: Props) {
  const elapsed = effectiveElapsed(stopwatch, currentTime);
  const phase = currentPhase(type, elapsed);
  const progress = progressFraction(type, elapsed);

  const total = totalDuration(type);
  const onsetW = type.onsetDuration / total;
  const comeupW = type.comeupDuration / total;
  const peakW = type.peakDuration / total;

  const textColor = isDark ? '#ECEDEE' : '#11181C';
  const subColor = isDark ? '#9BA1A6' : '#687076';
  const cardBg = isDark ? '#1E2022' : '#F5F5F7';
  const borderColor = isSelected
    ? (isDark ? '#4A9EFF' : '#007AFF')
    : isDark ? '#2A2D2F' : '#E5E5EA';

  const warningColor = warningStatus ? INTERACTION_COLOR[warningStatus] : undefined;

  return (
    <TouchableOpacity
      activeOpacity={isSelectMode ? 0.6 : 1}
      onPress={isSelectMode ? () => onPress?.(stopwatch.id) : undefined}
      onLongPress={() => onLongPress?.(stopwatch.id)}
      delayLongPress={400}
    >
      <View style={[
        styles.card,
        { backgroundColor: cardBg, borderColor },
        isSelected && styles.cardSelected,
      ]}>
        {/* Color bar on the left */}
        <View style={[styles.colorBar, { backgroundColor: type.color }]} />

        {/* Select mode checkbox */}
        {isSelectMode && (
          <View style={[styles.checkbox, isSelected && { backgroundColor: '#007AFF', borderColor: '#007AFF' }]}>
            {isSelected && <Text style={styles.checkmark}>✓</Text>}
          </View>
        )}

        <View style={styles.body}>
          {/* Top row: type name + elapsed/total + stop button */}
          <View style={styles.topRow}>
            <View style={styles.nameBlock}>
              <Text style={[styles.typeName, { color: type.color }]}>
                {type.name}
              </Text>
              {stopwatch.label ? (
                <Text style={[styles.label, { color: subColor }]}>{stopwatch.label}</Text>
              ) : null}
            </View>

            {/* Elapsed / Total */}
            <View style={styles.valueBlock}>
              <Text style={[styles.valueText, { color: textColor }]}>
                {formatElapsed(elapsed)}
              </Text>
              <Text style={[styles.valueUnit, { color: subColor }]}>
                {' '}/ {formatDuration(total)}
              </Text>
            </View>

            {/* Stop — hidden in select mode */}
            {!isSelectMode && (
              <TouchableOpacity
                style={styles.stopBtn}
                onPress={() => onStop(stopwatch.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.stopIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Middle row: phase pill + warning badge + edit button */}
          <View style={styles.midRow}>
            <View style={[styles.phasePill, { borderColor: type.color }]}>
              <Text style={[styles.phaseText, { color: type.color }]}>
                {PHASE_LABELS[phase] ?? phase}
              </Text>
            </View>

            {warningStatus && warningColor && (
              <View style={[styles.warningBadge, { backgroundColor: warningColor + '22', borderColor: warningColor }]}>
                <Text style={[styles.warningText, { color: warningColor }]}>
                  {WARNING_LABEL[warningStatus]}
                </Text>
              </View>
            )}

            {/* Spacer + Edit time button */}
            <View style={{ flex: 1 }} />
            {!isSelectMode && (
              <TouchableOpacity
                style={[styles.editBtn, { borderColor: isDark ? '#3A3D3F' : '#D1D1D6' }]}
                onPress={() => onEditStart(stopwatch.id)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={[styles.editBtnText, { color: subColor }]}>✎ Edit time</Text>
              </TouchableOpacity>
            )}
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
    </TouchableOpacity>
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
  cardSelected: {
    borderWidth: 1.5,
  },
  colorBar: {
    width: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#888',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginLeft: 10,
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
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
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  valueText: {
    fontSize: 18,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
  },
  valueUnit: {
    fontSize: 12,
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
    gap: 8,
    flexWrap: 'wrap',
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
  warningBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  warningText: {
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
