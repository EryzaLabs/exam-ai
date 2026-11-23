import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';

export interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  isHero?: boolean;
  noPadding?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export default function Card({
  children,
  style,
  isHero = false,
  noPadding = false,
  onPress,
  accessibilityLabel,
}: CardProps) {
  const { colors, radii } = useChalkboardTheme();

  const containerStyle: ViewStyle = {
    backgroundColor: isHero ? colors.hero : colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radii.card,
    padding: noPadding ? 0 : 20,
    overflow: 'hidden',
  };

  if (onPress) {
    return (
      <TouchableOpacity
        style={[containerStyle, style]}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[containerStyle, style]}>{children}</View>;
}
