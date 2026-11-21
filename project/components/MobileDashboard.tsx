import React from 'react';
import { useTheme } from '@/context/theme-context';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import {
  Bell,
  Search,
  FileText,
  Target,
  Clock,
  BarChart2,
  Play,
  ArrowRight,
  BookOpen,
  ChevronRight,
  Zap,
  Crown,
  Sparkles,
  SlidersHorizontal,
  Sun,
  Moon,
  CheckCircle2,
} from 'lucide-react-native';
import { useAuth } from '@/context/auth-context';
import { useExam } from '@/context/exam-context';
import ExamSelector from '@/components/ExamSelector';
import FeaturedTracksSlider from '@/components/FeaturedTracksSlider';
import { TestProgressService, SavedTestState } from '@/services/test-progress-service';

export default function MobileDashboard({
  performance,
  dashboardStats,
  refreshing,
  onRefresh,
}: any) {
  const { isDark, colors, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeTest, setActiveTest] = React.useState<SavedTestState | null>(null);
  const { user, isSubscribed: authSubscribed, isSubscriptionLoading, requireAuth } = useAuth();
  const { examMode, examInfo } = useExam();
  const isSubscribed = authSubscribed || dashboardStats?.isSubscribed === true;

  const loadActiveTest = React.useCallback(async () => {
    try {
      const saved = await TestProgressService.getSavedTests();
      if (saved && saved.length > 0) {
        setActiveTest(saved[0]);
      } else {
        setActiveTest(null);
      }
    } catch (err) {
      console.warn('Error loading active test in MobileDashboard:', err);
    }
  }, []);

  React.useEffect(() => {
    loadActiveTest();
  }, [user, refreshing, loadActiveTest]);

  const handleResumeTest = () => {
    requireAuth(() => {
      if (activeTest) {
        router.push({
          pathname: '/mock-test',
          params: {
            testId: activeTest.testId,
            resume: 'true',
            filename: activeTest.filename || '',
          },
        });
      } else {
        router.push({
          pathname: '/test-list',
          params: { category: 'full' },
        });
      }
    }, {
      title: 'Sign In to Start Test',
      feature: 'Mock Tests',
      subtitle: 'Create a free account or sign in to start tests and record your score.',
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* TOP BAR / BRAND HEADER */}
        <SafeAreaView edges={['top']} style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.topBarRow}>
            <View style={styles.brandRow}>
              <View style={[styles.logoBox, { backgroundColor: isDark ? '#1E293B' : '#0F172A' }]}>
                <Image
                  source={require('@/assets/images/logo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <View>
                <View style={styles.titleWithBadge}>
                  <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>Astra Exam AI</Text>
                  {isSubscribed && (
                    <View style={styles.proPill}>
                      <Crown size={11} color="#F59E0B" />
                      <Text style={styles.proPillText}>PRO</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.brandSubtitle, { color: colors.textSecondary }]}>
                  {examInfo.fullName || 'Official Exam Preparation'}
                </Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.actionIconBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={toggleTheme}
                accessibilityLabel="Toggle Dark Mode"
                activeOpacity={0.7}
              >
                {isDark ? <Sun size={18} color="#F59E0B" /> : <Moon size={18} color="#475569" />}
              </TouchableOpacity>

              {user ? (
                <TouchableOpacity
                  style={[styles.actionIconBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => router.push('/(tabs)/profile')}
                  accessibilityLabel="User Profile"
                  activeOpacity={0.7}
                >
                  <View style={[styles.avatarCircle, { backgroundColor: colors.accent }]}>
                    <Text style={styles.avatarText}>
                      {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.signInBtn}
                  onPress={() => router.push('/(auth)/login')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.signInBtnText}>Sign In</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* EXAM TARGET SWITCHER ROW */}
          <View style={styles.examSelectorWrapper}>
            <ExamSelector compact={true} showTagline={false} />
          </View>
        </SafeAreaView>

        {/* SEARCH BAR */}
        <View style={styles.searchSection}>
          <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Search size={18} color={colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder={`Search ${examInfo.shortName} papers, topics, questions...`}
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => {
                if (searchQuery.trim()) {
                  router.push({ pathname: '/test-list', params: { q: searchQuery.trim() } });
                }
              }}
              returnKeyType="search"
            />
          </View>
        </View>

        {/* PRIMARY FOCUS CARD: RESUME TEST OR START MOCK CBT */}
        {activeTest ? (
          <View style={styles.sectionContainer}>
            <TouchableOpacity
              style={[styles.resumeCard, { backgroundColor: isDark ? '#1E293B' : '#0F172A', borderColor: isDark ? '#334155' : '#1E293B' }]}
              activeOpacity={0.9}
              onPress={handleResumeTest}
            >
              <View style={styles.resumeHeaderRow}>
                <View style={styles.resumeBadge}>
                  <View style={styles.resumePulseDot} />
                  <Text style={styles.resumeBadgeText}>IN PROGRESS TEST</Text>
                </View>
                <Text style={styles.resumeTimeLeft}>
                  {Math.max(1, Math.floor((activeTest.timeRemaining || 0) / 60))}m remaining
                </Text>
              </View>

              <Text style={styles.resumeTitle} numberOfLines={2}>
                {activeTest.testTitle || 'Unfinished Mock Test'}
              </Text>

              {(() => {
                const attempted = Object.keys(activeTest.answers || {}).length || (activeTest.currentQuestionIndex + 1);
                const total = activeTest.totalQuestions || 120;
                const pct = Math.min(100, Math.max(1, Math.round((attempted / total) * 100)));
                return (
                  <View style={styles.resumeProgressSection}>
                    <View style={styles.resumeProgressBarTrack}>
                      <View style={[styles.resumeProgressBarFill, { width: `${pct}%` }]} />
                    </View>
                    <View style={styles.resumeProgressMeta}>
                      <Text style={styles.resumeProgressSubtext}>{attempted} of {total} questions answered</Text>
                      <Text style={styles.resumeProgressPercent}>{pct}%</Text>
                    </View>
                  </View>
                );
              })()}

              <View style={styles.resumeFooter}>
                <View style={styles.resumeCtaBtn}>
                  <Play size={14} color="#0F172A" fill="#0F172A" />
                  <Text style={styles.resumeCtaText}>Resume Exam</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.sectionContainer}>
            <View style={[styles.heroCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: colors.border }]}>
              <View style={styles.heroHeader}>
                <View style={[styles.heroBadge, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF' }]}>
                  <FileText size={13} color="#2563EB" />
                  <Text style={styles.heroBadgeText}>{examInfo.shortName} CBT Mock Suite</Text>
                </View>
              </View>
              <Text style={[styles.heroHeading, { color: colors.textPrimary }]}>
                Official Timed CBT Simulator
              </Text>
              <Text style={[styles.heroBody, { color: colors.textSecondary }]}>
                Full-length authentic examination papers with official section navigation, negative marking, and verified step-by-step solutions.
              </Text>

              <View style={styles.heroActionsRow}>
                <TouchableOpacity
                  style={styles.heroPrimaryBtn}
                  onPress={() => router.push({ pathname: '/test-list', params: { category: 'full' } })}
                  activeOpacity={0.88}
                >
                  <Text style={styles.heroPrimaryBtnText}>Browse Full Mocks</Text>
                  <ArrowRight size={15} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.heroSecondaryBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                  onPress={() => router.push('/practice')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.heroSecondaryBtnText, { color: colors.textPrimary }]}>Quick Practice</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* 4-METRIC GRID (MINIMALIST & UNIFIED) */}
        <View style={styles.sectionContainer}>
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.metricIconWrap, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : '#F1F5F9' }]}>
                <FileText size={16} color={isDark ? '#60A5FA' : '#2563EB'} />
              </View>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                {dashboardStats?.totalAvailableTests ?? 0}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Total Papers</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.metricIconWrap, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#F1F5F9' }]}>
                <Target size={16} color={isDark ? '#34D399' : '#059669'} />
              </View>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                {dashboardStats?.accuracy ? `${dashboardStats.accuracy.toFixed(1)}%` : '0%'}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Avg. Accuracy</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.metricIconWrap, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.12)' : '#F1F5F9' }]}>
                <Clock size={16} color={isDark ? '#A78BFA' : '#7C3AED'} />
              </View>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                {Math.floor((dashboardStats?.timeSpent || 0) / 60)}h {(dashboardStats?.timeSpent || 0) % 60}m
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Practice Time</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.metricIconWrap, { backgroundColor: isDark ? 'rgba(249, 115, 22, 0.12)' : '#F1F5F9' }]}>
                <BarChart2 size={16} color={isDark ? '#FB923C' : '#EA580C'} />
              </View>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                {dashboardStats?.questionsAttempted ?? 0}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Questions Solved</Text>
            </View>
          </View>
        </View>

        {/* PRACTICE MODES — CLEAN 2-COLUMN CARDS (NO CANDY GRADIENTS) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Practice Modes</Text>
            <TouchableOpacity onPress={() => router.push({ pathname: '/test-list', params: { category: 'all' } })}>
              <Text style={[styles.sectionLink, { color: colors.accent }]}>View All →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.practiceModesGrid}>
            <TouchableOpacity
              style={[styles.practiceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push({ pathname: '/test-list', params: { category: 'full' } })}
              activeOpacity={0.85}
            >
              <View style={[styles.practiceCardIconBox, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF' }]}>
                <FileText size={20} color="#2563EB" />
              </View>
              <Text style={[styles.practiceCardTitle, { color: colors.textPrimary }]}>Full Mock CBT</Text>
              <Text style={[styles.practiceCardDesc, { color: colors.textSecondary }]}>
                Official 200/300-question timed papers with negative marking and authentic section timers.
              </Text>
              <View style={styles.practiceCardFooter}>
                <Text style={[styles.practiceCardAction, { color: colors.accent }]}>Start CBT Exam</Text>
                <ArrowRight size={14} color={colors.accent} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.practiceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push('/practice')}
              activeOpacity={0.85}
            >
              <View style={[styles.practiceCardIconBox, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.15)' : '#ECFDF5' }]}>
                <BookOpen size={20} color="#059669" />
              </View>
              <Text style={[styles.practiceCardTitle, { color: colors.textPrimary }]}>Topic Practice</Text>
              <Text style={[styles.practiceCardDesc, { color: colors.textSecondary }]}>
                Targeted practice sets by subject and discipline to reinforce specific exam areas.
              </Text>
              <View style={styles.practiceCardFooter}>
                <Text style={[styles.practiceCardAction, { color: colors.accent }]}>Practice Topics</Text>
                <ArrowRight size={14} color={colors.accent} />
              </View>
            </TouchableOpacity>
          </View>

          {/* CUSTOM TEST BUILDER TILE */}
          <TouchableOpacity
            style={[styles.customBuilderTile, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => requireAuth(() => router.push(isSubscribed ? '/custom-test' : '/premium'), { title: 'Sign In for Custom Test Builder', feature: 'Custom Test Builder' })}
            activeOpacity={0.85}
          >
            <View style={[styles.customBuilderIconWrap, { backgroundColor: isDark ? 'rgba(124, 58, 237, 0.15)' : '#F5F3FF' }]}>
              <SlidersHorizontal size={18} color="#7C3AED" />
            </View>
            <View style={styles.customBuilderContent}>
              <View style={styles.customBuilderTitleRow}>
                <Text style={[styles.customBuilderTitle, { color: colors.textPrimary }]}>Custom Test Builder</Text>
                {!isSubscribed && (
                  <View style={styles.proSmallPill}>
                    <Crown size={10} color="#F59E0B" />
                    <Text style={styles.proSmallPillText}>PRO</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.customBuilderSubtitle, { color: colors.textSecondary }]}>
                Generate custom sets by selecting specific topics, question volume, and duration.
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* FEATURED EXAM TRACKS SLIDER */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Featured Exam Series</Text>
            <TouchableOpacity onPress={() => router.push({ pathname: '/test-list', params: { category: 'all' } })}>
              <Text style={[styles.sectionLink, { color: colors.accent }]}>View Catalog →</Text>
            </TouchableOpacity>
          </View>
          <FeaturedTracksSlider />
        </View>

        {/* RECENT ATTEMPTS */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Recent Tests</Text>
            <TouchableOpacity onPress={() => router.push('/test-history')}>
              <Text style={[styles.sectionLink, { color: colors.accent }]}>View All →</Text>
            </TouchableOpacity>
          </View>

          {(!performance?.recentTests || performance.recentTests.length === 0) ? (
            <View style={[styles.emptyStateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <FileText size={28} color={colors.textTertiary} />
              <Text style={[styles.emptyStateTitle, { color: colors.textPrimary }]}>No test attempts yet</Text>
              <Text style={[styles.emptyStateDesc, { color: colors.textSecondary }]}>
                Choose any official paper or topic test above to begin practicing.
              </Text>
            </View>
          ) : (
            performance.recentTests.slice(0, 3).map((test: any, i: number) => (
              <TouchableOpacity
                key={i}
                style={[styles.recentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                activeOpacity={0.8}
                onPress={() => {
                  if (test.id) {
                    router.push({ pathname: '/test-result', params: { attemptId: test.id } });
                  } else {
                    router.push('/test-history');
                  }
                }}
              >
                <View style={styles.recentCardTop}>
                  <View style={[styles.recentCardIcon, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                    <CheckCircle2 size={18} color="#2563EB" />
                  </View>
                  <View style={styles.recentCardInfo}>
                    <Text style={[styles.recentCardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                      {test.title || `Mock Test ${i + 1}`}
                    </Text>
                    <Text style={[styles.recentCardMeta, { color: colors.textSecondary }]}>
                      {test.date || 'Recently'} • {test.type || 'Official Paper'}
                    </Text>
                  </View>
                  <View style={[styles.scoreBadge, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.15)' : '#ECFDF5' }]}>
                    <Text style={styles.scoreBadgeText}>{test.score ?? 0}%</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* TASTEFUL PROMO (IF NOT SUBSCRIBED) */}
        {!isSubscriptionLoading && !isSubscribed && (
          <View style={[styles.sectionContainer, { marginBottom: 32 }]}>
            <View style={[styles.proCard, { backgroundColor: isDark ? '#1E293B' : '#0F172A', borderColor: isDark ? '#334155' : '#1E293B' }]}>
              <View style={styles.proCardHeader}>
                <View style={styles.proCardBadge}>
                  <Crown size={12} color="#F59E0B" />
                  <Text style={styles.proCardBadgeText}>ALL-ACCESS PASS</Text>
                </View>
                <Text style={styles.proCardPrice}>from ₹9</Text>
              </View>

              <Text style={styles.proCardTitle}>Unlock All {examInfo.shortName} Full Mocks & Explanations</Text>
              <Text style={styles.proCardDesc}>
                Unlimited re-attempts, authentic CBT timed tests, and genuine step-by-step bilingual solutions.
              </Text>

              <TouchableOpacity
                style={styles.proCardBtn}
                onPress={() => router.push('/premium')}
                activeOpacity={0.88}
              >
                <Text style={styles.proCardBtnText}>Upgrade Now</Text>
                <ArrowRight size={14} color="#0F172A" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  logoBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 28,
    height: 28,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  brandSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  proPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  proPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  signInBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  signInBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  examSelectorWrapper: {
    marginTop: 2,
  },
  searchSection: {
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  sectionContainer: {
    paddingHorizontal: 16,
    marginTop: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '600',
  },

  // HERO CARD
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  heroHeading: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  heroBody: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  heroPrimaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  heroSecondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  heroSecondaryBtnText: {
    fontWeight: '600',
    fontSize: 13,
  },

  // RESUME CARD (HIGH END EDITORIAL)
  resumeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  resumeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  resumeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resumePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#34D399',
  },
  resumeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#34D399',
    letterSpacing: 0.5,
  },
  resumeTimeLeft: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  resumeTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  resumeProgressSection: {
    marginBottom: 14,
  },
  resumeProgressBarTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  resumeProgressBarFill: {
    height: '100%',
    backgroundColor: '#38BDF8',
    borderRadius: 3,
  },
  resumeProgressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resumeProgressSubtext: {
    fontSize: 12,
    color: '#94A3B8',
  },
  resumeProgressPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
  },
  resumeFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  resumeCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  resumeCtaText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },

  // METRICS GRID
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    minWidth: '46%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
  },

  // PRACTICE MODES
  practiceModesGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  practiceCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  practiceCardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  practiceCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  practiceCardDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  practiceCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  practiceCardAction: {
    fontSize: 12,
    fontWeight: '600',
  },

  // CUSTOM TEST BUILDER TILE
  customBuilderTile: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  customBuilderIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customBuilderContent: {
    flex: 1,
  },
  customBuilderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  customBuilderTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  customBuilderSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  proSmallPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  proSmallPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#D97706',
  },

  // RECENT TESTS
  emptyStateCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  emptyStateDesc: {
    fontSize: 12,
    textAlign: 'center',
  },
  recentCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  recentCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recentCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentCardInfo: {
    flex: 1,
  },
  recentCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  recentCardMeta: {
    fontSize: 12,
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  scoreBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },

  // PRO CARD (MINIMALIST)
  proCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  proCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  proCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  proCardBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
    letterSpacing: 0.4,
  },
  proCardPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  proCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  proCardDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 17,
    marginBottom: 14,
  },
  proCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderRadius: 8,
  },
  proCardBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
});
