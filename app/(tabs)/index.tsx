import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStopwatch } from '@/store/StopwatchContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { StopwatchCard } from '@/components/StopwatchCard';
import { AddStopwatchModal } from '@/components/AddStopwatchModal';
import { EditStopwatchStartModal } from '@/components/EditStopwatchStartModal';
import { formatElapsed } from '@/engine/curveEngine';
import type { ActiveStopwatch } from '@/types/models';

const TICK_MS = 250; // update every 250 ms for smooth elapsed-time display

export default function StopwatchesScreen() {
  const {
    state,
    stopStopwatch,
    pauseStopwatch,
    resumeStopwatch,
    updateStopwatchStartTime,
  } = useStopwatch();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  const [now, setNow] = useState(Date.now);
  const [addVisible, setAddVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Tick timer
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Time elapsed since the earliest running stopwatch started
  const earliestStart = state.activeStopwatches.length > 0
    ? Math.min(...state.activeStopwatches.map(sw => sw.startTime))
    : null;
  const elapsedSinceFirst = earliestStart !== null ? now - earliestStart : null;

  const accent = Colors[colorScheme].tint;
  const bgColor = isDark ? '#000' : '#F2F2F7';
  const textColor = isDark ? '#ECEDEE' : '#11181C';
  const subColor = isDark ? '#9BA1A6' : '#687076';

  const editingStopwatch = editingId
    ? state.activeStopwatches.find(sw => sw.id === editingId) ?? null
    : null;
  const editingType = editingStopwatch
    ? state.types.find(t => t.id === editingStopwatch.typeId) ?? null
    : null;

  const renderItem = useCallback(
    ({ item }: { item: ActiveStopwatch }) => {
      const type = state.types.find(t => t.id === item.typeId);
      if (!type) return null;
      return (
        <StopwatchCard
          stopwatch={item}
          type={type}
          currentTime={now}
          onStop={stopStopwatch}
          onPause={pauseStopwatch}
          onResume={resumeStopwatch}
          onEditStart={setEditingId}
          isDark={isDark}
        />
      );
    },
    [state.types, now, stopStopwatch, pauseStopwatch, resumeStopwatch, isDark],
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: bgColor }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.screenTitle, { color: subColor }]}>STOPWATCHES</Text>

        {/* Time since earliest start */}
        <View style={styles.sumBlock}>
          <Text style={[styles.sumValue, { color: textColor }]}>
            {elapsedSinceFirst !== null ? formatElapsed(elapsedSinceFirst) : '--:--'}
          </Text>
          <Text style={[styles.sumLabel, { color: subColor }]}>elapsed</Text>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={state.activeStopwatches}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          state.activeStopwatches.length === 0 && styles.listEmpty,
        ]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>⏱</Text>
            <Text style={[styles.emptyTitle, { color: textColor }]}>No active stopwatches</Text>
            <Text style={[styles.emptySubtitle, { color: subColor }]}>Tap + below to start one</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: accent }]}
        onPress={() => setAddVisible(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      <AddStopwatchModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        isDark={isDark}
      />

      <EditStopwatchStartModal
        visible={!!editingId}
        stopwatch={editingStopwatch}
        type={editingType}
        currentTime={now}
        isDark={isDark}
        onSave={(id, newStartTime) => updateStopwatchStartTime(id, newStartTime)}
        onClose={() => setEditingId(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  sumBlock: { alignItems: 'center' },
  sumValue: {
    fontSize: 64,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
    lineHeight: 70,
  },
  sumLabel: { fontSize: 13, marginTop: 2 },
  list: { paddingTop: 8, paddingBottom: 100 },
  listEmpty: { flex: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '500', marginBottom: 6 },
  emptySubtitle: { fontSize: 14 },
  fab: {
    position: 'absolute',
    bottom: 32,
    alignSelf: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  fabIcon: { color: '#fff', fontSize: 28, lineHeight: 32, fontWeight: '300' },
});
