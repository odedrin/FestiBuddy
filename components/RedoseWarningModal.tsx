/**
 * RedoseWarningModal
 *
 * Shown as a blocking popup when a user is about to start a type that
 * already has an active instance which hasn't reached its peak phase yet.
 * Distinct from InteractionWarningModal: this is a timing nudge about a
 * single substance re-dosing on itself, not a drug-drug interaction.
 *
 * Has a "Cancel" and a "Redose anyway" button.
 */

import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { formatDuration } from '@/engine/curveEngine';

interface Props {
  visible: boolean;
  isDark: boolean;
  /** Name of the substance being re-dosed */
  typeName: string;
  /** Milliseconds remaining until the active dose reaches peak */
  remainingMs: number;
  onConfirm: () => void;
  onCancel: () => void;
  /**
   * When false, renders as an absoluteFill overlay instead of a native Modal.
   * Use this when already inside a Modal to avoid iOS's two-modal limitation.
   * Defaults to true.
   */
  modal?: boolean;
}

export function RedoseWarningModal({
  visible,
  isDark,
  typeName,
  remainingMs,
  onConfirm,
  onCancel,
  modal = true,
}: Props) {
  if (!visible) return null;

  const bgColor      = isDark ? '#1E2022' : '#fff';
  const textColor    = isDark ? '#ECEDEE' : '#11181C';
  const subColor     = isDark ? '#9BA1A6' : '#687076';
  const borderColor  = isDark ? '#333' : '#E0E0E0';
  const confirmColor = '#FF9500';

  const dialogContent = (
    <View style={styles.overlay}>
      <View style={[styles.dialog, { backgroundColor: bgColor, borderColor }]}>

        <Text style={styles.icon}>⏱</Text>
        <Text style={[styles.title, { color: textColor }]}>Not Peaked Yet</Text>
        <Text style={[styles.body, { color: subColor }]}>
          Your last dose of <Text style={{ fontWeight: '700', color: textColor }}>{typeName}</Text> hasn't
          peaked yet, about <Text style={{ fontWeight: '700', color: textColor }}>{formatDuration(remainingMs)}</Text> to go.
          Are you sure you want to take more?
        </Text>

        <View style={[styles.btnRow, { borderTopColor: borderColor }]}>
          <TouchableOpacity style={[styles.btn, { backgroundColor: bgColor }]} onPress={onCancel} activeOpacity={0.6}>
            <Text style={[styles.cancelText, { color: subColor }]}>Cancel</Text>
          </TouchableOpacity>
          <View style={[styles.btnDivider, { backgroundColor: borderColor }]} />
          <TouchableOpacity style={[styles.btn, { backgroundColor: bgColor }]} onPress={onConfirm} activeOpacity={0.6}>
            <Text style={[styles.confirmText, { color: confirmColor }]}>Redose anyway</Text>
          </TouchableOpacity>
        </View>

      </View>
    </View>
  );

  if (!modal) {
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
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  body: { fontSize: 15, lineHeight: 21, textAlign: 'center', marginBottom: 20 },

  btnRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
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
