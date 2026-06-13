import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { effectiveElapsed, useStopwatch } from '@/store/StopwatchContext';
import {
  currentPhase,
  formatDuration,
  formatElapsed,
  totalDuration,
} from '@/engine/curveEngine';
import { Graph } from '@/components/Graph';
import type { GraphRef, PlanMarker } from '@/components/Graph';

const TICK_MS = 1000;

export default function GraphScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const { state } = useStopwatch();

  const [now, setNow] = useState(Date.now);
  // Which plan IDs are currently overlaid on the graph
  const [visiblePlanIds, setVisiblePlanIds] = useState<Set<string>>(new Set());
  // Graph zoom/pan
  const graphRef = useRef<GraphRef>(null);
  const [isGraphPanned, setIsGraphPanned] = useState(false);

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
  const cardBg = isDark ? '#1E2022' : '#fff';
  const cardBorder = isDark ? '#2A2D2F' : '#E5E5EA';

  function togglePlan(planId: string) {
    setVisiblePlanIds(prev => {
      const next = new Set(prev);
      if (next.has(planId)) next.delete(planId);
      else next.add(planId);
      return next;
    });
  }

  // Build start-time markers for visible plans (no curves, just markers)
  const planMarkers: PlanMarker[] = [];
  for (const plan of state.plans) {
    if (!visiblePlanIds.has(plan.id)) continue;
    for (const entry of plan.entries) {
      const tp = state.types.find(t => t.id === entry.typeId);
      if (!tp) continue;
      planMarkers.push({
        startTime: entry.targetTime,
        label: `${plan.name} · ${tp.name}`,
        color: tp.color,
      });
    }
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: bgColor }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.screenTitle, { color: subColor }]}>GRAPH</Text>
          <Text style={[styles.sumValue, { color: textColor }]}>
            {elapsedSinceFirst !== null ? formatElapsed(elapsedSinceFirst) : '--:--'}
          </Text>
          <Text style={[styles.sumLabel, { color: subColor }]}>elapsed</Text>
        </View>

        {/* Graph */}
        <View style={[styles.graphCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Graph
            ref={graphRef}
            currentTime={now}
            height={280}
            colorScheme={colorScheme}
            planMarkers={planMarkers.length > 0 ? planMarkers : undefined}
            onIsPanned={setIsGraphPanned}
          />

          {/* Back to Now button — appears when user has panned/zoomed */}
          {isGraphPanned && (
            <TouchableOpacity
              style={[styles.backToNowBtn, { backgroundColor: isDark ? '#1E2022' : '#F0F0F0', borderColor: accent }]}
              onPress={() => graphRef.current?.resetView()}
            >
              <Text style={[styles.backToNowText, { color: accent }]}>↩ Back to Now</Text>
            </TouchableOpacity>
          )}

          {/* Legend */}
          {state.activeStopwatches.length > 0 && (
            <View style={[styles.legend, { borderTopColor: cardBorder }]}>
              {/* Sum row */}
              <View style={styles.legendRow}>
                <View style={[styles.legendLine, { backgroundColor: Colors[colorScheme].tint }]} />
                <Text style={[styles.legendLabel, { color: textColor }]}>Sum y(t)</Text>
              </View>

              {/* Per-stopwatch rows — always Time mode */}
              {state.activeStopwatches.map(sw => {
                const type = state.types.find(t => t.id === sw.typeId);
                if (!type) return null;
                const elapsed = effectiveElapsed(sw, now);
                const total = totalDuration(type);
                const phase = currentPhase(type, elapsed);

                return (
                  <View key={sw.id} style={styles.legendRow}>
                    <View style={[styles.legendLine, { backgroundColor: type.color }]} />
                    <Text style={[styles.legendLabel, { color: subColor }]}>{type.name}</Text>
                    <View style={[styles.phasePill, { borderColor: type.color }]}>
                      <Text style={[styles.phaseText, { color: type.color }]}>{phase}</Text>
                    </View>
                    <Text style={[styles.legendValue, { color: subColor }]}>
                      {formatElapsed(elapsed)} / {formatDuration(total)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Plan visibility toggles */}
        {state.plans.length > 0 && (
          <View style={styles.planToggles}>
            <Text style={[styles.planTogglesLabel, { color: subColor }]}>Overlay plans</Text>
            <View style={styles.planChips}>
              {state.plans.map(plan => {
                const isVisible = visiblePlanIds.has(plan.id);
                return (
                  <TouchableOpacity
                    key={plan.id}
                    style={[
                      styles.planChip,
                      {
                        backgroundColor: isVisible ? accent : (isDark ? '#1E2022' : '#F0F0F0'),
                        borderColor: isVisible ? accent : cardBorder,
                      },
                    ]}
                    onPress={() => togglePlan(plan.id)}
                  >
                    <Text style={[
                      styles.planChipText,
                      { color: isVisible ? '#fff' : subColor },
                    ]}>
                      {isVisible ? '☑' : '☐'} {plan.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Plan Mode button */}
        <TouchableOpacity
          style={[styles.planBtn, { borderColor: accent }]}
          onPress={() => router.push('/plan')}
        >
          <Text style={[styles.planBtnText, { color: accent }]}>Plan Mode</Text>
        </TouchableOpacity>

        {/* Empty hint */}
        {state.activeStopwatches.length === 0 && (
          <View style={styles.hint}>
            <Text style={[styles.hintText, { color: subColor }]}>
              Start stopwatches on the first tab to see the superposition here.
            </Text>
            <Text style={[styles.hintNote, { color: subColor }]}>
              The dashed portion shows the predicted future curve.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 40 },
  header: { alignItems: 'center', paddingTop: 20, paddingBottom: 20, gap: 4 },
  screenTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 1.2, marginBottom: 6 },
  sumValue: {
    fontSize: 52,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1.5,
    lineHeight: 58,
  },
  sumLabel: { fontSize: 13 },
  graphCard: {
    marginHorizontal: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    paddingTop: 12,
  },
  legend: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendLine: { width: 20, height: 3, borderRadius: 1.5 },
  legendLabel: { fontSize: 13, fontWeight: '500' },
  phasePill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  phaseText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
  legendValue: { flex: 1, fontSize: 12, fontVariant: ['tabular-nums'], fontWeight: '300', textAlign: 'right' },

  // Plan visibility toggles
  planToggles: { marginHorizontal: 12, marginTop: 12, gap: 8 },
  planTogglesLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
  },
  planChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  planChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  planChipText: { fontSize: 13, fontWeight: '500' },

  backToNowBtn: {
    alignSelf: 'center',
    marginTop: 6,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  backToNowText: { fontSize: 13, fontWeight: '600' },
  planBtn: {
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  planBtnText: { fontSize: 14, fontWeight: '600' },
  hint: { marginTop: 24, paddingHorizontal: 32, gap: 8, alignItems: 'center' },
  hintText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  hintNote: { fontSize: 12, textAlign: 'center', opacity: 0.7 },
});
