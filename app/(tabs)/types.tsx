import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useStopwatch } from '@/store/StopwatchContext';
import { TypeCard } from '@/components/TypeCard';
import { TypeEditorModal } from '@/components/TypeEditorModal';
import { InteractionWarningModal } from '@/components/InteractionWarningModal';
import { useInteractionGuard } from '@/hooks/use-interaction-guard';
import {
  getInteraction,
  INTERACTION_SEVERITY,
  type Interaction,
  type InteractionStatus,
} from '@/constants/interactions';
import type { StopwatchType } from '@/types/models';

export default function TypesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const {
    state,
    addType,
    updateType,
    deleteType,
    toggleFavorite,
    hideType,
    unhideType,
  } = useStopwatch();

  const { handleStart, pendingType, warningPairs, onConfirm, onCancel } =
    useInteractionGuard();

  const [editorVisible, setEditorVisible] = useState(false);
  const [editTarget, setEditTarget]       = useState<StopwatchType | null>(null);
  const [hiddenExpanded, setHiddenExpanded] = useState(false);

  const bgColor   = isDark ? '#000' : '#F2F2F7';
  const subColor  = isDark ? '#9BA1A6' : '#687076';
  const cardBg    = isDark ? '#1E2022' : '#F5F5F7';
  const borderColor = isDark ? '#2A2D2F' : '#E5E5EA';

  function openEditor(type: StopwatchType) {
    setEditTarget(type);
    setEditorVisible(true);
  }

  function handleSave(type: Omit<StopwatchType, 'id'> | StopwatchType) {
    if ('id' in type) updateType(type as StopwatchType);
    else addType(type);
    setEditorVisible(false);
  }

  function handleDelete(type: StopwatchType) {
    Alert.alert(
      `Delete "${type.name}"?`,
      'This will also stop any running stopwatches of this type.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteType(type.id) },
      ],
    );
  }

  // Worst interaction per type vs currently active stopwatches
  const warningMap = useMemo(() => {
    const map = new Map<string, InteractionStatus>();
    if (!state.showInteractionBadges) return map;
    const activeTypeIds = state.activeStopwatches.map(sw => sw.typeId);
    for (const type of state.types) {
      let worst: Interaction | undefined;
      for (const activeId of activeTypeIds) {
        if (activeId === type.id) continue;
        const inter = getInteraction(type.id, activeId);
        if (!inter) continue;
        if (!worst || INTERACTION_SEVERITY[inter.status] < INTERACTION_SEVERITY[worst.status]) {
          worst = inter;
        }
      }
      if (worst) map.set(type.id, worst.status);
    }
    return map;
  }, [state.activeStopwatches, state.types, state.showInteractionBadges]);

  // Visible types, split by section (excludes hidden)
  const customTypes    = state.types.filter(t => !t.isBuiltIn && !t.isSubstance && !t.hidden);
  const builtInTypes   = state.types.filter(t =>  t.isBuiltIn && !t.isSubstance && !t.hidden);
  const substanceTypes = state.types.filter(t =>  t.isSubstance                 && !t.hidden);
  const hiddenTypes    = state.types.filter(t =>  t.hidden);

  function renderCard(item: StopwatchType) {
    return (
      <TypeCard
        key={item.id}
        type={item}
        isDark={isDark}
        isFavorite={(state.favoriteTypeIds ?? []).includes(item.id)}
        activeCount={state.activeStopwatches.filter(sw => sw.typeId === item.id).length}
        onStart={handleStart}
        onEdit={openEditor}
        onDelete={handleDelete}
        onToggleFavorite={toggleFavorite}
        onHide={hideType}
        warningStatus={warningMap.get(item.id)}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: bgColor }]}>
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: subColor }]}>TYPES</Text>
        </View>

        {customTypes.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: subColor }]}>Custom</Text>
            {customTypes.map(renderCard)}
          </>
        )}

        {builtInTypes.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: subColor }]}>Built-in</Text>
            {builtInTypes.map(renderCard)}
          </>
        )}

        {substanceTypes.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: subColor }]}>Substances</Text>
            {substanceTypes.map(renderCard)}
          </>
        )}

        {/* Collapsible Hidden section */}
        {hiddenTypes.length > 0 && (
          <View style={styles.hiddenSection}>
            <TouchableOpacity
              style={[styles.hiddenHeader, { backgroundColor: cardBg, borderColor }]}
              onPress={() => setHiddenExpanded(e => !e)}
              activeOpacity={0.7}
            >
              <Text style={[styles.hiddenHeaderText, { color: subColor }]}>
                Hidden ({hiddenTypes.length})
              </Text>
              <Text style={[styles.hiddenChevron, { color: subColor }]}>
                {hiddenExpanded ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>

            {hiddenExpanded && hiddenTypes.map(item => (
              <TypeCard
                key={item.id}
                type={item}
                isDark={isDark}
                isFavorite={(state.favoriteTypeIds ?? []).includes(item.id)}
                activeCount={state.activeStopwatches.filter(sw => sw.typeId === item.id).length}
                onStart={handleStart}
                onEdit={openEditor}
                onDelete={handleDelete}
                onToggleFavorite={toggleFavorite}
                onHide={() => unhideType(item.id)}
                hideLabel="Unhide"
                warningStatus={warningMap.get(item.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <TypeEditorModal
        visible={editorVisible}
        initial={editTarget}
        onSave={handleSave}
        onClose={() => setEditorVisible(false)}
        isDark={isDark}
      />

      <InteractionWarningModal
        visible={pendingType !== null}
        isDark={isDark}
        newSubstanceName={pendingType?.name ?? ''}
        pairs={warningPairs}
        confirmLabel="Start anyway"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
    opacity: 0.6,
  },
  list: {
    paddingBottom: 40,
  },
  hiddenSection: {
    marginTop: 20,
    marginHorizontal: 16,
  },
  hiddenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  hiddenHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  hiddenChevron: {
    fontSize: 11,
    opacity: 0.6,
  },
});
