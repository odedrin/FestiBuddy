/**
 * InteractionWarnings
 *
 * Shown on the stopwatches screen when multiple substance stopwatches are
 * active and known interactions exist between them.
 *
 * Only substance types (isSubstance = true) are checked — generic built-in
 * and custom types are ignored because we have no interaction data for them.
 *
 * Interactions are sorted by severity (Dangerous first).
 * All severities are shown; Dangerous/Unsafe/Caution are visually prominent,
 * Low Risk variants are shown in a subtler style.
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  getActiveInteractions,
  INTERACTION_COLOR,
  INTERACTION_SEVERITY,
  type Interaction,
  type InteractionStatus,
} from '@/constants/interactions';
import { useStopwatch } from '@/store/StopwatchContext';

interface Props {
  isDark: boolean;
}

function severityLabel(status: InteractionStatus): string {
  switch (status) {
    case 'Dangerous':          return '☠ DANGEROUS';
    case 'Unsafe':             return '⚠ UNSAFE';
    case 'Caution':            return '⚡ CAUTION';
    case 'Low Risk & Synergy': return '✦ LOW RISK · SYNERGY';
    case 'Low Risk & Decrease':return '↓ LOW RISK · DECREASE';
    default:                   return '• LOW RISK';
  }
}

function isHighSeverity(status: InteractionStatus): boolean {
  return status === 'Dangerous' || status === 'Unsafe' || status === 'Caution';
}

interface WarningRowProps {
  nameA: string;
  nameB: string;
  interaction: Interaction;
  isDark: boolean;
}

function WarningRow({ nameA, nameB, interaction, isDark }: WarningRowProps) {
  const [expanded, setExpanded] = useState(false);
  const color = INTERACTION_COLOR[interaction.status];
  const high  = isHighSeverity(interaction.status);
  const bg    = isDark ? '#1E2022' : '#fff';
  const noteBg = isDark ? '#111' : '#F8F8F8';
  const noteColor = isDark ? '#9BA1A6' : '#687076';

  return (
    <TouchableOpacity
      onPress={() => setExpanded(e => !e)}
      activeOpacity={0.75}
      style={[
        styles.row,
        { backgroundColor: bg, borderLeftColor: color, borderLeftWidth: 3 },
      ]}
    >
      <View style={styles.rowHeader}>
        <View style={styles.rowLeft}>
          <Text style={[styles.badge, { color, backgroundColor: color + '20' }]}>
            {severityLabel(interaction.status)}
          </Text>
          <Text style={[styles.pair, { color: isDark ? '#ECEDEE' : '#11181C' }]}>
            {nameA} + {nameB}
          </Text>
        </View>
        <Text style={[styles.chevron, { color: noteColor }]}>{expanded ? '▲' : '▼'}</Text>
      </View>

      {expanded && (
        <View style={[styles.noteBox, { backgroundColor: noteBg }]}>
          <Text style={[styles.noteText, { color: noteColor }]}>
            {interaction.note}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function InteractionWarnings({ isDark }: Props) {
  const { state } = useStopwatch();
  const [lowRiskVisible, setLowRiskVisible] = useState(false);

  if (!state.showInteractionWarnings) return null;

  // Only substance types — deduplicated so multiple running instances of the
  // same substance don't produce duplicate interaction rows.
  const substanceIds = [
    ...new Set(
      state.activeStopwatches
        .map(sw => state.types.find(t => t.id === sw.typeId))
        .filter(t => t?.isSubstance)
        .map(t => t!.id),
    ),
  ];

  if (substanceIds.length < 2) return null;

  const pairs = getActiveInteractions(substanceIds)
    .sort((a, b) =>
      INTERACTION_SEVERITY[a.interaction.status] -
      INTERACTION_SEVERITY[b.interaction.status],
    );

  if (pairs.length === 0) return null;

  const highPairs = pairs.filter(p => isHighSeverity(p.interaction.status));
  const lowPairs  = pairs.filter(p => !isHighSeverity(p.interaction.status));

  const subColor  = isDark ? '#9BA1A6' : '#687076';
  const bgColor   = isDark ? '#000' : '#F2F2F7';

  const getName = (id: string) =>
    state.types.find(t => t.id === id)?.name ?? id;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Text style={[styles.sectionLabel, { color: subColor }]}>INTERACTIONS</Text>

      {highPairs.map(({ idA, idB, interaction }) => (
        <WarningRow
          key={`${idA}+${idB}`}
          nameA={getName(idA)}
          nameB={getName(idB)}
          interaction={interaction}
          isDark={isDark}
        />
      ))}

      {lowPairs.length > 0 && (
        <>
          <TouchableOpacity
            onPress={() => setLowRiskVisible(v => !v)}
            style={styles.lowRiskToggle}
          >
            <Text style={[styles.lowRiskToggleText, { color: subColor }]}>
              {lowRiskVisible ? '▲' : '▼'} {lowPairs.length} low-risk interaction{lowPairs.length !== 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>

          {lowRiskVisible && lowPairs.map(({ idA, idB, interaction }) => (
            <WarningRow
              key={`${idA}+${idB}`}
              nameA={getName(idA)}
              nameB={getName(idB)}
              interaction={interaction}
              isDark={isDark}
            />
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  row: {
    borderRadius: 10,
    overflow: 'hidden',
    padding: 12,
    gap: 6,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowLeft: {
    flex: 1,
    gap: 3,
  },
  badge: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  pair: {
    fontSize: 14,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 11,
    marginTop: 2,
  },
  noteBox: {
    borderRadius: 6,
    padding: 8,
    marginTop: 2,
  },
  noteText: {
    fontSize: 12,
    lineHeight: 17,
  },
  lowRiskToggle: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  lowRiskToggleText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
