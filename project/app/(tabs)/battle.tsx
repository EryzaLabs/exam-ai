import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swords, Users, Trophy } from 'lucide-react-native';
import Card from '@/components/Card';

export default function BattleScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Battle Mode</Text>
        
        <Card>
          <View style={styles.emptyContainer}>
            <Swords size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>Battle Mode Coming Soon</Text>
            <Text style={styles.emptyText}>
              Challenge other students and compete in real-time quiz battles!
            </Text>
          </View>
        </Card>
        
        <Card>
          <View style={styles.featureHeader}>
            <Trophy size={20} color="#667eea" />
            <Text style={styles.infoTitle}>Upcoming Features</Text>
          </View>
          <Text style={styles.infoText}>
            • Real-time 1v1 quiz battles{'\n'}
            • Compete with friends or random opponents{'\n'}
            • Earn battle points and climb leaderboards{'\n'}
            • Unlock achievements and rewards{'\n'}
            • Practice in different difficulty tiers
          </Text>
        </Card>

        <Card>
          <View style={styles.featureHeader}>
            <Users size={20} color="#667eea" />
            <Text style={styles.infoTitle}>How It Works</Text>
          </View>
          <Text style={styles.infoText}>
            1. Choose your topic and difficulty{'\n'}
            2. Get matched with an opponent{'\n'}
            3. Answer questions faster and more accurately{'\n'}
            4. Win points and improve your rank{'\n'}
            5. Review your battle history and improve
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1E',
    marginVertical: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1E',
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    lineHeight: 24,
  },
});
