import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  BarChart3,
  TrendingUp as TrendUp,
  Calendar,
  Clock,
  Target,
  BookOpen,
  Award,
  Star,
  Brain,
  Zap,
  Trophy,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Card from '@/components/Card';
import UserService, { UserStats, UserProfile } from '@/services/user-service';
import { TestProgressService, TestResult } from '@/services/test-progress-service';
import TestSeriesService from '@/services/testseries-service';
import DesktopDashboard from '@/components/DesktopDashboard';

const { width } = Dimensions.get('window');

export default function ProgressScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { width: windowWidth } = useWindowDimensions();
  const isLargeScreen = windowWidth >= 1024;
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  useEffect(() => {
    loadProgressData();
    
    // Poll for pending evaluations every 30 seconds
    const pollInterval = setInterval(() => {
      checkPendingEvaluations();
    }, 30000); // 30 seconds
    
    return () => clearInterval(pollInterval);
  }, []);

  const loadProgressData = async () => {
    setLoading(true);
    try {
      const [stats, profile, history] = await Promise.all([
        UserService.getUserStatistics().catch(err => {
          console.error('Stats error:', err);
          return null;
        }),
        UserService.getUserProfile().catch(err => {
          console.error('Profile error:', err);
          return null;
        }),
        TestProgressService.getTestHistory().catch(err => {
          console.error('History error:', err);
          return [];
        })
      ]);
      
      setUserStats(stats);
      setUserProfile(profile);
      setTestHistory(history);
    } catch (error) {
      console.error('Error loading progress data:', error);
      // Set default empty states to ensure UI renders
      setUserStats({
        questionsAttempted: 0,
        accuracy: 0,
        streak: 0,
        totalTests: 0,
      });
      setTestHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadProgressData(),
      checkPendingEvaluations()
    ]);
    setRefreshing(false);
  };

  const checkPendingEvaluations = async () => {
    try {
      const pendingTests = testHistory.filter(t => t.evaluationStatus === 'pending');
      
      if (pendingTests.length === 0) {
        console.log('No pending tests to check');
        return;
      }
      
      console.log(`🔍 Checking ${pendingTests.length} pending evaluations...`);
      
      let updatedAny = false;
      
      for (const test of pendingTests) {
        console.log(`Checking test: ${test.testId} (${test.testTitle})`);
        console.log(`  AttemptId: ${test.attemptId}`);
        
        // Check if answers are now available
        const status = await TestSeriesService.checkAnswerGenerationStatus(test.testId);
        
        console.log(`  Status response:`, JSON.stringify(status, null, 2));
        
        if (status.answersAvailable && status.status === 'completed') {
          console.log(`✅ Answers ready! Updating status for attemptId: ${test.attemptId}`);
          
          // Update the evaluation status to completed
          await TestProgressService.updateAnswerGenerationStatus(
            test.attemptId,
            'completed'
          );
          
          console.log(`✅ Status updated successfully`);
          updatedAny = true;
        } else if (status.status === 'not-found') {
          console.log(`🚀 Answer generation not started. Triggering it now for ${test.testId}...`);
          
          // We don't have the original path, but backend will do a global search using testId
          // if the path fails, so we can pass a dummy path that includes the testId
          const dummyPath = `testseries/unknown_section/unknown_${test.testId}.json.gz`;
          
          await TestSeriesService.requestAnswerGeneration(test.testId, dummyPath)
            .then(() => {
              console.log(`✅ Requested generation for ${test.testId}`);
              // Update status to 'pending' to reflect it has been requested
              TestProgressService.updateAnswerGenerationStatus(test.attemptId, 'pending');
            })
            .catch(err => console.error('Failed to trigger generation:', err));
        } else {
          console.log(`⏳ Still pending: status=${status.status}, answersAvailable=${status.answersAvailable}`);
        }
      }
      
      // Reload data if any test was updated
      if (updatedAny) {
        console.log('✅ Updated test statuses, reloading data...');
        await loadProgressData();
        
        // Show notification
        Alert.alert(
          'Evaluation Complete! ✅',
          'Your test results are now ready. Check your test history!',
          [{ text: 'OK' }]
        );
      } else {
        console.log('No updates needed');
      }
    } catch (error) {
      console.error('❌ Error checking pending evaluations:', error);
    }
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

  const renderSimpleChart = (data: number[], labels: string[], color: string) => {
    if (data.length === 0) return null;
    const maxValue = Math.max(...data, 100);
    const chartHeight = 120;
    
    return (
      <View style={[styles.chartContainer, { height: chartHeight }]}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'flex-start', height: chartHeight - 40 }}>
          {data.map((value, index) => {
            const barHeight = Math.max((value / maxValue) * (chartHeight - 40), 4); // min height 4
            const isHovered = hoveredBarIndex === index;
            
            return (
              <View key={index} style={{ flex: 1, maxWidth: 40, marginRight: 8, alignItems: 'center' }}>
                {isHovered && (
                  <View style={{
                    position: 'absolute',
                    top: -30,
                    backgroundColor: '#1E293B',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    zIndex: 10,
                    minWidth: 40,
                    alignItems: 'center'
                  }}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>
                      {value.toFixed(1)}%
                    </Text>
                    {/* Small triangle pointer */}
                    <View style={{
                      position: 'absolute',
                      bottom: -4,
                      width: 8,
                      height: 8,
                      backgroundColor: '#1E293B',
                      transform: [{ rotate: '45deg' }]
                    }} />
                  </View>
                )}
                <Pressable
                  onHoverIn={() => setHoveredBarIndex(index)}
                  onHoverOut={() => setHoveredBarIndex(null)}
                  style={[
                    styles.chartBar,
                    {
                      height: barHeight,
                      width: '100%',
                      backgroundColor: isHovered ? '#2563EB' : color, // Slightly darker blue on hover
                      opacity: isHovered ? 1 : 0.85,
                      transform: [{ scaleY: isHovered ? 1.05 : 1 }],
                      transformOrigin: 'bottom'
                    }
                  ]}
                />
              </View>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-start', marginTop: 8 }}>
          {labels.map((label, index) => (
            <Text key={index} style={{ flex: 1, maxWidth: 40, marginRight: 8, textAlign: 'center', fontSize: 12, color: '#8E8E93', fontWeight: '500' }}>
              {label}
            </Text>
          ))}
        </View>
      </View>
    );
  };

  const getFilteredHistory = () => {
    const now = new Date();
    return testHistory.filter(test => {
      if (!test.date) return false;
      const testDate = new Date(test.date);
      if (selectedPeriod === 'week') {
        return testDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (selectedPeriod === 'month') {
        return testDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else {
        return testDate >= new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      }
    });
  };

  const filteredHistory = getFilteredHistory();

  // Dynamically compute stats based on filtered history
  let totalQuestionsAttempted = 0;
  let totalCorrectAnswers = 0;
  filteredHistory.forEach(t => {
    if (t.sectionAnalytics && t.sectionAnalytics.length > 0) {
      t.sectionAnalytics.forEach(sec => {
        totalQuestionsAttempted += sec.attempted || 0;
        totalCorrectAnswers += sec.correct || 0;
      });
    } else {
      totalQuestionsAttempted += (t as any).totalQuestions || 0;
      if ((t as any).totalQuestions && t.accuracy) {
        totalCorrectAnswers += Math.round(((t as any).totalQuestions * t.accuracy) / 100);
      }
    }
  });

  const displayStats = {
    totalTests: filteredHistory.length,
    questionsAttempted: totalQuestionsAttempted,
    accuracy: totalQuestionsAttempted > 0 ? (totalCorrectAnswers / totalQuestionsAttempted) * 100 : 0,
    streak: userStats?.streak || 0,
  };

  const getRecentTestsData = () => {
    const recent = filteredHistory.slice(0, 7).reverse();
    return {
      accuracy: recent.map(t => t.accuracy),
      questions: recent.map(t => (t as any).totalQuestions || 0),
      labels: recent.map((_, i) => `T${i + 1}`)
    };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading your progress...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate exam-specific rankings based on filtered history
  const examRankings: Record<string, string> = {};
  if (userProfile && userProfile.exams && filteredHistory.length > 0) {
    userProfile.exams.forEach(exam => {
      const examTests = filteredHistory.filter(t => t.testTitle?.includes(exam));
      if (examTests.length > 0) {
        const avgAccuracy = examTests.reduce((sum, t) => sum + t.accuracy, 0) / examTests.length;
        examRankings[exam] = calculateRank(avgAccuracy);
      }
    });
  }

  const recentData = getRecentTestsData();
  const accuracyData = recentData.accuracy;
  const questionsData = recentData.questions;

  const content = (
    <SafeAreaView style={[styles.container, isLargeScreen && { flex: undefined, minHeight: 600 }]}>
      {/* Header */}
      <View style={styles.headerNew}>
        <View style={styles.headerLeft}>
          <View style={styles.progressIconNew}>
            <TrendUp size={24} color="#2563EB" />
          </View>
          <View>
            <Text style={styles.headerTitleNew}>Progress</Text>
            <Text style={styles.headerSubtitleNew}>Track your learning journey</Text>
          </View>
        </View>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {(['week', 'month', 'year'] as const).map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period && styles.periodButtonActive
            ]}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text style={[
              styles.periodText,
              selectedPeriod === period && styles.periodTextActive
            ]}>
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {testHistory.length === 0 ? (
          <Card>
            <View style={styles.emptyState}>
              <Trophy size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No Progress Yet</Text>
              <Text style={styles.emptyText}>
                Take your first test this {selectedPeriod} to start tracking your progress!
              </Text>
            </View>
          </Card>
        ) : (
          <>
            {/* Overall Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCardNew, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
                <View style={[styles.statIconBox, { backgroundColor: '#DBEAFE' }]}>
                  <Target size={20} color="#2563EB" />
                </View>
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.statValueNew}>{displayStats.accuracy.toFixed(1)}%</Text>
                  <Text style={styles.statLabelNew}>Overall Accuracy</Text>
                  <Text style={styles.statRankNew}>{calculateRank(displayStats.accuracy)}</Text>
                </View>
              </View>
              
              <View style={[styles.statCardNew, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
                <View style={[styles.statIconBox, { backgroundColor: '#FFEDD5' }]}>
                  <Zap size={20} color="#EA580C" />
                </View>
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.statValueNew}>{displayStats.streak}</Text>
                  <Text style={styles.statLabelNew}>Day Streak</Text>
                </View>
              </View>
              
              <TouchableOpacity 
                style={[styles.statCardNew, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
                onPress={() => router.push('/test-history')}
                activeOpacity={0.7}
              >
                <View style={[styles.statIconBox, { backgroundColor: '#DCFCE7' }]}>
                  <BookOpen size={20} color="#16A34A" />
                </View>
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.statValueNew}>{displayStats.questionsAttempted}</Text>
                  <Text style={styles.statLabelNew}>Questions</Text>
                </View>
              </TouchableOpacity>
              
              <View style={[styles.statCardNew, { backgroundColor: '#FAF5FF', borderColor: '#E9D5FF' }]}>
                <View style={[styles.statIconBox, { backgroundColor: '#F3E8FF' }]}>
                  <Trophy size={20} color="#9333EA" />
                </View>
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.statValueNew}>{displayStats.totalTests}</Text>
                  <Text style={styles.statLabelNew}>Tests Taken</Text>
                </View>
              </View>
            </View>

            {/* Exam-Specific Rankings */}
            {userProfile && Object.keys(examRankings).length > 0 && (
              <Card>
                <Text style={styles.cardTitle}>Exam Rankings</Text>
                <Text style={styles.cardSubtitle}>Your performance by exam type</Text>
                <View style={styles.rankingsContainer}>
                  {Object.entries(examRankings).map(([exam, rank]) => (
                    <View key={exam} style={styles.rankingItem}>
                      <View style={styles.rankingLeft}>
                        <Award size={18} color="#667eea" />
                        <Text style={styles.rankingExam}>{exam}</Text>
                      </View>
                      <View style={[styles.rankingBadge, { backgroundColor: getRankColor(rank) }]}>
                        <Text style={styles.rankingText}>{rank}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </Card>
            )}

            {/* Performance Chart */}
            {accuracyData.length > 0 && (
              <Card style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Text style={styles.cardTitle}>Accuracy Trend</Text>
                </View>
                <Text style={styles.chartDescription}>Your accuracy over recent tests</Text>
                {renderSimpleChart(accuracyData, recentData.labels, '#007AFF')}
              </Card>
            )}

            {/* Recent Tests */}
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={[styles.cardTitle, { marginBottom: 0 }]}>Recent Tests</Text>
                <TouchableOpacity onPress={() => router.push('/test-history')}>
                  <Text style={{ color: '#2563EB', fontWeight: '600' }}>View All →</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.testsContainer}>
                {filteredHistory.slice(0, 5).map((test, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.testItem}
                    onPress={() => {
                      // Check if evaluation is complete
                      if (test.evaluationStatus === 'pending') {
                        Alert.alert(
                          'Evaluation Pending ⏳',
                          'We are still generating AI answers and evaluating your test. Pull down to refresh or check back in a few minutes.',
                          [
                            { text: 'Check Now', onPress: async () => {
                              console.log('Manual check triggered');
                              await checkPendingEvaluations();
                            }},
                            { text: 'OK' }
                          ]
                        );
                      } else {
                        router.push({
                          pathname: '/test-result',
                          params: { attemptId: test.attemptId }
                        });
                      }
                    }}
                  >
                    <View style={styles.testInfo}>
                      <Text style={styles.testTitle} numberOfLines={1}>
                        {test.testTitle || 'Test'}
                      </Text>
                      <Text style={styles.testDate}>
                        {new Date(test.date).toLocaleDateString()}
                      </Text>
                      {test.evaluationStatus === 'pending' && (
                        <View style={styles.pendingBadge}>
                          <ActivityIndicator size="small" color="#FF9500" />
                          <Text style={styles.pendingText}>Evaluating...</Text>
                        </View>
                      )}
                    </View>
                    {test.evaluationStatus === 'completed' ? (
                      <View style={styles.testStats}>
                        <Text style={styles.testAccuracy}>{test.accuracy.toFixed(1)}%</Text>
                        <Text style={styles.testScore}>
                          {Number(test.overallScore).toFixed(1)}/{test.totalMarks} Marks
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.testStats}>
                        <Text style={styles.pendingStatusText}>Pending</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </Card>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );

  if (isLargeScreen) {
    return <DesktopDashboard>{content}</DesktopDashboard>;
  }

  return content;
}

const getRankColor = (rank: string): string => {
  const colors: Record<string, string> = {
    Grandmaster: '#FFD700',
    Master: '#C0C0C0',
    Expert: '#CD7F32',
    Advanced: '#4ECDC4',
    Intermediate: '#45B7D1',
    Novice: '#96CEB4',
    Beginner: '#95A5A6',
  };
  return colors[rank] || '#95A5A6';
};

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
  headerNew: {
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    borderRadius: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressIconNew: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitleNew: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitleNew: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  statCardNew: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValueNew: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabelNew: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
  statRankNew: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
    marginTop: 4,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#007AFF',
  },
  periodText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#8E8E93',
  },
  periodTextActive: {
    color: '#FFFFFF',
  },
  chartCard: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartInfoButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F2F2F7',
  },
  chartInfoText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#007AFF',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  subjectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  subjectIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  subjectDetails: {
    flex: 1,
  },
  subjectAccuracyText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1E',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1E',
    marginVertical: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1E',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#8E8E93',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
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
  statCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  statGradient: {
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statRank: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    marginBottom: 16,
    marginTop: -8,
  },
  rankingsContainer: {
    gap: 12,
  },
  rankingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  rankingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rankingExam: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#1C1C1E',
  },
  rankingBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  rankingText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  testsContainer: {
    gap: 12,
  },
  testItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  testInfo: {
    flex: 1,
  },
  testTitle: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  testDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  testStats: {
    alignItems: 'flex-end',
  },
  testAccuracy: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#007AFF',
  },
  testScore: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    marginTop: 2,
  },
  chartContainer: {
    marginVertical: 12,
  },
  chartDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    marginBottom: 12,
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 20,
    height: 80,
  },
  chartBar: {
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  chartLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  trendInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  trendText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1C1C1E',
  },
  subjectContainer: {
    gap: 16,
  },
  subjectItem: {
    gap: 8,
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subjectDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  subjectName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1E',
    flex: 1,
  },
  subjectStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subjectAccuracy: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1E',
  },
  subjectQuestions: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E5EA',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  achievementsContainer: {
    gap: 12,
  },
  achievementItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  achievementEarned: {
    backgroundColor: '#F0FFF4',
    borderColor: '#34C759',
  },
  achievementLocked: {
    backgroundColor: '#F8F9FA',
    borderColor: '#E5E5EA',
  },
  achievementTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    marginBottom: 8,
  },
  achievementStatus: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  earnedText: {
    color: '#34C759',
  },
  lockedText: {
    color: '#8E8E93',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  pendingText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#FF9500',
  },
  pendingStatusText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FF9500',
  },
});