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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  BookOpen,
  Target,
  Clock,
  TrendingUp as TrendUp,
  Zap,
  Award,
  Brain,
  Calendar,
  Star,
  Swords,
  BarChart3,
  Trophy,
  Flame as Fire, // Replaced Fire with Flame
  Users,
  Globe,
  Sparkles,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Card from '@/components/Card';
import Button from '@/components/Button';
import EnhancedQuestionDatabase, {
  UserPerformance,
  Achievement,
  Recommendation,
} from '@/services/question-database';

const { width, height } = Dimensions.get('window');

interface DashboardStats {
  questionsAttempted: number;
  accuracy: number;
  timeSpent: number;
  streak: number;
  rank: string;
  weeklyImprovement: number;
  totalTopics: number;
  masteredTopics: number;
}

export default function EnhancedHomeScreen() {
  const [performance, setPerformance] = useState<UserPerformance | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [questionStats, setQuestionStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load user performance
      const db = EnhancedQuestionDatabase.getInstance();
      const userPerformance = await db.getUserPerformance('default_user');
      setPerformance(userPerformance);
      
      // Load question statistics
      const qStats = await db.getQuestionStats();
      setQuestionStats(qStats);
      
      // Calculate dashboard stats
      if (userPerformance) {
        const recentWeek = userPerformance.weeklyProgress[userPerformance.weeklyProgress.length - 1];
        const previousWeek = userPerformance.weeklyProgress[userPerformance.weeklyProgress.length - 2];
        
        const masteredTopics = Object.values(userPerformance.topicWisePerformance)
          .filter(topic => topic.masteryLevel === 'expert' || topic.masteryLevel === 'advanced').length;
        
        setDashboardStats({
          questionsAttempted: userPerformance.totalQuestionsAttempted,
          accuracy: userPerformance.overallAccuracy,
          timeSpent: Math.round(userPerformance.timeSpent / 60), // Convert to minutes
          streak: userPerformance.streakCurrent,
          rank: calculateRank(userPerformance.overallAccuracy),
          weeklyImprovement: recentWeek && previousWeek ? recentWeek.accuracy - previousWeek.accuracy : 0,
          totalTopics: Object.keys(userPerformance.topicWisePerformance).length,
          masteredTopics,
        });
      } else {
        // Default stats for new users
        setDashboardStats({
          questionsAttempted: 0,
          accuracy: 0,
          timeSpent: 0,
          streak: 0,
          rank: 'Beginner',
          weeklyImprovement: 0,
          totalTopics: 0,
          masteredTopics: 0,
        });
      }
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

  const startAITest = () => {
    router.push('/practice?mode=ai');
  };

  const startQuickPractice = () => {
    router.push('/practice?mode=quick');
  };

  const viewAnalytics = () => {
    router.push('/progress');
  };

  const openBattle = () => {
    router.push('/battle');
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Enhanced Header with Performance Overview */}
        <LinearGradient
          colors={['#667eea', '#764ba2', '#8B5A96']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.greeting}>Hello Scholar! 👋</Text>
                <Text style={styles.subtitle}>Ready to master Indian History?</Text>
              </View>
              <View style={styles.headerStats}>
                <TouchableOpacity style={styles.streakBadge}>
                  <Fire size={16} color="#FF6B35" />
                  <Text style={styles.streakText}>{dashboardStats?.streak || 0}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.rankBadge, { backgroundColor: getRankColor(dashboardStats?.rank || 'Beginner') }]}
                >
                  <Trophy size={14} color="#FFFFFF" />
                  <Text style={styles.rankText}>{dashboardStats?.rank || 'Beginner'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Performance Metrics */}
            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>
                  {dashboardStats?.questionsAttempted.toLocaleString() || '0'}
                </Text>
                <Text style={styles.metricLabel}>Questions</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>
                  {dashboardStats?.accuracy.toFixed(1) || '0.0'}%
                </Text>
                <Text style={styles.metricLabel}>Accuracy</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{dashboardStats?.timeSpent || '0'}m</Text>
                <Text style={styles.metricLabel}>Study Time</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>
                  {dashboardStats?.masteredTopics || 0}/{dashboardStats?.totalTopics || 0}
                </Text>
                <Text style={styles.metricLabel}>Topics</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Mock Tests - NEW! */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <BookOpen size={20} color="#FF6B35" />
            <Text style={styles.sectionTitle}>UPSC Principal Mock Tests</Text>
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.mockTestCard} onPress={() => router.push('/test-list')}>
            <LinearGradient
              colors={['#4A90E2', '#357ABD']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.mockTestGradient}
            >
              <View style={styles.mockTestContent}>
                <View style={styles.mockTestIcon}>
                  <BookOpen size={32} color="#FFFFFF" />
                </View>
                <View style={styles.mockTestInfo}>
                  <Text style={styles.mockTestTitle}>UPSC Principal Test Series</Text>
                  <Text style={styles.mockTestSubtitle}>
                    Complete mock test series for Rs 500
                  </Text>
                  <View style={styles.mockTestFeatures}>
                    <View style={styles.mockTestFeature}>
                      <Clock size={14} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.mockTestFeatureText}>Timed Tests</Text>
                    </View>
                    <View style={styles.mockTestFeature}>
                      <Target size={14} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.mockTestFeatureText}>Detailed Analytics</Text>
                    </View>
                    <View style={styles.mockTestFeature}>
                      <Brain size={14} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.mockTestFeatureText}>Detailed Solutions</Text>
                    </View>
                  </View>
                </View>
              </View>
              <View style={styles.mockTestAction}>
                <Text style={styles.mockTestActionText}>Browse Tests</Text>
                <Text style={styles.mockTestArrow}>→</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* AI-Powered Quick Actions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Sparkles size={20} color="#667eea" />
            <Text style={styles.sectionTitle}>AI-Powered Practice</Text>
          </View>

          <View style={styles.aiActionsRow}>
            <TouchableOpacity style={styles.aiActionCard} onPress={startAITest}>
              <LinearGradient
                colors={['#FF6B6B', '#FF8E8E']}
                style={styles.aiActionGradient}
              >
                <Brain size={24} color="#FFFFFF" />
                <Text style={styles.aiActionTitle}>AI Test</Text>
                <Text style={styles.aiActionSubtitle}>Adaptive questions based on your performance</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.aiActionCard} onPress={startQuickPractice}>
              <LinearGradient
                colors={['#4ECDC4', '#44A08D']}
                style={styles.aiActionGradient}
              >
                <Zap size={24} color="#FFFFFF" />
                <Text style={styles.aiActionTitle}>Quick Practice</Text>
                <Text style={styles.aiActionSubtitle}>Random questions from all topics</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.battleCard} onPress={openBattle}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.battleGradient}
            >
              <Swords size={24} color="#FFFFFF" />
              <View style={styles.battleContent}>
                <Text style={styles.battleTitle}>Challenge Friends</Text>
                <Text style={styles.battleSubtitle}>Compete in real-time history battles</Text>
              </View>
              <View style={styles.battleBadge}>
                <Users size={16} color="#667eea" />
                <Text style={styles.battleBadgeText}>Live</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Today's Achievements */}
        {performance?.achievements && performance.achievements.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Award size={20} color="#FF6B35" />
              <Text style={styles.sectionTitle}>Recent Achievements</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {performance.achievements.slice(-3).map((achievement) => (
                <View key={achievement.id} style={styles.achievementCard}>
                  <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                  <Text style={styles.achievementTitle}>{achievement.title}</Text>
                  <Text style={styles.achievementDescription}>{achievement.description}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Performance Insights */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <BarChart3 size={20} color="#45B7D1" />
            <Text style={styles.sectionTitle}>Performance Insights</Text>
          </View>

          <Card style={styles.insightsCard}>
            <View style={styles.insightRow}>
              <View style={styles.insightItem}>
                <View style={styles.insightIconContainer}>
                  <TrendUp size={16} color="#4ECDC4" />
                </View>
                <View style={styles.insightContent}>
                  <Text style={styles.insightLabel}>Weekly Progress</Text>
                  <Text
                    style={[
                      styles.insightValue,
                      {
                        color:
                          (dashboardStats?.weeklyImprovement || 0) >= 0 ? '#4ECDC4' : '#FF6B6B',
                      },
                    ]}
                  >
                    {(dashboardStats?.weeklyImprovement || 0) >= 0 ? '+' : ''}
                    {dashboardStats?.weeklyImprovement?.toFixed(1) || '0.0'}%
                  </Text>
                </View>
              </View>

              <View style={styles.insightItem}>
                <View style={styles.insightIconContainer}>
                  <Target size={16} color="#FFD700" />
                </View>
                <View style={styles.insightContent}>
                  <Text style={styles.insightLabel}>Best Streak</Text>
                  <Text style={styles.insightValue}>{performance?.streakBest || 0} days</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.viewAnalyticsButton} onPress={viewAnalytics}>
              <BarChart3 size={16} color="#667eea" />
              <Text style={styles.viewAnalyticsText}>View Detailed Analytics</Text>
            </TouchableOpacity>
          </Card>
        </View>

        {/* AI Recommendations */}
        {performance?.personalizedRecommendations && performance.personalizedRecommendations.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Brain size={20} color="#8B5A96" />
              <Text style={styles.sectionTitle}>AI Recommendations</Text>
            </View>
            
            {performance.personalizedRecommendations.slice(0, 2).map((rec, index) => (
              <Card key={index} style={styles.recommendationCard}>
                <View style={styles.recommendationHeader}>
                  <View style={[
                    styles.priorityBadge,
                    {
                      backgroundColor:
                        rec.priority === 'high'
                          ? '#FF6B6B'
                          : rec.priority === 'medium'
                          ? '#FFD93D'
                          : '#4ECDC4',
                    },
                  ]}>
                    <Text style={styles.priorityText}>{rec.priority.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.impactText}>{rec.estimatedImpact}% impact</Text>
                </View>
                <Text style={styles.recommendationTitle}>{rec.title}</Text>
                <Text style={styles.recommendationDescription}>{rec.description}</Text>
                
                <View style={styles.actionItems}>
                  {rec.actionItems.slice(0, 2).map((action, actionIndex) => (
                    <View key={actionIndex} style={styles.actionItem}>
                      <View style={styles.actionBullet} />
                      <Text style={styles.actionText}>{action}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Quick Stats */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Globe size={20} color="#96CEB4" />
            <Text style={styles.sectionTitle}>Question Bank</Text>
          </View>

          <View style={styles.quickStatsRow}>
            <Card style={styles.statCard}>
              <Text style={styles.statNumber}>{questionStats?.total?.toLocaleString() || '0'}</Text>
              <Text style={styles.statLabel}>Total Questions</Text>
            </Card>
            
            <Card style={styles.statCard}>
              <Text style={styles.statNumber}>
                {questionStats?.byTopic ? Object.keys(questionStats.byTopic).length : 0}
              </Text>
              <Text style={styles.statLabel}>Topics Covered</Text>
            </Card>
          </View>

          <Card style={styles.statCard}>
            <Text style={styles.statDescription}>
              🏛️ Comprehensive collection of Indian History questions from BharatKosh
            </Text>
            <Text style={styles.statSubDescription}>
              Covering Ancient, Medieval, and Modern Indian History with AI-powered explanations
            </Text>
          </Card>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    fontFamily: 'Inter_500Medium',
  },
  scrollView: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  header: {
    paddingTop: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#E0E7FF',
    opacity: 0.9,
  },
  headerStats: {
    flexDirection: 'row',
    gap: 12,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  streakText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  rankText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#E0E7FF',
    opacity: 0.8,
  },
  metricDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  newBadge: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  mockTestCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  mockTestGradient: {
    padding: 20,
  },
  mockTestContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  mockTestIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockTestInfo: {
    flex: 1,
  },
  mockTestTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  mockTestSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 12,
  },
  mockTestFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mockTestFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mockTestFeatureText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  mockTestAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
  },
  mockTestActionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  mockTestArrow: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  aiActionsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  aiActionCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  aiActionGradient: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  aiActionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 4,
  },
  aiActionSubtitle: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
  },
  battleCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  battleGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  battleContent: {
    flex: 1,
  },
  battleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  battleSubtitle: {
    fontSize: 14,
    color: '#E0E7FF',
    opacity: 0.9,
  },
  battleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  battleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667eea',
  },
  achievementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    width: 140,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  achievementIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  insightsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  insightRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  insightItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  insightIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  insightValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  viewAnalyticsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  viewAnalyticsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
  },
  recommendationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  impactText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  recommendationDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
  },
  actionItems: {
    gap: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#667eea',
  },
  actionText: {
    fontSize: 13,
    color: '#475569',
    flex: 1,
  },
  quickStatsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  statDescription: {
    fontSize: 14,
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  statSubDescription: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});