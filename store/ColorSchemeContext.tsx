import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'festibud_color_scheme';

export type ColorSchemePreference = 'system' | 'light' | 'dark';

interface ColorSchemeContextValue {
  colorSchemePreference: ColorSchemePreference;
  setColorScheme: (pref: ColorSchemePreference) => void;
}

const ColorSchemeContext = createContext<ColorSchemeContextValue>({
  colorSchemePreference: 'system',
  setColorScheme: () => {},
});

export function ColorSchemeProvider({ children }: { children: React.ReactNode }) {
  const [pref, setPref] = useState<ColorSchemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(value => {
      if (value === 'light' || value === 'dark' || value === 'system') {
        setPref(value);
      }
    });
  }, []);

  const setColorScheme = useCallback((newPref: ColorSchemePreference) => {
    setPref(newPref);
    AsyncStorage.setItem(STORAGE_KEY, newPref);
  }, []);

  return (
    <ColorSchemeContext.Provider value={{ colorSchemePreference: pref, setColorScheme }}>
      {children}
    </ColorSchemeContext.Provider>
  );
}

export function useColorSchemePreference(): ColorSchemeContextValue {
  return useContext(ColorSchemeContext);
}
