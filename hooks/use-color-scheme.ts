import { useColorScheme as useNativeColorScheme } from 'react-native';
import { useColorSchemePreference } from '@/store/ColorSchemeContext';

/**
 * Drop-in replacement for React Native's useColorScheme.
 * Respects the user's manual override (System / Light / Dark) set in Settings.
 * When preference is 'system', falls back to the OS color scheme.
 */
export function useColorScheme(): 'light' | 'dark' {
  const { colorSchemePreference } = useColorSchemePreference();
  const systemScheme = useNativeColorScheme() ?? 'light';

  if (colorSchemePreference === 'system') return systemScheme;
  return colorSchemePreference;
}
