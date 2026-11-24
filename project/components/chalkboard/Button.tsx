import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
  Platform,
  View,
} from 'react-native';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';

export interface ButtonProps {
  label?: string;
  title?: string;
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'small' | 'medium' | 'large';
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
}

export default function Button({
  label,
  title,
  children,
  variant = 'secondary',
  size = 'md',
  onPress,
  disabled = false,
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  style,
  textStyle,
  accessibilityLabel,
}: ButtonProps) {
  const { colors, radii } = useChalkboardTheme();
  const buttonText = label || title;

  let bg: string = colors.surface;
  let borderColor: string = colors.line;
  let textColor: string = colors.text;
  let borderWidth = 1;

  if (variant === 'primary') {
    bg = colors.accent;
    borderColor = colors.accent;
    textColor = colors.accentText; // #1b1500 as required
    borderWidth = 0;
  } else if (variant === 'danger') {
    bg = colors.dangerBg;
    borderColor = colors.danger;
    textColor = colors.danger;
  } else if (variant === 'ghost') {
    bg = 'transparent';
    borderColor = 'transparent';
    borderWidth = 0;
    textColor = colors.text;
  }

  const isSm = size === 'sm' || size === 'small';
  const isLg = size === 'lg' || size === 'large';
  const height = isSm ? 44 : isLg ? 52 : 48;
  const paddingH = isSm ? 14 : isLg ? 24 : 18;
  const fontSize = isSm ? 13.5 : isLg ? 16 : 14.5;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: bg,
          borderColor,
          borderWidth,
          borderRadius: radii.button,
          minHeight: height,
          paddingHorizontal: paddingH,
          width: fullWidth ? '100%' : 'auto',
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || buttonText}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <View style={styles.contentRow}>
          {icon && <View style={styles.iconLeft}>{icon}</View>}
          {buttonText ? (
            <Text
              style={[
                styles.text,
                {
                  color: textColor,
                  fontSize,
                  fontWeight: variant === 'primary' ? '700' : '600',
                },
                textStyle,
              ]}
            >
              {buttonText}
            </Text>
          ) : (
            children
          )}
          {iconRight && <View style={styles.iconRight}>{iconRight}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconLeft: {
    marginRight: 2,
  },
  iconRight: {
    marginLeft: 2,
  },
  text: {
    textAlign: 'center',
  },
});
