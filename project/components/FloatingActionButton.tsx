import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface FloatingActionButtonProps {
  onPress: () => void;
  icon: React.ReactNode;
  title?: string;
  gradient?: [string, string, ...string[]];
  style?: ViewStyle;
  size?: 'small' | 'medium' | 'large';
}

export default function FloatingActionButton({ 
  onPress, 
  icon, 
  title, 
  gradient = ['#007AFF', '#0056CC'],
  style,
  size = 'medium'
}: FloatingActionButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.container, styles[size], style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.button, styles[`${size}Button`]]}
      >
        {icon}
        {title && <Text style={[styles.title, styles[`${size}Title`]]}>{title}</Text>}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    gap: 8,
  },
  title: {
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  // Sizes
  small: {
    borderRadius: 20,
  },
  medium: {
    borderRadius: 28,
  },
  large: {
    borderRadius: 32,
  },
  smallButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  mediumButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 28,
  },
  largeButton: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 32,
  },
  smallTitle: {
    fontSize: 12,
  },
  mediumTitle: {
    fontSize: 14,
  },
  largeTitle: {
    fontSize: 16,
  },
});
