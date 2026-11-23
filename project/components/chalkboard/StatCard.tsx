import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';

export interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  hideIfZero?: boolean;
  style?: ViewStyle;
}

export default function StatCard({
  label,
  value,
  subtext,
  icon,
  hideIfZero = true,
  style,
}: StatCardProps) {
  const { colors, radii } = useChalkboardTheme();

  // If hideIfZero is true and numeric value is 0 or '0' or '0%', don't render!
  if (hideIfZero) {
    if (value === 0 || value === '0' || value === '0%' || value === '0m') {
      return null;
    }
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.line,
          borderRadius: radii.card,
        },
        style,
      ]}
    >
      <View style={styles.topRow}>
        <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
        {icon && <View style={styles.icon}>{icon}</View>}
      </View>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      {subtext ? (
        <Text style={[styles.subtext, { color: colors.muted }]}>{subtext}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    padding: 16,
    flex: 1,
    minWidth: 140,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 13.5,
    fontWeight: '500',
  },
  icon: {
    marginLeft: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  subtext: {
    fontSize: 13.5,
    marginTop: 4,
  },
});
