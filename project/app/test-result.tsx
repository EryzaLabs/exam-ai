import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import {
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Bookmark,
  MessageSquare,
  Award,
  Clock,
  Target,
  Sparkles,
  Zap,
  BookOpen,
  BarChart2,
} from 'lucide-react-native';
import SSCCGLService, {
  TestAnalytics,
  ParsedMockTest,
  ParsedQuestion,
} from '@/services/ssc-cgl-service';
import { TestProgressService, TestResult } from '@/services/test-progress-service';
import { addBookmark } from '@/services/bookmark-service';
import { useAuth } from '@/context/auth-context';
import { useSub } from '@/context/subscription-context';
import { useExam } from '@/context/exam-context';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';
import { extractTestTopicAndSubject, resolveQuestionTopic } from '@/utils/topic-resolver';
import AppShell from '@/components/chalkboard/AppShell';
import Card from '@/components/chalkboard/Card';
import Button from '@/components/chalkboard/Button';
import Pill from '@/components/chalkboard/Pill';
import Chip from '@/components/chalkboard/Chip';
import TopicBar from '@/components/chalkboard/TopicBar';
import ProgressRing from '@/components/chalkboard/ProgressRing';
import OfferCard from '@/components/chalkboard/OfferCard';

const cleanHtml = (text?: string): string => {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
};

export default function TestResultScreen() {
  const params = useLocalSearchParams();
  const attemptId = params.attemptId as string;
  const testId = params.testId as string;

  const { colors, typography, radii } = useChalkboardTheme();
  const { user } = useAuth();
  const { isSubscribed } = useSub();
  const { examMode } = useExam();

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<TestResult | null>(null);
  const [paper, setPaper] = useState<ParsedMockTest | null>(null);
  const [activeReviewFilter, setActiveReviewFilter] = useState<
    'all' | 'correct' | 'wrong' | 'unattempted' | 'bookmarked'
  >('all');
  const [bookmarkedSet, setBookmarkedSet] = useState<Set<string>>(new Set());
  const [resultViewMode, setResultViewMode] = useState<'solutions' | 'topics'>('solutions');

  // Load analytics & paper
  useEffect(() => {
    let isCancelled = false;

    const loadResultData = async () => {
      try {
        setLoading(true);

        // 1. Fetch result
        let res: TestResult | undefined;
        if (attemptId) {
          res = await TestProgressService.getTestResult(attemptId);
        }

        if (!res && attemptId) {
          const memoryAnalytics = SSCCGLService.getAnalytics(attemptId);
          if (memoryAnalytics) {
            res = {
              ...memoryAnalytics,
              date: new Date().toISOString(),
            } as any;
          }
        }

        if (!res) {
          const history = await TestProgressService.getTestHistory();
          res = history.find((h) => h.attemptId === attemptId || h.id === attemptId);
        }

        if (isCancelled) return;
        if (res) setResult(res);

        // 2. Fetch paper
        const targetFilename = (res as any)?.filename || (params.filename as string);
        const targetTestId = res?.testId || testId;

        let loadedPaper: ParsedMockTest | null = null;
        if (targetFilename) {
          try {
            loadedPaper = await SSCCGLService.fetchPaper(targetFilename);
          } catch {}
        }

        if (!loadedPaper && targetTestId) {
          loadedPaper = SSCCGLService.getPaper(targetTestId) || null;
        }

        if (!loadedPaper && targetTestId) {
          try {
            loadedPaper = await SSCCGLService.fetchPaperById(targetTestId);
          } catch {}
        }

        if (isCancelled) return;
        if (loadedPaper) setPaper(loadedPaper);
      } catch (err) {
        console.error('Error loading result:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    loadResultData();

    return () => {
      isCancelled = true;
    };
  }, [attemptId, testId]);

  // Aggregate questions with user's attempt answers
  const allQuestions = useMemo(() => {
    if (!paper) return [];
    return paper.sections.flatMap((s) => s.questions);
  }, [paper]);

  const questionsWithStatus = useMemo(() => {
    if (!result) return [];

    const answersMap: Record<string, number> = {};
    if (result.answers && Array.isArray(result.answers)) {
      result.answers.forEach((ans: any) => {
        answersMap[ans.questionId] = ans.selectedOption;
      });
    } else if (result.questionStates) {
      Object.keys(result.questionStates).forEach((qId) => {
        const qs = result.questionStates![qId];
        if (qs.selectedOption !== null && qs.selectedOption !== undefined) {
          answersMap[qId] = qs.selectedOption;
        }
      });
    }

    return allQuestions.map((q, idx) => {
      const selected = answersMap[q.id];
      const hasAnswered = selected !== null && selected !== undefined && selected !== -1;
      const isCorrect = hasAnswered && selected === q.correctAnswerIndex;
      const isWrong = hasAnswered && selected !== q.correctAnswerIndex;
      const isUnattempted = !hasAnswered;

      return {
        ...q,
        globalIndex: idx + 1,
        selectedOption: selected ?? -1,
        hasAnswered,
        isCorrect,
        isWrong,
        isUnattempted,
      };
    });
  }, [allQuestions, result]);

  // Topic Breakdown
  const topicStats = useMemo(() => {
    const map: Record<string, { topic: string; total: number; correct: number }> = {};

    questionsWithStatus.forEach((q) => {
      const top = resolveQuestionTopic(q, q.sectionId, paper?.title);
      if (!map[top]) {
        map[top] = { topic: top, total: 0, correct: 0 };
      }
      map[top].total++;
      if (q.isCorrect) map[top].correct++;
    });

    return Object.values(map)
      .map((item) => ({
        ...item,
        accuracy: item.total > 0 ? (item.correct / item.total) * 100 : 0,
      }))
      .sort((a, b) => a.accuracy - b.accuracy);
  }, [questionsWithStatus, paper]);

  // Weak topics (<50% accuracy)
  const weakTopics = useMemo(() => {
    return topicStats.filter((t) => t.accuracy < 50);
  }, [topicStats]);

  // Satisfactory / Strong topics (>=50% accuracy)
  const strongTopics = useMemo(() => {
    return topicStats.filter((t) => t.accuracy >= 50);
  }, [topicStats]);

  // Filtered Review List
  const filteredQuestions = useMemo(() => {
    return questionsWithStatus.filter((q) => {
      if (activeReviewFilter === 'correct') return q.isCorrect;
      if (activeReviewFilter === 'wrong') return q.isWrong;
      if (activeReviewFilter === 'unattempted') return q.isUnattempted;
      if (activeReviewFilter === 'bookmarked') return bookmarkedSet.has(q.id);
      return true;
    });
  }, [questionsWithStatus, activeReviewFilter, bookmarkedSet]);

  const handleToggleBookmark = (q: any) => {
    const next = new Set(bookmarkedSet);
    if (next.has(q.id)) {
      next.delete(q.id);
    } else {
      next.add(q.id);
      if (user?.uid) {
        addBookmark({
          questionId: q.id,
          questionText: q.questionText,
          testTitle: result?.testTitle || 'Mock Exam',
        }).catch(() => {});
      }
    }
    setBookmarkedSet(next);
  };

  const handleAskAI = (q: any) => {
    const textPrompt = `I need help understanding this exam question:\n\nQuestion: ${cleanHtml(q.questionText)}\n\nMy Answer: Option ${String.fromCharCode(65 + q.selectedOption)}\nCorrect Answer: Option ${String.fromCharCode(65 + q.correctAnswerIndex)}\n\nExplanation: ${cleanHtml(typeof q.explanation === 'string' ? q.explanation : q.explanation?.english)}\n\nPlease explain why my answer is wrong and teach me the core concept.`;
    router.push({
      pathname: '/assistant',
      params: { prefill: textPrompt },
    } as any);
  };

  if (loading || !result) {
    return (
      <View style={[styles.centerLoading, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.muted }]}>
          Computing performance analytics...
        </Text>
      </View>
    );
  }

  const accuracy = Math.round(result.accuracy || 0);
  const totalQuestions = result.totalQuestions || questionsWithStatus.length;
  const correctCount =
    result.totalCorrect ?? questionsWithStatus.filter((q) => q.isCorrect).length;
  const incorrectCount =
    result.totalIncorrect ?? questionsWithStatus.filter((q) => q.isWrong).length;
  const unattemptedCount =
    result.totalUnattempted ?? questionsWithStatus.filter((q) => q.isUnattempted).length;

  const timeMinutes = Math.round((result.timeTaken || 0) / 60);

  // Performance Tier Message
  let tierTitle = 'Good base to build on';
  let tierDesc =
    'You demonstrated clear understanding of syllabus fundamentals. Focused practice on weak topics will help clear the merit cutoff.';
  if (accuracy >= 80) {
    tierTitle = 'Strong start!';
    tierDesc =
      'Outstanding score! Your conceptual foundation is exceptionally strong. Maintain your speed with full-length mocks.';
  } else if (accuracy < 40) {
    tierTitle = 'Plenty of room to grow';
    tierDesc =
      'Identifying your weak areas early is the most valuable part of mock practice. Review missed explanations carefully.';
  }

  return (
    <AppShell maxWidth={840}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Back Link */}
        <TouchableOpacity
          style={styles.backLink}
          onPress={() => router.push('/test-list')}
          activeOpacity={0.7}
        >
          <ArrowLeft size={15} color={colors.muted} />
          <Text style={[styles.backLinkText, { color: colors.muted }]}>
            Back to test series
          </Text>
        </TouchableOpacity>

        {/* Section 1: Score & Performance Summary Card */}
        <Card style={styles.scoreCard}>
          <View style={styles.scoreSummaryRow}>
            {/* Score Ring */}
            <ProgressRing
              percentage={accuracy}
              size={120}
              strokeWidth={9}
              label={`${accuracy}%`}
              sublabel="Accuracy"
            />

            <View style={styles.scoreTextColumn}>
              <View style={styles.badgeRow}>
                <Pill label="OFFICIAL EVALUATION" variant="neutral" />
              </View>

              <Text
                style={[
                  styles.tierHeadline,
                  {
                    color: colors.text,
                    fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
                  },
                ]}
              >
                {tierTitle}
              </Text>
              <Text style={[styles.tierSubtext, { color: colors.muted }]}>
                {tierDesc}
              </Text>

              {/* Metric Chips */}
              <View style={styles.metricChipsRow}>
                <View style={[styles.metricChip, { backgroundColor: colors.surface2 }]}>
                  <Target size={13} color={colors.muted} />
                  <Text style={[styles.metricChipText, { color: colors.text }]}>
                    {correctCount} / {totalQuestions} Correct
                  </Text>
                </View>

                {(result.overallScore !== undefined || (result as any).score !== undefined) && (
                  <View style={[styles.metricChip, { backgroundColor: colors.surface2 }]}>
                    <Award size={13} color={colors.accent} />
                    <Text style={[styles.metricChipText, { color: colors.text }]}>
                      {Math.round((result.overallScore ?? (result as any).score ?? 0) * 10) / 10} / {result.totalMarks || (result as any).maxScore || paper?.totalMarks || (totalQuestions * 2.5)} Marks
                    </Text>
                  </View>
                )}

                <View style={[styles.metricChip, { backgroundColor: colors.surface2 }]}>
                  <Clock size={13} color={colors.muted} />
                  <Text style={[styles.metricChipText, { color: colors.text }]}>
                    {timeMinutes} mins spent
                  </Text>
                </View>

                {result.rank && (
                  <View style={[styles.metricChip, { backgroundColor: colors.surface2 }]}>
                    <Award size={13} color={colors.accent} />
                    <Text style={[styles.metricChipText, { color: colors.text }]}>
                      Rank #{result.rank}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Quick Stats Strip */}
          <View style={[styles.statsStrip, { borderTopColor: colors.line }]}>
            <View style={styles.statCell}>
              <Text style={[styles.statVal, { color: colors.success }]}>
                {correctCount}
              </Text>
              <Text style={[styles.statLbl, { color: colors.muted }]}>Correct</Text>
            </View>

            <View style={styles.statCell}>
              <Text style={[styles.statVal, { color: colors.danger }]}>
                {incorrectCount}
              </Text>
              <Text style={[styles.statLbl, { color: colors.muted }]}>Incorrect</Text>
            </View>

            <View style={styles.statCell}>
              <Text style={[styles.statVal, { color: colors.muted }]}>
                {unattemptedCount}
              </Text>
              <Text style={[styles.statLbl, { color: colors.muted }]}>Unattempted</Text>
            </View>

            <View style={styles.statCell}>
              <Text style={[styles.statVal, { color: colors.text }]}>
                {totalQuestions}
              </Text>
              <Text style={[styles.statLbl, { color: colors.muted }]}>Total Questions</Text>
            </View>
          </View>
        </Card>

        {/* Section 2: Action Buttons */}
        <View style={styles.primaryActionRow}>
          <Button
            title="Retake Mock Test"
            variant="secondary"
            size="md"
            onPress={() =>
              router.push({
                pathname: '/mock-test',
                params: { testId, filename: (result as any).filename },
              } as any)
            }
            icon={<RotateCcw size={15} color={colors.text} />}
            style={{ flex: 1 }}
          />

          {weakTopics.length > 0 && (
            <Button
              title="Drill Weak Topics"
              variant="primary"
              size="md"
              onPress={() =>
                router.push({
                  pathname: '/practice',
                  params: { topic: weakTopics[0].topic },
                } as any)
              }
              icon={<Zap size={15} color={colors.accentText} />}
              style={{ flex: 1 }}
            />
          )}
        </View>

        {/* Section 3: Navigation Switcher between Question Review & Topic Analytics */}
        {topicStats.length > 0 && (
          <View style={[styles.viewModeTabsContainer, { backgroundColor: colors.surface2 }]}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setResultViewMode('solutions')}
              style={[
                styles.viewModeTab,
                resultViewMode === 'solutions' && [
                  styles.viewModeTabActive,
                  { backgroundColor: colors.surface },
                ],
              ]}
            >
              <BookOpen
                size={16}
                color={resultViewMode === 'solutions' ? colors.text : colors.muted}
              />
              <Text
                style={[
                  styles.viewModeTabText,
                  { color: resultViewMode === 'solutions' ? colors.text : colors.muted },
                ]}
              >
                Question Review ({questionsWithStatus.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setResultViewMode('topics')}
              style={[
                styles.viewModeTab,
                resultViewMode === 'topics' && [
                  styles.viewModeTabActive,
                  { backgroundColor: colors.surface },
                ],
              ]}
            >
              <BarChart2
                size={16}
                color={resultViewMode === 'topics' ? colors.text : colors.muted}
              />
              <Text
                style={[
                  styles.viewModeTabText,
                  { color: resultViewMode === 'topics' ? colors.text : colors.muted },
                ]}
              >
                Topic Analytics ({topicStats.length})
              </Text>
              {weakTopics.length > 0 && (
                <View style={[styles.weakCountBadge, { backgroundColor: colors.danger + '20' }]}>
                  <Text style={[styles.weakCountBadgeText, { color: colors.danger }]}>
                    {weakTopics.length} weak
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* View Mode: SOLUTIONS */}
        {resultViewMode === 'solutions' ? (
          <View style={styles.sectionWrap}>
            {/* Compact Weak Topics Banner if applicable */}
            {weakTopics.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setResultViewMode('topics')}
                style={[
                  styles.weakTopicSummaryBanner,
                  {
                    backgroundColor: colors.surface2,
                    borderColor: colors.danger + '35',
                  },
                ]}
              >
                <View style={styles.bannerLeft}>
                  <Target size={16} color={colors.danger} />
                  <Text style={[styles.bannerText, { color: colors.text }]}>
                    <Text style={{ fontWeight: '700', color: colors.danger }}>
                      {weakTopics.length} weak {weakTopics.length === 1 ? 'topic' : 'topics'}
                    </Text>{' '}
                    identified under 50% accuracy.
                  </Text>
                </View>
                <View style={styles.bannerRight}>
                  <Text style={[styles.bannerActionText, { color: colors.text }]}>
                    View Breakdown
                  </Text>
                  <ArrowRight size={13} color={colors.text} />
                </View>
              </TouchableOpacity>
            )}

            <Text
              style={[
                styles.sectionHeading,
                {
                  color: colors.text,
                  fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
                },
              ]}
            >
              Review Solutions & Explanations
            </Text>
            <Text style={[styles.sectionSub, { color: colors.muted }]}>
              Study the official derivations and use "Ask AI" to resolve doubts on difficult questions.
            </Text>

          {/* Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsScroll}
          >
            <Chip
              label="All"
              count={questionsWithStatus.length}
              active={activeReviewFilter === 'all'}
              onPress={() => setActiveReviewFilter('all')}
            />
            <Chip
              label="Correct"
              count={correctCount}
              active={activeReviewFilter === 'correct'}
              onPress={() => setActiveReviewFilter('correct')}
            />
            <Chip
              label="Wrong"
              count={incorrectCount}
              active={activeReviewFilter === 'wrong'}
              onPress={() => setActiveReviewFilter('wrong')}
            />
            <Chip
              label="Unattempted"
              count={unattemptedCount}
              active={activeReviewFilter === 'unattempted'}
              onPress={() => setActiveReviewFilter('unattempted')}
            />
            <Chip
              label="Bookmarked"
              count={bookmarkedSet.size}
              active={activeReviewFilter === 'bookmarked'}
              onPress={() => setActiveReviewFilter('bookmarked')}
            />
          </ScrollView>

          {/* Questions Review Cards List */}
          <View style={styles.questionsReviewList}>
            {filteredQuestions.map((q) => {
              const exp =
                typeof q.explanation === 'string'
                  ? q.explanation
                  : q.explanation?.english ||
                    'Official answer key derivation and rationale.';

              return (
                <Card key={q.id} style={styles.reviewQuestionCard}>
                  {/* Question Header */}
                  <View style={[styles.reviewHeader, { borderBottomColor: colors.line }]}>
                    <View style={styles.reviewHeaderLeft}>
                      <View style={[styles.reviewNumBadge, { backgroundColor: colors.surface2 }]}>
                        <Text style={[styles.reviewNumText, { color: colors.text }]}>
                          Q{q.globalIndex}
                        </Text>
                      </View>

                      {q.isCorrect ? (
                        <Pill
                          label="Correct"
                          variant="free"
                          icon={<CheckCircle2 size={12} color={colors.success} />}
                        />
                      ) : q.isWrong ? (
                        <Pill
                          label="Incorrect"
                          variant="danger"
                          icon={<XCircle size={12} color={colors.danger} />}
                        />
                      ) : (
                        <Pill label="Unattempted" variant="neutral" />
                      )}

                      {(() => {
                        const topicName = resolveQuestionTopic(q, q.sectionId, paper?.title);
                        return topicName ? (
                          <Text
                            style={[styles.reviewTopic, { color: colors.muted }]}
                            numberOfLines={1}
                          >
                            {topicName}
                          </Text>
                        ) : null;
                      })()}
                    </View>

                    <View style={styles.reviewHeaderRight}>
                      <TouchableOpacity
                        style={[
                          styles.reviewActionBtn,
                          {
                            backgroundColor: bookmarkedSet.has(q.id)
                              ? colors.accent
                              : colors.surface2,
                            borderColor: colors.line,
                          },
                        ]}
                        onPress={() => handleToggleBookmark(q)}
                        accessibilityLabel="Bookmark this question"
                      >
                        <Bookmark
                          size={14}
                          color={bookmarkedSet.has(q.id) ? colors.accentText : colors.muted}
                          fill={bookmarkedSet.has(q.id) ? colors.accentText : 'none'}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.reviewActionBtn,
                          { backgroundColor: colors.surface2, borderColor: colors.line },
                        ]}
                        onPress={() => handleAskAI(q)}
                        accessibilityLabel="Ask AI about this question"
                      >
                        <MessageSquare size={14} color={colors.text} />
                        <Text style={[styles.askAIText, { color: colors.text }]}>
                          Ask AI
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Question Text */}
                  <Text
                    style={[
                      styles.reviewQuestionText,
                      {
                        color: colors.text,
                        fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
                      },
                    ]}
                  >
                    {cleanHtml(q.questionText)}
                  </Text>

                  {/* Options */}
                  <View style={styles.reviewOptionsList}>
                    {q.options.map((opt, optIdx) => {
                      const letter = String.fromCharCode(65 + optIdx);
                      const isCorrect = optIdx === q.correctAnswerIndex;
                      const isUserChoice = optIdx === q.selectedOption;

                      let optBg: string = colors.surface;
                      let optBorder: string = colors.line;
                      let textCol: string = colors.muted;

                      if (isCorrect) {
                        optBg = colors.successBg;
                        optBorder = colors.success;
                        textCol = colors.text;
                      } else if (isUserChoice) {
                        optBg = colors.dangerBg;
                        optBorder = colors.danger;
                        textCol = colors.danger;
                      }

                      return (
                        <View
                          key={optIdx}
                          style={[
                            styles.reviewOptionRow,
                            {
                              backgroundColor: optBg,
                              borderColor: optBorder,
                              borderRadius: radii.button,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.reviewOptionLetterBadge,
                              {
                                backgroundColor: isCorrect
                                  ? colors.success
                                  : isUserChoice
                                  ? colors.danger
                                  : colors.surface2,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.reviewOptionLetterText,
                                {
                                  color:
                                    isCorrect || isUserChoice
                                      ? colors.white
                                      : colors.text,
                                },
                              ]}
                            >
                              {letter}
                            </Text>
                          </View>

                          <Text style={[styles.reviewOptionText, { color: textCol }]}>
                            {cleanHtml(opt)}
                          </Text>

                          {isCorrect && (
                            <CheckCircle2 size={16} color={colors.success} />
                          )}
                          {isUserChoice && !isCorrect && (
                            <XCircle size={16} color={colors.danger} />
                          )}
                        </View>
                      );
                    })}
                  </View>

                  {/* Official Solution & Explanation Box */}
                  <View
                    style={[
                      styles.reviewExplanationBox,
                      {
                        backgroundColor: colors.surface2,
                        borderColor: colors.line,
                        borderRadius: radii.button,
                      },
                    ]}
                  >
                    <View style={styles.reviewExplanationHeader}>
                      <CheckCircle2 size={15} color={colors.success} />
                      <Text
                        style={[styles.reviewExplanationTitle, { color: colors.text }]}
                      >
                        Official Answer & Explanation
                      </Text>
                    </View>
                    <Text
                      style={[styles.reviewExplanationBody, { color: colors.text }]}
                    >
                      {cleanHtml(exp)}
                    </Text>
                  </View>
                </Card>
              );
            })}
          </View>
        </View>
        ) : (
          /* View Mode: TOPICS */
          <View style={styles.sectionWrap}>
            <View style={styles.topicsTabHeader}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.sectionHeading,
                    {
                      color: colors.text,
                      fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
                    },
                  ]}
                >
                  Topic Performance Breakdown
                </Text>
                <Text style={[styles.sectionSub, { color: colors.muted }]}>
                  Topics below 50% accuracy are highlighted in red. Focus your revision on these areas.
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setResultViewMode('solutions')}
                style={[
                  styles.backToReviewBtn,
                  {
                    backgroundColor: colors.surface2,
                    borderColor: colors.line,
                  },
                ]}
              >
                <ArrowLeft size={13} color={colors.text} />
                <Text style={[styles.backToReviewBtnText, { color: colors.text }]}>
                  Review Questions
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quick Summary Cards */}
            <View style={styles.topicOverviewCardsRow}>
              <View
                style={[
                  styles.topicStatSummaryCard,
                  { backgroundColor: colors.surface2, borderColor: colors.line },
                ]}
              >
                <Text style={[styles.topicStatSummaryVal, { color: colors.text }]}>
                  {topicStats.length}
                </Text>
                <Text style={[styles.topicStatSummaryLbl, { color: colors.muted }]}>
                  Topics Tested
                </Text>
              </View>

              <View
                style={[
                  styles.topicStatSummaryCard,
                  {
                    backgroundColor:
                      weakTopics.length > 0 ? colors.danger + '12' : colors.surface2,
                    borderColor:
                      weakTopics.length > 0 ? colors.danger + '40' : colors.line,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.topicStatSummaryVal,
                    { color: weakTopics.length > 0 ? colors.danger : colors.text },
                  ]}
                >
                  {weakTopics.length}
                </Text>
                <Text
                  style={[
                    styles.topicStatSummaryLbl,
                    { color: weakTopics.length > 0 ? colors.danger : colors.muted },
                  ]}
                >
                  Weak (&lt;50%)
                </Text>
              </View>

              <View
                style={[
                  styles.topicStatSummaryCard,
                  {
                    backgroundColor: colors.success + '12',
                    borderColor: colors.success + '40',
                  },
                ]}
              >
                <Text style={[styles.topicStatSummaryVal, { color: colors.success }]}>
                  {strongTopics.length}
                </Text>
                <Text style={[styles.topicStatSummaryLbl, { color: colors.success }]}>
                  Strong (≥50%)
                </Text>
              </View>
            </View>

            <Card noPadding style={{ marginTop: 4 }}>
              {topicStats.map((item, idx) => (
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
                    drillLabel="Practice Drill"
                  />
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* Section 5: Offer Card for Non-Buyers */}
        {!isSubscribed && (
          <OfferCard
            cardHeading="Keep going with the full series"
            seriesName={
              examMode === 'pgt'
                ? 'DSSSB PGT Complete Series 2026'
                : examMode === 'tgt'
                ? 'DSSSB TGT Complete Series 2026'
                : 'UPSC & UP Principal Complete Mock Test Series'
            }
            description="Unlock unlimited full-length CBT mock exams, all previous year solved papers, and in-depth rank analytics."
            originalPrice={examMode === 'pgt' || examMode === 'tgt' ? 999 : 399}
            currentPrice={199}
            planId={
              examMode === 'pgt'
                ? 'pgt-series'
                : examMode === 'tgt'
                ? 'tgt-series'
                : 'monthly'
            }
            features={[
              'All official solved previous year papers',
              'Full-length timed CBT mock tests with rank prediction',
              'Step-by-step explanations for all questions',
              'Topic-wise weakness & accuracy analytics',
              'Unlimited retakes throughout the 2026 examination cycle',
            ]}
          />
        )}
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  backLinkText: {
    fontSize: 13.5,
    fontWeight: '500',
  },
  scoreCard: {
    marginBottom: 20,
    padding: 24,
  },
  scoreSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    flexWrap: 'wrap',
  },
  scoreTextColumn: {
    flex: 1,
    minWidth: 240,
  },
  badgeRow: {
    marginBottom: 8,
  },
  tierHeadline: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  tierSubtext: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  metricChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  metricChipText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 18,
    borderTopWidth: 1,
    marginTop: 20,
  },
  statCell: {
    alignItems: 'center',
    flex: 1,
  },
  statVal: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLbl: {
    fontSize: 12,
    marginTop: 2,
  },
  primaryActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
    flexWrap: 'wrap',
  },
  sectionWrap: {
    marginBottom: 32,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  filterChipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 14,
  },
  questionsReviewList: {
    gap: 16,
  },
  reviewQuestionCard: {
    padding: 20,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 14,
  },
  reviewHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  reviewNumBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  reviewNumText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reviewTopic: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  reviewHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  askAIText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  reviewQuestionText: {
    fontSize: 16.5,
    fontWeight: '600',
    lineHeight: 24,
    marginBottom: 16,
  },
  reviewOptionsList: {
    gap: 8,
    marginBottom: 16,
  },
  reviewOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    gap: 10,
  },
  reviewOptionLetterBadge: {
    width: 24,
    height: 24,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewOptionLetterText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  reviewOptionText: {
    fontSize: 13.5,
    lineHeight: 19,
    flex: 1,
  },
  reviewExplanationBox: {
    padding: 14,
    borderWidth: 1,
  },
  reviewExplanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  reviewExplanationTitle: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  reviewExplanationBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  viewModeTabsContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
    marginTop: 20,
    marginBottom: 16,
    gap: 6,
  },
  viewModeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 7,
  },
  viewModeTabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  viewModeTabText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  weakCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 2,
  },
  weakCountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  weakTopicSummaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  bannerText: {
    fontSize: 12.5,
    fontWeight: '500',
    flex: 1,
  },
  bannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bannerActionText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  topicOverviewCardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  topicStatSummaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  topicStatSummaryVal: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  topicStatSummaryLbl: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  topicsTabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  backToReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  backToReviewBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
