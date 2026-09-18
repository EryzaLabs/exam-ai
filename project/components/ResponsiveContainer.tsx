import React from 'react';
import { View, ViewStyle, StyleSheet, Platform, useWindowDimensions } from 'react-native';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  maxWidth?: number;
}

export default function ResponsiveContainer({
  children,
  style,
  maxWidth = 1000, // Balanced width for both text readability and grid layouts
}: ResponsiveContainerProps) {
  const { width } = useWindowDimensions();
  const isWideScreen = width > maxWidth;
  
  return (
    <View style={[styles.outerContainer, isWideScreen && styles.webBackground]}>
      <View
        style={[
          styles.innerContainer,
          isWideScreen && { 
            maxWidth, 
            width: '100%', 
            alignSelf: 'center', 
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.1,
            shadowRadius: 20,
            elevation: 10
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
    backgroundColor: '#fff',
  },
  webBackground: {
    backgroundColor: '#f1f5f9', // Light gray background for the empty space on wide screens
  },
  innerContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#fff', // Keep the app background white
    overflow: 'hidden', // Contain the app nicely
  },
});
