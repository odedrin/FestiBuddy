import React, { useState } from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useColorSchemePreference } from '@/store/ColorSchemeContext';
import type { ColorSchemePreference } from '@/store/ColorSchemeContext';
import { useStopwatch } from '@/store/StopwatchContext';
import { DisclosureModal } from '@/components/DisclosureModal';

const SCHEME_OPTIONS: { label: string; value: ColorSchemePreference }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light',  value: 'light' },
  { label: 'Dark',   value: 'dark' },
];

export default function SettingsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const { state, toggleInteractionWarnings } = useStopwatch();
  const { colorSchemePreference, setColorScheme } = useColorSchemePreference();
  const [disclosureVisible, setDisclosureVisible] = useState(false);

  const bgColor   = isDark ? '#000' : '#F2F2F7';
  const cardBg    = isDark ? '#1E2022' : '#fff';
  const textColor = isDark ? '#ECEDEE' : '#11181C';
  const subColor  = isDark ? '#9BA1A6' : '#687076';
  const sepColor  = isDark ? '#2A2D2F' : '#E5E5EA';

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: bgColor }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={[styles.screenTitle, { color: subColor }]}>SETTINGS</Text>
        </View>

        {/* Appearance */}
        <Text style={[styles.groupLabel, { color: subColor }]}>Appearance</Text>
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: textColor }]}>Color Scheme</Text>
              <Text style={[styles.rowSub, { color: subColor }]}>
                Override the system appearance or follow it automatically.
              </Text>
            </View>
          </View>
          <View style={[
            styles.segmentRow,
            { backgroundColor: isDark ? '#2c2c2e' : '#e5e5ea' },
          ]}>
            {SCHEME_OPTIONS.map(opt => {
              const active = colorSchemePreference === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.segment,
                    active && { backgroundColor: isDark ? '#48484a' : '#fff' },
                    active && styles.segmentActive,
                  ]}
                  onPress={() => setColorScheme(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.segmentText,
                    { color: active ? (isDark ? '#ECEDEE' : '#11181C') : subColor },
                    active && styles.segmentTextActive,
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Harm Reduction */}
        <Text style={[styles.groupLabel, { color: subColor }]}>Harm Reduction</Text>
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <View style={[styles.row, { borderBottomColor: sepColor }]}>
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: textColor }]}>Interaction Warnings</Text>
              <Text style={[styles.rowSub, { color: subColor }]}>
                Show known drug interaction alerts on the stopwatches screen when multiple substances are active.
              </Text>
            </View>
            <Switch
              value={state.showInteractionWarnings}
              onValueChange={toggleInteractionWarnings}
              trackColor={{ false: isDark ? '#3a3a3c' : '#E5E5EA', true: '#30D158' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* About data sources */}
        <Text style={[styles.groupLabel, { color: subColor }]}>About</Text>
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => Linking.openURL('https://psychonautwiki.org')}
            activeOpacity={0.6}
          >
            <Text style={[styles.infoLabel, { color: subColor }]}>PK data source</Text>
            <Text style={[styles.infoValue, { color: textColor }]}>PsychonautWiki ↗</Text>
          </TouchableOpacity>
          <View style={[styles.sep, { backgroundColor: sepColor }]} />
          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => Linking.openURL('https://tripsit.me')}
            activeOpacity={0.6}
          >
            <Text style={[styles.infoLabel, { color: subColor }]}>Interaction data</Text>
            <Text style={[styles.infoValue, { color: textColor }]}>TripSit combos ↗</Text>
          </TouchableOpacity>
          <View style={[styles.sep, { backgroundColor: sepColor }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: subColor }]}>Substances</Text>
            <Text style={[styles.infoValue, { color: textColor }]}>16 bundled</Text>
          </View>
          <View style={[styles.sep, { backgroundColor: sepColor }]} />
          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => setDisclosureVisible(true)}
            activeOpacity={0.6}
          >
            <Text style={[styles.infoLabel, { color: subColor }]}>Privacy & disclosure</Text>
            <Text style={[styles.infoValue, { color: textColor }]}>View ↗</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.disclaimer, { color: subColor }]}>
          FestiBud provides pharmacokinetic reference data for harm reduction purposes only.
          Duration estimates are population midpoints. Individual responses vary significantly
          with dose, bodyweight, tolerance, and co-administration. Always consult a medical
          professional if in doubt.
        </Text>

      </ScrollView>

      <DisclosureModal
        visible={disclosureVisible}
        onDismiss={() => setDisclosureVisible(false)}
        onResetLaunch={() => {
          AsyncStorage.removeItem('disclosure:dismissed');
          setDisclosureVisible(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 60 },

  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  screenTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
  },

  groupLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 6,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '500', marginBottom: 3 },
  rowSub: { fontSize: 12, lineHeight: 17 },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoLabel: { fontSize: 13 },
  infoValue: { fontSize: 13, fontWeight: '500' },
  sep: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },

  segmentRow: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
  },
  segmentTextActive: {
    fontWeight: '600',
  },

  disclaimer: {
    fontSize: 11,
    lineHeight: 17,
    marginHorizontal: 20,
    marginTop: 20,
    textAlign: 'center',
    opacity: 0.7,
  },
});
