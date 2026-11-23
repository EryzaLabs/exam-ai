import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';

export interface PillProps {
  label: string;
  variant?: 'free' | 'owned' | 'success' | 'series' | 'danger' | 'neutral' | 'accent';
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Pill({
  label,
  variant = 'neutral',
  icon,
  style,
  textStyle,
}: PillProps) {
  const { colors, radii } = useChalkboardTheme();

  let bg = colors.surface2;
  let border = colors.line;
  let text = colors.muted;

  if (variant === 'free' || variant === 'owned' || variant === 'success') {
    bg = colors.successBg;
    border = colors.success;
    text = colors.success;
  } else if (variant === 'danger') {
    bg = colors.dangerBg;
    border = colors.danger;
    text = colors.danger;
  } else if (variant === 'accent') {
    bg = colors.surface2;
    border = colors.accent;
    text = colors.accent;
  } else if (variant === 'series') {
    bg = colors.surface2;
    border = colors.line;
    text = colors.muted;
  }

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: bg,
          borderColor: border,
          borderRadius: radii.pill,
        },
        style,
      ]}
    >
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text
        style={[
          styles.label,
          {
            color: text,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
