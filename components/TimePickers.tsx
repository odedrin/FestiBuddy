/**
 * Shared picker components used by AddPlanEntryModal, EditPlanEntryModal,
 * and EditStopwatchStartModal.
 *
 * ClockPicker  — HH:MM selector with direct TextInput for hours and minutes.
 * ValueStepper — % selector with direct TextInput for the percentage.
 * TimelineSummary — Start → Peak → End timeline strip.
 */
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { StopwatchType } from '@/types/models';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

export function pad2(n: number) { return n.toString().padStart(2, '0'); }
export function clampH(h: number) { return ((h % 24) + 24) % 24; }
export function clampM(m: number) { return ((m % 60) + 60) % 60; }
export function fmtClock(ms: number) {
  const d = new Date(ms);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
export function toAbsMs(now: number, hour: number, minute: number): number {
  const d = new Date(now);
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
}

// ---------------------------------------------------------------------------
// ClockPicker
// ---------------------------------------------------------------------------

interface ClockPickerProps {
  hour: number;
  minute: number;
  isDark: boolean;
  label: string;
  onHour: (h: number) => void;
  onMinute: (m: number) => void;
}

export function ClockPicker({ hour, minute, isDark, label, onHour, onMinute }: ClockPickerProps) {
  const textColor = isDark ? '#ECEDEE' : '#11181C';
  const subColor  = isDark ? '#9BA1A6' : '#687076';
  const btnBg     = isDark ? '#2A2D2F' : '#E5E5EA';
  const inputBg   = isDark ? '#2A2D2F' : '#F0F0F2';

  // Local strings so the user can type freely; commit on blur/submit
  const [hourStr,   setHourStr]   = useState(pad2(hour));
  const [minuteStr, setMinuteStr] = useState(pad2(minute));

  // Sync when props change (e.g. ±button presses from outside)
  useEffect(() => setHourStr(pad2(hour)),   [hour]);
  useEffect(() => setMinuteStr(pad2(minute)), [minute]);

  function commitHour(str: string) {
    const n = parseInt(str, 10);
    const v = isNaN(n) ? hour : clampH(n);
    onHour(v);
    setHourStr(pad2(v));
  }

  function commitMinute(str: string) {
    const n = parseInt(str, 10);
    const v = isNaN(n) ? minute : clampM(n);
    onMinute(v);
    setMinuteStr(pad2(v));
  }

  return (
    <View style={styles.clockPicker}>
      <Text style={[styles.pickerLabel, { color: subColor }]}>{label}</Text>
      <View style={styles.pickerRow}>

        {/* ── Hours ── */}
        <View style={styles.pickerCol}>
          <TouchableOpacity
            style={[styles.pickerBtn, { backgroundColor: btnBg }]}
            onPress={() => onHour(clampH(hour + 1))}
          >
            <Text style={[styles.pickerArrow, { color: subColor }]}>▲</Text>
          </TouchableOpacity>

          <TextInput
            style={[styles.pickerDigit, { color: textColor, backgroundColor: inputBg }]}
            value={hourStr}
            onChangeText={setHourStr}
            onEndEditing={() => commitHour(hourStr)}
            onSubmitEditing={() => commitHour(hourStr)}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
            textAlign="center"
          />

          <TouchableOpacity
            style={[styles.pickerBtn, { backgroundColor: btnBg }]}
            onPress={() => onHour(clampH(hour - 1))}
          >
            <Text style={[styles.pickerArrow, { color: subColor }]}>▼</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.pickerColon, { color: textColor }]}>:</Text>

        {/* ── Minutes ── */}
        <View style={styles.pickerCol}>
          <View style={styles.minuteRow}>
            {[+15, +5, +1].map(d => (
              <TouchableOpacity
                key={d}
                style={[styles.pickerBtn, styles.minuteBtn, { backgroundColor: btnBg }]}
                onPress={() => onMinute(clampM(minute + d))}
              >
                <Text style={[styles.minuteBtnText, { color: subColor }]}>+{d}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={[styles.pickerDigit, { color: textColor, backgroundColor: inputBg }]}
            value={minuteStr}
            onChangeText={setMinuteStr}
            onEndEditing={() => commitMinute(minuteStr)}
            onSubmitEditing={() => commitMinute(minuteStr)}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
            textAlign="center"
          />

          <View style={styles.minuteRow}>
            {[-15, -5, -1].map(d => (
              <TouchableOpacity
                key={d}
                style={[styles.pickerBtn, styles.minuteBtn, { backgroundColor: btnBg }]}
                onPress={() => onMinute(clampM(minute + d))}
              >
                <Text style={[styles.minuteBtnText, { color: subColor }]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ValueStepper
// ---------------------------------------------------------------------------

interface ValueStepperProps {
  value: number;
  max: number;
  isDark: boolean;
  onChange: (v: number) => void;
}

export function ValueStepper({ value, max, isDark, onChange }: ValueStepperProps) {
  const textColor = isDark ? '#ECEDEE' : '#11181C';
  const subColor  = isDark ? '#9BA1A6' : '#687076';
  const btnBg     = isDark ? '#2A2D2F' : '#E5E5EA';
  const inputBg   = isDark ? '#2A2D2F' : '#F0F0F2';

  const toPct = (v: number) => Math.round((v / max) * 100);
  const [pctStr, setPctStr] = useState(toPct(value).toString());

  // Sync when props change (e.g. ±button presses)
  useEffect(() => setPctStr(toPct(value).toString()), [value, max]);

  function commitPct(str: string) {
    const n = parseInt(str, 10);
    if (!isNaN(n)) {
      const clamped = Math.max(1, Math.min(99, n));
      onChange((clamped / 100) * max);
      setPctStr(clamped.toString());
    } else {
      setPctStr(toPct(value).toString());
    }
  }

  function clampV(v: number) {
    const step = max / 100;
    return Math.max(step, Math.min(max - step, v));
  }

  return (
    <View style={styles.valueStepper}>
      <Text style={[styles.pickerLabel, { color: subColor }]}>Value at that time</Text>
      <View style={styles.valueRow}>
        {[-20, -5, -1].map(d => (
          <TouchableOpacity
            key={d}
            style={[styles.pickerBtn, styles.valueBtn, { backgroundColor: btnBg }]}
            onPress={() => onChange(clampV(value + d * (max / 100)))}
          >
            <Text style={[styles.valueBtnText, { color: textColor }]}>{d}%</Text>
          </TouchableOpacity>
        ))}

        <View style={styles.valueInputBlock}>
          <TextInput
            style={[styles.valueInput, { color: textColor, backgroundColor: inputBg }]}
            value={pctStr}
            onChangeText={setPctStr}
            onEndEditing={() => commitPct(pctStr)}
            onSubmitEditing={() => commitPct(pctStr)}
            keyboardType="number-pad"
            maxLength={3}
            selectTextOnFocus
            textAlign="center"
          />
          <Text style={[styles.valuePctSign, { color: subColor }]}>%</Text>
        </View>

        {[1, 5, 20].map(d => (
          <TouchableOpacity
            key={d}
            style={[styles.pickerBtn, styles.valueBtn, { backgroundColor: btnBg }]}
            onPress={() => onChange(clampV(value + d * (max / 100)))}
          >
            <Text style={[styles.valueBtnText, { color: textColor }]}>+{d}%</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// TimelineSummary
// ---------------------------------------------------------------------------

interface TimelineSummaryProps {
  type: StopwatchType;
  startMs: number;
  isDark: boolean;
}

export function TimelineSummary({ type, startMs, isDark }: TimelineSummaryProps) {
  const textColor = isDark ? '#ECEDEE' : '#11181C';
  const subColor  = isDark ? '#9BA1A6' : '#687076';
  const pts = [
    { label: 'Start', ms: startMs },
    { label: 'Peak',  ms: startMs + type.onsetDuration + type.comeupDuration },
    { label: 'End',   ms: startMs + type.onsetDuration + type.comeupDuration + type.peakDuration + type.offsetDuration },
  ];
  return (
    <View style={styles.timeline}>
      {pts.map((pt, i) => (
        <React.Fragment key={i}>
          <View style={styles.tlItem}>
            <View style={[styles.tlDot, { backgroundColor: i === 1 ? type.color : subColor }]} />
            <Text style={[styles.tlTime, { color: textColor }]}>{fmtClock(pt.ms)}</Text>
            <Text style={[styles.tlLabel, { color: subColor }]}>{pt.label}</Text>
          </View>
          {i < pts.length - 1 && <View style={[styles.tlLine, { backgroundColor: subColor }]} />}
        </React.Fragment>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

export const pickerStyles = StyleSheet.create({
  clockPicker: { gap: 10 },
  pickerLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  pickerCol: { alignItems: 'center', gap: 4 },
  pickerBtn: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, alignItems: 'center', minWidth: 36 },
  pickerArrow: { fontSize: 12, fontWeight: '600' },
  pickerDigit: {
    fontSize: 44,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
    lineHeight: 52,
    minWidth: 70,
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  pickerColon: { fontSize: 44, fontWeight: '200', lineHeight: 52, marginTop: -8 },
  minuteRow: { flexDirection: 'row', gap: 4 },
  minuteBtn: { minWidth: 40 },
  minuteBtnText: { fontSize: 11, fontWeight: '600' },
  valueStepper: { gap: 8 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  valueBtn: { minWidth: 44 },
  valueBtnText: { fontSize: 11, fontWeight: '600' },
  valueInputBlock: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  valueInput: {
    fontSize: 28,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    minWidth: 56,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  valuePctSign: { fontSize: 20, fontWeight: '400' },
  timeline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  tlItem: { alignItems: 'center', gap: 2, minWidth: 60 },
  tlDot: { width: 8, height: 8, borderRadius: 4 },
  tlTime: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  tlLabel: { fontSize: 10, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.4 },
  tlLine: { flex: 1, height: 1.5, opacity: 0.25, marginBottom: 14 },
});

// Re-export as `styles` so the component-local StyleSheet.create calls above compile
const styles = pickerStyles;
export default styles;
