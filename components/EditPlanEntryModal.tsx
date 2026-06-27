import React, { useEffect, useRef, useState } from 'react';
import { formatOffset } from '@/utils/formatOffset';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  solveStartForOffsetValue,
  solveStartForPeakAt,
} from '@/engine/curveEngine';
import {
  ClockPicker,
  ClockPickerHandle,
  TimelineSummary,
  ValueStepper,
  toAbsMs,
} from '@/components/TimePickers';
import type { PlannedEntry, StopwatchType } from '@/types/models';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EditMode = 'start' | 'peak' | 'comedown';

interface Props {
  visible: boolean;
  entry: PlannedEntry | null;
  type: StopwatchType | null;
  /** Current wall-clock time in ms */
  currentTime: number;
  isDark: boolean;
  onSave: (entryId: string, newTargetTime: number) => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function EditPlanEntryModal({
  visible,
  entry,
  type,
  currentTime,
  isDark,
  onSave,
  onClose,
}: Props) {
  const [mode, setMode] = useState<EditMode>('start');
  const clockRef = useRef<ClockPickerHandle>(null);
  const [hour,     setHour]     = useState(0);
  const [minute,   setMinute]   = useState(0);
  const [dayOffset, setDayOffset] = useState(0); // days from today
  const [cdHour,   setCdHour]   = useState(0);
  const [cdMinute, setCdMinute] = useState(0);
  const [cdValue,  setCdValue]  = useState(0);

  // Seed state whenever the modal opens
  useEffect(() => {
    if (!visible || !entry || !type) return;
    setMode('start');
    const startMs = entry.targetTime;
    const sd = new Date(startMs);
    setHour(sd.getHours());
    setMinute(sd.getMinutes());
    // Compute day offset (how many days from today)
    const todayStart = new Date(currentTime);
    todayStart.setHours(0, 0, 0, 0);
    const entryDay = new Date(startMs);
    entryDay.setHours(0, 0, 0, 0);
    setDayOffset(Math.round((entryDay.getTime() - todayStart.getTime()) / 86_400_000));
    const peakEndMs = startMs + type.onsetDuration + type.comeupDuration + type.peakDuration;
    const cdDefault = new Date(peakEndMs + 30 * 60_000);
    setCdHour(cdDefault.getHours());
    setCdMinute(cdDefault.getMinutes());
    setCdValue(type.peakValue * 0.25);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!entry || !type) return null;

  // ── Theme ─────────────────────────────────────────────────────────────────
  const bgColor   = isDark ? '#111' : '#fff';
  const textColor = isDark ? '#ECEDEE' : '#11181C';
  const subColor  = isDark ? '#9BA1A6' : '#687076';
  const handleBg  = isDark ? '#444' : '#DDD';
  const dividerBg = isDark ? '#222' : '#F0F0F0';

  // ── Compute startMs from current mode + picker state ─────────────────────
  function absMs(h: number, m: number, dOff: number): number {
    const d = new Date(currentTime);
    d.setDate(d.getDate() + dOff);
    d.setHours(h, m, 0, 0);
    return d.getTime();
  }

  const targetMs   = absMs(hour, minute, dayOffset);
  const cdTargetMs = absMs(cdHour, cdMinute, dayOffset);

  let startMs: number;
  switch (mode) {
    case 'start':
      startMs = targetMs;
      break;
    case 'peak':
      startMs = solveStartForPeakAt(type, targetMs);
      break;
    case 'comedown':
      startMs = solveStartForOffsetValue(type, cdValue, cdTargetMs) ?? cdTargetMs;
      break;
  }

  const diffMs = startMs - currentTime;
  const offsetLabel = `${formatOffset(diffMs)} from now`;

  const MODES: { key: EditMode; label: string }[] = [
    { key: 'start',    label: 'Start at'  },
    { key: 'peak',     label: 'Peak at'   },
    { key: 'comedown', label: 'Comedown'  },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.sheet, { backgroundColor: bgColor }]}>
        <View style={[styles.handle, { backgroundColor: handleBg }]} />

        {/* Entry header */}
        <View style={styles.entryHeader}>
          <View style={[styles.dot, { backgroundColor: type.color }]} />
          <Text style={[styles.entryName, { color: textColor }]}>{type.name}</Text>
        </View>

        {/* Mode segmented control */}
        <View style={[styles.segmented, { backgroundColor: isDark ? '#1E2022' : '#E5E5EA' }]}>
          {MODES.map(m => (
            <TouchableOpacity
              key={m.key}
              style={[styles.segment, mode === m.key && { backgroundColor: type.color }]}
              onPress={() => setMode(m.key)}
            >
              <Text style={[styles.segmentText, { color: mode === m.key ? '#fff' : subColor }]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ValueStepper only shown in comedown mode */}
          {mode === 'comedown' && (
            <ValueStepper value={cdValue} max={type.peakValue} isDark={isDark} onChange={setCdValue} />
          )}

          {/* Single always-mounted ClockPicker — avoids 1680-node remount on mode switch */}
          <ClockPicker
            ref={clockRef}
            hour={mode === 'comedown' ? cdHour : hour}
            minute={mode === 'comedown' ? cdMinute : minute}
            isDark={isDark}
            label={mode === 'start' ? 'Starts at' : mode === 'peak' ? 'Peak begins at' : 'At this clock time'}
            onHour={mode === 'comedown' ? setCdHour : setHour}
            onMinute={mode === 'comedown' ? setCdMinute : setMinute}
            dayOffset={dayOffset}
            onDayOffset={setDayOffset}
          />

          {mode === 'peak' && (
            <Text style={[styles.modeNote, { color: subColor }]}>
              Onset + comeup = {Math.round((type.onsetDuration + type.comeupDuration) / 60_000)}m before peak
            </Text>
          )}

          {/* Timeline preview */}
          <View style={[styles.timelineSection, { borderTopColor: dividerBg }]}>
            <Text style={[styles.sectionLabel, { color: subColor }]}>Timeline</Text>
            <TimelineSummary type={type} startMs={startMs} isDark={isDark} />
            <Text style={[styles.offsetLabel, { color: subColor }]}>{offsetLabel}</Text>
          </View>
        </ScrollView>

        {/* Save */}
        <View style={[styles.footer, { borderTopColor: dividerBg }]}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={[styles.cancelText, { color: subColor }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: type.color }]}
            onPress={() => {
              const effH = clockRef.current?.getHour() ?? (mode === 'comedown' ? cdHour : hour);
              const effM = clockRef.current?.getMinute() ?? (mode === 'comedown' ? cdMinute : minute);
              const effTarget = absMs(effH, effM, dayOffset);
              let effStartMs: number;
              switch (mode) {
                case 'start': effStartMs = effTarget; break;
                case 'peak': effStartMs = solveStartForPeakAt(type, effTarget); break;
                case 'comedown': effStartMs = solveStartForOffsetValue(type, cdValue, effTarget) ?? effTarget; break;
              }
              onSave(entry.id, effStartMs);
              onClose();
            }}
          >
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, maxHeight: '90%' },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  entryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, marginBottom: 14 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  entryName: { fontSize: 17, fontWeight: '600' },
  segmented: { flexDirection: 'row', borderRadius: 12, padding: 3, marginHorizontal: 16, marginBottom: 4 },
  segment: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  segmentText: { fontSize: 13, fontWeight: '600' },
  scroll: { flexShrink: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 16 },
  modeNote: { fontSize: 12, textAlign: 'center', opacity: 0.7 },
  offsetLabel: { fontSize: 12, textAlign: 'center', marginTop: 6, opacity: 0.8 },
  timelineSection: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14, gap: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 36, gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: 'rgba(128,128,128,0.1)' },
  cancelText: { fontSize: 15, fontWeight: '600' },
  saveBtn: { flex: 2, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
