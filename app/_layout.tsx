import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { StopwatchProvider } from '@/store/StopwatchContext';
import { ColorSchemeProvider } from '@/store/ColorSchemeContext';
import { DisclosureModal } from '@/components/DisclosureModal';

const DISCLOSURE_KEY = 'disclosure:dismissed';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <ColorSchemeProvider>
      <RootLayoutInner />
    </ColorSchemeProvider>
  );
}

function RootLayoutInner() {
  const colorScheme = useColorScheme();
  const [disclosureVisible, setDisclosureVisible] = useState(false);

  // Show disclosure on first launch (when key is absent from AsyncStorage)
  useEffect(() => {
    AsyncStorage.getItem(DISCLOSURE_KEY).then(val => {
      if (val === null) setDisclosureVisible(true);
    });
  }, []);

  function dismissDisclosure(suppress: boolean) {
    setDisclosureVisible(false);
    if (suppress) AsyncStorage.setItem(DISCLOSURE_KEY, 'true');
  }

  return (
    <StopwatchProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="plan" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>

      <DisclosureModal
        visible={disclosureVisible}
        isFirstLaunch
        onDismiss={dismissDisclosure}
      />
    </StopwatchProvider>
  );
}
