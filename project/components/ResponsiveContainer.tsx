import React from 'react';
import { View, ViewStyle, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { useTheme } from '@/context/theme-context';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  maxWidth?: number;
}

export default function ResponsiveContainer({
  children,
  style,
  maxWidth = '100%', // Fully responsive for web
}: ResponsiveContainerProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isWideScreen = width > maxWidth;
  
  return (
    <View style={[styles.outerContainer, { backgroundColor: colors.background }, isWideScreen && { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.innerContainer,
          { backgroundColor: colors.background },
          isWideScreen && { 
            maxWidth, 
            width: '100%', 
            alignSelf: 'center', 
          } as any,
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    width: '100%',
  },
  innerContainer: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
});
