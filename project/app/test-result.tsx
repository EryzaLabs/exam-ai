import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  CheckCircle,
  XCircle,
  AlertCircle,
  Award,
  BarChart3,
  Lightbulb,
  Home,
  Share2,
  BookOpen,
  Flag,
  RefreshCw,
  X as CloseIcon,
  ArrowLeft,
  ChevronRight,
  HelpCircle,
  Filter,
} from 'lucide-react-native';
import RenderHtml from 'react-native-render-html';
import SSCCGLService, {
  TestAnalytics,
  SectionAnalytics,
  ParsedMockTest,
  ParsedQuestion,
  UserAnswer,
} from '@/services/ssc-cgl-service';
import { TestProgressService } from '@/services/test-progress-service';
import ReportService, { ReportType } from '@/services/report-service';
import { useTheme } from '@/context/theme-context';

const { width } = Dimensions.get('window');

export default function TestResultScreen() {
  const { isDark, colors } = useTheme();
  const params = useLocalSearchParams();
  const attemptId = params.attemptId as string;

  const [analytics, setAnalytics] = useState<TestAnalytics | null>(null);
  const [test, setTest] = useState<ParsedMockTest | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'sections' | 'solutions'>(
    params.tab === 'solutions' ? 'solutions' : 'overview'
  );
  // Filter questions: defaults to 'incorrect' as requested by the user
  const [questionFilter, setQuestionFilter] = useState<'incorrect' | 'correct' | 'all' | 'skipped'>('incorrect');
  const [language, setLanguage] = useState<'english' | 'hindi'>('english');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingQuestion, setReportingQuestion] = useState<ParsedQuestion | null>(null);
  const [reportType, setReportType] = useState<ReportType>('wrong_answer');
  const [reportDescription, setReportDescription] = useState('');
  const [isReevaluating, setIsReevaluating] = useState(false);

  useEffect(() => {
    loadResults();
  }, [attemptId]);

  const loadResults = async () => {
    try {
        let result: TestAnalytics | null | undefined = null;
        
        // 1. Try Memory first (if just submitted)
        const memoryAttempt = SSCCGLService.getAttempt(attemptId);
        if (memoryAttempt) {
            result = SSCCGLService.submitTest(attemptId);
        }
        
        // 2. Try History (Persistent Storage)
        if (!result) {
            result = await TestProgressService.getTestResult(attemptId);
        }
        
        if (result) {
            setAnalytics(result);
            
            const targetTestId = result.testId || (params.testId as string);
            const targetFilename = (result as any).filename || (params.filename as string);
            
            // Ensure Paper is Loaded
            let testData: ParsedMockTest | null = null;
            if (targetTestId) {
                testData = SSCCGLService.getPaper(targetTestId);
            }
            if (!testData && targetFilename) {
                testData = SSCCGLService.getPaper(targetFilename);
            }
            
            if (!testData) {
                // 1. If filename is provided, fetch directly from /api/papers/:filename
                if (targetFilename) {
                    try {
                        testData = await SSCCGLService.fetchPaper(targetFilename);
                    } catch (e) {
                        console.warn('Failed to fetch paper by filename:', e);
                    }
                }
                
                // 2. Try fetching by identifier (UUID testId) via /api/papers/find/:id
                if (!testData && targetTestId) {
                    try {
                        testData = await SSCCGLService.fetchPaperById(targetTestId);
                    } catch (e) {
                        console.warn('Failed to fetch paper by id:', e);
                    }
                }
                
                // 3. Match against papers list
                if (!testData) {
                    try {
                        const papers = await SSCCGLService.fetchPapersList();
                        const paperInfo = papers.find((p: any) => 
                            p.id === targetTestId || 
                            p.testId === targetTestId || 
                            p.filename === targetFilename ||
                            p.filename === targetTestId ||
                            (result!.testTitle && p.title && p.title.trim().toLowerCase() === result!.testTitle.trim().toLowerCase()) ||
                            (params.testTitle && p.title && p.title.trim().toLowerCase() === (params.testTitle as string).trim().toLowerCase())
                        );
                        if (paperInfo && paperInfo.filename) {
                            testData = await SSCCGLService.fetchPaper(paperInfo.filename);
                        }
                    } catch (e) {
                        console.warn('Failed to fetch paper from list:', e);
                    }
                }
            }

            // Restore exact question order that user saw during the test
            if (testData && result.questionOrder && result.questionOrder.length > 0) {
              const questionMap = new Map<string, ParsedQuestion>();
              testData.sections.forEach(s => s.questions.forEach(q => questionMap.set(q.id, q)));
              
              const sectionStartIndices: number[] = [];
              let curIdx = 0;
              testData.sections.forEach(sec => {
                sectionStartIndices.push(curIdx);
                curIdx += sec.questions.length;
              });

              testData = {
                ...testData,
                sections: testData.sections.map((section, sIdx) => {
                  const start = sectionStartIndices[sIdx];
                  const end = sIdx < testData!.sections.length - 1 
                    ? sectionStartIndices[sIdx + 1] 
                    : result!.questionOrder!.length;
                  const secQuestionIds = result!.questionOrder!.slice(start, end);
                  
                  const orderedQuestions = secQuestionIds
                    .map(qId => questionMap.get(qId)!)
                    .filter(Boolean);

                  return {
                    ...section,
                    questions: orderedQuestions.length > 0 ? orderedQuestions : section.questions
                  };
                })
              };
            }
            
            setTest(testData || null);
        }
    } catch (error) {
        console.error("Error loading results:", error);
    }
  };

  const answers = useMemo(() => {
    const memoryAttempt = SSCCGLService.getAttempt(attemptId);
    return memoryAttempt?.answers || (analytics as any)?.answers || [];
  }, [attemptId, analytics]);

  const questionsMeta = useMemo(() => {
    if (!test) return [];
    let counter = 0;
    return test.sections.flatMap((section) =>
      section.questions.map((q) => {
        counter += 1;
        const userAnswer = answers.find((a: any) => a.questionId === q.id);
        const isAttempted =
          userAnswer !== undefined &&
          userAnswer?.selectedOption !== undefined &&
          userAnswer?.selectedOption !== null &&
          userAnswer?.selectedOption !== -1;
        const isCorrect =
          isAttempted &&
          (userAnswer?.isCorrect === true ||
            userAnswer?.selectedOption === q.correctAnswerIndex);
        const isIncorrect = isAttempted && !isCorrect;
        const isSkipped = !isAttempted;

        return {
          question: q,
          sectionTitle: section.title,
          sectionId: section.id,
          questionNumber: counter,
          userAnswer,
          isAttempted,
          isCorrect,
          isIncorrect,
          isSkipped,
        };
      })
    );
  }, [test, answers]);

  const totalQuestionsCount = questionsMeta.length;
  const correctCount = questionsMeta.filter((q) => q.isCorrect).length;
  const incorrectCount = questionsMeta.filter((q) => q.isIncorrect).length;
  const skippedCount = questionsMeta.filter((q) => q.isSkipped).length;

  const formatTime = (seconds: number): string => {
    const totalSecs = Math.max(0, Math.round(seconds || 0));
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    } else if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const handleReevaluate = async () => {
    try {
      setIsReevaluating(true);
      await loadResults();
      Alert.alert('Refreshed', 'Results reloaded successfully.');
    } catch (error) {
      console.error('Re-evaluation error:', error);
      Alert.alert('Error', 'Failed to refresh test results');
    } finally {
      setIsReevaluating(false);
    }
  };

  const handleReportQuestion = (question: ParsedQuestion) => {
    setReportingQuestion(question);
    setReportType('wrong_answer');
    setReportDescription('');
    setShowReportModal(true);
  };

  const submitReport = async () => {
    if (!reportingQuestion || !reportDescription.trim()) {
      Alert.alert('Error', 'Please provide a description for your report');
      return;
    }

    try {
      await ReportService.submitReport({
        userId: '',
        testId: analytics?.testId || '',
        testTitle: test?.title,
        questionId: reportingQuestion.id,
        questionText: reportingQuestion.questionText.substring(0, 200),
        reportType,
        description: reportDescription,
      });

      Alert.alert(
        'Thank You!',
        'Your report has been submitted. We will review it and take appropriate action.',
        [{ text: 'OK' }]
      );

      setShowReportModal(false);
      setReportingQuestion(null);
      setReportDescription('');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
      console.error('Report submission error:', error);
    }
  };

  const getScoreColor = (score: number, maxScore: number): string => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 75) return '#4CAF50';
    if (percentage >= 50) return '#FF9800';
    return '#F44336';
  };

  const getAccuracyColor = (accuracy: number): string => {
    if (accuracy >= 75) return '#4CAF50';
    if (accuracy >= 50) return '#FF9800';
    return '#F44336';
  };

  const renderOverviewTab = () => {
    if (!analytics || !test) return null;

    const scorePercentage = (analytics.overallScore / analytics.totalMarks) * 100;
    const scoreColor = getScoreColor(analytics.overallScore, analytics.totalMarks);

    return (
      <View style={styles.tabContent}>
        {/* Score Card */}
        <LinearGradient
          colors={[scoreColor, scoreColor + 'CC']}
          style={styles.scoreCard}
        >
          <View style={styles.scoreCardHeader}>
            <Trophy size={48} color="#fff" />
            <Text style={styles.scoreCardTitle}>Your Score</Text>
          </View>

          <View style={styles.scoreCardMain}>
            <Text style={styles.scoreCardScore}>
              {analytics.overallScore.toFixed(1)}
            </Text>
            <Text style={styles.scoreCardMaxScore}>/ {analytics.totalMarks}</Text>
          </View>

          <View style={styles.scoreCardProgress}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(scorePercentage, 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.scoreCardPercentage}>{scorePercentage.toFixed(1)}%</Text>
          </View>

          <View style={styles.scoreCardMeta}>
            <View style={styles.scoreCardMetaItem}>
              <Target size={20} color="#fff" />
              <Text style={styles.scoreCardMetaText}>
                Accuracy: {analytics.accuracy.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.scoreCardMetaItem}>
              <Clock size={20} color="#fff" />
              <Text style={styles.scoreCardMetaText}>
                Time: {formatTime(analytics.timeTaken)}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Quick Review Banner for Incorrect Questions */}
        {incorrectCount > 0 ? (
          <TouchableOpacity
            style={[
              styles.reviewIncorrectBanner,
              {
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
                borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA',
              },
            ]}
            onPress={() => {
              setQuestionFilter('incorrect');
              setSelectedTab('solutions');
            }}
            activeOpacity={0.8}
          >
            <View style={styles.reviewIncorrectLeft}>
              <View style={[styles.reviewIncorrectIcon, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FEE2E2' }]}>
                <XCircle size={22} color="#EF4444" />
              </View>
              <View style={styles.reviewIncorrectTexts}>
                <Text style={[styles.reviewIncorrectTitle, { color: isDark ? '#FCA5A5' : '#991B1B' }]}>
                  Review {incorrectCount} Incorrect {incorrectCount === 1 ? 'Question' : 'Questions'}
                </Text>
                <Text style={[styles.reviewIncorrectSub, { color: isDark ? '#F87171' : '#B91C1C' }]}>
                  Tap to view detailed solutions & correct answers
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color={isDark ? '#FCA5A5' : '#EF4444'} />
          </TouchableOpacity>
        ) : (
          <View
            style={[
              styles.reviewIncorrectBanner,
              {
                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5',
                borderColor: isDark ? 'rgba(16, 185, 129, 0.35)' : '#A7F3D0',
              },
            ]}
          >
            <View style={styles.reviewIncorrectLeft}>
              <View style={[styles.reviewIncorrectIcon, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.25)' : '#D1FAE5' }]}>
                <CheckCircle size={22} color="#10B981" />
              </View>
              <View style={styles.reviewIncorrectTexts}>
                <Text style={[styles.reviewIncorrectTitle, { color: isDark ? '#6EE7B7' : '#065F46' }]}>
                  All Attempted Questions Correct!
                </Text>
                <Text style={[styles.reviewIncorrectSub, { color: isDark ? '#A7F3D0' : '#047857' }]}>
                  Outstanding score! Zero incorrect questions.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Interactive Breakdown / Quick Stats Cards */}
        <View style={styles.quickStatsRow}>
          <TouchableOpacity
            style={[
              styles.quickStatCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => {
              setQuestionFilter('correct');
              setSelectedTab('solutions');
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.quickStatIconWrap, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' }]}>
              <CheckCircle size={20} color="#10B981" />
            </View>
            <Text style={[styles.quickStatValue, { color: colors.textPrimary }]}>{correctCount}</Text>
            <Text style={[styles.quickStatLabel, { color: colors.textSecondary }]}>Correct</Text>
            <Text style={[styles.quickStatHint, { color: '#10B981' }]}>Review →</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.quickStatCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => {
              setQuestionFilter('incorrect');
              setSelectedTab('solutions');
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.quickStatIconWrap, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2' }]}>
              <XCircle size={20} color="#EF4444" />
            </View>
            <Text style={[styles.quickStatValue, { color: colors.textPrimary }]}>{incorrectCount}</Text>
            <Text style={[styles.quickStatLabel, { color: colors.textSecondary }]}>Incorrect</Text>
            <Text style={[styles.quickStatHint, { color: '#EF4444' }]}>Review →</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.quickStatCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => {
              setQuestionFilter('skipped');
              setSelectedTab('solutions');
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.quickStatIconWrap, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB' }]}>
              <AlertCircle size={20} color="#F59E0B" />
            </View>
            <Text style={[styles.quickStatValue, { color: colors.textPrimary }]}>{skippedCount}</Text>
            <Text style={[styles.quickStatLabel, { color: colors.textSecondary }]}>Skipped</Text>
            <Text style={[styles.quickStatHint, { color: '#F59E0B' }]}>Review →</Text>
          </TouchableOpacity>
        </View>

        {/* Strengths & Weaknesses */}
        <View style={styles.strengthsWeaknesses}>
          {analytics.strengthAreas.length > 0 && (
            <View style={styles.strengthsSection}>
              <View style={styles.sectionHeader}>
                <TrendingUp size={24} color="#4CAF50" />
                <Text style={styles.sectionTitle}>Strengths</Text>
              </View>
              <View style={styles.topicsList}>
                {analytics.strengthAreas.map((area, index) => (
                  <View key={index} style={[styles.topicBadge, styles.strengthBadge]}>
                    <Text style={styles.strengthBadgeText}>{area}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {analytics.weaknessAreas.length > 0 && (
            <View style={styles.weaknessSection}>
              <View style={styles.sectionHeader}>
                <TrendingDown size={24} color="#F44336" />
                <Text style={styles.sectionTitle}>Areas to Improve</Text>
              </View>
              <View style={styles.topicsList}>
                {analytics.weaknessAreas.map((area, index) => (
                  <View key={index} style={[styles.topicBadge, styles.weaknessBadge]}>
                    <Text style={styles.weaknessBadgeText}>{area}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Recommendations */}
        {analytics.recommendations.length > 0 && (
          <View style={styles.recommendations}>
            <View style={styles.sectionHeader}>
              <Lightbulb size={24} color="#FF9800" />
              <Text style={styles.sectionTitle}>Recommendations</Text>
            </View>
            {analytics.recommendations.map((rec, index) => (
              <View key={index} style={styles.recommendationItem}>
                <View style={styles.recommendationBullet} />
                <Text style={styles.recommendationText}>{rec}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderSectionsTab = () => {
    if (!analytics) return null;

    return (
      <View style={styles.tabContent}>
        {analytics.sectionAnalytics.map((section) => {
          const accuracyColor = getAccuracyColor(section.accuracy);
          const scorePercentage = (section.score / section.maxScore) * 100;

          return (
            <View key={section.sectionId} style={styles.sectionCard}>
              <View style={styles.sectionCardHeader}>
                <Text style={styles.sectionCardTitle}>{section.sectionTitle}</Text>
                <View
                  style={[styles.sectionCardBadge, { backgroundColor: accuracyColor + '20' }]}
                >
                  <Text style={[styles.sectionCardBadgeText, { color: accuracyColor }]}>
                    {section.accuracy.toFixed(1)}%
                  </Text>
                </View>
              </View>

              <View style={styles.sectionCardScore}>
                <Text style={styles.sectionCardScoreValue}>
                  {section.score.toFixed(1)} / {section.maxScore}
                </Text>
                <View style={styles.sectionProgressBar}>
                  <View
                    style={[
                      styles.sectionProgressFill,
                      {
                        width: `${Math.min(scorePercentage, 100)}%`,
                        backgroundColor: accuracyColor,
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.sectionCardStats}>
                <View style={styles.sectionCardStat}>
                  <Text style={styles.sectionCardStatLabel}>Attempted</Text>
                  <Text style={styles.sectionCardStatValue}>{section.attempted}</Text>
                </View>
                <View style={styles.sectionCardStat}>
                  <Text style={styles.sectionCardStatLabel}>Correct</Text>
                  <Text style={[styles.sectionCardStatValue, { color: '#4CAF50' }]}>
                    {section.correct}
                  </Text>
                </View>
                <View style={styles.sectionCardStat}>
                  <Text style={styles.sectionCardStatLabel}>Incorrect</Text>
                  <Text style={[styles.sectionCardStatValue, { color: '#F44336' }]}>
                    {section.incorrect}
                  </Text>
                </View>
                <View style={styles.sectionCardStat}>
                  <Text style={styles.sectionCardStatLabel}>Skipped</Text>
                  <Text style={[styles.sectionCardStatValue, { color: '#FF9800' }]}>
                    {section.skipped}
                  </Text>
                </View>
              </View>

              <View style={styles.sectionCardTime}>
                <Clock size={16} color="#666" />
                <Text style={styles.sectionCardTimeText}>
                  Avg. {section.averageTimePerQuestion.toFixed(1)}s per question
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderSolutionsTab = () => {
    if (!test || !analytics) return null;

    const filteredQuestions = questionsMeta.filter((item) => {
      if (questionFilter === 'incorrect') return item.isIncorrect;
      if (questionFilter === 'correct') return item.isCorrect;
      if (questionFilter === 'skipped') return item.isSkipped;
      return true; // 'all'
    });

    const sectionsWithQuestions = test.sections
      .map((section) => {
        const matchingItems = filteredQuestions.filter((item) => item.sectionId === section.id);
        return {
          ...section,
          matchingItems,
        };
      })
      .filter((s) => s.matchingItems.length > 0);

    return (
      <View style={styles.tabContent}>
        {/* Question Filter Bar */}
        <View style={[styles.filterBarCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.filterBarHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Filter size={16} color={colors.accent || '#3B82F6'} />
              <Text style={[styles.filterBarTitle, { color: colors.textPrimary }]}>Filter Questions</Text>
            </View>
            <Text style={[styles.filterBarCount, { color: colors.textSecondary }]}>
              Showing {filteredQuestions.length} of {totalQuestionsCount}
            </Text>
          </View>

          <View style={styles.filterPillsRow}>
            <TouchableOpacity
              style={[
                styles.filterPill,
                { borderColor: colors.border, backgroundColor: isDark ? colors.surfaceElevated : '#F8FAFC' },
                questionFilter === 'incorrect' && styles.filterPillIncorrectActive,
              ]}
              onPress={() => setQuestionFilter('incorrect')}
              activeOpacity={0.7}
            >
              <XCircle size={15} color={questionFilter === 'incorrect' ? '#fff' : '#EF4444'} />
              <Text
                style={[
                  styles.filterPillText,
                  { color: colors.textSecondary },
                  questionFilter === 'incorrect' && styles.filterPillTextActive,
                ]}
              >
                Incorrect ({incorrectCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                { borderColor: colors.border, backgroundColor: isDark ? colors.surfaceElevated : '#F8FAFC' },
                questionFilter === 'correct' && styles.filterPillCorrectActive,
              ]}
              onPress={() => setQuestionFilter('correct')}
              activeOpacity={0.7}
            >
              <CheckCircle size={15} color={questionFilter === 'correct' ? '#fff' : '#10B981'} />
              <Text
                style={[
                  styles.filterPillText,
                  { color: colors.textSecondary },
                  questionFilter === 'correct' && styles.filterPillTextActive,
                ]}
              >
                Correct ({correctCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                { borderColor: colors.border, backgroundColor: isDark ? colors.surfaceElevated : '#F8FAFC' },
                questionFilter === 'skipped' && styles.filterPillSkippedActive,
              ]}
              onPress={() => setQuestionFilter('skipped')}
              activeOpacity={0.7}
            >
              <AlertCircle size={15} color={questionFilter === 'skipped' ? '#fff' : '#F59E0B'} />
              <Text
                style={[
                  styles.filterPillText,
                  { color: colors.textSecondary },
                  questionFilter === 'skipped' && styles.filterPillTextActive,
                ]}
              >
                Skipped ({skippedCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                { borderColor: colors.border, backgroundColor: isDark ? colors.surfaceElevated : '#F8FAFC' },
                questionFilter === 'all' && styles.filterPillAllActive,
              ]}
              onPress={() => setQuestionFilter('all')}
              activeOpacity={0.7}
            >
              <HelpCircle size={15} color={questionFilter === 'all' ? '#fff' : colors.textSecondary} />
              <Text
                style={[
                  styles.filterPillText,
                  { color: colors.textSecondary },
                  questionFilter === 'all' && styles.filterPillTextActive,
                ]}
              >
                All ({totalQuestionsCount})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Empty State when no questions match filter */}
        {filteredQuestions.length === 0 ? (
          <View style={[styles.emptyFilterCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View
              style={[
                styles.emptyFilterIconWrap,
                {
                  backgroundColor:
                    questionFilter === 'incorrect'
                      ? isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5'
                      : isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
                },
              ]}
            >
              {questionFilter === 'incorrect' ? (
                <CheckCircle size={40} color="#10B981" />
              ) : questionFilter === 'correct' ? (
                <XCircle size={40} color="#EF4444" />
              ) : (
                <AlertCircle size={40} color="#F59E0B" />
              )}
            </View>
            <Text style={[styles.emptyFilterTitle, { color: colors.textPrimary }]}>
              {questionFilter === 'incorrect'
                ? 'No Incorrect Questions!'
                : questionFilter === 'correct'
                ? 'No Correct Questions'
                : 'No Skipped Questions'}
            </Text>
            <Text style={[styles.emptyFilterSub, { color: colors.textSecondary }]}>
              {questionFilter === 'incorrect'
                ? 'Congratulations! You answered all your attempted questions correctly.'
                : questionFilter === 'correct'
                ? 'Review the questions and explanations below to improve.'
                : 'You attempted every single question in this paper.'}
            </Text>
            <TouchableOpacity
              style={[styles.emptyFilterActionBtn, { backgroundColor: colors.accent || '#3B82F6' }]}
              onPress={() => setQuestionFilter('all')}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyFilterActionBtnText}>
                View All Questions ({totalQuestionsCount})
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          sectionsWithQuestions.map((section) => (
            <View key={section.id} style={styles.solutionsSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.solutionsSectionTitle, { color: colors.textPrimary }]}>
                  {section.title}
                </Text>
                <View
                  style={[
                    styles.sectionCountBadge,
                    {
                      backgroundColor: isDark ? colors.surfaceElevated : '#F1F5F9',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.sectionCountBadgeText, { color: colors.textSecondary }]}>
                    {section.matchingItems.length} {section.matchingItems.length === 1 ? 'question' : 'questions'}
                  </Text>
                </View>
              </View>

              {section.matchingItems.map((item) => {
                const { question, questionNumber, userAnswer, isAttempted, isCorrect } = item;

                return (
                  <View
                    key={question.id}
                    style={[
                      styles.solutionCard,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <View style={styles.solutionHeader}>
                      <Text style={[styles.solutionQuestionNumber, { color: colors.textSecondary }]}>
                        Question {questionNumber}
                      </Text>
                      <View
                        style={[
                          styles.solutionStatusBadge,
                          isCorrect
                            ? styles.solutionCorrectBadge
                            : isAttempted
                            ? styles.solutionIncorrectBadge
                            : styles.solutionSkippedBadge,
                        ]}
                      >
                        {isCorrect ? (
                          <CheckCircle size={16} color="#fff" />
                        ) : isAttempted ? (
                          <XCircle size={16} color="#fff" />
                        ) : (
                          <AlertCircle size={16} color="#fff" />
                        )}
                        <Text style={styles.solutionStatusText}>
                          {isCorrect ? 'Correct' : isAttempted ? 'Incorrect' : 'Skipped'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.solutionQuestion}>
                      <RenderHtml
                        contentWidth={width - 64}
                        source={{
                          html: (language === 'hindi' && question.questionTextHindi
                            ? question.questionTextHindi
                            : question.questionText
                          ).replace(/\n/g, '<br />'),
                        }}
                        baseStyle={{
                          ...styles.solutionQuestionText,
                          color: colors.textPrimary,
                        }}
                      />
                    </View>

                    <View style={styles.solutionOptions}>
                      {(language === 'hindi' && question.optionsHindi && question.optionsHindi.length > 0
                        ? question.optionsHindi
                        : question.options
                      ).map((option, optIndex) => {
                        const isCorrectAnswer = optIndex === question.correctAnswerIndex;
                        const isUserAnswer = optIndex === userAnswer?.selectedOption;

                        return (
                          <View
                            key={optIndex}
                            style={[
                              styles.solutionOption,
                              {
                                backgroundColor: isDark ? colors.surfaceElevated : '#f9f9f9',
                                borderColor: colors.border,
                              },
                              isCorrectAnswer && (isDark ? styles.solutionOptionCorrectDark : styles.solutionOptionCorrect),
                              isUserAnswer && !isCorrect && (isDark ? styles.solutionOptionWrongDark : styles.solutionOptionWrong),
                            ]}
                          >
                            <View style={styles.solutionOptionHeader}>
                              <Text style={[styles.solutionOptionLabel, { color: colors.textSecondary }]}>
                                Option {optIndex + 1}
                              </Text>
                              {isCorrectAnswer && (
                                <View style={styles.correctAnswerBadge}>
                                  <CheckCircle size={14} color="#10B981" />
                                  <Text style={styles.correctAnswerText}>Correct Answer</Text>
                                </View>
                              )}
                              {isUserAnswer && !isCorrect && (
                                <View style={styles.yourAnswerBadge}>
                                  <Text style={styles.yourAnswerText}>Your Answer</Text>
                                </View>
                              )}
                            </View>
                            <RenderHtml
                              contentWidth={width - 96}
                              source={{ html: option.replace(/\n/g, '<br />') }}
                              baseStyle={{
                                ...styles.solutionOptionText,
                                color: colors.textPrimary,
                              }}
                            />
                          </View>
                        );
                      })}
                    </View>

                    <View
                      style={[
                        styles.solutionExplanation,
                        {
                          backgroundColor: isDark ? 'rgba(245, 158, 11, 0.08)' : '#FFF9E6',
                          borderLeftColor: '#F59E0B',
                        },
                      ]}
                    >
                      <View style={styles.solutionExplanationHeader}>
                        <Text style={[styles.solutionExplanationTitle, { color: colors.textPrimary }]}>
                          Explanation
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity
                            style={[
                              styles.reportButton,
                              {
                                borderColor: colors.accent || '#3B82F6',
                                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#F0F7FF',
                              },
                            ]}
                            onPress={() => {
                              const prompt = 'Can you explain this question in detail?\n\nQuestion: ' + question.questionText + '\n\nCorrect Answer: Option ' + (question.correctAnswerIndex + 1);
                              router.push({ pathname: '/assistant', params: { prompt } });
                            }}
                          >
                            <Lightbulb size={16} color={colors.accent || '#3B82F6'} />
                            <Text style={[styles.reportButtonText, { color: colors.accent || '#3B82F6' }]}>
                              Ask AI
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.reportButton}
                            onPress={() => handleReportQuestion(question)}
                          >
                            <Flag size={16} color="#FF9500" />
                            <Text style={styles.reportButtonText}>Report</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      <Text style={[styles.solutionExplanationText, { color: colors.textSecondary }]}>
                        {language === 'hindi' && question.explanation.hindi
                          ? question.explanation.hindi
                          : question.explanation.english}
                      </Text>
                      {question.keyConcepts.length > 0 && (
                        <View style={styles.solutionKeyConcepts}>
                          <Text style={[styles.solutionKeyConceptsTitle, { color: colors.textSecondary }]}>
                            Key Concepts:
                          </Text>
                          <View style={styles.solutionKeyConceptsList}>
                            {question.keyConcepts.map((concept, i) => (
                              <View key={i} style={styles.keyConceptBadge}>
                                <Text style={styles.keyConceptText}>{concept}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        )}
      </View>
    );
  };

  if (!analytics || !test) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading results...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#4A90E2', '#357ABD']}
        style={styles.header}
      >
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4}}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <TouchableOpacity onPress={() => router.back()} style={{marginRight: 12}}>
              <ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Test Results</Text>
          </View>
          <TouchableOpacity
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
            }}
            onPress={() => setLanguage(l => l === 'english' ? 'hindi' : 'english')}
          >
            <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 13}}>
              {language === 'english' ? 'A/अ' : 'अ/A'}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>{test.title}</Text>
      </LinearGradient>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'overview' && { borderBottomColor: colors.accent || '#3B82F6' }]}
          onPress={() => setSelectedTab('overview')}
        >
          <BarChart3
            size={20}
            color={selectedTab === 'overview' ? (colors.accent || '#3B82F6') : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: selectedTab === 'overview' ? (colors.accent || '#3B82F6') : colors.textSecondary },
              selectedTab === 'overview' && styles.tabTextActive,
            ]}
          >
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'sections' && styles.tabActive]}
          onPress={() => setSelectedTab('sections')}
        >
          <Target
            size={20}
            color={selectedTab === 'sections' ? (colors.accent || '#3B82F6') : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: selectedTab === 'sections' ? (colors.accent || '#3B82F6') : colors.textSecondary },
              selectedTab === 'sections' && styles.tabTextActive,
            ]}
          >
            Sections
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'solutions' && styles.tabActive]}
          onPress={() => setSelectedTab('solutions')}
        >
          <BookOpen
            size={20}
            color={selectedTab === 'solutions' ? (colors.accent || '#3B82F6') : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: selectedTab === 'solutions' ? (colors.accent || '#3B82F6') : colors.textSecondary },
              selectedTab === 'solutions' && styles.tabTextActive,
            ]}
          >
            Solutions
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {selectedTab === 'overview' && renderOverviewTab()}
        {selectedTab === 'sections' && renderSectionsTab()}
        {selectedTab === 'solutions' && renderSolutionsTab()}
      </ScrollView>

      {/* Footer Actions */}
      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={styles.footerButton}
          onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/test-list'); } }}
        >
          <Home size={20} color="#4A90E2" />
          <Text style={styles.footerButtonText}>Back to Tests</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.footerButton}
          onPress={handleReevaluate}
          disabled={isReevaluating}
        >
          {isReevaluating ? (
            <ActivityIndicator size="small" color="#4A90E2" />
          ) : (
            <RefreshCw size={20} color="#4A90E2" />
          )}
          <Text style={styles.footerButtonText}>Re-evaluate</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.footerButton}>
          <Share2 size={20} color="#4A90E2" />
          <Text style={styles.footerButtonText}>Share Result</Text>
        </TouchableOpacity>
      </View>

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Question</Text>
              <TouchableOpacity
                onPress={() => setShowReportModal(false)}
                style={styles.modalCloseButton}
              >
                <CloseIcon size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Report Type</Text>
              <View style={styles.reportTypeContainer}>
                {[
                  { value: 'wrong_answer' as ReportType, label: 'Wrong Answer' },
                  { value: 'incorrect_question' as ReportType, label: 'Incorrect Question' },
                  { value: 'typo' as ReportType, label: 'Typo/Error' },
                  { value: 'inappropriate' as ReportType, label: 'Inappropriate' },
                  { value: 'other' as ReportType, label: 'Other' },
                ].map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.reportTypeButton,
                      reportType === type.value && styles.reportTypeButtonActive,
                    ]}
                    onPress={() => setReportType(type.value)}
                  >
                    <Text
                      style={[
                        styles.reportTypeButtonText,
                        reportType === type.value && styles.reportTypeButtonTextActive,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Description</Text>
              <TextInput
                style={styles.reportInput}
                multiline
                numberOfLines={4}
                placeholder="Please describe the issue in detail..."
                value={reportDescription}
                onChangeText={setReportDescription}
                textAlignVertical="top"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalButtonCancel}
                  onPress={() => setShowReportModal(false)}
                >
                  <Text style={styles.modalButtonCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalButtonSubmit}
                  onPress={submitReport}
                >
                  <Text style={styles.modalButtonSubmitText}>Submit Report</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#4A90E2',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#4A90E2',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
    gap: 16,
  },
  scoreCard: {
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  scoreCardHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginTop: 8,
  },
  scoreCardMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 16,
  },
  scoreCardScore: {
    fontSize: 56,
    fontWeight: '800',
    color: '#fff',
  },
  scoreCardMaxScore: {
    fontSize: 28,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 8,
  },
  scoreCardProgress: {
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  scoreCardPercentage: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'right',
  },
  scoreCardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
  },
  scoreCardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreCardMetaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  quickStats: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  quickStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickStatItem: {
    alignItems: 'center',
    gap: 8,
  },
  quickStatValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#333',
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#666',
  },
  strengthsWeaknesses: {
    gap: 16,
  },
  strengthsSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  weaknessSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  topicsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  strengthBadge: {
    backgroundColor: '#E8F5E9',
  },
  strengthBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  weaknessBadge: {
    backgroundColor: '#FFEBEE',
  },
  weaknessBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F44336',
  },
  recommendations: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  recommendationItem: {
    flexDirection: 'row',
    marginTop: 12,
    paddingLeft: 8,
  },
  recommendationBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF9800',
    marginRight: 12,
    marginTop: 8,
  },
  recommendationText: {
    flex: 1,
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  sectionCardBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  sectionCardBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionCardScore: {
    marginBottom: 16,
  },
  sectionCardScoreValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  sectionProgressBar: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  sectionProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  sectionCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionCardStat: {
    alignItems: 'center',
  },
  sectionCardStatLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  sectionCardStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  sectionCardTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  sectionCardTimeText: {
    fontSize: 13,
    color: '#666',
  },
  solutionsSection: {
    marginBottom: 24,
  },
  solutionsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  solutionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  solutionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  solutionQuestionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  solutionStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  solutionCorrectBadge: {
    backgroundColor: '#4CAF50',
  },
  solutionIncorrectBadge: {
    backgroundColor: '#F44336',
  },
  solutionSkippedBadge: {
    backgroundColor: '#FF9800',
  },
  solutionStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  solutionQuestion: {
    marginBottom: 16,
  },
  solutionQuestionText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  solutionOptions: {
    gap: 12,
    marginBottom: 20,
  },
  solutionOption: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  solutionOptionCorrect: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  solutionOptionWrong: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  solutionOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  solutionOptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  correctAnswerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  correctAnswerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4CAF50',
  },
  yourAnswerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#F44336',
  },
  yourAnswerText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  solutionOptionText: {
    fontSize: 14,
    color: '#333',
  },
  solutionExplanation: {
    padding: 16,
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  solutionExplanationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  solutionExplanationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  reportButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9500',
  },
  solutionExplanationText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  solutionKeyConcepts: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#FFE082',
  },
  solutionKeyConceptsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    marginBottom: 8,
  },
  solutionKeyConceptsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  keyConceptBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FFE082',
  },
  keyConceptText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F57C00',
  },
  footer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
  },
  footerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  reportTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  reportTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  reportTypeButtonActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#4A90E2',
  },
  reportTypeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  reportTypeButtonTextActive: {
    color: '#4A90E2',
  },
  reportInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 100,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  modalButtonCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  modalButtonSubmit: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
  },
  modalButtonSubmitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  reviewIncorrectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  reviewIncorrectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  reviewIncorrectIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewIncorrectTexts: {
    flex: 1,
  },
  reviewIncorrectTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  reviewIncorrectSub: {
    fontSize: 12,
  },
  quickStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickStatCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  quickStatIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickStatHint: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  filterBarCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  filterBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterBarTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  filterBarCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  filterPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterPillIncorrectActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  filterPillCorrectActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  filterPillSkippedActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  filterPillAllActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  emptyFilterCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    marginVertical: 12,
  },
  emptyFilterIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyFilterTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyFilterSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    maxWidth: 280,
  },
  emptyFilterActionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyFilterActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionCountBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  solutionOptionCorrectDark: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  solutionOptionWrongDark: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
  },
});
