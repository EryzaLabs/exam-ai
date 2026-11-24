import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Play,
  RotateCcw,
  Zap,
  ArrowRight,
  Target,
  CheckCircle2,
  Clock,
  Calendar,
  Award,
  Sparkles,
  ChevronRight,
  BookOpen,
} from 'lucide-react-native';
import { useAuth } from '@/context/auth-context';
import { useSub } from '@/context/subscription-context';
import { useExam, EXAMS } from '@/context/exam-context';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';
import { SSCCGLService } from '@/services/ssc-cgl-service';
import { TestProgressService, SavedTestState, TestResult } from '@/services/test-progress-service';
import UserService from '@/services/user-service';
import PaperService, { INITIAL_TGT_PGT_PAPERS } from '@/services/paper-service';
import ExamPicker, { FIRST_VISIT_EXAM_STORAGE_KEY } from '@/components/first-visit/ExamPicker';
import AppShell from '@/components/chalkboard/AppShell';
import Card from '@/components/chalkboard/Card';
import Button from '@/components/chalkboard/Button';
import Pill from '@/components/chalkboard/Pill';
import ProgressRing from '@/components/chalkboard/ProgressRing';
import ProgressBar from '@/components/chalkboard/ProgressBar';
import TopicBar from '@/components/chalkboard/TopicBar';
import SeriesCard from '@/components/chalkboard/SeriesCard';
import OfferCard from '@/components/chalkboard/OfferCard';
import FirstTimeWalkthrough, { hasCompletedWalkthrough } from '@/components/FirstTimeWalkthrough';
import { extractTestTopicAndSubject } from '@/utils/topic-resolver';

const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function HomeScreen() {
  const { user } = useAuth();
  const { isSubscribed } = useSub();
  const { examMode, examInfo } = useExam();
  const { colors, typography, radii } = useChalkboardTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [loading, setLoading] = useState(true);
  const [showFirstVisitPicker, setShowFirstVisitPicker] = useState<boolean | null>(null);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [activeTests, setActiveTests] = useState<SavedTestState[]>([]);
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);
  const [profile, setProfile] = useState<any>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Guest Check
      if (!user) {
        let savedExam: string | null = null;
        try {
          savedExam = await AsyncStorage.getItem(FIRST_VISIT_EXAM_STORAGE_KEY);
        } catch {}

        if (
          savedExam &&
          (savedExam === 'upsc' || savedExam === 'uppsc' || savedExam === 'tgt' || savedExam === 'pgt')
        ) {
          router.replace(`/exam/${savedExam}` as any);
          return;
        }

        setShowFirstVisitPicker(true);
        setLoading(false);
        return;
      }

      // 2. Logged-in user data
      const userProfile = await UserService.getUserProfile(user.uid);
      const history = await TestProgressService.getTestHistory();
      const saved = await TestProgressService.getSavedTests();

      setProfile(userProfile);
      setTestHistory(history || []);
      setActiveTests(saved || []);
      setShowFirstVisitPicker(false);

      const done = await hasCompletedWalkthrough();
      if (!done) {
        setShowWalkthrough(true);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Performance calculations
  const totalAttemptedQuestions = useMemo(() => {
    return testHistory.reduce((sum, t) => {
      const qCount =
        t.totalQuestions ||
        t.sectionAnalytics?.reduce((s: number, a: any) => s + (a.attempted || 0), 0) ||
        (t.answers ? t.answers.length : 0);
      return sum + qCount;
    }, 0);
  }, [testHistory]);

  const totalCorrectQuestions = useMemo(() => {
    return testHistory.reduce((sum, t) => {
      const cCount =
        t.totalCorrect ??
        (t.sectionAnalytics?.reduce((s: number, a: any) => s + (a.correct || 0), 0) ||
          (t.answers ? t.answers.filter((a: any) => a.isCorrect).length : 0));
      return sum + cCount;
    }, 0);
  }, [testHistory]);

  const overallAccuracy =
    totalAttemptedQuestions > 0
      ? Math.round((totalCorrectQuestions / totalAttemptedQuestions) * 100)
      : 0;

  const totalMinutesSpent = useMemo(() => {
    return Math.round(
      testHistory.reduce((sum, t) => sum + (t.timeTaken || 0), 0) / 60
    );
  }, [testHistory]);

  // Topic mastery map
  const topicBreakdown = useMemo(() => {
    const map: Record<string, { topic: string; total: number; correct: number }> = {};

    testHistory.forEach((t) => {
      const resolved = extractTestTopicAndSubject(t);
      if (t.sectionAnalytics && t.sectionAnalytics.length > 0) {
        t.sectionAnalytics.forEach((sec: any) => {
          let name = sec.sectionTitle || sec.sectionName || sec.title;
          if (!name || name === 'main' || name === 'Full Mock CBT') {
            name = resolved.topic;
          }
          if (name && name !== 'Full Mock CBT Exam') {
            if (!map[name]) map[name] = { topic: name, total: 0, correct: 0 };
            map[name].total += sec.attempted || 0;
            map[name].correct += sec.correct || 0;
          }
        });
      } else {
        const name = resolved.topic;
        if (name && name !== 'Full Mock CBT Exam') {
          if (!map[name]) map[name] = { topic: name, total: 0, correct: 0 };
          const attempted = t.answers ? t.answers.length : (t.totalQuestions || 20);
          const correct = t.totalCorrect ?? Math.round((attempted * (t.accuracy || 0)) / 100);
          map[name].total += attempted;
          map[name].correct += correct;
        }
      }
    });

    return Object.values(map)
      .map((item) => ({
        ...item,
        accuracy: item.total > 0 ? (item.correct / item.total) * 100 : 0,
      }))
      .sort((a, b) => a.accuracy - b.accuracy); // weakest first
  }, [testHistory]);

  const weakTopics = useMemo(() => {
    return topicBreakdown.filter((t) => t.accuracy < 50);
  }, [topicBreakdown]);

  // 1. GUEST STATE
  if (showFirstVisitPicker) {
    return <ExamPicker />;
  }

  if (loading) {
    return (
      <View style={[styles.centerLoading, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.muted }]}>
          Loading your exam dashboard...
        </Text>
      </View>
    );
  }

  const hasPastAttempts = testHistory.length > 0;
  const hasActiveResume = activeTests.length > 0;
  const currentExamInfo = EXAMS[examMode] || EXAMS.upsc;
  const activeSeriesPrice = examMode === 'pgt' || examMode === 'tgt' ? 199 : 199;
  const activeSeriesOriginal = examMode === 'pgt' || examMode === 'tgt' ? 999 : 399;

  return (
    <AppShell maxWidth={1080}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentLayoutRow}>
          {/* Main Feed Column */}
          <View style={styles.mainFeedColumn}>
            {/* 2. FREE USER WITH NO ATTEMPTS */}
            {!hasPastAttempts && !hasActiveResume ? (
              <View style={styles.zeroStateContainer}>
                {/* Warm-Up Hero Banner */}
                <Card isHero style={styles.warmUpCard}>
                  <View style={styles.warmUpBadge}>
                    <Zap size={14} color={colors.accent} />
                    <Text style={[styles.warmUpBadgeText, { color: colors.text }]}>
                      READY TO BEGIN?
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.warmUpTitle,
                      {
                        color: colors.text,
                        fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
                      },
                    ]}
                  >
                    Start a 10-Question Diagnostic Warm-Up
                  </Text>
                  <Text style={[styles.warmUpSub, { color: colors.muted }]}>
                    Take a quick 10-minute baseline test in {currentExamInfo.shortName} to identify your starting strengths and topic weaknesses.
                  </Text>

                  <View style={styles.warmUpActionRow}>
                    <Button
                      title="Start 10-question warm-up"
                      variant="primary"
                      size="md"
                      onPress={() => router.push('/practice')}
                      iconRight={<ArrowRight size={15} color={colors.accentText} />}
                    />
                  </View>
                </Card>

                {/* Daily Goal Box (Clean progress ring without empty zero clutter) */}
                <Card style={styles.goalCard}>
                  <View style={styles.goalRow}>
                    <ProgressRing
                      percentage={0}
                      size={90}
                      strokeWidth={7}
                      label="0/20"
                      sublabel="Questions"
                    />
                    <View style={styles.goalTextWrap}>
                      <Text
                        style={[
                          styles.goalHeadline,
                          {
                            color: colors.text,
                            fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
                          },
                        ]}
                      >
                        Daily Practice Target
                      </Text>
                      <Text style={[styles.goalSubtext, { color: colors.muted }]}>
                        Consistent daily practice of 20 questions increases exam retention by 3.5×. Complete your first warm-up above to start today's goal!
                      </Text>
                    </View>
                  </View>
                </Card>

                {/* Target Exam Series Preview */}
                <View style={styles.sectionArea}>
                  <Text
                    style={[
                      styles.sectionHeaderTitle,
                      {
                        color: colors.text,
                        fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
                      },
                    ]}
                  >
                    {currentExamInfo.shortName} Test Series
                  </Text>
                  <Text style={[styles.sectionHeaderSubtitle, { color: colors.muted }]}>
                    {isSubscribed
                      ? 'Access full CBT mock tests, official solved papers, and practice drills.'
                      : 'Explore free sample papers and official CBT mocks.'}
                  </Text>

                  <View style={{ marginTop: 14 }}>
                    <SeriesCard
                      id={examMode}
                      title={currentExamInfo.fullName}
                      description={currentExamInfo.tagline}
                      testCount={20}
                      isOwned={isSubscribed}
                      price={activeSeriesPrice}
                      originalPrice={activeSeriesOriginal}
                      onPress={() => router.push('/test-list')}
                    />
                  </View>
                </View>

                {/* Single Offer Card */}
                {!isSubscribed && (
                  <OfferCard
                    cardHeading="Get the full series"
                    seriesName={`${currentExamInfo.shortName} Complete Pass 2026`}
                    description={currentExamInfo.tagline}
                    originalPrice={activeSeriesOriginal}
                    currentPrice={activeSeriesPrice}
                    planId={
                      examMode === 'pgt'
                        ? 'pgt-series'
                        : examMode === 'tgt'
                        ? 'tgt-series'
                        : 'monthly'
                    }
                    features={[
                      'All official previous year solved papers',
                      'Full-length timed CBT mock tests with rank prediction',
                      'Step-by-step explanations for all questions',
                      'Topic-wise weakness & accuracy analytics',
                      'Unlimited retakes throughout the 2026 examination cycle',
                    ]}
                  />
                )}
              </View>
            ) : (
              /* 3. BUYER OR USER WITH PAST ATTEMPTS */
              <View style={styles.returningUserContainer}>
                {/* A. Continue Unfinished Test Card */}
                {hasActiveResume && (
                  <Card isHero style={styles.continueCard}>
                    <View style={styles.continueBadge}>
                      <Clock size={13} color={colors.accent} />
                      <Text style={[styles.continueBadgeText, { color: colors.text }]}>
                        IN-PROGRESS SESSION
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.continueTitle,
                        {
                          color: colors.text,
                          fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {activeTests[0].testTitle || 'Mock Examination'}
                    </Text>

                    <Text style={[styles.continueMeta, { color: colors.muted }]}>
                      Question {activeTests[0].currentQuestionIndex + 1} of{' '}
                      {activeTests[0].totalQuestions || 100} · {Math.round(activeTests[0].timeRemaining / 60)} mins remaining
                    </Text>

                    <View style={styles.continueActionRow}>
                      <Button
                        title="Resume Test"
                        variant="primary"
                        size="md"
                        onPress={() =>
                          router.push({
                            pathname: '/mock-test',
                            params: {
                              testId: activeTests[0].testId,
                              resume: 'true',
                              filename: activeTests[0].filename,
                            },
                          } as any)
                        }
                        iconRight={<ArrowRight size={15} color={colors.accentText} />}
                      />
                    </View>
                  </Card>
                )}

                {/* B. Recommended Next */}
                <Card style={styles.recommendedCard}>
                  <View style={styles.recommendedHeader}>
                    <Sparkles size={16} color={colors.accent} />
                    <Text style={[styles.recommendedLabel, { color: colors.muted }]}>
                      RECOMMENDED NEXT
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.recommendedTitle,
                      {
                        color: colors.text,
                        fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
                      },
                    ]}
                  >
                    {weakTopics.length > 0
                      ? `Target Weak Area: ${weakTopics[0].topic}`
                      : `Next Full CBT Mock for ${currentExamInfo.shortName}`}
                  </Text>

                  <Text style={[styles.recommendedSub, { color: colors.muted }]}>
                    {weakTopics.length > 0
                      ? `Your current accuracy in this topic is ${Math.round(weakTopics[0].accuracy)}%. Practice 10 targeted questions to strengthen your score.`
                      : 'Maintain your test-taking pace with realistic exam timing and live rank analytics.'}
                  </Text>

                  <View style={styles.recommendedButtonRow}>
                    <Button
                      title={weakTopics.length > 0 ? 'Drill This Topic' : 'Start Next Mock'}
                      variant={hasActiveResume ? 'secondary' : 'primary'}
                      size="sm"
                      onPress={() =>
                        weakTopics.length > 0
                          ? router.push({
                              pathname: '/practice',
                              params: { topic: weakTopics[0].topic },
                            } as any)
                          : router.push('/test-list')
                      }
                      iconRight={<ChevronRight size={14} color={hasActiveResume ? colors.text : colors.accentText} />}
                    />
                  </View>
                </Card>

                {/* C. Compact Progress Strip */}
                <Card noPadding style={styles.progressStripCard}>
                  <View style={styles.progressStrip}>
                    <View style={styles.progressStripCell}>
                      <Text style={[styles.progressStripVal, { color: colors.text }]}>
                        {overallAccuracy}%
                      </Text>
                      <Text style={[styles.progressStripLbl, { color: colors.muted }]}>
                        Accuracy
                      </Text>
                    </View>

                    <View style={styles.progressStripCell}>
                      <Text style={[styles.progressStripVal, { color: colors.text }]}>
                        {totalAttemptedQuestions}
                      </Text>
                      <Text style={[styles.progressStripLbl, { color: colors.muted }]}>
                        Questions
                      </Text>
                    </View>

                    <View style={styles.progressStripCell}>
                      <Text style={[styles.progressStripVal, { color: colors.text }]}>
                        {totalMinutesSpent}m
                      </Text>
                      <Text style={[styles.progressStripLbl, { color: colors.muted }]}>
                        Study Time
                      </Text>
                    </View>

                    <View style={styles.progressStripCell}>
                      <Text style={[styles.progressStripVal, { color: colors.accent }]}>
                        {profile?.stats?.streak || 1}d
                      </Text>
                      <Text style={[styles.progressStripLbl, { color: colors.muted }]}>
                        Streak
                      </Text>
                    </View>
                  </View>
                </Card>

                {/* D. Recent Tests */}
                <View style={styles.sectionArea}>
                  <View style={styles.sectionHeaderRow}>
                    <Text
                      style={[
                        styles.sectionHeaderTitle,
                        {
                          color: colors.text,
                          fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
                        },
                      ]}
                    >
                      Recent Mock Attempts
                    </Text>
                    <TouchableOpacity onPress={() => router.push('/progress')}>
                      <Text style={[styles.viewAllText, { color: colors.accent }]}>
                        View all
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.recentList}>
                    {testHistory.slice(0, 4).map((item, idx) => (
                      <Card
                        key={idx}
                        style={styles.recentCard}
                        onPress={() =>
                          router.push({
                            pathname: '/test-result',
                            params: { attemptId: item.attemptId || item.id },
                          } as any)
                        }
                      >
                        <View style={styles.recentCardLeft}>
                          <Text style={[styles.recentTitle, { color: colors.text }]} numberOfLines={1}>
                            {item.testTitle || 'Mock Examination'}
                          </Text>
                          <Text style={[styles.recentMeta, { color: colors.muted }]}>
                            {item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Recently'} · {Math.round(item.accuracy || 0)}% score
                          </Text>
                        </View>

                        <View style={styles.recentCardRight}>
                          <Pill
                            label={item.accuracy !== undefined ? `${Math.round(item.accuracy)}%` : 'Done'}
                            variant={item.accuracy && item.accuracy >= 50 ? 'owned' : 'danger'}
                          />
                          <ChevronRight size={14} color={colors.muted} />
                        </View>
                      </Card>
                    ))}
                  </View>
                </View>

                {/* Non-buyers only see the offer once at the bottom */}
                {!isSubscribed && (
                  <View style={{ marginTop: 24 }}>
                    <OfferCard
                      cardHeading="Unlock unlimited full mocks"
                      seriesName={`${currentExamInfo.shortName} Complete Pass`}
                      description="Get complete access to all full-length mocks, solved previous papers, and rank analytics."
                      originalPrice={activeSeriesOriginal}
                      currentPrice={activeSeriesPrice}
                      planId={
                        examMode === 'pgt'
                          ? 'pgt-series'
                          : examMode === 'tgt'
                          ? 'tgt-series'
                          : 'monthly'
                      }
                      features={[
                        'All official previous year solved papers',
                        'Full-length timed CBT mock tests with rank prediction',
                        'Step-by-step explanations for all questions',
                        'Topic-wise weakness & accuracy analytics',
                      ]}
                    />
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Desktop Right Rail */}
          {isDesktop && hasPastAttempts && (
            <View style={styles.desktopRailColumn}>
              {/* 7-Day Streak Week Dots */}
              <Card style={styles.railCard}>
                <View style={styles.railHeaderRow}>
                  <Calendar size={15} color={colors.accent} />
                  <Text style={[styles.railTitle, { color: colors.text }]}>Study Streak</Text>
                </View>

                <View style={styles.streakDotsRow}>
                  {WEEK_DAYS.map((day, idx) => {
                    const isDone = idx === 0 || idx === 1 || idx === 2; // Active mock week
                    return (
                      <View key={idx} style={styles.streakDayColumn}>
                        <View
                          style={[
                            styles.streakDot,
                            {
                              backgroundColor: isDone ? colors.success : colors.surface2,
                              borderColor: isDone ? colors.success : colors.line,
                            },
                          ]}
                        >
                          {isDone && <CheckCircle2 size={10} color={colors.white} />}
                        </View>
                        <Text style={[styles.streakDayLabel, { color: colors.muted }]}>
                          {day}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </Card>

              {/* Weak Topics Rail */}
              {weakTopics.length > 0 && (
                <Card style={styles.railCard}>
                  <View style={styles.railHeaderRow}>
                    <Target size={15} color={colors.danger} />
                    <Text style={[styles.railTitle, { color: colors.text }]}>Focus Areas</Text>
                  </View>
                  <Text style={[styles.railSub, { color: colors.muted }]}>
                    Your lowest accuracy topics. Practice drills are ready:
                  </Text>

                  <View style={styles.weakList}>
                    {weakTopics.slice(0, 3).map((w, idx) => (
                      <View key={idx} style={[styles.weakRow, { borderBottomColor: colors.line }]}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={[styles.weakName, { color: colors.text }]} numberOfLines={1}>
                            {w.topic}
                          </Text>
                          <Text style={[styles.weakAcc, { color: colors.danger }]}>
                            {Math.round(w.accuracy)}% accuracy
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.weakDrillBtn, { backgroundColor: colors.surface2, borderColor: colors.line }]}
                          onPress={() =>
                            router.push({
                              pathname: '/practice',
                              params: { topic: w.topic },
                            } as any)
                          }
                        >
                          <Text style={[styles.weakDrillBtnText, { color: colors.text }]}>
                            Drill
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </Card>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <FirstTimeWalkthrough
        visible={showWalkthrough}
        onComplete={() => setShowWalkthrough(false)}
        onNavigate={(route) => router.push(route as any)}
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14.5,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  contentLayoutRow: {
    flexDirection: 'row',
    gap: 24,
  },
  mainFeedColumn: {
    flex: 1,
  },
  desktopRailColumn: {
    width: 280,
    gap: 16,
  },
  zeroStateContainer: {
    gap: 20,
  },
  returningUserContainer: {
    gap: 20,
  },
  warmUpCard: {
    padding: 24,
  },
  warmUpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  warmUpBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  warmUpTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  warmUpSub: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  warmUpActionRow: {
    alignSelf: 'flex-start',
  },
  goalCard: {
    padding: 20,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  goalTextWrap: {
    flex: 1,
  },
  goalHeadline: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  goalSubtext: {
    fontSize: 13,
    lineHeight: 18,
  },
  sectionArea: {
    marginTop: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionHeaderSubtitle: {
    fontSize: 13.5,
    marginTop: 2,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  continueCard: {
    padding: 22,
  },
  continueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  continueBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  continueTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  continueMeta: {
    fontSize: 13,
    marginBottom: 16,
  },
  continueActionRow: {
    alignSelf: 'flex-start',
  },
  recommendedCard: {
    padding: 20,
  },
  recommendedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  recommendedLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  recommendedTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  recommendedSub: {
    fontSize: 13.5,
    lineHeight: 19,
    marginBottom: 16,
  },
  recommendedButtonRow: {
    alignSelf: 'flex-start',
  },
  progressStripCard: {
    padding: 0,
    overflow: 'hidden',
  },
  progressStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 18,
  },
  progressStripCell: {
    alignItems: 'center',
    flex: 1,
  },
  progressStripVal: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  progressStripLbl: {
    fontSize: 12,
    marginTop: 2,
  },
  recentList: {
    gap: 10,
  },
  recentCard: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentCardLeft: {
    flex: 1,
    marginRight: 12,
  },
  recentTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  recentMeta: {
    fontSize: 12.5,
  },
  recentCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  railCard: {
    padding: 16,
  },
  railHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  railTitle: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  railSub: {
    fontSize: 12.5,
    lineHeight: 17,
    marginBottom: 10,
  },
  streakDotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  streakDayColumn: {
    alignItems: 'center',
    gap: 6,
  },
  streakDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakDayLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  weakList: {
    gap: 10,
  },
  weakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  weakName: {
    fontSize: 13,
    fontWeight: '600',
  },
  weakAcc: {
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 1,
  },
  weakDrillBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  weakDrillBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
});
