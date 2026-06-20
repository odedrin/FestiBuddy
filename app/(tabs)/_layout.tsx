import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: isDark ? '#1c1c1e' : '#f2f2f7',
          borderTopColor: isDark ? '#2c2c2e' : '#d1d1d6',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Stopwatches',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="stopwatch.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Graph',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="waveform.path.ecg" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="types"
        options={{
          title: 'Types',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="slider.horizontal.3" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="gearshape.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
