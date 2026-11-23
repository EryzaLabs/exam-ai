import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react-native';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  visible: boolean;
  onDismiss?: () => void;
  duration?: number;
}

export default function Toast({
  message,
  type = 'info',
  visible,
  onDismiss,
  duration = 3000,
}: ToastProps) {
  const { colors, radii } = useChalkboardTheme();

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      if (onDismiss) onDismiss();
    }, duration);
    return () => clearTimeout(timer);
  }, [visible, duration, onDismiss]);

  if (!visible) return null;

  let bg = colors.surface;
  let border = colors.line;
  let text = colors.text;
  let icon = <Info size={16} color={colors.accent} />;

  if (type === 'success') {
    bg = colors.successBg;
    border = colors.success;
    text = colors.success;
    icon = <CheckCircle2 size={16} color={colors.success} />;
  } else if (type === 'error') {
    bg = colors.dangerBg;
    border = colors.danger;
    text = colors.danger;
    icon = <AlertCircle size={16} color={colors.danger} />;
  }

  return (
    <View
      style={[
        styles.toast,
        {
          backgroundColor: bg,
          borderColor: border,
          borderRadius: radii.button,
        },
      ]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      {icon}
      <Text style={[styles.text, { color: text }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    zIndex: 9999,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  text: {
    fontSize: 13.5,
    fontWeight: '600',
  },
});
