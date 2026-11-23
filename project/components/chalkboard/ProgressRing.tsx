import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';

export interface ProgressRingProps {
  percentage: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  color?: string;
}

export default function ProgressRing({
  percentage,
  size = 110,
  strokeWidth = 8,
  label,
  sublabel,
  color,
}: ProgressRingProps) {
  const { colors, typography } = useChalkboardTheme();
  const clamped = Math.max(0, Math.min(100, percentage));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  const ringColor =
    color ||
    (clamped >= 80 ? colors.success : clamped >= 40 ? colors.accent : colors.danger);

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
    >
      <Svg width={size} height={size}>
        {/* Background track circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.surface2}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Foreground progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <View style={styles.centerTextContainer}>
        <Text style={[styles.labelText, { color: colors.text }]}>
          {label !== undefined ? label : `${Math.round(clamped)}%`}
        </Text>
        {sublabel ? (
          <Text style={[styles.sublabelText, { color: colors.muted }]}>
            {sublabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  centerTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  sublabelText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
});
