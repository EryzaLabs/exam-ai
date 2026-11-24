import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';

export interface OptionButtonProps {
  letter: string; // "A", "B", "C", "D"
  text: string;
  isSelected?: boolean;
  isCorrect?: boolean;
  showFeedback?: boolean;
  disabled?: boolean;
  onPress: () => void;
  keyboardShortcut?: string; // "1", "2", "3", "4"
  style?: ViewStyle;
}

export default function OptionButton({
  letter,
  text,
  isSelected = false,
  isCorrect,
  showFeedback = false,
  disabled = false,
  onPress,
  keyboardShortcut,
  style,
}: OptionButtonProps) {
  const { colors, radii } = useChalkboardTheme();

  let bg: string = colors.surface;
  let borderColor: string = colors.line;
  let textColor: string = colors.text;
  let badgeBg: string = colors.surface2;
  let badgeTextColor: string = colors.text;

  if (showFeedback) {
    if (isCorrect) {
      bg = colors.successBg;
      borderColor = colors.success;
      badgeBg = colors.success;
      badgeTextColor = colors.white;
    } else if (isSelected && !isCorrect) {
      bg = colors.dangerBg;
      borderColor = colors.danger;
      badgeBg = colors.danger;
      badgeTextColor = colors.white;
      textColor = colors.danger;
    } else {
      textColor = colors.muted;
    }
  } else if (isSelected) {
    bg = colors.surface2;
    borderColor = colors.accent;
    badgeBg = colors.accent;
    badgeTextColor = colors.accentText;
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: bg,
          borderColor,
          borderRadius: radii.button,
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected, disabled }}
    >
      <View style={[styles.badge, { backgroundColor: badgeBg }]}>
        <Text style={[styles.badgeText, { color: badgeTextColor }]}>
          {letter}
        </Text>
      </View>

      <Text style={[styles.optionText, { color: textColor }]}>{text}</Text>

      {showFeedback && isCorrect && (
        <Check size={18} color={colors.success} style={styles.icon} />
      )}

      {showFeedback && isSelected && !isCorrect && (
        <X size={18} color={colors.danger} style={styles.icon} />
      )}

      {!showFeedback && keyboardShortcut && (
        <View style={[styles.shortcutHint, { backgroundColor: colors.surface2 }]}>
          <Text style={[styles.shortcutText, { color: colors.muted }]}>
            {keyboardShortcut}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  optionText: {
    flex: 1,
    fontSize: 14.5,
    lineHeight: 21,
  },
  icon: {
    marginLeft: 6,
  },
  shortcutHint: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  shortcutText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
