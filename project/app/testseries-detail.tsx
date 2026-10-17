import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';

export default function TestSeriesDetailScreen() {
  useEffect(() => {
    router.replace({ pathname: '/test-list', params: { category: 'full' } });
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1E3A8A" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
});
