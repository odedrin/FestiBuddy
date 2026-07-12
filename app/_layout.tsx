import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { StopwatchProvider } from '@/store/StopwatchContext';
import { ColorSchemeProvider } from '@/store/ColorSchemeContext';
import { DisclosureModal } from '@/components/DisclosureModal';
import { TourOverlay } from '@/components/TourOverlay';
import { TourProvider, hasTourCompleted, useTour } from '@/store/TourContext';

const DISCLOSURE_KEY = 'disclosure:dismissed';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <ColorSchemeProvider>
      <TourProvider>
        <RootLayoutInner />
      </TourProvider>
    </ColorSchemeProvider>
  );
}

function RootLayoutInner() {
  const colorScheme = useColorScheme();
  const [disclosureVisible, setDisclosureVisible] = useState(false);
  const tour = useTour();

  // Show disclosure on first launch (when key is absent from AsyncStorage)
  useEffect(() => {
    AsyncStorage.getItem(DISCLOSURE_KEY).then(val => {
      if (val === null) setDisclosureVisible(true);
    });
  }, []);

  function dismissDisclosure(suppress: boolean) {
    setDisclosureVisible(false);
    if (suppress) AsyncStorage.setItem(DISCLOSURE_KEY, 'true');

    // This instance of DisclosureModal only ever shows on first launch, so
    // dismissing it is the natural moment to kick off the guided tour —
    // once, and only if it hasn't already been completed or skipped before.
    hasTourCompleted().then(done => {
      if (!done) setTimeout(() => tour.start(), 400);
    });
  }

  return (
    <StopwatchProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>

      <DisclosureModal
        visible={disclosureVisible}
        isFirstLaunch
        onDismiss={dismissDisclosure}
      />

      <TourOverlay />
    </StopwatchProvider>
  );
}
