import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';
import { useSub } from '@/context/subscription-context';
import { SSCCGLService } from '@/services/ssc-cgl-service';
import { INITIAL_PAPERS_CATALOG } from '@/services/paper-service';
import { ExamTarget } from '@/context/exam-context';
import { resolveQuestionTopic } from '@/utils/topic-resolver';
import FirstVisitHeader from '@/components/first-visit/FirstVisitHeader';
import QuizView, { QuizQuestionItem } from '@/components/first-visit/QuizView';
import ResultView, {
  MissedQuestionItem,
  TopicStatItem,
} from '@/components/first-visit/ResultView';

export default function SampleTestScreen() {
  const params = useLocalSearchParams();
  const examId = (params.examId as ExamTarget) || 'upsc';
  const testId = (params.testId as string) || '';

  const { colors } = useChalkboardTheme();
  const { isSubscribed } = useSub();

  const [loading, setLoading] = useState(true);
  const [testTitle, setTestTitle] = useState('Free Sample Mock Test');
  const [questions, setQuestions] = useState<QuizQuestionItem[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});

  const storageKey = `@astra_sample_quiz_${examId}_${testId}`;

  const examDisplayName =
    examId === 'upsc'
      ? 'UPSC Principal'
      : examId === 'uppsc'
      ? 'UP Principal'
      : examId === 'tgt'
      ? 'DSSSB TGT'
      : 'DSSSB PGT';

  // Series pricing details for the offer card on results
  let seriesPrice = 199;
  let originalPrice = 999;
  let planId = 'tgt-series';
  let planDescription =
    'Complete access to all official question papers, full-length CBT mocks, and detailed bilingual solutions.';
  let planFeatures = [
    'All official previous year solved papers',
    'Full-length timed CBT mock tests with rank prediction',
    'Step-by-step explanations for all questions',
    'Topic-wise weakness & accuracy analytics',
    'Unlimited retakes throughout the 2026 examination cycle',
  ];

  if (examId === 'pgt') {
    seriesPrice = 199;
    originalPrice = 999;
    planId = 'pgt-series';
    planDescription =
      'Complete access to official DSSSB PGT solved question papers across all subjects.';
  } else if (examId === 'upsc' || examId === 'uppsc') {
    seriesPrice = 199;
    originalPrice = 399;
    planId = 'monthly';
    planDescription =
      examId === 'upsc'
        ? 'Comprehensive UPSC Principal and Vice-Principal test series pass.'
        : 'Uttar Pradesh Principal and Headmaster recruitment test series pass.';
  }

  // Load paper and saved progress
  useEffect(() => {
    let isCancelled = false;

    const loadData = async () => {
      try {
        setLoading(true);

        // 1. Find paper filename
        let filename = '';
        let title = 'Sample Mock Test';

        const foundInCatalog = INITIAL_PAPERS_CATALOG.find(
          (p) => p.id === testId || p.testId === testId || p.filename === testId
        );
        if (foundInCatalog) {
          filename = foundInCatalog.filename;
          title = foundInCatalog.title;
        } else {
          // Check server papers
          try {
            const serverPapers = await SSCCGLService.fetchPapersList();
            const sp = serverPapers.find(
              (p: any) => p.id === testId || p.testId === testId || p.filename === testId
            );
            if (sp) {
              filename = sp.filename;
              title = sp.title;
            }
          } catch {}
        }

        if (!filename) {
          // If no specific paper matched, pick default first paper for exam
          const fallback = INITIAL_PAPERS_CATALOG.find((p) => {
            if (examId === 'pgt') return p.series === 'pgt' || p.filename.includes('pgt');
            if (examId === 'tgt') return p.series === 'tgt' || p.filename.includes('tgt');
            return p.series === 'upsc' || p.filename.includes('full_mock') || p.filename.includes('topic_wise');
          });
          if (fallback) {
            filename = fallback.filename;
            title = fallback.title;
          }
        }

        let parsed = null;
        if (filename) {
          parsed = await SSCCGLService.fetchPaper(filename);
        }

        if (parsed) {
          setTestTitle(parsed.title || title);

          // Extract all questions across sections
          let allQuestions: QuizQuestionItem[] = [];
          if (parsed.sections && parsed.sections.length > 0) {
            parsed.sections.forEach((sec) => {
              (sec.questions || []).forEach((q) => {
                const exp =
                  typeof q.explanation === 'string'
                    ? q.explanation
                    : q.explanation?.english ||
                      'Official answer key derivation and rationale.';

                allQuestions.push({
                  id: q.id,
                  questionText: q.questionText,
                  options: q.options || [],
                  correctAnswerIndex: q.correctAnswerIndex ?? 0,
                  explanation: exp,
                  topic: resolveQuestionTopic(q, sec.title, parsed.title) || 'Subject Knowledge',
                  section: sec.title,
                });
              });
            });
          }

          // Limit sample test to 20 questions for a snappy high-conversion sample experience
          const sampleSlice = allQuestions.slice(0, 20);
          if (!isCancelled) {
            setQuestions(sampleSlice);
          }
        }

        // 2. Check saved state in AsyncStorage
        try {
          const savedRaw = await AsyncStorage.getItem(storageKey);
          if (savedRaw) {
            const savedState = JSON.parse(savedRaw);
            if (savedState?.answers) {
              setUserAnswers(savedState.answers);
            }
            if (savedState?.completed) {
              setIsCompleted(true);
            }
          }
        } catch {}
      } catch (err) {
        console.error('Failed to load sample test:', err);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [examId, testId, storageKey]);

  // Finish quiz handler
  const handleFinishTest = useCallback(
    async (finalAnswers: Record<number, number>) => {
      setUserAnswers(finalAnswers);
      setIsCompleted(true);
      try {
        await AsyncStorage.setItem(
          storageKey,
          JSON.stringify({
            currentIndex: questions.length - 1,
            answers: finalAnswers,
            completed: true,
          })
        );
      } catch (e) {
        console.warn('Failed to save completion state:', e);
      }
    },
    [storageKey, questions.length]
  );

  // Retake handler
  const handleRetake = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(storageKey);
    } catch {}
    setUserAnswers({});
    setIsCompleted(false);
  }, [storageKey]);

  const handleBackToExam = useCallback(() => {
    router.push(`/exam/${examId}` as any);
  }, [examId]);

  if (loading) {
    return (
      <View style={[styles.centerLoading, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.muted }]}>
          Loading sample test...
        </Text>
      </View>
    );
  }

  // Calculate results if completed
  if (isCompleted) {
    let correctCount = 0;
    const missedQuestions: MissedQuestionItem[] = [];
    const topicAgg: Record<
      string,
      { total: number; correct: number; incorrect: number }
    > = {};

    questions.forEach((q, idx) => {
      const topicName = q.topic || 'General';
      if (!topicAgg[topicName]) {
        topicAgg[topicName] = { total: 0, correct: 0, incorrect: 0 };
      }
      topicAgg[topicName].total += 1;

      const chosenIdx = userAnswers[idx];
      const isCorrect = chosenIdx !== undefined && chosenIdx === q.correctAnswerIndex;

      if (isCorrect) {
        correctCount += 1;
        topicAgg[topicName].correct += 1;
      } else {
        topicAgg[topicName].incorrect += 1;
        missedQuestions.push({
          id: q.id,
          questionNumber: idx + 1,
          questionText: q.questionText,
          topic: q.topic,
          options: q.options,
          chosenIndex: chosenIdx !== undefined ? chosenIdx : -1,
          correctIndex: q.correctAnswerIndex,
          explanation: q.explanation,
        });
      }
    });

    const topicStats: TopicStatItem[] = Object.keys(topicAgg).map((tName) => {
      const item = topicAgg[tName];
      const acc = item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0;
      return {
        topic: tName,
        total: item.total,
        correct: item.correct,
        incorrect: item.incorrect,
        accuracy: acc,
      };
    });

    return (
      <ResultView
        examId={examId}
        examName={examDisplayName}
        testTitle={testTitle}
        totalQuestions={questions.length}
        correctCount={correctCount}
        topicStats={topicStats}
        missedQuestions={missedQuestions}
        offerData={{
          seriesName: `${examDisplayName} Complete Series 2026`,
          description: planDescription,
          originalPrice,
          currentPrice: seriesPrice,
          planId,
          features: planFeatures,
          isUnlocked: isSubscribed,
        }}
        onRetake={handleRetake}
        onBackToExam={handleBackToExam}
      />
    );
  }

  // Otherwise render active Quiz view
  return (
    <QuizView
      examId={examId}
      examName={examDisplayName}
      testId={testId}
      testTitle={testTitle}
      questions={questions}
      onFinishTest={handleFinishTest}
      onExitTest={handleBackToExam}
    />
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
    fontSize: 14,
    fontWeight: '500',
  },
});
