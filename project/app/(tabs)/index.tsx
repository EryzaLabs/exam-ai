import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import DesktopDashboard from '@/components/DesktopDashboard';
import MobileDashboard from '@/components/MobileDashboard';
import UserService from '@/services/user-service';
import { TestProgressService } from '@/services/test-progress-service';
import { auth } from '@/services/firebaseConfig';

interface DashboardStats {
  questionsAttempted: number;
  accuracy: number;
  timeSpent: number;
  streak: number;
  rank: string;
  weeklyImprovement: number;
  totalTopics: number;
  masteredTopics: number;
  userName?: string;
}

export default function EnhancedHomeScreen() {
  const [performance, setPerformance] = useState<any>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [questionStats, setQuestionStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const user = auth.currentUser;
      if (!user) {
         setLoading(false);
         return;
      }
      
      // Fetch profile using the singleton instance to prevent constructor errors
      const profile = await UserService.getUserProfile(user.uid);
      const history = await TestProgressService.getTestHistory();
      
      const stats = profile?.stats || {
          questionsAttempted: 0,
          accuracy: 0,
          streak: 0,
          totalTests: 0,
      };

      let timeSpentSeconds = 0;
      let topics: Record<string, any> = {};
      let totalQuestionsAttempted = 0;
      let totalCorrectAnswers = 0;
      
      history.forEach(test => {
          timeSpentSeconds += test.timeTaken || 0;
          if (test.sectionAnalytics) {
              test.sectionAnalytics.forEach(sec => {
                  totalQuestionsAttempted += sec.attempted || 0;
                  totalCorrectAnswers += sec.correct || 0;

                  if (!topics[sec.sectionTitle]) {
                      topics[sec.sectionTitle] = { attempted: 0, correct: 0 };
                  }
                  topics[sec.sectionTitle].attempted += sec.attempted || 0;
                  topics[sec.sectionTitle].correct += sec.correct || 0;
              });
          }
      });
      
      const subjectWisePerformance: Record<string, any> = {};
      let masteredTopics = 0;
      Object.keys(topics).forEach(key => {
          const acc = topics[key].attempted > 0 ? (topics[key].correct / topics[key].attempted) * 100 : 0;
          if (acc > 80) masteredTopics++;
          subjectWisePerformance[key] = {
              subject: key,
              accuracy: acc,
          };
      });

      const overallAccuracy = totalQuestionsAttempted > 0 ? (totalCorrectAnswers / totalQuestionsAttempted) * 100 : 0;

      // Calculate streak dynamically
      let currentStreak = 0;
      if (history && history.length > 0) {
          const uniqueDates = new Set<string>();
          history.forEach(test => {
              if (test.date) {
                  const d = new Date(test.date);
                  d.setHours(0, 0, 0, 0);
                  uniqueDates.add(d.getTime().toString());
              }
          });
          
          const sortedDates = Array.from(uniqueDates).map(Number).sort((a, b) => b - a);
          if (sortedDates.length > 0) {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const todayTime = today.getTime();
              const oneDay = 86400000;
              
              let expectedDate = todayTime;
              
              if (sortedDates[0] === todayTime) {
                  currentStreak = 1;
                  expectedDate = todayTime - oneDay;
              } else if (sortedDates[0] === todayTime - oneDay) {
                  currentStreak = 1; // Streak maintained from yesterday
                  expectedDate = todayTime - (2 * oneDay);
              }
              
              if (currentStreak > 0) {
                  for (let i = 1; i < sortedDates.length; i++) {
                      if (sortedDates[i] === expectedDate) {
                          currentStreak++;
                          expectedDate -= oneDay;
                      } else {
                          break;
                      }
                  }
              }
          }
      }

      setDashboardStats({
          questionsAttempted: totalQuestionsAttempted,
          accuracy: overallAccuracy,
          timeSpent: Math.round(timeSpentSeconds / 60),
          streak: currentStreak,
          rank: calculateRank(overallAccuracy),
          weeklyImprovement: 0,
          totalTopics: Object.keys(topics).length,
          masteredTopics,
          userName: profile?.displayName || user.displayName || undefined,
      });

      setPerformance({
          subjectWisePerformance,
          recentTests: history.map(h => ({
              id: h.attemptId,
              title: h.testTitle || 'UPSC Mock Test',
              date: h.date ? new Date(h.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Recently',
              type: 'Practice',
              status: 'completed',
              questions: h.sectionAnalytics?.reduce((sum: number, s: any) => sum + s.attempted, 0) || 0,
              duration: Math.round((h.timeTaken || 0)/60) + 'm',
              score: Math.round(h.accuracy || 0),
          }))
      });
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const calculateRank = (accuracy: number): string => {
    if (accuracy >= 95) return 'Grandmaster';
    if (accuracy >= 90) return 'Master';
    if (accuracy >= 80) return 'Expert';
    if (accuracy >= 70) return 'Advanced';
    if (accuracy >= 60) return 'Intermediate';
    if (accuracy >= 40) return 'Novice';
    return 'Beginner';
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const { width: windowWidth } = useWindowDimensions();
  const isLargeScreen = windowWidth > 1024;

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['bottom']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={{ marginTop: 16, fontSize: 16, color: '#64748B' }}>Loading your dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLargeScreen) {
    return <DesktopDashboard performance={performance} dashboardStats={dashboardStats} />;
  }

  return (
    <MobileDashboard 
      performance={performance}
      dashboardStats={dashboardStats}
      refreshing={refreshing}
      onRefresh={onRefresh}
    />
  );
}