import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { evaluate, formatDuration, totalDuration } from '@/engine/curveEngine';
import type { StopwatchType } from '@/types/models';
import Svg, { Path, Line } from 'react-native-svg';

interface Props {
  type: StopwatchType;
  isDark: boolean;
  isFavorite: boolean;
  onStart: (typeId: string) => void;
  /** Called for both "Customize" (built-in) and "Edit" (custom) */
  onEdit: (type: StopwatchType) => void;
  onDelete?: (type: StopwatchType) => void;
  onToggleFavorite: (typeId: string) => void;
}

/** Sparkline preview of f(t) for a single type */
function MiniCurve({ type }: { type: StopwatchType }) {
  const W = 90;
  const H = 40;
  const PAD = 4;

  const d = useMemo(() => {
    const total = totalDuration(type);
    const steps = 80;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const t = (i / steps) * total;
      const v = evaluate(type, t);
      const x = PAD + (i / steps) * (W - PAD * 2);
      const y = H - PAD - (v / type.peakValue) * (H - PAD * 2);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [type]);

  return (
    <Svg width={W} height={H}>
      <Line
        x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD}
        stroke="rgba(128,128,128,0.2)" strokeWidth={1}
      />
      <Path d={d} stroke={type.color} strokeWidth={2} fill="none" />
    </Svg>
  );
}

export function TypeCard({ type, isDark, isFavorite, onStart, onEdit, onDelete, onToggleFavorite }: Props) {
  const textColor = isDark ? '#ECEDEE' : '#11181C';
  const subColor  = isDark ? '#9BA1A6' : '#687076';
  const cardBg    = isDark ? '#1E2022' : '#F5F5F7';
  const border    = isDark ? '#2A2D2F' : '#E5E5EA';

  const total = totalDuration(type);
  const onsetPct  = Math.round((type.onsetDuration  / total) * 100);
  const comeupPct = Math.round((type.comeupDuration / total) * 100);
  const peakPct   = Math.round((type.peakDuration   / total) * 100);
  const offsetPct = 100 - onsetPct - comeupPct - peakPct;

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
      {/* Left color stripe */}
      <View style={[styles.stripe, { backgroundColor: type.color }]} />

      <View style={styles.body}>
        {/* Name + duration */}
        <View style={styles.topRow}>
          <View style={styles.nameBlock}>
            <Text style={[styles.name, { color: textColor }]}>{type.name}</Text>
            <Text style={[styles.totalDur, { color: subColor }]}>
              {formatDuration(total)} total · peak {type.peakValue}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => onToggleFavorite(type.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.starBtn}
          >
            <Text style={[styles.star, { color: isFavorite ? '#FFD700' : subColor }]}>
              {isFavorite ? '★' : '☆'}
            </Text>
          </TouchableOpacity>

          <MiniCurve type={type} />
        </View>

        {/* Phase breakdown */}
        <View style={styles.phases}>
          {[
            { label: 'Onset',  dur: type.onsetDuration,  pct: onsetPct  },
            { label: 'Comeup', dur: type.comeupDuration, pct: comeupPct },
            { label: 'Peak',   dur: type.peakDuration,   pct: peakPct   },
            { label: 'Offset', dur: type.offsetDuration, pct: offsetPct },
          ].map(({ label, dur, pct }) => (
            <View key={label} style={styles.phaseItem}>
              <Text style={[styles.phaseLabel, { color: subColor }]}>{label}</Text>
              <Text style={[styles.phaseDur, { color: textColor }]}>{formatDuration(dur)}</Text>
              <Text style={[styles.phasePct, { color: subColor }]}>{pct}%</Text>
            </View>
          ))}
        </View>

        {/* Segmented bar */}
        <View style={styles.bar}>
          {[
            { pct: onsetPct,  opacity: 0.35 },
            { pct: comeupPct, opacity: 0.6  },
            { pct: peakPct,   opacity: 1.0  },
            { pct: offsetPct, opacity: 0.5  },
          ].map(({ pct, opacity }, i) => (
            <View
              key={i}
              style={{ width: `${pct}%`, height: '100%', backgroundColor: type.color, opacity }}
            />
          ))}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: type.color }]}
            onPress={() => onStart(type.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.startText}>▶  Start</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: type.color }]}
            onPress={() => onEdit(type)}
            activeOpacity={0.7}
          >
            <Text style={[styles.secondaryText, { color: type.color }]}>
              {type.isBuiltIn ? 'Customize' : 'Edit'}
            </Text>
          </TouchableOpacity>

          {!type.isBuiltIn && onDelete && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => onDelete(type)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.deleteText, { color: subColor }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    marginBottom: 14,
    overflow: 'hidden',
  },
  stripe: {
    width: 5,
  },
  body: {
    flex: 1,
    padding: 14,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameBlock: {
    gap: 3,
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
  },
  totalDur: {
    fontSize: 12,
  },
  phases: {
    flexDirection: 'row',
    gap: 4,
  },
  phaseItem: {
    flex: 1,
    gap: 2,
  },
  phaseLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  phaseDur: {
    fontSize: 12,
    fontWeight: '500',
  },
  phasePct: {
    fontSize: 10,
  },
  bar: {
    height: 5,
    borderRadius: 3,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: 'rgba(128,128,128,0.12)',
  },
  starBtn: {
    padding: 2,
  },
  star: {
    fontSize: 20,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  startBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  startText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(128,128,128,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
