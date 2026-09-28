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
  maxWidth = '100%', // Fully responsive for web
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
    backgroundColor: '#fff', // Keep it white
  },
  innerContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#fff', // Keep the app background white
    overflow: 'hidden', // Contain the app nicely
  },
});
