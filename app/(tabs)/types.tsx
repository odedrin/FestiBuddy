import React, { useState } from 'react';
import { Alert, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useStopwatch } from '@/store/StopwatchContext';
import { TypeCard } from '@/components/TypeCard';
import { TypeEditorModal } from '@/components/TypeEditorModal';
import type { StopwatchType } from '@/types/models';

export default function TypesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const {
    state,
    addType,
    updateType,
    deleteType,
    startStopwatch,
    toggleFavorite,
  } = useStopwatch();

  const [editorVisible, setEditorVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<StopwatchType | null>(null);

  const bgColor  = isDark ? '#000' : '#F2F2F7';
  const subColor = isDark ? '#9BA1A6' : '#687076';

  function openEditor(type: StopwatchType) {
    setEditTarget(type);
    setEditorVisible(true);
  }

  function handleSave(type: Omit<StopwatchType, 'id'> | StopwatchType) {
    if ('id' in type) {
      updateType(type as StopwatchType);
    } else {
      addType(type);
    }
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

  // Custom types first, then built-in
  const customTypes  = state.types.filter(t => !t.isBuiltIn);
  const builtInTypes = state.types.filter(t =>  t.isBuiltIn);

  const sections = [
    ...(customTypes.length  > 0 ? [{ title: 'Custom',   data: customTypes  }] : []),
    ...(builtInTypes.length > 0 ? [{ title: 'Built-in', data: builtInTypes }] : []),
  ];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: bgColor }]}>
      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: subColor }]}>TYPES</Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={[styles.sectionLabel, { color: subColor }]}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <TypeCard
            type={item}
            isDark={isDark}
            isFavorite={(state.favoriteTypeIds ?? []).includes(item.id)}
            onStart={startStopwatch}
            onEdit={openEditor}
            onDelete={handleDelete}
            onToggleFavorite={toggleFavorite}
          />
        )}
      />

      <TypeEditorModal
        visible={editorVisible}
        initial={editTarget}
        onSave={handleSave}
        onClose={() => setEditorVisible(false)}
        isDark={isDark}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
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
});
