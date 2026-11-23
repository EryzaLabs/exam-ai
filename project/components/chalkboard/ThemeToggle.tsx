import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Sun, Moon } from 'lucide-react-native';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';

export default function ThemeToggle() {
  const { isDark, toggleTheme, colors, radii } = useChalkboardTheme();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: colors.surface,
          borderColor: colors.line,
          borderRadius: radii.button,
        },
      ]}
      onPress={toggleTheme}
      accessibilityRole="button"
      accessibilityLabel={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      activeOpacity={0.7}
    >
      {isDark ? (
        <Sun size={17} color={colors.accent} />
      ) : (
        <Moon size={17} color={colors.text} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 38,
    height: 38,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
