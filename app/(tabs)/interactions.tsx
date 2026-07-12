/**
 * Check a Combo — one of the four permanent tabs (Live, Plan, Combos,
 * Settings). A dedicated substance-vs-substance comparison tool: tap one
 * substance to see interaction badges on every other substance, tap a
 * second to see the full explanation in the card below.
 *
 * Deliberately NOT a searchable list and NOT folded into Settings — this is
 * the app's harm-reduction reference of record, so it always needs to be
 * one tap away regardless of what else is going on.
 *
 * IMPORTANT: badges here are shown unconditionally, ignoring
 * state.showInteractionBadges. That toggle only controls the incidental
 * badges shown in the Add Stopwatch / Substances Library lists — this
 * screen's entire purpose is checking combinations, so hiding badges here
 * would defeat the point even if the user has turned them off elsewhere.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useStopwatch } from '@/store/StopwatchContext';
import {
  getInteraction,
  INTERACTION_COLOR,
  type InteractionStatus,
} from '@/constants/interactions';
import type { StopwatchType } from '@/types/models';
import { useTourTarget } from '@/store/tourTargets';

function severityLabel(status: InteractionStatus): string {
  switch (status) {
    case 'Dangerous':           return '☠ Dangerous';
    case 'Unsafe':              return '⚠ Unsafe';
    case 'Caution':             return '⚡ Caution';
    case 'Low Risk & Synergy':  return '↑ Low Risk · Synergy';
    case 'Low Risk & Decrease': return '↓ Low Risk · Decrease';
    default:                    return '▲ Low Risk · No Synergy';
  }
}

function badgeIcon(status: InteractionStatus): string {
  return status === 'Low Risk & Synergy'    ? '↑'
       : status === 'Low Risk & Decrease'   ? '↓'
       : status === 'Low Risk & No Synergy' ? '▲'
       : '⚠';
}

/** Derive the PsychonautWiki article URL from a substance name. */
function psychonautWikiUrl(name: string): string {
  const slug = name.replace(/\s*\(.*?\)\s*/g, '').trim();
  return `https://psychonautwiki.org/wiki/${encodeURIComponent(slug)}`;
}

export default function CheckComboScreen() {
  const params = useLocalSearchParams<{ prefill?: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const { state } = useStopwatch();

  const substances = useMemo(
    () => state.types.filter(t => t.isSubstance),
    [state.types],
  );

  const activeSubstanceIds = useMemo(() => [
    ...new Set(
      state.activeStopwatches
        .map(sw => state.types.find(t => t.id === sw.typeId))
        .filter((t): t is StopwatchType => !!t?.isSubstance)
        .map(t => t.id),
    ),
  ], [state.activeStopwatches, state.types]);

  // Jumping in from the Live screen's quick-access button pre-selects
  // whatever's currently running, up to the 2-substance cap.
  const [selected, setSelected] = useState<string[]>(() =>
    params.prefill === 'active' ? activeSubstanceIds.slice(0, 2) : [],
  );

  // Onboarding tour target — see store/TourContext.tsx for the step copy.
  const headlineTourRef = useTourTarget('combos.headline');

  // The result card lives in the same scroll flow as the grid (see
  // components note above) so it can never cover an unscrolled chip, but
  // that means picking the second substance can leave the explanation
  // off-screen below the fold. Auto-scroll to reveal it the moment it
  // appears, rather than making the user scroll to read their own result.
  const scrollRef = useRef<ScrollView>(null);
  const pendingScrollRef = useRef(false);
  useEffect(() => {
    if (selected.length === 2) pendingScrollRef.current = true;
  }, [selected]);

  const bgColor    = isDark ? '#000' : '#F2F2F7';
  const cardBg     = isDark ? '#1E2022' : '#fff';
  const textColor  = isDark ? '#ECEDEE' : '#11181C';
  const subColor   = isDark ? '#9BA1A6' : '#687076';
  const borderColor = isDark ? '#2A2D2F' : '#E5E5EA';

  function toggle(id: string) {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) return prev; // full — must deselect first
      return [...prev, id];
    });
  }

  const getName = (id: string) => state.types.find(t => t.id === id)?.name ?? id;

  // Badges vs. the single selected substance — guides picking the second.
  const badgeMap = useMemo(() => {
    const map = new Map<string, InteractionStatus>();
    if (selected.length !== 1) return map;
    const [primaryId] = selected;
    for (const s of substances) {
      if (s.id === primaryId) continue;
      const interaction = getInteraction(primaryId, s.id);
      if (interaction) map.set(s.id, interaction.status);
    }
    return map;
  }, [selected, substances]);

  const pairInteraction = selected.length === 2
    ? getInteraction(selected[0], selected[1])
    : undefined;

  const hint =
    selected.length === 0 ? 'Tap a substance to begin.' :
    selected.length === 1 ? 'Tap a second substance to see how they interact.' :
    null;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: bgColor }]}>
      {/* ── Screen headline (matches Live / Plan) ── */}
      <View ref={headlineTourRef} style={styles.headline}>
        <Text style={[styles.headlineTitle, { color: textColor }]}>Check a Combo</Text>
        <Text style={[styles.headlineSubtitle, { color: subColor }]}>
          Select two substances to see how they interact
        </Text>
      </View>

      {/* ── Substance grid ── */}
      <ScrollView
        ref={scrollRef}
        onContentSizeChange={() => {
          if (pendingScrollRef.current) {
            pendingScrollRef.current = false;
            scrollRef.current?.scrollToEnd({ animated: true });
          }
        }}
        style={styles.gridScroll}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
      >
        {hint && <Text style={[styles.hint, { color: subColor }]}>{hint}</Text>}

        <View style={styles.grid}>
          {substances.map(s => {
            const isSelected = selected.includes(s.id);
            const isLocked = selected.length === 2 && !isSelected;
            const badgeStatus = badgeMap.get(s.id);

            return (
              <TouchableOpacity
                key={s.id}
                onPress={() => toggle(s.id)}
                disabled={isLocked}
                activeOpacity={0.7}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? s.color : cardBg,
                    borderColor: isSelected ? s.color : borderColor,
                    opacity: isLocked ? 0.4 : 1,
                  },
                ]}
              >
                {!isSelected && <View style={[styles.chipDot, { backgroundColor: s.color }]} />}
                <Text
                  style={[
                    styles.chipText,
                    { color: isSelected ? '#fff' : textColor },
                  ]}
                  numberOfLines={1}
                >
                  {s.name}
                </Text>
                {badgeStatus && (
                  <View style={[
                    styles.chipBadge,
                    { backgroundColor: INTERACTION_COLOR[badgeStatus], borderColor: cardBg },
                  ]}>
                    <Text style={styles.chipBadgeText}>{badgeIcon(badgeStatus)}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Explanation card — follows the grid in the same scroll flow (not
             pinned outside it) so it can never sit on top of an unscrolled
             chip and block deselecting it. Only shown once 2 are picked. ── */}
        {pairInteraction !== undefined && (
          <View style={[
            styles.explainCard,
            { backgroundColor: cardBg, borderLeftColor: INTERACTION_COLOR[pairInteraction.status] },
          ]}>
            <Text style={[
              styles.explainBadge,
              { color: INTERACTION_COLOR[pairInteraction.status], backgroundColor: INTERACTION_COLOR[pairInteraction.status] + '20' },
            ]}>
              {severityLabel(pairInteraction.status)}
            </Text>
            <View style={styles.explainNames}>
              {selected.map((id, i) => (
                <React.Fragment key={id}>
                  {i > 0 && <Text style={[styles.explainPlus, { color: subColor }]}>+</Text>}
                  <Text style={[styles.explainName, { color: textColor }]}>{getName(id)}</Text>
                  <TouchableOpacity
                    hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                    onPress={() => Linking.openURL(psychonautWikiUrl(getName(id)))}
                  >
                    <Text style={[styles.explainWiki, { color: subColor }]}>ⓘ</Text>
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </View>
            <Text style={[styles.explainNote, { color: subColor }]}>{pairInteraction.note}</Text>
          </View>
        )}

        {selected.length === 2 && pairInteraction === undefined && (
          <View style={[styles.explainCard, { backgroundColor: cardBg, borderLeftColor: borderColor }]}>
            <Text style={[styles.explainBadge, { color: subColor, backgroundColor: borderColor }]}>
              No documented interaction
            </Text>
            <View style={styles.explainNames}>
              <Text style={[styles.explainName, { color: textColor }]}>{getName(selected[0])}</Text>
              <Text style={[styles.explainPlus, { color: subColor }]}>+</Text>
              <Text style={[styles.explainName, { color: textColor }]}>{getName(selected[1])}</Text>
            </View>
            <Text style={[styles.explainNote, { color: subColor }]}>
              DoseAngel has no interaction data for this pair. This does not mean the combination is safe.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  headline: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 6,
    gap: 2,
  },
  headlineTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headlineSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },

  gridScroll: { flex: 1 },
  gridContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  hint: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 12,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 8,
    position: 'relative',
  },
  chipDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  chipText: {
    fontSize: 15,
    fontWeight: '600',
  },
  chipBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
  },

  explainCard: {
    marginTop: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 14,
    gap: 8,
  },
  explainBadge: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  explainNames: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  explainName: { fontSize: 16, fontWeight: '700' },
  explainPlus: { fontSize: 14, marginHorizontal: 2 },
  explainWiki: { fontSize: 13 },
  explainNote: { fontSize: 13, lineHeight: 19 },
});
