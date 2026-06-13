/**
 * PlanEntryEditor
 *
 * Shared UI for setting the offset of a planned entry via three modes:
 *   • Start at   — pick the clock time when the stopwatch starts
 *   • Peak at    — pick the clock time when the peak phase begins
 *   • Comedown   — pick a target value (% of peak) and the clock time
 *                  at which that value should be reached during offset
 *
 * The component is controlled: the caller owns offsetMinutes and receives
 * updates via onChangeOffset.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  solveStartForOffsetValue,
  solveStartForPeakAt,
  totalDuration,
} from '@/engine/curveEngine';
import type { StopwatchType } from '@/types/models';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnchorMode = 'start' | 'peak' | 'comedown';

interface Props {
  type: StopwatchType;
  /** Current wall-clock time in ms (pass Date.now() from parent interval) */
  now: number;
  /** Current offset in minutes — used to initialise the picker on mount */
  initialOffsetMinutes: number;
  isDark: boolean;
  /** Called whenever the derived offsetMinutes changes */
  onChangeOffset: (offsetMinutes: number) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clampHour(h: number) {
  return ((h % 24) + 24) % 24;
}
function clampMinute(m: number) {
  return ((m % 60) + 60) % 60;
}
function pad2(n: number) {
  return n.toString().padStart(2, '0');
}

/**
 * Given a startTime in absolute ms, return the clock time for each milestone
 * of the type: start, peak-begin, peak-end, done.
 */
function milestones(
  type: StopwatchType,
  startMs: number,
): { label: string; ms: number }[] {
  const d1 = type.onsetDuration;
  const d2 = type.comeupDuration;
  const d3 = type.peakDuration;
  const d4 = type.offsetDuration;
  return [
    { label: 'Starts',     ms: startMs },
    { label: 'Peak begins', ms: startMs + d1 + d2 },
    { label: 'Peak ends',  ms: startMs + d1 + d2 + d3 },
    { label: 'Done',       ms: startMs + d1 + d2 + d3 + d4 },
  ];
}

function fmtClock(ms: number): string {
  const d = new Date(ms);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// ---------------------------------------------------------------------------
// Mode selector
// ---------------------------------------------------------------------------

function ModeButton({
  label,
  active,
  color,
  isDark,
  onPress,
}: {
  label: string;
  active: boolean;
  color: string;
  isDark: boolean;
  onPress: () => void;
}) {
  const inactiveBg   = isDark ? '#1E2022' : '#F0F0F0';
  const inactiveText = isDark ? '#9BA1A6' : '#687076';
  return (
    <TouchableOpacity
      style={[
        styles.modeBtn,
        { backgroundColor: active ? color : inactiveBg },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.modeBtnText,
          { color: active ? '#fff' : inactiveText },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// HH:MM picker row
// ---------------------------------------------------------------------------

function TimePicker({
  hour,
  minute,
  isDark,
  onHourChange,
  onMinuteChange,
}: {
  hour: number;
  minute: number;
  isDark: boolean;
  onHourChange: (h: number) => void;
  onMinuteChange: (m: number) => void;
}) {
  const textColor = isDark ? '#ECEDEE' : '#11181C';
  const subColor  = isDark ? '#9BA1A6' : '#687076';
  const btnBg     = isDark ? '#2A2D2F' : '#E5E5EA';

  return (
    <View style={styles.timePicker}>
      {/* Hours column */}
      <View style={styles.timeCol}>
        <TouchableOpacity
          style={[styles.timeBtn, { backgroundColor: btnBg }]}
          onPress={() => onHourChange(clampHour(hour + 1))}
        >
          <Text style={[styles.timeBtnText, { color: subColor }]}>▲</Text>
        </TouchableOpacity>
        <Text style={[styles.timeDigit, { color: textColor }]}>{pad2(hour)}</Text>
        <TouchableOpacity
          style={[styles.timeBtn, { backgroundColor: btnBg }]}
          onPress={() => onHourChange(clampHour(hour - 1))}
        >
          <Text style={[styles.timeBtnText, { color: subColor }]}>▼</Text>
        </TouchableOpacity>
        <Text style={[styles.timeUnit, { color: subColor }]}>h</Text>
      </View>

      <Text style={[styles.timeSep, { color: textColor }]}>:</Text>

      {/* Minutes column */}
      <View style={styles.timeCol}>
        <View style={styles.minuteRow}>
          <TouchableOpacity
            style={[styles.timeBtn, styles.wideBtn, { backgroundColor: btnBg }]}
            onPress={() => onMinuteChange(clampMinute(minute + 15))}
          >
            <Text style={[styles.timeBtnText, { color: subColor }]}>+15</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.timeBtn, styles.wideBtn, { backgroundColor: btnBg }]}
            onPress={() => onMinuteChange(clampMinute(minute + 5))}
          >
            <Text style={[styles.timeBtnText, { color: subColor }]}>+5</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.timeDigit, { color: textColor }]}>{pad2(minute)}</Text>
        <View style={styles.minuteRow}>
          <TouchableOpacity
            style={[styles.timeBtn, styles.wideBtn, { backgroundColor: btnBg }]}
            onPress={() => onMinuteChange(clampMinute(minute - 5))}
          >
            <Text style={[styles.timeBtnText, { color: subColor }]}>−5</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.timeBtn, styles.wideBtn, { backgroundColor: btnBg }]}
            onPress={() => onMinuteChange(clampMinute(minute - 15))}
          >
            <Text style={[styles.timeBtnText, { color: subColor }]}>−15</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.timeUnit, { color: subColor }]}>m</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Comedown percent stepper
// ---------------------------------------------------------------------------

function ComedownStepper({
  percent,
  isDark,
  onChange,
}: {
  percent: number;
  isDark: boolean;
  onChange: (p: number) => void;
}) {
  const textColor = isDark ? '#ECEDEE' : '#11181C';
  const subColor  = isDark ? '#9BA1A6' : '#687076';
  const btnBg     = isDark ? '#2A2D2F' : '#E5E5EA';

  function clamp(v: number) {
    return Math.min(99, Math.max(1, v));
  }

  return (
    <View style={styles.comedownRow}>
      <Text style={[styles.comedownLabel, { color: subColor }]}>
        Value at that time
      </Text>
      <View style={styles.comedownStepper}>
        <TouchableOpacity
          style={[styles.stepBtn, { backgroundColor: btnBg }]}
          onPress={() => onChange(clamp(percent - 10))}
        >
          <Text style={[styles.stepBtnText, { color: textColor }]}>−10%</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.stepBtn, { backgroundColor: btnBg }]}
          onPress={() => onChange(clamp(percent - 1))}
        >
          <Text style={[styles.stepBtnText, { color: textColor }]}>−1%</Text>
        </TouchableOpacity>
        <Text style={[styles.comedownValue, { color: textColor }]}>{percent}%</Text>
        <TouchableOpacity
          style={[styles.stepBtn, { backgroundColor: btnBg }]}
          onPress={() => onChange(clamp(percent + 1))}
        >
          <Text style={[styles.stepBtnText, { color: textColor }]}>+1%</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.stepBtn, { backgroundColor: btnBg }]}
          onPress={() => onChange(clamp(percent + 10))}
        >
          <Text style={[styles.stepBtnText, { color: textColor }]}>+10%</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Timeline preview
// ---------------------------------------------------------------------------

function TimelinePreview({
  type,
  startMs,
  isDark,
}: {
  type: StopwatchType;
  startMs: number;
  isDark: boolean;
}) {
  const textColor = isDark ? '#ECEDEE' : '#11181C';
  const subColor  = isDark ? '#9BA1A6' : '#687076';
  const pts = milestones(type, startMs);

  return (
    <View style={styles.timeline}>
      {pts.map((pt, i) => (
        <View key={i} style={styles.timelineItem}>
          <View style={[styles.timelineDot, { backgroundColor: i === 0 ? type.color : subColor }]} />
          <Text style={[styles.timelineClock, { color: textColor }]}>
            {fmtClock(pt.ms)}
          </Text>
          <Text style={[styles.timelineLabel, { color: subColor }]}>{pt.label}</Text>
          {i < pts.length - 1 && (
            <View style={[styles.timelineConnector, { backgroundColor: subColor }]} />
          )}
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PlanEntryEditor({
  type,
  now,
  initialOffsetMinutes,
  isDark,
  onChangeOffset,
}: Props) {
  const subColor = isDark ? '#9BA1A6' : '#687076';

  // Derive initial clock time from current offset (start-mode basis)
  const initMs = now + initialOffsetMinutes * 60_000;
  const initDate = new Date(initMs);

  const [mode, setMode]               = useState<AnchorMode>('start');
  const [hour, setHour]               = useState(initDate.getHours());
  const [minute, setMinute]           = useState(initDate.getMinutes());
  const [comedownPct, setComedownPct] = useState(25);

  // Re-initialise when the modal is re-opened with a different entry
  useEffect(() => {
    const ms   = now + initialOffsetMinutes * 60_000;
    const date = new Date(ms);
    setHour(date.getHours());
    setMinute(date.getMinutes());
    setMode('start');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOffsetMinutes]);

  // Compute the absolute clock time the user has dialled in (today)
  const targetClockMs = useMemo(() => {
    const d = new Date(now);
    d.setHours(hour, minute, 0, 0);
    return d.getTime();
  }, [now, hour, minute]);

  // Compute startTime in absolute ms based on mode
  const startMs = useMemo((): number => {
    switch (mode) {
      case 'start':
        return targetClockMs;
      case 'peak':
        return solveStartForPeakAt(type, targetClockMs);
      case 'comedown': {
        const targetValue = (comedownPct / 100) * type.peakValue;
        return solveStartForOffsetValue(type, targetValue, targetClockMs) ?? targetClockMs;
      }
    }
  }, [mode, targetClockMs, type, comedownPct]);

  // Derive offsetMinutes from startMs and notify parent
  const offsetMinutes = Math.round((startMs - now) / 60_000);
  useEffect(() => {
    onChangeOffset(offsetMinutes);
  }, [offsetMinutes, onChangeOffset]);

  const offsetLabel =
    offsetMinutes === 0
      ? 'Now'
      : offsetMinutes > 0
      ? `+${offsetMinutes}m from now`
      : `${offsetMinutes}m from now`;

  return (
    <View style={styles.root}>
      {/* Mode selector */}
      <Text style={[styles.sectionLabel, { color: subColor }]}>Anchor by</Text>
      <View style={styles.modeRow}>
        <ModeButton
          label="Start at"
          active={mode === 'start'}
          color={type.color}
          isDark={isDark}
          onPress={() => setMode('start')}
        />
        <ModeButton
          label="Peak at"
          active={mode === 'peak'}
          color={type.color}
          isDark={isDark}
          onPress={() => setMode('peak')}
        />
        <ModeButton
          label="Comedown"
          active={mode === 'comedown'}
          color={type.color}
          isDark={isDark}
          onPress={() => setMode('comedown')}
        />
      </View>

      {/* Time picker */}
      <Text style={[styles.sectionLabel, { color: subColor }, { marginTop: 14 }]}>
        {mode === 'start'    ? 'Starts at'
         : mode === 'peak'  ? 'Peak begins at'
         :                    'Reaches value at'}
      </Text>
      <TimePicker
        hour={hour}
        minute={minute}
        isDark={isDark}
        onHourChange={setHour}
        onMinuteChange={setMinute}
      />

      {/* Comedown percent (only in comedown mode) */}
      {mode === 'comedown' && (
        <ComedownStepper
          percent={comedownPct}
          isDark={isDark}
          onChange={setComedownPct}
        />
      )}

      {/* Timeline preview */}
      <Text style={[styles.sectionLabel, { color: subColor }, { marginTop: 14 }]}>
        Timeline preview
      </Text>
      <TimelinePreview type={type} startMs={startMs} isDark={isDark} />

      {/* Offset summary */}
      <Text style={[styles.offsetSummary, { color: subColor }]}>{offsetLabel}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    gap: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Time picker
  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  timeCol: {
    alignItems: 'center',
    gap: 4,
  },
  minuteRow: {
    flexDirection: 'row',
    gap: 4,
  },
  timeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 36,
    alignItems: 'center',
  },
  wideBtn: {
    minWidth: 44,
  },
  timeBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeDigit: {
    fontSize: 36,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
    lineHeight: 44,
    minWidth: 52,
    textAlign: 'center',
  },
  timeSep: {
    fontSize: 36,
    fontWeight: '200',
    lineHeight: 44,
    marginBottom: 14, // account for the unit label below digits
  },
  timeUnit: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  // Comedown stepper
  comedownRow: {
    marginTop: 12,
    gap: 6,
  },
  comedownLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  comedownStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepBtn: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 9,
  },
  stepBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  comedownValue: {
    flex: 1,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  // Timeline preview
  timeline: {
    paddingLeft: 8,
    gap: 0,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 16,
    position: 'relative',
    minHeight: 28,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    left: 0,
    top: 6,
  },
  timelineConnector: {
    width: 1.5,
    position: 'absolute',
    left: 3,
    top: 14,
    bottom: -6,
    opacity: 0.3,
  },
  timelineClock: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    width: 44,
  },
  timelineLabel: {
    fontSize: 13,
    marginLeft: 8,
    marginTop: 1,
  },

  // Offset summary
  offsetSummary: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    opacity: 0.8,
  },
});
