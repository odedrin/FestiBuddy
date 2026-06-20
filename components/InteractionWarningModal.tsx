/**
 * InteractionWarningModal
 *
 * Shown as a blocking popup when a user is about to start a substance
 * stopwatch or add a substance to a plan and interactions with existing
 * substances are detected.
 *
 * Has a "Cancel" and a configurable confirm button ("Start anyway" / "Add anyway").
 * Each interaction row is tappable to expand/collapse the clinical note.
 */

import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  INTERACTION_COLOR,
  INTERACTION_SEVERITY,
  type Interaction,
  type InteractionStatus,
} from '@/constants/interactions';

export interface WarningPair {
  nameA: string;
  nameB: string;
  interaction: Interaction;
}

interface Props {
  visible: boolean;
  isDark: boolean;
  /** Name of the substance the user is trying to add/start */
  newSubstanceName: string;
  pairs: WarningPair[];
  /** Label for the confirm button, e.g. "Start anyway" or "Add anyway" */
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /**
   * When false, renders as an absoluteFill overlay instead of a native Modal.
   * Use this when already inside a Modal to avoid iOS's two-modal limitation.
   * Defaults to true.
   */
  modal?: boolean;
}

function severityLabel(status: InteractionStatus): string {
  switch (status) {
    case 'Dangerous':           return '☠ DANGEROUS';
    case 'Unsafe':              return '⚠ UNSAFE';
    case 'Caution':             return '⚡ CAUTION';
    case 'Low Risk & Synergy':  return '✦ LOW RISK · SYNERGY';
    case 'Low Risk & Decrease': return '↓ LOW RISK · DECREASE';
    default:                    return '• LOW RISK';
  }
}

function PairRow({ pair, isDark }: { pair: WarningPair; isDark: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const color    = INTERACTION_COLOR[pair.interaction.status];
  const noteBg   = isDark ? '#111' : '#F4F4F4';
  const noteColor = isDark ? '#9BA1A6' : '#687076';
  const textColor = isDark ? '#ECEDEE' : '#11181C';

  return (
    <TouchableOpacity
      onPress={() => setExpanded(e => !e)}
      activeOpacity={0.75}
      style={[styles.pairRow, { borderLeftColor: color, backgroundColor: isDark ? '#1A1A1A' : '#FAFAFA' }]}
    >
      <View style={styles.pairHeader}>
        <View style={styles.pairLeft}>
          <Text style={[styles.badge, { color, backgroundColor: color + '22' }]}>
            {severityLabel(pair.interaction.status)}
          </Text>
          <Text style={[styles.pairNames, { color: textColor }]}>
            {pair.nameA} + {pair.nameB}
          </Text>
        </View>
        <Text style={[styles.chevron, { color: noteColor }]}>{expanded ? '▲' : '▼'}</Text>
      </View>

      {expanded && (
        <View style={[styles.noteBox, { backgroundColor: noteBg }]}>
          <Text style={[styles.noteText, { color: noteColor }]}>
            {pair.interaction.note}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function InteractionWarningModal({
  visible,
  isDark,
  newSubstanceName,
  pairs,
  confirmLabel,
  onConfirm,
  onCancel,
  modal = true,
}: Props) {
  if (!visible) return null;

  // Sort by severity (most severe first)
  const sorted = [...pairs].sort(
    (a, b) =>
      INTERACTION_SEVERITY[a.interaction.status] -
      INTERACTION_SEVERITY[b.interaction.status],
  );

  const hasDangerous = sorted.some(
    p => p.interaction.status === 'Dangerous' || p.interaction.status === 'Unsafe',
  );

  const bgColor      = isDark ? '#1E2022' : '#fff';
  const textColor    = isDark ? '#ECEDEE' : '#11181C';
  const subColor     = isDark ? '#9BA1A6' : '#687076';
  const borderColor  = isDark ? '#333' : '#E0E0E0';
  const confirmColor = hasDangerous ? '#FF3B30' : '#FF9500';

  const dialogContent = (
    <View style={styles.overlay}>
      <View style={[styles.dialog, { backgroundColor: bgColor, borderColor }]}>

        {/* Title */}
        <Text style={styles.icon}>⚠️</Text>
        <Text style={[styles.title, { color: textColor }]}>Interaction Warning</Text>
        <Text style={[styles.subtitle, { color: subColor }]}>
          Adding <Text style={{ fontWeight: '700', color: textColor }}>{newSubstanceName}</Text> creates the following interactions:
        </Text>

        {/* Interaction list */}
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {sorted.map((pair, i) => (
            <PairRow key={i} pair={pair} isDark={isDark} />
          ))}
        </ScrollView>

        {/* Buttons */}
        <View style={[styles.btnRow, { borderTopColor: borderColor }]}>
          <TouchableOpacity style={styles.btn} onPress={onCancel}>
            <Text style={[styles.cancelText, { color: subColor }]}>Cancel</Text>
          </TouchableOpacity>
          <View style={[styles.btnDivider, { backgroundColor: borderColor }]} />
          <TouchableOpacity style={styles.btn} onPress={onConfirm}>
            <Text style={[styles.confirmText, { color: confirmColor }]}>{confirmLabel}</Text>
          </TouchableOpacity>
        </View>

      </View>
    </View>
  );

  if (!modal) {
    // Render as an absoluteFill overlay — use this when already inside a native Modal
    // to avoid iOS's limitation of only one presented Modal at a time.
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {dialogContent}
      </View>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      {dialogContent}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  icon: { fontSize: 32, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 16 },

  list: { maxHeight: 280 },
  listContent: { gap: 8, paddingBottom: 8 },

  pairRow: {
    borderLeftWidth: 3,
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  pairHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  pairLeft: { flex: 1, gap: 3 },
  badge: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  pairNames: { fontSize: 13, fontWeight: '600' },
  chevron: { fontSize: 10, marginTop: 2 },
  noteBox: { borderRadius: 6, padding: 8, marginTop: 2 },
  noteText: { fontSize: 12, lineHeight: 17 },

  btnRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 16,
    marginHorizontal: -20,
  },
  btn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnDivider: { width: StyleSheet.hairlineWidth },
  cancelText: { fontSize: 16, fontWeight: '500' },
  confirmText: { fontSize: 16, fontWeight: '700' },
});
