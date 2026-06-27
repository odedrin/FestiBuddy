import React, { useEffect, useRef, useState } from 'react';
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
  ClockPicker,
  ClockPickerHandle,
  TimelineSummary,
  clampH,
  clampM,
} from '@/components/TimePickers';
import type { ActiveStopwatch, StopwatchType } from '@/types/models';

interface Props {
  visible: boolean;
  stopwatch: ActiveStopwatch | null;
  type: StopwatchType | null;
  /** Current wall-clock time in ms */
  currentTime: number;
  isDark: boolean;
  onSave: (id: string, newStartTime: number) => void;
  onClose: () => void;
}

export function EditStopwatchStartModal({
  visible, stopwatch, type, currentTime, isDark, onSave, onClose,
}: Props) {
  const [hour,      setHour]      = useState(0);
  const [minute,    setMinute]    = useState(0);
  const [dayOffset, setDayOffset] = useState(0);
  const clockRef = useRef<ClockPickerHandle>(null);

  useEffect(() => {
    if (!visible || !stopwatch) return;
    const sd  = new Date(stopwatch.startTime);
    const now = new Date(currentTime);
    // day offset relative to today
    const todayMidnight = new Date(now); todayMidnight.setHours(0, 0, 0, 0);
    const swMidnight    = new Date(sd);  swMidnight.setHours(0, 0, 0, 0);
    setDayOffset(Math.round((swMidnight.getTime() - todayMidnight.getTime()) / 86_400_000));
    setHour(sd.getHours());
    setMinute(sd.getMinutes());
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!stopwatch || !type) return null;

  const bgColor   = isDark ? '#111' : '#fff';
  const textColor = isDark ? '#ECEDEE' : '#11181C';
  const subColor  = isDark ? '#9BA1A6' : '#687076';
  const handleBg  = isDark ? '#444' : '#DDD';
  const dividerBg = isDark ? '#222' : '#F0F0F0';

  // Clamp to "now" — a running stopwatch cannot have a future start time
  const newStartTime = Math.min(
    (() => {
      const d = new Date(currentTime);
      d.setDate(d.getDate() + dayOffset);
      d.setHours(hour, minute, 0, 0);
      return d.getTime();
    })(),
    currentTime,
  );

  const diffMinutes = Math.round((currentTime - newStartTime) / 60_000);
  const startedLabel =
    diffMinutes === 0 ? 'Started just now'
    : `Started ${diffMinutes}m ago`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.sheet, { backgroundColor: bgColor }]}>
          <View style={[styles.handle, { backgroundColor: handleBg }]} />

          {/* Header */}
          <View style={styles.entryHeader}>
            <View style={[styles.dot, { backgroundColor: type.color }]} />
            <Text style={[styles.entryName, { color: textColor }]}>Edit Start — {type.name}</Text>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <ClockPicker
              ref={clockRef}
              hour={hour}
              minute={minute}
              isDark={isDark}
              label="Started at"
              onHour={h => setHour(clampH(h))}
              onMinute={m => setMinute(clampM(m))}
              dayOffset={dayOffset}
              onDayOffset={setDayOffset}
            />

            <View style={[styles.timelineSection, { borderTopColor: dividerBg }]}>
              <Text style={[styles.sectionLabel, { color: subColor }]}>Timeline</Text>
              <TimelineSummary type={type} startMs={newStartTime} isDark={isDark} />
              <Text style={[styles.offsetLabel, { color: subColor }]}>{startedLabel}</Text>
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: dividerBg }]}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={[styles.cancelText, { color: subColor }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: type.color }]}
              onPress={() => {
                const effH = clockRef.current?.getHour() ?? hour;
                const effM = clockRef.current?.getMinute() ?? minute;
                const d = new Date(currentTime);
                d.setDate(d.getDate() + dayOffset);
                d.setHours(effH, effM, 0, 0);
                const effStartTime = Math.min(d.getTime(), currentTime);
                onSave(stopwatch.id, effStartTime);
                onClose();
              }}
            >
              <Text style={styles.saveBtnText}>Update</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, maxHeight: '85%' },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  entryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, marginBottom: 14 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  entryName: { fontSize: 17, fontWeight: '600' },
  scroll: { flexShrink: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 20 },
  offsetLabel: { fontSize: 12, textAlign: 'center', marginTop: 6, opacity: 0.8 },
  timelineSection: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14, gap: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 36, gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: 'rgba(128,128,128,0.1)' },
  cancelText: { fontSize: 15, fontWeight: '600' },
  saveBtn: { flex: 2, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
