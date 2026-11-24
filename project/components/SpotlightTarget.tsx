import React, { useEffect, useRef } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { useWalkthrough } from '@/context/walkthrough-context';

export interface SpotlightTargetProps {
  id: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function SpotlightTarget({ id, children, style }: SpotlightTargetProps) {
  const ref = useRef<View | null>(null);
  const { registerTarget, unregisterTarget } = useWalkthrough();

  useEffect(() => {
    registerTarget(id, ref);
    return () => {
      unregisterTarget(id);
    };
  }, [id, registerTarget, unregisterTarget]);

  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  );
}
