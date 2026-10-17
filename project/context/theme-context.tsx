import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@astra_theme_preference';

export const LightColors = {
  // Backgrounds
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceHighlight: '#F1F5F9',
  surfaceInput: '#F1F5F9',

  // Borders
  border: '#E2E8F0',
  borderLight: '#F1F5F9',

  // Text
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  textInverse: '#FFFFFF',

  // Accent / Brand
  accent: '#3B82F6',
  accentHover: '#2563EB',
  accentLight: '#EFF6FF',

  // Sidebar
  sidebarBg: '#FFFFFF',
  sidebarBorder: '#E2E8F0',

  // Status
  success: '#059669',
  successBg: '#D1FAE5',
  warning: '#D97706',
  warningBg: '#FEF3C7',
  error: '#EF4444',
  errorBg: '#FEE2E2',
  errorBgLight: '#FEF2F2',
  errorBorder: '#FEE2E2',

  // Premium / gold
  premiumBg: '#FFFBEB',
  premiumTitle: '#92400E',
  premiumDesc: '#B45309',

  // Hero banner (remains gradient, these are text colors on it)
  heroBg: '#EEF2FF',
  heroSub: '#4338CA',
  heroTitle: '#1E1B4B',
  heroDesc: '#4F46E5',

  // Misc icon backgrounds
  iconBgBlue: '#EFF6FF',
  iconBgPurple: '#F3E8FF',
  iconBgOrange: '#FFF7ED',
  iconBgYellow: '#FEF3C7',
  iconBgGreen: '#D1FAE5',
  iconBgRed: '#FEE2E2',

  // Card metrics
  metricText: '#475569',
  cardBorder: '#E2E8F0',
  progressBarBg: '#F1F5F9',

  // Calendar
  calDayBg: '#F1F5F9',
  calDayText: '#64748B',
};

export const DarkColors = {
  // Backgrounds
  background: '#0F172A',
  surface: '#1E293B',
  surfaceElevated: '#243047',
  surfaceHighlight: '#273549',
  surfaceInput: '#1E293B',

  // Borders
  border: '#334155',
  borderLight: '#2D3E55',

  // Text
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  textInverse: '#FFFFFF',

  // Accent / Brand
  accent: '#3B82F6',
  accentHover: '#60A5FA',
  accentLight: '#1E3A5F',

  // Sidebar
  sidebarBg: '#1E293B',
  sidebarBorder: '#334155',

  // Status
  success: '#34D399',
  successBg: '#064E3B',
  warning: '#FBBF24',
  warningBg: '#451A03',
  error: '#F87171',
  errorBg: '#450A0A',
  errorBgLight: '#1C0707',
  errorBorder: '#7F1D1D',

  // Premium / gold
  premiumBg: '#1C1A07',
  premiumTitle: '#FDE68A',
  premiumDesc: '#FCD34D',

  // Hero banner
  heroBg: '#1A1F3A',
  heroSub: '#818CF8',
  heroTitle: '#E0E7FF',
  heroDesc: '#A5B4FC',

  // Misc icon backgrounds
  iconBgBlue: '#1E3A5F',
  iconBgPurple: '#2D1B69',
  iconBgOrange: '#431407',
  iconBgYellow: '#422006',
  iconBgGreen: '#064E3B',
  iconBgRed: '#450A0A',

  // Card metrics
  metricText: '#94A3B8',
  cardBorder: '#334155',
  progressBarBg: '#334155',

  // Calendar
  calDayBg: '#273549',
  calDayText: '#94A3B8',
};

export type ThemeColors = typeof LightColors;

interface ThemeContextType {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  colors: LightColors,
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState<boolean>(systemScheme === 'dark');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === 'dark') setIsDark(true);
      else if (val === 'light') setIsDark(false);
      else setIsDark(systemScheme === 'dark');
      setLoaded(true);
    }).catch(() => {
      setIsDark(systemScheme === 'dark');
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded && typeof document !== 'undefined') {
      const bg = isDark ? DarkColors.background : LightColors.background;
      document.body.style.backgroundColor = bg;
      if (document.documentElement) {
        document.documentElement.style.backgroundColor = bg;
      }
    }
  }, [isDark, loaded]);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light').catch(() => {});
      return next;
    });
  };

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ isDark, colors: isDark ? DarkColors : LightColors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
