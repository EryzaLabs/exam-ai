import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@astra_theme_preference';

export const LightColors = {
  // Core chalkboard tokens
  bg: '#f2f5f3',
  background: '#f2f5f3',
  surface: '#ffffff',
  surface2: '#e9efeb',
  surfaceElevated: '#ffffff',
  surfaceHighlight: '#e9efeb',
  surfaceInput: '#e9efeb',

  // Borders & lines
  line: '#d5dfd9',
  border: '#d5dfd9',
  borderLight: '#e9efeb',

  // Typography
  text: '#16241f',
  textPrimary: '#16241f',
  textSecondary: '#5b6e65',
  muted: '#5b6e65',
  textTertiary: '#83968c',
  textInverse: '#ffffff',

  // Accent & Actions
  accent: '#e0a800',
  accentText: '#1b1500',
  accentHover: '#c79500',
  accentLight: '#fdf6e2',

  // Status & Feedback
  success: '#2f8f62',
  successBg: '#e6f5ee',
  danger: '#c0392b',
  error: '#c0392b',
  errorBg: '#fcebe9',
  errorBgLight: '#fdf2f1',
  errorBorder: '#f5c6cb',
  warning: '#e0a800',
  warningBg: '#fdf6e2',

  // Hero & Accents
  hero: '#e7efe9',
  heroBg: '#e7efe9',
  heroSub: '#5b6e65',
  heroTitle: '#16241f',
  heroDesc: '#5b6e65',

  // Sidebar
  sidebarBg: '#ffffff',
  sidebarBorder: '#d5dfd9',

  // Cards & Visuals
  metricText: '#5b6e65',
  cardBorder: '#d5dfd9',
  progressBarBg: '#d5dfd9',
  calDayBg: '#e9efeb',
  calDayText: '#5b6e65',

  // Category & Icon Accents
  iconBgBlue: '#e9efeb',
  iconBgPurple: '#e9efeb',
  iconBgOrange: '#fdf6e2',
  iconBgYellow: '#fdf6e2',
  iconBgGreen: '#e6f5ee',
  iconBgRed: '#fcebe9',
  premiumBg: '#fdf6e2',
  premiumTitle: '#1b1500',
  premiumDesc: '#5b6e65',
};

export const DarkColors = {
  // Core chalkboard tokens
  bg: '#101c18',
  background: '#101c18',
  surface: '#182822',
  surface2: '#20342d',
  surfaceElevated: '#20342d',
  surfaceHighlight: '#263d35',
  surfaceInput: '#20342d',

  // Borders & lines
  line: '#2b4239',
  border: '#2b4239',
  borderLight: '#20342d',

  // Typography
  text: '#edf2ea',
  textPrimary: '#edf2ea',
  textSecondary: '#9bb0a5',
  muted: '#9bb0a5',
  textTertiary: '#768c82',
  textInverse: '#101c18',

  // Accent & Actions
  accent: '#f2c94c',
  accentText: '#1b1500',
  accentHover: '#e0a800',
  accentLight: '#2c2714',

  // Status & Feedback
  success: '#5fcf9a',
  successBg: '#133527',
  danger: '#ff8a7a',
  error: '#ff8a7a',
  errorBg: '#3d1c18',
  errorBgLight: '#2d1411',
  errorBorder: '#5c221b',
  warning: '#f2c94c',
  warningBg: '#2c2714',

  // Hero & Accents
  hero: '#1c3029',
  heroBg: '#1c3029',
  heroSub: '#9bb0a5',
  heroTitle: '#edf2ea',
  heroDesc: '#9bb0a5',

  // Sidebar
  sidebarBg: '#182822',
  sidebarBorder: '#2b4239',

  // Cards & Visuals
  metricText: '#9bb0a5',
  cardBorder: '#2b4239',
  progressBarBg: '#2b4239',
  calDayBg: '#20342d',
  calDayText: '#9bb0a5',

  // Category & Icon Accents
  iconBgBlue: '#20342d',
  iconBgPurple: '#20342d',
  iconBgOrange: '#2c2714',
  iconBgYellow: '#2c2714',
  iconBgGreen: '#133527',
  iconBgRed: '#3d1c18',
  premiumBg: '#2c2714',
  premiumTitle: '#f2c94c',
  premiumDesc: '#9bb0a5',
};

export type ThemeColors = typeof LightColors;

interface ThemeContextType {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  colors: LightColors,
  toggleTheme: () => {},
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState<boolean>(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => {
        if (val === 'dark') {
          setIsDark(true);
        } else {
          setIsDark(false);
        }
        setLoaded(true);
      })
      .catch(() => {
        setIsDark(false);
        setLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const bg = isDark ? DarkColors.background : LightColors.background;
      document.body.style.backgroundColor = bg;
      if (document.documentElement) {
        document.documentElement.style.backgroundColor = bg;
      }
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light').catch(() => {});
      return next;
    });
  };

  const setTheme = (theme: 'light' | 'dark') => {
    const nextDark = theme === 'dark';
    setIsDark(nextDark);
    AsyncStorage.setItem(STORAGE_KEY, theme).catch(() => {});
  };

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        colors: isDark ? DarkColors : LightColors,
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
