import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';
import Button, { ButtonProps } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onPress: () => void;
    variant?: ButtonProps['variant'];
    icon?: React.ReactNode;
  };
  style?: ViewStyle;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  style,
}: EmptyStateProps) {
  const { colors, radii } = useChalkboardTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.line,
          borderRadius: radii.card,
        },
        style,
      ]}
    >
      {icon && (
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: colors.surface2, borderColor: colors.line },
          ]}
        >
          {icon}
        </View>
      )}

      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.muted }]}>
        {description}
      </Text>

      {action && (
        <View style={styles.actionWrap}>
          <Button
            title={action.label}
            variant={action.variant || 'primary'}
            onPress={action.onPress}
            icon={action.icon}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    marginVertical: 12,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 380,
    marginBottom: 20,
  },
  actionWrap: {
    minWidth: 180,
  },
});
