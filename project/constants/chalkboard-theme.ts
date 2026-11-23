import { useMemo } from 'react';
import { useTheme } from '@/context/theme-context';

export interface ChalkboardColorTokens {
  bg: string;
  surface: string;
  surface2: string;
  line: string;
  text: string;
  muted: string;
  accent: string;
  accentHover: string;
  success: string;
  successBg: string;
  danger: string;
  dangerBg: string;
  white: string;
  cardBorder: string;
}

export const ChalkboardTokens = {
  light: {
    bg: '#f2f5f3',
    surface: '#ffffff',
    surface2: '#e9efeb',
    line: '#d5dfd9',
    text: '#16241f',
    muted: '#5b6e65',
    accent: '#e0a800',
    accentHover: '#c99700',
    success: '#2f8f62',
    successBg: '#eaf5f0',
    danger: '#c0392b',
    dangerBg: '#fdf0ee',
    white: '#ffffff',
    cardBorder: '#d5dfd9',
  },
  dark: {
    bg: '#101c18',
    surface: '#182822',
    surface2: '#20342d',
    line: '#2b4239',
    text: '#edf2ea',
    muted: '#9bb0a5',
    accent: '#f2c94c',
    accentHover: '#e0b83b',
    success: '#5fcf9a',
    successBg: '#122e23',
    danger: '#ff8a7a',
    dangerBg: '#331815',
    white: '#ffffff',
    cardBorder: '#2b4239',
  },
} as const;

export const ChalkboardTypography = {
  headingFamily: 'Newsreader, Georgia, "Times New Roman", serif',
  bodyFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

export const ChalkboardRadii = {
  card: 14,
  button: 10,
  pill: 9999,
  input: 8,
};

export function useChalkboardTheme() {
  const { isDark, toggleTheme, setTheme } = useTheme();

  const colors = useMemo(() => {
    return isDark ? ChalkboardTokens.dark : ChalkboardTokens.light;
  }, [isDark]);

  return {
    isDark,
    toggleTheme,
    setTheme,
    colors,
    typography: ChalkboardTypography,
    radii: ChalkboardRadii,
  };
}
