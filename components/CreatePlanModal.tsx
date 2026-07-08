import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useStopwatch } from '@/store/StopwatchContext';
import { formatDuration, totalDuration } from '@/engine/curveEngine';
import { formatEntryTime } from '@/utils/formatEntryTime';
import { genLocalId } from '@/utils/genLocalId';
import { AddPlanEntryModal } from '@/components/AddPlanEntryModal';
import { EditPlanEntryModal } from '@/components/EditPlanEntryModal';
import { InteractionWarningModal, type WarningPair } from '@/components/InteractionWarningModal';
import { getActiveInteractions } from '@/constants/interactions';
import type { PlannedEntry, StopwatchType } from '@/types/models';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  visible: boolean;
  isDark: boolean;
  /** Suggested plan name, pre-filled but editable. Recomputed each time the modal opens. */
  defaultName: string;
  /** Current wall-clock time in ms */
  now: number;
  onCancel: () => void;
  /** Called when the user presses Done, with the plan name and every staged entry. */
  onDone: (name: string, entries: { typeId: string; targetTime: number }[]) => void;
}

// ---------------------------------------------------------------------------
// Staged entry row
// ---------------------------------------------------------------------------

function StagedEntryRow({
  entry,
  type,
  now,
  isDark,
  onEdit,
  onDelete,
}: {
  entry: PlannedEntry;
  type: StopwatchType | undefined;
  now: number;
  isDark: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const textColor = isDark ? '#ECEDEE' : '#11181C';
  const subColor  = isDark ? '#9BA1A6' : '#687076';
  const rowBg     = isDark ? '#1E2022' : '#F5F5F7';
  const border    = isDark ? '#2A2D2F' : '#E5E5EA';

  return (
    <View style={[styles.row, { backgroundColor: rowBg, borderColor: border }]}>
      <View style={[styles.dot, { backgroundColor: type?.color ?? '#888' }]} />
      <View style={styles.rowInfo}>
        <Text style={[styles.rowName, { color: textColor }]}>{type?.name ?? '?'}</Text>
        <Text style={[styles.rowMeta, { color: subColor }]}>
          {type ? formatDuration(totalDuration(type)) : ''} · {formatEntryTime(entry.targetTime, now)}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.editBtn, { borderColor: type?.color ?? subColor }]}
        onPress={onEdit}
      >
        <Text style={[styles.editBtnText, { color: type?.color ?? subColor }]}>Edit</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={onDelete}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.deleteBtnText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

export function CreatePlanModal({ visible, isDark, defaultName, now, onCancel, onDone }: Props) {
  const { state } = useStopwatch();

  const [name, setName] = useState(defaultName);
  const [entries, setEntries] = useState<PlannedEntry[]>([]);
  const [addEntryVisible, setAddEntryVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PlannedEntry | null>(null);
  const [pendingEntry, setPendingEntry] = useState<{ typeId: string; targetTime: number } | null>(null);
  const [pendingWarningPairs, setPendingWarningPairs] = useState<WarningPair[]>([]);

  // Re-seed every time the modal opens
  useEffect(() => {
    if (!visible) return;
    setName(defaultName);
    setEntries([]);
    setAddEntryVisible(false);
    setEditingEntry(null);
    setPendingEntry(null);
    setPendingWarningPairs([]);
  }, [visible, defaultName]);

  const existingSubstanceIds = useMemo(
    () => [
      ...new Set(
        entries
          .map(e => state.types.find(t => t.id === e.typeId))
          .filter((t): t is StopwatchType => !!t?.isSubstance)
          .map(t => t.id),
      ),
    ],
    [entries, state.types],
  );

  function commitEntry(typeId: string, targetTime: number) {
    setEntries(prev => [...prev, { id: genLocalId('staged'), typeId, targetTime }]);
  }

  function stageEntry(typeId: string, targetTime: number) {
    const type = state.types.find(t => t.id === typeId);
    if (type?.isSubstance && state.showInteractionWarnings) {
      const otherSubstanceIds = existingSubstanceIds.filter(id => id !== typeId);
      if (otherSubstanceIds.length > 0) {
        const rawPairs = getActiveInteractions([typeId, ...otherSubstanceIds])
          .filter(p => p.idA === typeId || p.idB === typeId)
          .filter(p => !p.interaction.status.startsWith('Low Risk'));

        if (rawPairs.length > 0) {
          const pairs: WarningPair[] = rawPairs.map(p => ({
            nameA: state.types.find(t => t.id === p.idA)?.name ?? p.idA,
            nameB: state.types.find(t => t.id === p.idB)?.name ?? p.idB,
            interaction: p.interaction,
          }));
          setPendingEntry({ typeId, targetTime });
          setPendingWarningPairs(pairs);
          return;
        }
      }
    }
    commitEntry(typeId, targetTime);
  }

  function handleEditSave(entryId: string, newTargetTime: number) {
    setEntries(prev => prev.map(e => (e.id === entryId ? { ...e, targetTime: newTargetTime } : e)));
  }

  function handleDeleteEntry(entryId: string) {
    setEntries(prev => prev.filter(e => e.id !== entryId));
  }

  function handleClose() {
    onCancel();
  }

  function handleDone() {
    onDone(
      name.trim() || defaultName,
      entries.map(({ typeId, targetTime }) => ({ typeId, targetTime })),
    );
  }

  const bgColor     = isDark ? '#111' : '#fff';
  const textColor   = isDark ? '#ECEDEE' : '#11181C';
  const subColor    = isDark ? '#9BA1A6' : '#687076';
  const handleColor = isDark ? '#444' : '#DDD';
  const divider     = isDark ? '#222' : '#F0F0F0';
  const tint        = isDark ? '#4ECDC4' : '#2BBDB4';

  const editingType = editingEntry
    ? state.types.find(t => t.id === editingEntry.typeId) ?? null
    : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.sheet, { backgroundColor: bgColor }]}>
          <View style={[styles.handle, { backgroundColor: handleColor }]} />
          <Text style={[styles.title, { color: textColor }]}>New Plan</Text>

          <TextInput
            style={[styles.nameInput, { color: textColor, borderColor: divider }]}
            value={name}
            onChangeText={setName}
            placeholder="Plan name"
            placeholderTextColor={subColor}
            returnKeyType="done"
            selectTextOnFocus
          />

          <Text style={[styles.sectionLabel, { color: subColor }]}>
            {entries.length > 0 ? `Substances (${entries.length})` : 'Substances (optional — add later if you prefer)'}
          </Text>

          <ScrollView
            style={styles.list}
            contentContainerStyle={entries.length === 0 ? styles.listContentEmpty : styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {entries.length === 0 ? (
              <Text style={[styles.emptyText, { color: subColor }]}>Nothing added yet.</Text>
            ) : (
              entries.map(e => (
                <StagedEntryRow
                  key={e.id}
                  entry={e}
                  type={state.types.find(t => t.id === e.typeId)}
                  now={now}
                  isDark={isDark}
                  onEdit={() => setEditingEntry(e)}
                  onDelete={() => handleDeleteEntry(e.id)}
                />
              ))
            )}
          </ScrollView>

          <TouchableOpacity
            style={[styles.addSubstanceBtn, { borderColor: tint }]}
            onPress={() => setAddEntryVisible(true)}
          >
            <Text style={[styles.addSubstanceText, { color: tint }]}>+ Add substance</Text>
          </TouchableOpacity>

          <View style={[styles.footer, { borderTopColor: divider }]}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={[styles.cancelText, { color: subColor }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.doneBtn, { backgroundColor: tint }]}
              onPress={handleDone}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Nested sub-flows render as absoluteFill overlays (modal=false) rather than
          native Modals, since iOS only allows one presented native Modal at a time
          and this component is already inside one. */}
      <AddPlanEntryModal
        modal={false}
        visible={addEntryVisible}
        isDark={isDark}
        now={now}
        onClose={() => setAddEntryVisible(false)}
        onAdd={stageEntry}
        existingSubstanceIds={existingSubstanceIds}
      />

      <EditPlanEntryModal
        modal={false}
        visible={!!editingEntry}
        entry={editingEntry}
        type={editingType}
        currentTime={now}
        isDark={isDark}
        onSave={handleEditSave}
        onClose={() => setEditingEntry(null)}
      />

      <InteractionWarningModal
        modal={false}
        visible={pendingEntry !== null}
        isDark={isDark}
        newSubstanceName={
          pendingEntry ? (state.types.find(t => t.id === pendingEntry.typeId)?.name ?? '') : ''
        }
        pairs={pendingWarningPairs}
        confirmLabel="Add anyway"
        onConfirm={() => {
          if (pendingEntry) commitEntry(pendingEntry.typeId, pendingEntry.targetTime);
          setPendingEntry(null);
          setPendingWarningPairs([]);
        }}
        onCancel={() => {
          setPendingEntry(null);
          setPendingWarningPairs([]);
        }}
      />
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, paddingHorizontal: 16, height: '86%' },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 17, fontWeight: '600', textAlign: 'center', marginBottom: 14 },

  nameInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 16,
    marginBottom: 16,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },

  list: { flex: 1 },
  listContent: { paddingBottom: 4 },
  listContentEmpty: { flexGrow: 1, justifyContent: 'center', paddingBottom: 4 },
  emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 16 },

  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 8, gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '600' },
  rowMeta: { fontSize: 12, marginTop: 1 },
  editBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  editBtnText: { fontSize: 12, fontWeight: '600' },
  deleteBtn: { paddingHorizontal: 6, paddingVertical: 5, borderRadius: 8 },
  deleteBtnText: { fontSize: 13, color: '#FF6B6B', fontWeight: '700' },

  addSubstanceBtn: {
    borderWidth: 1.5,
    borderRadius: 12,
    borderStyle: 'dashed',
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  addSubstanceText: { fontSize: 14, fontWeight: '600' },

  footer: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14, paddingBottom: 36, gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: 'rgba(128,128,128,0.1)' },
  cancelText: { fontSize: 15, fontWeight: '600' },
  doneBtn: { flex: 2, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
