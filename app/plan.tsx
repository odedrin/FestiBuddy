import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useStopwatch } from '@/store/StopwatchContext';
import { Graph } from '@/components/Graph';
import { AddPlanEntryModal } from '@/components/AddPlanEntryModal';
import { EditPlanEntryModal } from '@/components/EditPlanEntryModal';
import { formatDuration, totalDuration } from '@/engine/curveEngine';
import type { PlanMarker } from '@/components/Graph';
import type { Plan, PlannedEntry } from '@/types/models';

const TICK_MS = 2_000;

// ---------------------------------------------------------------------------
// Plan chip bar
// ---------------------------------------------------------------------------

function PlanChipBar({
  plans,
  selectedId,
  onSelect,
  onAdd,
  onRename,
  onDelete,
  isDark,
}: {
  plans: Plan[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  isDark: boolean;
}) {
  const subColor = isDark ? '#9BA1A6' : '#687076';
  const chipBg   = isDark ? '#1E2022' : '#F0F0F0';
  const selBg    = isDark ? '#2A4A4A' : '#D0F0EE';
  const tint     = isDark ? '#4ECDC4' : '#2BBDB4';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipBar}
    >
      {plans.map(plan => {
        const selected = plan.id === selectedId;
        return (
          <TouchableOpacity
            key={plan.id}
            style={[
              styles.chip,
              { backgroundColor: selected ? selBg : chipBg },
              selected && { borderColor: tint, borderWidth: 1.5 },
            ]}
            onPress={() => onSelect(plan.id)}
            onLongPress={() => {
              Alert.alert(plan.name, 'What would you like to do?', [
                { text: 'Rename', onPress: () => onRename(plan.id) },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => onDelete(plan.id),
                },
                { text: 'Cancel', style: 'cancel' },
              ]);
            }}
          >
            <Text
              style={[
                styles.chipText,
                { color: selected ? tint : subColor },
                selected && { fontWeight: '700' },
              ]}
            >
              {plan.name}
            </Text>
            {/* Show rename pencil inline for the selected plan */}
            {selected && (
              <TouchableOpacity
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                onPress={() => onRename(plan.id)}
                style={styles.chipEditBtn}
              >
                <Text style={[styles.chipEditIcon, { color: tint }]}>✏</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        );
      })}

      {/* + New plan button */}
      <TouchableOpacity
        style={[styles.chip, { backgroundColor: chipBg }]}
        onPress={onAdd}
      >
        <Text style={[styles.chipText, { color: tint, fontWeight: '700' }]}>+ New</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Entry row
// ---------------------------------------------------------------------------

function formatEntryTime(targetTime: number, now: number): string {
  const d = new Date(targetTime);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hh}:${mm}`;
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const entryDay = new Date(targetTime);
  entryDay.setHours(0, 0, 0, 0);
  const daysDiff = Math.round((entryDay.getTime() - todayStart.getTime()) / 86_400_000);
  if (daysDiff === 0) return `Today ${timeStr}`;
  if (daysDiff === 1) return `Tomorrow ${timeStr}`;
  if (daysDiff === -1) return `Yesterday ${timeStr}`;
  if (daysDiff > 1) return `+${daysDiff}d ${timeStr}`;
  return `${daysDiff}d ${timeStr}`;
}

function EntryRow({
  entry,
  now,
  isDark,
  onEdit,
  onDelete,
}: {
  entry: PlannedEntry & { typeName: string; typeColor: string; typeDuration: number };
  now: number;
  isDark: boolean;
  onEdit: (entry: PlannedEntry) => void;
  onDelete: (entryId: string) => void;
}) {
  const textColor = isDark ? '#ECEDEE' : '#11181C';
  const subColor  = isDark ? '#9BA1A6' : '#687076';
  const rowBg     = isDark ? '#1E2022' : '#F5F5F7';
  const border    = isDark ? '#2A2D2F' : '#E5E5EA';

  return (
    <View style={[styles.entryRow, { backgroundColor: rowBg, borderColor: border }]}>
      <View style={[styles.entryDot, { backgroundColor: entry.typeColor }]} />

      <View style={styles.entryInfo}>
        <Text style={[styles.entryName, { color: textColor }]}>{entry.typeName}</Text>
        <Text style={[styles.entrySub, { color: subColor }]}>
          {formatDuration(entry.typeDuration)} · {formatEntryTime(entry.targetTime, now)}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.editEntryBtn, { borderColor: entry.typeColor }]}
        onPress={() => onEdit(entry)}
      >
        <Text style={[styles.editEntryText, { color: entry.typeColor }]}>Edit</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteEntryBtn}
        onPress={() => onDelete(entry.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.deleteEntryText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Rename dialog
// ---------------------------------------------------------------------------

function RenameDialog({
  visible,
  currentName,
  isDark,
  onSave,
  onCancel,
}: {
  visible: boolean;
  currentName: string;
  isDark: boolean;
  onSave: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(currentName);

  useEffect(() => {
    if (visible) setName(currentName);
  }, [visible, currentName]);

  if (!visible) return null;

  const bgColor   = isDark ? '#1E2022' : '#fff';
  const textColor = isDark ? '#ECEDEE' : '#11181C';
  const border    = isDark ? '#333' : '#DDD';
  const tint      = isDark ? '#4ECDC4' : '#2BBDB4';

  return (
    <View style={styles.dialogOverlay}>
      <View style={[styles.dialog, { backgroundColor: bgColor, borderColor: border }]}>
        <Text style={[styles.dialogTitle, { color: textColor }]}>Rename Plan</Text>
        <TextInput
          style={[styles.dialogInput, { color: textColor, borderColor: border }]}
          value={name}
          onChangeText={setName}
          autoFocus
          selectTextOnFocus
          returnKeyType="done"
          onSubmitEditing={() => name.trim() && onSave(name.trim())}
        />
        <View style={styles.dialogBtns}>
          <TouchableOpacity onPress={onCancel} style={styles.dialogBtn}>
            <Text style={[styles.dialogBtnText, { color: textColor }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => name.trim() && onSave(name.trim())}
            style={styles.dialogBtn}
          >
            <Text style={[styles.dialogBtnText, { color: tint, fontWeight: '700' }]}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function PlanScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const {
    state,
    addPlan,
    renamePlan,
    deletePlan,
    addPlanEntry,
    removePlanEntry,
    updatePlanEntry,
  } = useStopwatch();

  const [currentTime, setCurrentTime] = useState(Date.now);
  const [selectedPlanId, setSelectedPlanId] = useState(state.plans[0]?.id ?? '');
  const [addEntryVisible, setAddEntryVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PlannedEntry | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);

  // Keep currentTime ticking
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  // If selectedPlan no longer exists (deleted), fall back to first plan
  const selectedPlan =
    state.plans.find(p => p.id === selectedPlanId) ?? state.plans[0];

  useEffect(() => {
    if (!state.plans.find(p => p.id === selectedPlanId)) {
      setSelectedPlanId(state.plans[0]?.id ?? '');
    }
  }, [state.plans, selectedPlanId]);

  const bgColor = isDark ? '#000' : '#F2F2F7';
  const textColor = isDark ? '#ECEDEE' : '#11181C';
  const subColor  = isDark ? '#9BA1A6' : '#687076';
  const tint      = isDark ? '#4ECDC4' : '#2BBDB4';

  // Compute plan markers (start-time indicators) from the selected plan
  const planMarkers: PlanMarker[] = (selectedPlan?.entries ?? []).flatMap(e => {
    const tp = state.types.find(t => t.id === e.typeId);
    if (!tp) return [];
    return [{
      startTime: e.targetTime,
      label: `${selectedPlan?.name ?? 'Plan'} · ${tp.name}`,
      color: tp.color,
    }];
  });

  // Rich entry list for rendering
  const richEntries = (selectedPlan?.entries ?? []).map(e => {
    const tp = state.types.find(t => t.id === e.typeId);
    return {
      ...e,
      typeName: tp?.name ?? '?',
      typeColor: tp?.color ?? '#888',
      typeDuration: tp ? totalDuration(tp) : 0,
    };
  });

  // The type for the entry currently being edited
  const editingType = editingEntry
    ? state.types.find(t => t.id === editingEntry.typeId) ?? null
    : null;

  function handleAddPlan() {
    addPlan(`Plan ${state.plans.length + 1}`);
  }

  function handleDeletePlan(id: string) {
    const plan = state.plans.find(p => p.id === id);
    if (state.plans.length <= 1) {
      Alert.alert('Cannot delete', 'You must keep at least one plan.');
      return;
    }
    Alert.alert(`Delete "${plan?.name}"?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePlan(id) },
    ]);
  }

  function handleSaveEntry(entryId: string, newTargetTime: number) {
    if (!selectedPlan) return;
    const entry = selectedPlan.entries.find(e => e.id === entryId);
    if (!entry) return;
    updatePlanEntry(selectedPlan.id, { ...entry, targetTime: newTargetTime });
  }

  function handleDeleteEntry(entryId: string) {
    if (!selectedPlan) return;
    removePlanEntry(selectedPlan.id, entryId);
  }

  const renamingPlan = renameId
    ? state.plans.find(p => p.id === renameId)
    : null;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: bgColor }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={[styles.backText, { color: tint }]}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Plan Mode</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Plan chip selector */}
        <PlanChipBar
          plans={state.plans}
          selectedId={selectedPlan?.id ?? ''}
          onSelect={setSelectedPlanId}
          onAdd={handleAddPlan}
          onRename={id => setRenameId(id)}
          onDelete={handleDeletePlan}
          isDark={isDark}
        />

        {/* Graph preview — markers only, no curves */}
        <View style={styles.graphContainer}>
          <Graph
            currentTime={currentTime}
            colorScheme={colorScheme}
            overrideEntries={[]}
            planMarkers={planMarkers.length > 0 ? planMarkers : undefined}
            height={240}
          />
        </View>

        {/* Entry list */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: subColor }]}>
            {selectedPlan?.name ?? ''} entries
          </Text>

          {richEntries.length === 0 ? (
            <Text style={[styles.emptyText, { color: subColor }]}>
              No entries yet — tap + to add one.
            </Text>
          ) : (
            richEntries.map(e => (
              <EntryRow
                key={e.id}
                entry={e}
                now={currentTime}
                isDark={isDark}
                onEdit={entry => setEditingEntry(entry)}
                onDelete={handleDeleteEntry}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: tint }]}
        onPress={() => setAddEntryVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add entry modal */}
      <AddPlanEntryModal
        visible={addEntryVisible}
        isDark={isDark}
        now={currentTime}
        onClose={() => setAddEntryVisible(false)}
        onAdd={(typeId, targetTime) => {
          if (selectedPlan) addPlanEntry(selectedPlan.id, typeId, targetTime);
        }}
      />

      {/* Edit entry modal */}
      <EditPlanEntryModal
        visible={!!editingEntry}
        entry={editingEntry}
        type={editingType}
        currentTime={currentTime}
        isDark={isDark}
        onSave={handleSaveEntry}
        onClose={() => setEditingEntry(null)}
      />

      {/* Rename dialog */}
      <RenameDialog
        visible={!!renameId}
        currentName={renamingPlan?.name ?? ''}
        isDark={isDark}
        onSave={name => {
          if (renameId) renamePlan(renameId, name);
          setRenameId(null);
        }}
        onCancel={() => setRenameId(null)}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 64 },
  backText: { fontSize: 17, fontWeight: '600' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  // Chip bar
  chipBar: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 6,
  },
  chipText: { fontSize: 14, fontWeight: '500' },
  chipEditBtn: { marginLeft: 2 },
  chipEditIcon: { fontSize: 12 },

  // Graph
  graphContainer: { marginTop: 12, marginBottom: 8 },

  // Section
  section: { paddingHorizontal: 16, marginTop: 8 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 24 },

  // Entry row
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 8,
    gap: 10,
  },
  entryDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  entryInfo: { flex: 1 },
  entryName: { fontSize: 14, fontWeight: '600' },
  entrySub: { fontSize: 12, marginTop: 1 },
  editEntryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  editEntryText: { fontSize: 12, fontWeight: '600' },
  deleteEntryBtn: {
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: 8,
  },
  deleteEntryText: { fontSize: 13, color: '#FF6B6B', fontWeight: '700' },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 32 },

  // Rename dialog
  dialogOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  dialog: {
    width: '80%',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 16,
  },
  dialogTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  dialogInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  dialogBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20 },
  dialogBtn: { paddingVertical: 4 },
  dialogBtnText: { fontSize: 16 },
});
