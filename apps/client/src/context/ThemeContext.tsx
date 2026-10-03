import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';

export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
  canvas: string;
  panel: string;
  text: string;
  muted: string;
  line: string;
  header: string;
  headerBorder: string;
  sidebar: string;
  sidebarBorder: string;
  ink: string;
  mint: string;
  sky: string;
  sun: string;
  coral: string;
  card: string;
  border: string;
  primary: string;
  danger: string;
  success: string;
  warning: string;
  purple: string;
  blueLight: string;
}

const FIXED_PALETTE = {
  ink: '#111936',
  mint: '#5BE0B3',
  sky: '#8E9BFF',
  sun: '#FFC93C',
  coral: '#FF6B57',
  primary: '#8E9BFF',
  danger: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  purple: '#8B5CF6',
  blueLight: '#93C5FD',
};

export const THEME_PALETTES: Record<ThemeMode, ThemeColors> = {
  dark: {
    canvas: '#0C1230',
    panel: '#161E45',
    text: '#F2F3FF',
    muted: '#98A0CC',
    line: '#27316A',
    header: 'rgba(22, 30, 69, 0.95)',
    headerBorder: '#27316A',
    sidebar: '#080C22',
    sidebarBorder: '#27316A',
    card: '#161E45',
    border: '#27316A',
    ...FIXED_PALETTE,
  },
  light: {
    canvas: '#EEF0FF',
    panel: '#FFFFFF',
    text: '#111936',
    muted: '#5E668C',
    line: '#DCE0F5',
    header: 'rgba(255, 255, 255, 0.95)',
    headerBorder: '#DCE0F5',
    sidebar: '#FFFFFF',
    sidebarBorder: '#DCE0F5',
    card: '#FFFFFF',
    border: '#DCE0F5',
    ...FIXED_PALETTE,
  },
};

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  isDark: true,
  colors: THEME_PALETTES.dark,
  toggleTheme: () => {},
  setTheme: () => {},
});

const STORAGE_KEY = 'arihant_erp_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default is dark as required
  const [theme, setThemeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      if (saved === 'light' || saved === 'dark') {
        setThemeState(saved);
      }
    }
  }, []);

  const setTheme = (next: ThemeMode) => {
    setThemeState(next);
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const isDark = theme === 'dark';
  const colors = THEME_PALETTES[theme];

  return (
    <ThemeContext.Provider value={{ theme, isDark, colors, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
