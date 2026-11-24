import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';

export interface ChipProps {
  label: string;
  count?: number;
  active?: boolean;
  selected?: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export default function Chip({
  label,
  count,
  active = false,
  selected,
  onPress,
  icon,
  style,
}: ChipProps) {
  const { colors, radii } = useChalkboardTheme();
  const isActive = selected !== undefined ? selected : active;

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        {
          backgroundColor: isActive ? colors.text : colors.surface,
          borderColor: isActive ? colors.text : colors.line,
          borderRadius: radii.pill,
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
    >
      {icon && <>{icon}</>}
      <Text
        style={[
          styles.label,
          {
            color: isActive ? colors.surface : colors.text,
            fontWeight: isActive ? '700' : '500',
          },
        ]}
      >
        {label}
        {count !== undefined ? ` (${count})` : ''}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    minHeight: 38,
  },
  label: {
    fontSize: 13.5,
  },
});
