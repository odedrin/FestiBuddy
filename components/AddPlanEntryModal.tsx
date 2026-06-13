import React, { useState } from 'react';
import { formatOffset } from '@/utils/formatOffset';
import {
  Modal,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useStopwatch } from '@/store/StopwatchContext';
import {
  formatDuration,
  solveStartForOffsetValue,
  solveStartForPeakAt,
  totalDuration,
} from '@/engine/curveEngine';
import {
  ClockPicker,
  TimelineSummary,
  ValueStepper,
  toAbsMs,
} from '@/components/TimePickers';
import type { StopwatchType } from '@/types/models';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EditMode = 'start' | 'peak' | 'comedown';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd: (typeId: string, targetTime: number) => void;
  isDark: boolean;
  /** Current wall-clock time in ms */
  now: number;
}

// ---------------------------------------------------------------------------
// Type row
// ---------------------------------------------------------------------------

function TypeRow({
  item, selected, isDark, onSelect,
}: {
  item: StopwatchType; selected: boolean; isDark: boolean; onSelect: (type: StopwatchType) => void;
}) {
  const textColor = isDark ? '#ECEDEE' : '#11181C';
  const subColor  = isDark ? '#9BA1A6' : '#687076';
  const rowBg     = selected ? (isDark ? '#1C2B2B' : '#E8F8F7') : (isDark ? '#1E2022' : '#F5F5F7');
  const border    = selected ? item.color : (isDark ? '#2A2D2F' : '#E5E5EA');

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: rowBg, borderColor: border }]}
      onPress={() => onSelect(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.dot, { backgroundColor: item.color }]} />
      <View style={styles.rowInfo}>
        <Text style={[styles.rowName, { color: textColor }]}>{item.name}</Text>
        <Text style={[styles.rowMeta, { color: subColor }]}>
          {formatDuration(totalDuration(item))} · peak {item.peakValue}
        </Text>
      </View>
      {selected && <Text style={[styles.checkmark, { color: item.color }]}>✓</Text>}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

export function AddPlanEntryModal({ visible, onClose, onAdd, isDark, now }: Props) {
  const { state } = useStopwatch();
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [mode, setMode] = useState<EditMode>('start');

  const initDate = new Date(now);
  const [hour,     setHour]     = useState(initDate.getHours());
  const [minute,   setMinute]   = useState(initDate.getMinutes());
  const [dayOffset, setDayOffset] = useState(0); // 0 = today, 1 = tomorrow, etc.
  const [cdHour,   setCdHour]   = useState(initDate.getHours());
  const [cdMinute, setCdMinute] = useState(initDate.getMinutes());
  const [cdValue,  setCdValue]  = useState(50);

  const bgColor     = isDark ? '#111' : '#fff';
  const textColor   = isDark ? '#ECEDEE' : '#11181C';
  const subColor    = isDark ? '#9BA1A6' : '#687076';
  const handleColor = isDark ? '#444' : '#DDD';
  const divider     = isDark ? '#222' : '#F0F0F0';

  const selectedType = selectedTypeId ? state.types.find(t => t.id === selectedTypeId) : null;

  // Compute absolute targetTime using dayOffset + clock picker
  function absMs(h: number, m: number, dOff: number): number {
    const d = new Date(now);
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
      startMs = selectedType ? solveStartForPeakAt(selectedType, targetMs) : targetMs;
      break;
    case 'comedown':
      startMs = selectedType
        ? (solveStartForOffsetValue(selectedType, cdValue, cdTargetMs) ?? cdTargetMs)
        : cdTargetMs;
      break;
  }

  const diffMs = startMs - now;
  const offsetLabel = `${formatOffset(diffMs)} from now`;

  function handleAdd() {
    if (!selectedTypeId) return;
    onAdd(selectedTypeId, startMs);
    setSelectedTypeId(null);
    setMode('start');
    setDayOffset(0);
    onClose();
  }

  function handleClose() {
    setSelectedTypeId(null);
    setMode('start');
    setDayOffset(0);
    onClose();
  }

  const favIds = state.favoriteTypeIds ?? [];
  const favorites    = state.types.filter(t => favIds.includes(t.id));
  const nonFavorites = state.types.filter(t => !favIds.includes(t.id));
  const sections = [
    ...(favorites.length > 0    ? [{ title: 'Favorites', data: favorites }] : []),
    ...(nonFavorites.length > 0 ? [{ title: favorites.length > 0 ? 'All Types' : '', data: nonFavorites }] : []),
  ];

  const MODES: { key: EditMode; label: string }[] = [
    { key: 'start',    label: 'Start at'  },
    { key: 'peak',     label: 'Peak at'   },
    { key: 'comedown', label: 'Comedown'  },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />

      <View style={[styles.sheet, { backgroundColor: bgColor }]}>
        <View style={[styles.handle, { backgroundColor: handleColor }]} />
        <Text style={[styles.title, { color: textColor }]}>Add to Plan</Text>

        {/* Type list */}
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          style={styles.list}
          renderSectionHeader={({ section }) =>
            section.title ? (
              <Text style={[styles.sectionHeader, { color: subColor }]}>{section.title}</Text>
            ) : null
          }
          renderItem={({ item }) => (
            <TypeRow
              item={item}
              selected={item.id === selectedTypeId}
              isDark={isDark}
              onSelect={t => {
                setSelectedTypeId(t.id);
                setCdValue(t.peakValue * 0.25);
              }}
            />
          )}
        />

        {/* Footer: mode picker + time picker + Add button */}
        <View style={[styles.footer, { borderTopColor: divider }]}>
          {/* Mode tabs */}
          <View style={[styles.segmented, { backgroundColor: isDark ? '#1E2022' : '#E5E5EA' }]}>
            {MODES.map(m => (
              <TouchableOpacity
                key={m.key}
                style={[styles.segmentTab, mode === m.key && { backgroundColor: selectedType?.color ?? (isDark ? '#4ECDC4' : '#2BBDB4') }]}
                onPress={() => setMode(m.key)}
              >
                <Text style={[styles.segmentText, { color: mode === m.key ? '#fff' : subColor }]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Day offset selector (+1d / −1d) */}
          <View style={styles.dayRow}>
            <TouchableOpacity
              style={[styles.dayBtn, { backgroundColor: isDark ? '#2A2D2F' : '#E5E5EA' }]}
              onPress={() => setDayOffset(d => d - 1)}
            >
              <Text style={[styles.dayBtnText, { color: subColor }]}>−1d</Text>
            </TouchableOpacity>
            <Text style={[styles.dayLabel, { color: textColor }]}>
              {dayOffset === 0 ? 'Today' : dayOffset === 1 ? 'Tomorrow' : `+${dayOffset}d`}
            </Text>
            <TouchableOpacity
              style={[styles.dayBtn, { backgroundColor: isDark ? '#2A2D2F' : '#E5E5EA' }]}
              onPress={() => setDayOffset(d => d + 1)}
            >
              <Text style={[styles.dayBtnText, { color: subColor }]}>+1d</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.pickerScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {mode === 'start' && (
              <ClockPicker hour={hour} minute={minute} isDark={isDark} label="Starts at" onHour={setHour} onMinute={setMinute} />
            )}

            {mode === 'peak' && (
              <>
                <ClockPicker hour={hour} minute={minute} isDark={isDark} label="Peak begins at" onHour={setHour} onMinute={setMinute} />
                {selectedType && (
                  <Text style={[styles.modeNote, { color: subColor }]}>
                    Onset + comeup = {Math.round((selectedType.onsetDuration + selectedType.comeupDuration) / 60_000)}m before peak
                  </Text>
                )}
              </>
            )}

            {mode === 'comedown' && (
              <>
                <ValueStepper value={cdValue} max={selectedType?.peakValue ?? 100} isDark={isDark} onChange={setCdValue} />
                <ClockPicker hour={cdHour} minute={cdMinute} isDark={isDark} label="At this clock time" onHour={setCdHour} onMinute={setCdMinute} />
              </>
            )}

            {/* Timeline preview (only when a type is selected) */}
            {selectedType && (
              <View style={[styles.timelineSection, { borderTopColor: divider }]}>
                <Text style={[styles.sectionLabel, { color: subColor }]}>Timeline</Text>
                <TimelineSummary type={selectedType} startMs={startMs} isDark={isDark} />
                <Text style={[styles.offsetLabel, { color: subColor }]}>{offsetLabel}</Text>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.addBtn,
              {
                backgroundColor: selectedType ? selectedType.color : (isDark ? '#333' : '#DDD'),
                opacity: selectedType ? 1 : 0.5,
              },
            ]}
            onPress={handleAdd}
            disabled={!selectedTypeId}
          >
            <Text style={styles.addBtnText}>Add Entry</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, paddingHorizontal: 16, maxHeight: '90%' },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 17, fontWeight: '600', textAlign: 'center', marginBottom: 12 },
  list: { flexShrink: 1, maxHeight: 200 },
  listContent: { paddingBottom: 8 },
  sectionHeader: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 8, marginBottom: 6, paddingHorizontal: 2 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8, gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600' },
  rowMeta: { fontSize: 12, marginTop: 1 },
  checkmark: { fontSize: 16, fontWeight: '700' },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14, paddingBottom: 36, gap: 10 },
  segmented: { flexDirection: 'row', borderRadius: 12, padding: 3 },
  segmentTab: { flex: 1, paddingVertical: 7, borderRadius: 9, alignItems: 'center' },
  segmentText: { fontSize: 12, fontWeight: '600' },
  pickerScroll: { maxHeight: 300 },
  modeNote: { fontSize: 12, textAlign: 'center', opacity: 0.7, marginTop: 4 },
  timelineSection: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 8, marginTop: 4 },
  sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },
  offsetLabel: { fontSize: 12, textAlign: 'center', opacity: 0.8 },
  addBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  dayBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  dayBtnText: { fontSize: 13, fontWeight: '600' },
  dayLabel: { fontSize: 15, fontWeight: '600', minWidth: 80, textAlign: 'center' },
});
