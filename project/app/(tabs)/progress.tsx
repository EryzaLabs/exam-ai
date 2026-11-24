import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  BarChart2,
  TrendingUp,
  Target,
  Clock,
  Calendar,
  Zap,
  ArrowRight,
  CheckCircle2,
  Award,
  AlertCircle,
} from 'lucide-react-native';
import { useAuth } from '@/context/auth-context';
import { useSub } from '@/context/subscription-context';
import { useExam } from '@/context/exam-context';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';
import { TestProgressService, TestResult } from '@/services/test-progress-service';
import UserService from '@/services/user-service';
import { extractTestTopicAndSubject } from '@/utils/topic-resolver';
import AppShell from '@/components/chalkboard/AppShell';
import Card from '@/components/chalkboard/Card';
import Chip from '@/components/chalkboard/Chip';
import Pill from '@/components/chalkboard/Pill';
import Button from '@/components/chalkboard/Button';
import TopicBar from '@/components/chalkboard/TopicBar';
import EmptyState from '@/components/chalkboard/EmptyState';
import ProgressRing from '@/components/chalkboard/ProgressRing';

export default function AnalyticsScreen() {
  const { user } = useAuth();
  const { isSubscribed } = useSub();
  const { examMode, examInfo } = useExam();
  const { colors, typography, radii } = useChalkboardTheme();

  const [loading, setLoading] = useState(true);
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | 'all'>('30d');
  const [showTableFallback, setShowTableFallback] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      if (!user) {
        setLoading(false);
        return;
      }

      const p = await UserService.getUserProfile(user.uid);
      const h = await TestProgressService.getTestHistory();
      setProfile(p);
      setTestHistory(h || []);
    } catch (e) {
      console.warn('Analytics load error:', e);
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

  // Date range filtering
  const filteredHistory = useMemo(() => {
    if (dateRange === 'all') return testHistory;

    const days = dateRange === '7d' ? 7 : 30;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    return testHistory.filter((t) => {
      if (!t.date) return true;
      return new Date(t.date).getTime() >= cutoff;
    });
  }, [testHistory, dateRange]);

  // Aggregate stats
  const totalAttempted = useMemo(() => {
    return filteredHistory.reduce((sum, t) => {
      const cnt =
        t.totalQuestions ||
        t.sectionAnalytics?.reduce((s: number, a: any) => s + (a.attempted || 0), 0) ||
        (t.answers ? t.answers.length : 0);
      return sum + cnt;
    }, 0);
  }, [filteredHistory]);

  const totalCorrect = useMemo(() => {
    return filteredHistory.reduce((sum, t) => {
      const cnt =
        t.totalCorrect ??
        (t.sectionAnalytics?.reduce((s: number, a: any) => s + (a.correct || 0), 0) ||
          (t.answers ? t.answers.filter((a: any) => a.isCorrect).length : 0));
      return sum + cnt;
    }, 0);
  }, [filteredHistory]);

  const accuracy =
    totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

  const totalMinutes = useMemo(() => {
    return Math.round(
      filteredHistory.reduce((sum, t) => sum + (t.timeTaken || 0), 0) / 60
    );
  }, [filteredHistory]);

  // Topic mastery list (sorted weakest first)
  const topicMasteryList = useMemo(() => {
    const map: Record<string, { topic: string; total: number; correct: number }> = {};

    filteredHistory.forEach((t) => {
      const meta = extractTestTopicAndSubject({
        testTitle: t.testTitle,
        filename: (t as any).filename,
      });

      if (t.sectionAnalytics && t.sectionAnalytics.length > 0) {
        t.sectionAnalytics.forEach((sec: any) => {
          let name = sec.sectionName || sec.title || '';
          if (
            !name ||
            name === 'General' ||
            name === 'Core Subject' ||
            name.toLowerCase().startsWith('correct answer:') ||
            name.length > 65
          ) {
            name = meta?.topic || 'Educational Administration & Governance';
          }
          if (!map[name]) map[name] = { topic: name, total: 0, correct: 0 };
          map[name].total += sec.attempted || 0;
          map[name].correct += sec.correct || 0;
        });
      } else if (t.answers && t.answers.length > 0) {
        const name = meta?.topic || 'Educational Administration & Governance';
        if (!map[name]) map[name] = { topic: name, total: 0, correct: 0 };
        map[name].total += t.answers.length;
        map[name].correct += t.answers.filter((a: any) => a.isCorrect).length;
      }
    });

    return Object.values(map)
      .map((item) => ({
        ...item,
        accuracy: item.total > 0 ? (item.correct / item.total) * 100 : 0,
      }))
      .sort((a, b) => a.accuracy - b.accuracy); // weakest first
  }, [filteredHistory]);

  if (loading) {
    return (
      <View style={[styles.centerLoading, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.muted }]}>
          Loading performance analytics...
        </Text>
      </View>
    );
  }

  // 1. Logged-out state
  if (!user) {
    return (
      <AppShell maxWidth={820}>
        <View style={styles.stateWrapper}>
          <EmptyState
            icon={<BarChart2 size={26} color={colors.accent} />}
            title="Sign in to view your analytics"
            description="Track your accuracy trends, topic weaknesses, study streaks, and rank percentiles across all CBT exams."
            action={{
              label: 'Sign in to account',
              variant: 'primary',
              onPress: () => router.push('/(auth)/login'),
            }}
          />
        </View>
      </AppShell>
    );
  }

  // 2. Free user with no attempts
  if (testHistory.length === 0) {
    return (
      <AppShell maxWidth={820}>
        <View style={styles.stateWrapper}>
          <EmptyState
            icon={<Target size={26} color={colors.accent} />}
            title="No test data recorded yet"
            description="Take your first 10-question warm-up test to generate your baseline accuracy and topic mastery analytics."
            action={{
              label: 'Start 10-question warm-up',
              variant: 'primary',
              onPress: () => router.push('/practice'),
              icon: <Zap size={14} color={colors.accentText} />,
            }}
          />
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell maxWidth={840}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerBlock}>
          <Text
            style={[
              styles.screenTitle,
              {
                color: colors.text,
                fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
              },
            ]}
          >
            Performance Analytics
          </Text>
          <Text style={[styles.screenSubtitle, { color: colors.muted }]}>
            Detailed diagnostic insights across your mock tests and practice sets.
          </Text>

          {/* Date range filter chips */}
          <View style={styles.dateFilterRow}>
            <Chip
              label="Last 7 Days"
              active={dateRange === '7d'}
              onPress={() => setDateRange('7d')}
            />
            <Chip
              label="Last 30 Days"
              active={dateRange === '30d'}
              onPress={() => setDateRange('30d')}
            />
            <Chip
              label="All Time"
              active={dateRange === 'all'}
              onPress={() => setDateRange('all')}
            />
          </View>
        </View>

        {/* Top Summary Cards */}
        <Card style={styles.overviewCard}>
          <View style={styles.overviewRow}>
            <ProgressRing
              percentage={accuracy}
              size={110}
              strokeWidth={8}
              label={`${accuracy}%`}
              sublabel="Accuracy"
            />

            <View style={styles.overviewDetails}>
              <Text
                style={[
                  styles.overviewHeadline,
                  {
                    color: colors.text,
                    fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
                  },
                ]}
              >
                {accuracy >= 75
                  ? 'Strong Conceptual Grasp'
                  : accuracy >= 50
                  ? 'Moderate Foundation'
                  : 'Focus on Weaker Topics'}
              </Text>
              <Text style={[styles.overviewSub, { color: colors.muted }]}>
                {accuracy >= 75
                  ? 'Your answers reflect high accuracy across the syllabus. Keep practicing timed mocks to maximize speed.'
                  : 'Review missed question explanations and drill topics below 50% accuracy to ensure a safe cutoff margin.'}
              </Text>

              <View style={styles.statPillsRow}>
                <View style={[styles.statPill, { backgroundColor: colors.surface2 }]}>
                  <Text style={[styles.statPillLabel, { color: colors.muted }]}>
                    Questions:
                  </Text>
                  <Text style={[styles.statPillVal, { color: colors.text }]}>
                    {totalAttempted}
                  </Text>
                </View>

                <View style={[styles.statPill, { backgroundColor: colors.surface2 }]}>
                  <Text style={[styles.statPillLabel, { color: colors.muted }]}>
                    Time:
                  </Text>
                  <Text style={[styles.statPillVal, { color: colors.text }]}>
                    {totalMinutes}m
                  </Text>
                </View>

                <View style={[styles.statPill, { backgroundColor: colors.surface2 }]}>
                  <Text style={[styles.statPillLabel, { color: colors.muted }]}>
                    Tests Taken:
                  </Text>
                  <Text style={[styles.statPillVal, { color: colors.text }]}>
                    {filteredHistory.length}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Card>

        {/* Topic Mastery List (sorted weakest first with practice button) */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: colors.text,
                    fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
                  },
                ]}
              >
                Topic Mastery
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
                Sorted weakest-first. Topics below 50% require targeted revision.
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setShowTableFallback(!showTableFallback)}
              style={styles.toggleTableBtn}
            >
              <Text style={[styles.toggleTableText, { color: colors.accent }]}>
                {showTableFallback ? 'Show Bars' : 'View Table'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Accessible Table Fallback */}
          {showTableFallback ? (
            <Card noPadding style={{ marginTop: 12 }}>
              <View style={[styles.tableHeaderRow, { borderBottomColor: colors.line, backgroundColor: colors.surface2 }]}>
                <Text style={[styles.tableColHeader, { flex: 2, color: colors.text }]}>
                  Topic
                </Text>
                <Text style={[styles.tableColHeader, { flex: 1, color: colors.text, textAlign: 'center' }]}>
                  Accuracy
                </Text>
                <Text style={[styles.tableColHeader, { flex: 1, color: colors.text, textAlign: 'right' }]}>
                  Attempted
                </Text>
              </View>

              {topicMasteryList.map((item, idx) => (
                <View
                  key={idx}
                  style={[styles.tableDataRow, { borderBottomColor: colors.line }]}
                >
                  <Text
                    style={[
                      styles.tableDataText,
                      { flex: 2, color: item.accuracy < 50 ? colors.danger : colors.text },
                    ]}
                    numberOfLines={1}
                  >
                    {item.topic}
                  </Text>
                  <Text
                    style={[
                      styles.tableDataText,
                      {
                        flex: 1,
                        color: item.accuracy < 50 ? colors.danger : colors.success,
                        textAlign: 'center',
                        fontWeight: '700',
                      },
                    ]}
                  >
                    {Math.round(item.accuracy)}%
                  </Text>
                  <Text
                    style={[styles.tableDataText, { flex: 1, color: colors.muted, textAlign: 'right' }]}
                  >
                    {item.correct}/{item.total}
                  </Text>
                </View>
              ))}
            </Card>
          ) : (
            <Card noPadding style={{ marginTop: 12 }}>
              {topicMasteryList.map((item, idx) => (
                <View key={idx} style={{ paddingHorizontal: 16 }}>
                  <TopicBar
                    topic={item.topic}
                    accuracy={item.accuracy}
                    attempted={item.total}
                    correct={item.correct}
                    onDrill={() =>
                      router.push({
                        pathname: '/practice',
                        params: { topic: item.topic },
                      } as any)
                    }
                    drillLabel="Practice"
                  />
                </View>
              ))}
            </Card>
          )}
        </View>

        {/* Section Performance */}
        <View style={styles.sectionWrap}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.text,
                fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
              },
            ]}
          >
            Exam History & Recent Scores
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
            Review your past mock tests and compare your score progression.
          </Text>

          <View style={styles.historyList}>
            {filteredHistory.map((h, idx) => (
              <Card
                key={idx}
                style={styles.historyCard}
                onPress={() =>
                  router.push({
                    pathname: '/test-result',
                    params: { attemptId: h.attemptId || h.id },
                  } as any)
                }
              >
                <View style={styles.historyLeft}>
                  <Text style={[styles.historyTitle, { color: colors.text }]} numberOfLines={1}>
                    {h.testTitle || 'Mock Examination'}
                  </Text>
                  <Text style={[styles.historyMeta, { color: colors.muted }]}>
                    {h.date ? new Date(h.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently'} · {Math.round((h.timeTaken || 0) / 60)} mins
                  </Text>
                </View>

                <View style={styles.historyRight}>
                  <Pill
                    label={h.accuracy !== undefined ? `${Math.round(h.accuracy)}% Accuracy` : 'Completed'}
                    variant={h.accuracy && h.accuracy >= 50 ? 'owned' : 'danger'}
                  />
                </View>
              </Card>
            ))}
          </View>
        </View>
      </ScrollView>
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
  stateWrapper: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  headerBlock: {
    marginBottom: 20,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  screenSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  dateFilterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  overviewCard: {
    padding: 24,
    marginBottom: 28,
  },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    flexWrap: 'wrap',
  },
  overviewDetails: {
    flex: 1,
    minWidth: 240,
  },
  overviewHeadline: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  overviewSub: {
    fontSize: 13.5,
    lineHeight: 19,
    marginBottom: 14,
  },
  statPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  statPillLabel: {
    fontSize: 12,
  },
  statPillVal: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  sectionWrap: {
    marginBottom: 32,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13.5,
    marginTop: 2,
  },
  toggleTableBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  toggleTableText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  tableColHeader: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  tableDataRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  tableDataText: {
    fontSize: 13.5,
  },
  historyList: {
    gap: 10,
    marginTop: 14,
  },
  historyCard: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyLeft: {
    flex: 1,
    marginRight: 12,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  historyMeta: {
    fontSize: 12.5,
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
