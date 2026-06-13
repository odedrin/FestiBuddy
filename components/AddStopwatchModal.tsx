import React from 'react';
import {
  Modal,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useStopwatch } from '@/store/StopwatchContext';
import type { StopwatchType } from '@/types/models';
import { formatDuration, totalDuration } from '@/engine/curveEngine';

interface Props {
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
}

function TypeRow({
  item,
  isDark,
  onStart,
}: {
  item: StopwatchType;
  isDark: boolean;
  onStart: (type: StopwatchType) => void;
}) {
  const textColor = isDark ? '#ECEDEE' : '#11181C';
  const subColor  = isDark ? '#9BA1A6' : '#687076';
  const rowBg     = isDark ? '#1E2022' : '#F5F5F7';
  const border    = isDark ? '#2A2D2F' : '#E5E5EA';

  return (
    <View style={[styles.row, { backgroundColor: rowBg, borderColor: border }]}>
      <View style={[styles.dot, { backgroundColor: item.color }]} />
      <View style={styles.rowInfo}>
        <Text style={[styles.rowName, { color: textColor }]}>{item.name}</Text>
        <Text style={[styles.rowMeta, { color: subColor }]}>
          {formatDuration(totalDuration(item))} · peak {item.peakValue}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.startBtn, { backgroundColor: item.color }]}
        onPress={() => onStart(item)}
      >
        <Text style={styles.startText}>▶ Start</Text>
      </TouchableOpacity>
    </View>
  );
}

export function AddStopwatchModal({ visible, onClose, isDark }: Props) {
  const { state, startStopwatch } = useStopwatch();

  const bgColor     = isDark ? '#111' : '#fff';
  const textColor   = isDark ? '#ECEDEE' : '#11181C';
  const subColor    = isDark ? '#9BA1A6' : '#687076';
  const handleColor = isDark ? '#444' : '#DDD';

  function handleStart(type: StopwatchType) {
    startStopwatch(type.id);
    onClose();
  }

  const favIds = state.favoriteTypeIds ?? [];
  const favorites   = state.types.filter(t => favIds.includes(t.id));
  const nonFavorites = state.types.filter(t => !favIds.includes(t.id));

  const sections = [
    ...(favorites.length > 0
      ? [{ title: 'Favorites', data: favorites }]
      : []),
    ...(nonFavorites.length > 0
      ? [{ title: favorites.length > 0 ? 'All Types' : '', data: nonFavorites }]
      : []),
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

      <View style={[styles.sheet, { backgroundColor: bgColor }]}>
        <View style={[styles.handle, { backgroundColor: handleColor }]} />
        <Text style={[styles.title, { color: textColor }]}>Start a Stopwatch</Text>

        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) =>
            section.title ? (
              <Text style={[styles.sectionHeader, { color: subColor }]}>
                {section.title}
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <TypeRow item={item} isDark={isDark} onStart={handleStart} />
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 16,
    maxHeight: '70%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 36,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowMeta: {
    fontSize: 12,
    marginTop: 1,
  },
  startBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  startText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
