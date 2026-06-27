import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useStopwatch } from '@/store/StopwatchContext';
import { Graph } from '@/components/Graph';
import { AddPlanEntryModal } from '@/components/AddPlanEntryModal';
import { EditPlanEntryModal } from '@/components/EditPlanEntryModal';
import { InteractionWarningModal, type WarningPair } from '@/components/InteractionWarningModal';
import {
  getActiveInteractions,
  INTERACTION_COLOR,
  INTERACTION_SEVERITY,
  type InteractionStatus,
} from '@/constants/interactions';
import { formatDuration, totalDuration } from '@/engine/curveEngine';
import type { GraphEntry, GraphRef, PlanMarker } from '@/components/Graph';
import type { Plan, PlannedEntry, StopwatchType } from '@/types/models';

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
      style={styles.chipScroll}
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
                { text: 'Delete', style: 'destructive', onPress: () => onDelete(plan.id) },
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
  if (daysDiff === 0)  return `Today ${timeStr}`;
  if (daysDiff === 1)  return `Tomorrow ${timeStr}`;
  if (daysDiff === -1) return `Yesterday ${timeStr}`;
  if (daysDiff > 1)    return `+${daysDiff}d ${timeStr}`;
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
// Persistent interaction warning row
// ---------------------------------------------------------------------------

function PlanWarningRow({ pair, isDark }: { pair: WarningPair; isDark: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const color     = INTERACTION_COLOR[pair.interaction.status];
  const noteBg    = isDark ? '#111' : '#F4F4F4';
  const noteColor = isDark ? '#9BA1A6' : '#687076';
  const textColor = isDark ? '#ECEDEE' : '#11181C';

  function badge(status: InteractionStatus): string {
    switch (status) {
      case 'Dangerous':           return '☠ DANGEROUS';
      case 'Unsafe':              return '⚠ UNSAFE';
      case 'Caution':             return '⚡ CAUTION';
      case 'Low Risk & Synergy':  return '✦ SYNERGY';
      case 'Low Risk & Decrease': return '↓ DECREASE';
      default:                    return '• LOW RISK';
    }
  }

  return (
    <TouchableOpacity
      onPress={() => setExpanded(e => !e)}
      activeOpacity={0.75}
      style={[styles.warnRow, { borderLeftColor: color, backgroundColor: isDark ? '#1A1A1A' : '#FAFAFA' }]}
    >
      <View style={styles.warnHeader}>
        <View style={styles.warnLeft}>
          <Text style={[styles.warnBadge, { color, backgroundColor: color + '22' }]}>
            {badge(pair.interaction.status)}
          </Text>
          <Text style={[styles.warnNames, { color: textColor }]}>
            {pair.nameA} + {pair.nameB}
          </Text>
        </View>
        <Text style={[styles.warnChevron, { color: noteColor }]}>{expanded ? '▲' : '▼'}</Text>
      </View>
      {expanded && (
        <View style={[styles.warnNote, { backgroundColor: noteBg }]}>
          <Text style={[styles.warnNoteText, { color: noteColor }]}>
            {pair.interaction.note}
          </Text>
        </View>
      )}
    </TouchableOpacity>
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
  onDelete,
}: {
  visible: boolean;
  currentName: string;
  isDark: boolean;
  onSave: (name: string) => void;
  onCancel: () => void;
  onDelete: () => void;
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
        <View style={[styles.dialogDivider, { backgroundColor: border }]} />
        <TouchableOpacity onPress={onDelete} style={styles.dialogDeleteBtn}>
          <Text style={styles.dialogDeleteText}>Delete Plan</Text>
        </TouchableOpacity>
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

  const graphRef = useRef<GraphRef>(null);
  const [isGraphPanned, setIsGraphPanned] = useState(false);
  const [isGraphDay, setIsGraphDay] = useState(false);
  const [visibleWindow, setVisibleWindow] = useState<{ start: number; end: number } | null>(null);

  const [pendingEntry, setPendingEntry] = useState<{ typeId: string; targetTime: number } | null>(null);
  const [pendingWarningPairs, setPendingWarningPairs] = useState<WarningPair[]>([]);

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const selectedPlan =
    state.plans.find(p => p.id === selectedPlanId) ?? state.plans[0];

  useEffect(() => {
    if (!state.plans.find(p => p.id === selectedPlanId)) {
      setSelectedPlanId(state.plans[0]?.id ?? '');
    }
  }, [state.plans, selectedPlanId]);

  const bgColor    = isDark ? '#000' : '#F2F2F7';
  const textColor  = isDark ? '#ECEDEE' : '#11181C';
  const subColor   = isDark ? '#9BA1A6' : '#687076';
  const tint       = isDark ? '#4ECDC4' : '#2BBDB4';
  const cardBg     = isDark ? '#1E2022' : '#fff';
  const cardBorder = isDark ? '#2A2D2F' : '#E5E5EA';

  const planOverrideEntries: GraphEntry[] = useMemo(() =>
    (selectedPlan?.entries ?? []).flatMap(e => {
      const tp = state.types.find(t => t.id === e.typeId);
      if (!tp) return [];
      return [{ type: tp, startTime: e.targetTime }];
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedPlan?.entries, state.types],
  );

  const planMarkers: PlanMarker[] = useMemo(() =>
    (selectedPlan?.entries ?? []).flatMap(e => {
      const tp = state.types.find(t => t.id === e.typeId);
      if (!tp) return [];
      return [{
        startTime: e.targetTime,
        label: `${selectedPlan?.name ?? 'Plan'} · ${tp.name}`,
        color: tp.color,
      }];
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedPlan?.entries, selectedPlan?.name, state.types],
  );

  const richEntries = (selectedPlan?.entries ?? []).map(e => {
    const tp = state.types.find(t => t.id === e.typeId);
    return {
      ...e,
      typeName: tp?.name ?? '?',
      typeColor: tp?.color ?? '#888',
      typeDuration: tp ? totalDuration(tp) : 0,
    };
  });

  const planSubstanceIds = [
    ...new Set(
      (selectedPlan?.entries ?? [])
        .map(e => state.types.find(t => t.id === e.typeId))
        .filter((t): t is StopwatchType => !!t?.isSubstance)
        .map(t => t.id),
    ),
  ];

  const planInteractionPairs: WarningPair[] = getActiveInteractions(planSubstanceIds)
    .sort((a, b) => INTERACTION_SEVERITY[a.interaction.status] - INTERACTION_SEVERITY[b.interaction.status])
    .map(p => ({
      nameA: state.types.find(t => t.id === p.idA)?.name ?? p.idA,
      nameB: state.types.find(t => t.id === p.idB)?.name ?? p.idB,
      interaction: p.interaction,
    }));

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

  function handleAddEntry(typeId: string, targetTime: number) {
    if (!selectedPlan) return;

    const type = state.types.find(t => t.id === typeId);
    if (type?.isSubstance && state.showInteractionWarnings) {
      const existingSubstanceIds = [
        ...new Set(
          selectedPlan.entries
            .map(e => state.types.find(t => t.id === e.typeId))
            .filter((t): t is StopwatchType => !!t?.isSubstance)
            .map(t => t.id)
            .filter(id => id !== typeId),
        ),
      ];

      if (existingSubstanceIds.length > 0) {
        const rawPairs = getActiveInteractions([typeId, ...existingSubstanceIds])
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

    addPlanEntry(selectedPlan.id, typeId, targetTime);
  }

  const renamingPlan = renameId
    ? state.plans.find(p => p.id === renameId)
    : null;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: bgColor }]}>

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

      {/* Graph card (fixed height) */}
      <View style={[styles.graphCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <Graph
          ref={graphRef}
          currentTime={currentTime}
          colorScheme={colorScheme}
          overrideEntries={planOverrideEntries}
          planMarkers={planMarkers.length > 0 ? planMarkers : undefined}
          height={180}
          onIsPanned={setIsGraphPanned}
          onIsDay={setIsGraphDay}
          onViewChange={(s, e) => setVisibleWindow({ start: s, end: e })}
        />

        {/* Off-screen indicators */}
        {visibleWindow && (() => {
          const offLeft = planOverrideEntries.filter(
            e => e.startTime + totalDuration(e.type) < visibleWindow.start,
          ).length;
          const offRight = planOverrideEntries.filter(
            e => e.startTime > visibleWindow.end,
          ).length;
          return (
            <>
              {offLeft > 0 && (
                <View pointerEvents="none" style={[styles.offPillAnchor, { left: 8 }]}>
                  <View style={[styles.offPill, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                    <Text style={[styles.offPillText, { color: subColor }]}>‹ {offLeft}</Text>
                  </View>
                </View>
              )}
              {offRight > 0 && (
                <View pointerEvents="none" style={[styles.offPillAnchor, { right: 8 }]}>
                  <View style={[styles.offPill, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                    <Text style={[styles.offPillText, { color: subColor }]}>{offRight} ›</Text>
                  </View>
                </View>
              )}
            </>
          );
        })()}

        {/* Navigation buttons */}
        <View style={[styles.navRow, { borderTopColor: cardBorder }]}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => graphRef.current?.panByFraction(-1)}
          >
            <Text style={[styles.navBtnText, { color: subColor }]}>{'<<'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => graphRef.current?.panByFraction(-0.5)}
          >
            <Text style={[styles.navBtnText, { color: subColor }]}>{'<'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navBtn, styles.navBtnWide, isGraphPanned && !isGraphDay && { backgroundColor: tint + '22' }]}
            onPress={() => graphRef.current?.resetView()}
          >
            <Text style={[styles.navBtnText, { color: isGraphPanned && !isGraphDay ? tint : subColor }]}>now</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navBtn, styles.navBtnWide, isGraphDay && { backgroundColor: tint + '22' }]}
            onPress={() => graphRef.current?.showDay()}
          >
            <Text style={[styles.navBtnText, { color: isGraphDay ? tint : subColor }]}>day</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => graphRef.current?.panByFraction(0.5)}
          >
            <Text style={[styles.navBtnText, { color: subColor }]}>{'>'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => graphRef.current?.panByFraction(1)}
          >
            <Text style={[styles.navBtnText, { color: subColor }]}>{'>>'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Entry card (flex: 1, internally scrollable) */}
      <View style={[styles.entryCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <Text style={[styles.entryCardTitle, { color: subColor }]}>
          {selectedPlan?.name ?? ''} entries
        </Text>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.entryScrollContent}>
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
        </ScrollView>
      </View>

      {/* Interactions card — always visible when there are interactions */}
      {state.showInteractionWarnings && planInteractionPairs.length > 0 && (
        <View style={[styles.interactionsCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Text style={[styles.entryCardTitle, { color: subColor }]}>Interactions</Text>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.interactionsScrollContent}>
            {planInteractionPairs.map((pair, i) => (
              <PlanWarningRow key={i} pair={pair} isDark={isDark} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: tint }]}
        onPress={() => setAddEntryVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <AddPlanEntryModal
        visible={addEntryVisible}
        isDark={isDark}
        now={currentTime}
        onClose={() => setAddEntryVisible(false)}
        onAdd={handleAddEntry}
        existingSubstanceIds={planSubstanceIds}
      />

      <EditPlanEntryModal
        visible={!!editingEntry}
        entry={editingEntry}
        type={editingType}
        currentTime={currentTime}
        isDark={isDark}
        onSave={handleSaveEntry}
        onClose={() => setEditingEntry(null)}
      />

      <RenameDialog
        visible={!!renameId}
        currentName={renamingPlan?.name ?? ''}
        isDark={isDark}
        onSave={name => {
          if (renameId) renamePlan(renameId, name);
          setRenameId(null);
        }}
        onCancel={() => setRenameId(null)}
        onDelete={() => {
          const id = renameId;
          setRenameId(null);
          if (id) handleDeletePlan(id);
        }}
      />

      <InteractionWarningModal
        visible={pendingEntry !== null}
        isDark={isDark}
        newSubstanceName={
          pendingEntry ? (state.types.find(t => t.id === pendingEntry.typeId)?.name ?? '') : ''
        }
        pairs={pendingWarningPairs}
        confirmLabel="Add anyway"
        onConfirm={() => {
          if (pendingEntry && selectedPlan) {
            addPlanEntry(selectedPlan.id, pendingEntry.typeId, pendingEntry.targetTime);
          }
          setPendingEntry(null);
          setPendingWarningPairs([]);
        }}
        onCancel={() => {
          setPendingEntry(null);
          setPendingWarningPairs([]);
        }}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1, gap: 8, paddingBottom: 0 },

  graphCard: {
    marginHorizontal: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },

  entryCard: {
    flex: 1,
    marginHorizontal: 12,
    marginBottom: 0,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    paddingTop: 12,
  },
  entryCardTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 10,
  },

  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
    gap: 4,
  },
  navBtn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnWide: {
    paddingHorizontal: 18,
  },
  navBtnText: {
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  entryScrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },

  interactionsCard: {
    maxHeight: 220,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    paddingTop: 12,
  },
  interactionsScrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },

  chipScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  chipBar: {
    paddingHorizontal: 12,
    gap: 6,
    paddingBottom: 0,
    paddingTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 4,
  },
  chipText: { fontSize: 12, fontWeight: '500' },
  chipEditBtn: { marginLeft: 2 },
  chipEditIcon: { fontSize: 12 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 24 },

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
  editEntryBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  editEntryText: { fontSize: 12, fontWeight: '600' },
  deleteEntryBtn: { paddingHorizontal: 6, paddingVertical: 5, borderRadius: 8 },
  deleteEntryText: { fontSize: 13, color: '#FF6B6B', fontWeight: '700' },

  warnRow: { borderLeftWidth: 3, borderRadius: 8, padding: 10, gap: 6 },
  warnHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  warnLeft: { flex: 1, gap: 3 },
  warnBadge: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  warnNames: { fontSize: 13, fontWeight: '600' },
  warnChevron: { fontSize: 10, marginTop: 2 },
  warnNote: { borderRadius: 6, padding: 8, marginTop: 2 },
  warnNoteText: { fontSize: 12, lineHeight: 17 },

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
  dialogDivider: { height: StyleSheet.hairlineWidth, marginTop: 4 },
  dialogDeleteBtn: { paddingVertical: 12, alignItems: 'center' },
  dialogDeleteText: { fontSize: 15, fontWeight: '600', color: '#FF3B30' },

  // Off-screen indicator pills
  offPillAnchor: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  offPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  offPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
