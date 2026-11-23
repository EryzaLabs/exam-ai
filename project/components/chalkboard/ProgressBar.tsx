import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';

export interface ProgressBarProps {
  progress: number; // 0 to 100
  color?: string;
  height?: number;
  style?: ViewStyle;
}

export default function ProgressBar({
  progress,
  color,
  height = 6,
  style,
}: ProgressBarProps) {
  const { colors } = useChalkboardTheme();
  const clamped = Math.max(0, Math.min(100, progress));
  const fillColor = color || colors.accent;

  return (
    <View
      style={[
        styles.track,
        {
          backgroundColor: colors.surface2,
          height,
        },
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${clamped}%`,
            backgroundColor: fillColor,
            height,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 9999,
  },
});
