import { useState, useEffect } from 'react';
import UserService from '@/services/user-service';
import { TestProgressService } from '@/services/test-progress-service';
import { auth } from '@/services/firebaseConfig';

export interface DashboardStats {
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

export function useDashboardData() {
  const [performance, setPerformance] = useState<any>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
         setLoading(false);
         return;
      }
      
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
                  currentStreak = 1;
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

      const calculateRank = (acc: number) => {
        if (acc >= 90) return 'Expert';
        if (acc >= 75) return 'Advanced';
        if (acc >= 50) return 'Intermediate';
        return 'Beginner';
      };

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
              status: h.evaluationStatus === 'pending' ? 'in-progress' : 'completed',
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

  useEffect(() => {
    loadData();
  }, []);

  return { performance, dashboardStats, loading, reloadData: loadData };
}
