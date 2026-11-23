import React from 'react';
import { Text, StyleSheet, ScrollView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trophy } from 'lucide-react-native';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';
import { EmptyState } from '@/components/chalkboard';
import { useRouter } from 'expo-router';

export default function LeaderboardScreen() {
  const { colors } = useChalkboardTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>Rank & Leaderboard</Text>
        
        <EmptyState
          icon={Trophy}
          title="Live Candidate Rankings"
          description="State-level percentile and rank standings are calculated upon conclusion of full-length timed mock tests. Complete a mock test to view your relative performance."
          actionLabel="View Available Tests"
          onAction={() => router.push('/test-list')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Newsreader-SemiBold',
    marginBottom: 20,
  },
});
