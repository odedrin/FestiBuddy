import React, { useCallback, useEffect, useMemo } from 'react';
import {
  Linking,
  Modal,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

function psychonautWikiUrl(name: string): string {
  const slug = name.replace(/\s*\(.*?\)\s*/g, '').trim();
  return `https://psychonautwiki.org/wiki/${encodeURIComponent(slug)}`;
}
import { useStopwatch } from '@/store/StopwatchContext';
import { InteractionWarningModal } from '@/components/InteractionWarningModal';
import { useInteractionGuard } from '@/hooks/use-interaction-guard';
import {
  getInteraction,
  INTERACTION_COLOR,
  INTERACTION_SEVERITY,
  type Interaction,
  type InteractionStatus,
} from '@/constants/interactions';
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
  warningStatus,
  isFavorite,
  onToggleFavorite,
}: {
  item: StopwatchType;
  isDark: boolean;
  onStart: (type: StopwatchType) => void;
  warningStatus?: InteractionStatus;
  isFavorite: boolean;
  onToggleFavorite: (typeId: string) => void;
}) {
  const textColor    = isDark ? '#ECEDEE' : '#11181C';
  const subColor     = isDark ? '#9BA1A6' : '#687076';
  const rowBg        = isDark ? '#1E2022' : '#F5F5F7';
  const border       = isDark ? '#2A2D2F' : '#E5E5EA';
  const warningColor = warningStatus ? INTERACTION_COLOR[warningStatus] : undefined;

  return (
    <View style={[styles.row, { backgroundColor: rowBg, borderColor: border }]}>
      <View style={[styles.dot, { backgroundColor: item.color }]} />
      <View style={styles.rowInfo}>
        <Text style={[styles.rowName, { color: textColor }]}>{item.name}</Text>
        <Text style={[styles.rowMeta, { color: subColor }]}>
          {formatDuration(totalDuration(item))}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => onToggleFavorite(item.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.starBtn}
      >
        <Text style={[styles.star, { color: isFavorite ? '#FFD700' : subColor }]}>
          {isFavorite ? '★' : '☆'}
        </Text>
      </TouchableOpacity>
      {warningColor && (
        <View style={[styles.warningBadge, { backgroundColor: warningColor + '22', borderColor: warningColor }]}>
          <Text style={[styles.warningText, { color: warningColor }]}>
            {warningStatus === 'Low Risk & Synergy' ? '↑' :
             warningStatus === 'Low Risk & Decrease' ? '↓' :
             warningStatus === 'Low Risk & No Synergy' ? '▲' : '⚠'}
          </Text>
        </View>
      )}
      <TouchableOpacity
        style={[styles.startBtn, { backgroundColor: item.color }]}
        onPress={() => onStart(item)}
      >
        <Text style={styles.startText}>▶ Start</Text>
      </TouchableOpacity>

      {item.isSubstance && (
        <TouchableOpacity
          onPress={() => Linking.openURL(psychonautWikiUrl(item.name))}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={[styles.wikiLink, { color: subColor }]}>↗</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function AddStopwatchModal({ visible, onClose, isDark }: Props) {
  const { state, toggleFavorite } = useStopwatch();
  const { handleStart, pendingType, warningPairs, onConfirm, onCancel } =
    useInteractionGuard();

  // Precompute worst interaction for each type vs currently active stopwatches
  const warningMap = useMemo(() => {
    const activeTypeIds = state.activeStopwatches.map(sw => sw.typeId);
    const map = new Map<string, InteractionStatus>();
    for (const type of state.types) {
      let worst: Interaction | undefined;
      for (const activeId of activeTypeIds) {
        const inter = getInteraction(type.id, activeId);
        if (!inter) continue;
        if (!worst || INTERACTION_SEVERITY[inter.status] < INTERACTION_SEVERITY[worst.status]) {
          worst = inter;
        }
      }
      if (worst) map.set(type.id, worst.status);
    }
    return map;
  }, [state.activeStopwatches, state.types]);

  // Clear pending warning whenever the sheet is closed externally
  useEffect(() => {
    if (!visible) onCancel();
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start a type: close the sheet only if no interaction warning was triggered.
  // If a warning was triggered, the sheet stays open and the warning modal appears on top.
  const handleTypeStart = useCallback((type: StopwatchType) => {
    const warned = handleStart(type.id);
    if (!warned) onClose();
  }, [handleStart, onClose]);

  // Confirm from warning modal: start the timer, then close the sheet.
  const handleConfirm = useCallback(() => {
    onConfirm();
    onClose();
  }, [onConfirm, onClose]);

  const bgColor     = isDark ? '#111' : '#fff';
  const textColor   = isDark ? '#ECEDEE' : '#11181C';
  const subColor    = isDark ? '#9BA1A6' : '#687076';
  const handleColor = isDark ? '#444' : '#DDD';

  const favIds = new Set(state.favoriteTypeIds ?? []);

  const favorites        = state.types.filter(t =>  favIds.has(t.id));
  const nonFavNonSubst   = state.types.filter(t => !favIds.has(t.id) && !t.isSubstance);
  const nonFavSubstances = state.types.filter(t => !favIds.has(t.id) &&  t.isSubstance);

  const sections = [
    ...(favorites.length > 0
      ? [{ title: 'Favorites', data: favorites }]
      : []),
    ...(nonFavNonSubst.length > 0
      ? [{ title: favorites.length > 0 ? 'All Types' : '', data: nonFavNonSubst }]
      : []),
    ...(nonFavSubstances.length > 0
      ? [{ title: 'Substances', data: nonFavSubstances }]
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
            <TypeRow
              item={item}
              isDark={isDark}
              onStart={handleTypeStart}
              warningStatus={state.showInteractionBadges ? warningMap.get(item.id) : undefined}
              isFavorite={favIds.has(item.id)}
              onToggleFavorite={toggleFavorite}
            />
          )}
        />
      </View>

      {/* Interaction warning — rendered as absoluteFill overlay inside this Modal
          to avoid iOS's limitation of only one presented native Modal at a time. */}
      <InteractionWarningModal
        modal={false}
        visible={pendingType !== null}
        isDark={isDark}
        newSubstanceName={pendingType?.name ?? ''}
        pairs={warningPairs}
        confirmLabel="Start anyway"
        onConfirm={handleConfirm}
        onCancel={onCancel}
      />
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
  starBtn: {
    padding: 2,
  },
  star: {
    fontSize: 18,
  },
  warningBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningText: {
    fontSize: 12,
    fontWeight: '700',
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
  wikiLink: {
    fontSize: 16,
    fontWeight: '600',
  },
});
