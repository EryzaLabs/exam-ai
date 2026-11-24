import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';
import { useAuth } from '@/context/auth-context';
import { useSub } from '@/context/subscription-context';
import { SSCCGLService } from '@/services/ssc-cgl-service';
import PaperService, { INITIAL_PAPERS_CATALOG, ServerPaper } from '@/services/paper-service';
import { PLANS } from '@/app/premium';
import { EXAMS, ExamTarget } from '@/context/exam-context';
import FirstVisitHeader from '@/components/first-visit/FirstVisitHeader';
import ExamHero from '@/components/first-visit/ExamHero';
import SampleQuestionPreview, { SampleQuestionData } from '@/components/first-visit/SampleQuestionPreview';
import ExamTestList, { TestRowItem } from '@/components/first-visit/ExamTestList';
import OfferCard from '@/components/first-visit/OfferCard';
import { FIRST_VISIT_EXAM_STORAGE_KEY } from '@/components/first-visit/ExamPicker';
import { resolveQuestionTopic } from '@/utils/topic-resolver';

export default function ExamScreen() {
  const params = useLocalSearchParams();
  const examId = (params.examId as ExamTarget) || 'upsc';
  const { colors, typography } = useChalkboardTheme();
  const { user } = useAuth();
  const { isSubscribed } = useSub();

  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<TestRowItem[]>([]);
  const [sampleQuestion, setSampleQuestion] = useState<SampleQuestionData | null>(null);
  const [sampleTestId, setSampleTestId] = useState<string>('');
  const [attemptedSampleIds, setAttemptedSampleIds] = useState<Set<string>>(new Set());

  const scrollViewRef = useRef<ScrollView>(null);
  const offerSectionRef = useRef<View>(null);

  // Exam info & metadata
  const examInfo = EXAMS[examId] || EXAMS.upsc;
  const examDisplayName =
    examId === 'upsc'
      ? 'UPSC Principal'
      : examId === 'uppsc'
      ? 'UP Principal'
      : examId === 'tgt'
      ? 'DSSSB TGT'
      : 'DSSSB PGT';

  // Determine series pricing from PLANS / EXAMS
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

  // Load tests and sample question
  useEffect(() => {
    let isCancelled = false;

    const loadExamData = async () => {
      try {
        setLoading(true);

        // 1. Fetch papers list
        let allPapers: ServerPaper[] = [];
        try {
          allPapers = await SSCCGLService.fetchPapersList();
        } catch {
          allPapers = INITIAL_PAPERS_CATALOG || [];
        }

        // 2. Filter papers for this exam
        let filtered: ServerPaper[] = [];
        if (examId === 'tgt') {
          filtered = allPapers.filter(
            (p) => p.series === 'tgt' || p.filename.includes('tgt')
          );
        } else if (examId === 'pgt') {
          filtered = allPapers.filter(
            (p) => p.series === 'pgt' || p.filename.includes('pgt')
          );
        } else if (examId === 'uppsc') {
          filtered = allPapers.filter(
            (p) =>
              p.series === 'uppsc' ||
              p.filename.includes('uppsc') ||
              p.title.toLowerCase().includes('up principal')
          );
          if (filtered.length === 0) {
            // fallback to full mocks adapted for UP Principal
            filtered = allPapers.filter(
              (p) => p.filename.includes('full_mock') || p.series === 'upsc' || p.filename.includes('topic_wise')
            );
          }
        } else {
          // upsc
          filtered = allPapers.filter(
            (p) =>
              p.series === 'upsc' ||
              p.filename.includes('full_mock') ||
              p.filename.includes('topic_wise')
          );
        }

        if (filtered.length === 0) {
          filtered = allPapers;
        }

        // Check local attempted tests
        const attempted = new Set<string>();
        try {
          const keys = await AsyncStorage.getAllKeys();
          keys.forEach((k) => {
            if (k.startsWith(`@astra_sample_quiz_${examId}_`)) {
              const tid = k.replace(`@astra_sample_quiz_${examId}_`, '');
              attempted.add(tid);
            }
          });
        } catch {}

        if (!isCancelled) {
          setAttemptedSampleIds(attempted);
        }

        // Map to TestRowItems. First 2 tests are free samples for unsubscribed users!
        const mappedTests: TestRowItem[] = filtered.slice(0, 30).map((paper, idx) => {
          const isFree = !isSubscribed && idx < 2;
          const isLocked = !isSubscribed && !isFree;
          const tid = paper.testId || paper.id || `test_${idx}`;
          const isAttempted = attempted.has(tid);

          const isTopic =
            paper.filename?.includes('topic_wise') ||
            paper.id?.includes('topic_wise') ||
            paper.subject === 'Topic Wise';

          const questionCount =
            paper.totalQuestions ||
            (isTopic ? 20 : examId === 'pgt' ? 300 : examId === 'tgt' ? 200 : 120);

          let duration = 120;
          if (isTopic) {
            duration = 20;
          } else if (paper.duration) {
            duration = paper.duration > 300 ? Math.round(paper.duration / 60) : paper.duration;
          } else if (examId === 'pgt') {
            duration = 180;
          }

          let marks = 200;
          if (isTopic) {
            marks = paper.totalMarks || (questionCount * 2);
          } else if (paper.totalMarks) {
            marks = paper.totalMarks;
          } else if (examId === 'pgt' || examId === 'upsc' || examId === 'uppsc') {
            marks = 300;
          }

          let displayTitle = paper.title;
          if (examId === 'uppsc') {
            displayTitle = displayTitle.replace(/UPSC Principal/gi, 'UP Principal');
          }

          return {
            id: tid,
            testId: tid,
            filename: paper.filename,
            title: displayTitle,
            questionCount,
            durationMinutes: duration,
            marks,
            isFree,
            isLocked,
            isAttempted,
          };
        });

        if (!isCancelled) {
          setTests(mappedTests);
          if (mappedTests.length > 0) {
            setSampleTestId(mappedTests[0].id);
          }
        }

        // 3. Load a real sample question from the first paper
        if (mappedTests.length > 0) {
          try {
            const firstPaper = mappedTests[0];
            const parsed = await SSCCGLService.fetchPaper(firstPaper.filename);
            if (
              parsed &&
              parsed.sections &&
              parsed.sections.length > 0 &&
              parsed.sections[0].questions &&
              parsed.sections[0].questions.length > 0
            ) {
              const q = parsed.sections[0].questions[0];
              const exp =
                typeof q.explanation === 'string'
                  ? q.explanation
                  : q.explanation?.english ||
                    'Official solution derived using standard exam board methodology.';

              if (!isCancelled) {
                setSampleQuestion({
                  questionText: q.questionText,
                  options: q.options || [],
                  correctAnswerIndex: q.correctAnswerIndex ?? 0,
                  explanation: exp,
                  topic: resolveQuestionTopic(q, parsed.sections[0]?.title, parsed.title) || 'Core Subject',
                });
              }
            }
          } catch (e) {
            console.warn('Could not load sample question preview:', e);
          }
        }
      } catch (err) {
        console.error('Failed to load exam page data:', err);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadExamData();

    return () => {
      isCancelled = true;
    };
  }, [examId, isSubscribed]);

  const handleStartSample = (targetTestId?: string) => {
    const tid = targetTestId || sampleTestId || (tests[0] && tests[0].id);
    if (!tid) return;
    router.push(`/exam/${examId}/sample/${tid}` as any);
  };

  const handleStartTest = (targetTest: TestRowItem) => {
    if (isSubscribed) {
      router.push({
        pathname: '/test-instructions',
        params: {
          testId: targetTest.testId || targetTest.id,
          filename: targetTest.filename,
        },
      } as any);
    } else {
      handleStartSample(targetTest.id);
    }
  };

  const handleHeroStart = () => {
    if (isSubscribed) {
      const first = tests[0];
      if (first) {
        router.push({
          pathname: '/test-instructions',
          params: {
            testId: first.testId || first.id,
            filename: first.filename,
          },
        } as any);
      } else {
        router.push('/test-list');
      }
    } else {
      handleStartSample();
    }
  };

  const handleChangeExam = async () => {
    try {
      await AsyncStorage.removeItem(FIRST_VISIT_EXAM_STORAGE_KEY);
    } catch {}
    router.push('/');
  };

  const handleUnlockScroll = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const el = document.getElementById('offer-card-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  if (loading) {
    return (
      <View style={[styles.centerLoading, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.muted }]}>
          Loading {examDisplayName} tests...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FirstVisitHeader
        showChangeExam={true}
        onChangeExam={handleChangeExam}
        examName={examDisplayName}
      />

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.innerWrapper}>
          {/* Hero Section */}
          <ExamHero
            examName={examDisplayName}
            sampleQuestionCount={tests[0]?.questionCount || 20}
            sampleDurationMinutes={tests[0]?.durationMinutes || 20}
            onStartSampleTest={handleHeroStart}
            isSubscribed={isSubscribed}
          />

          {/* Real Sample Question Explanation Preview */}
          {!isSubscribed && sampleQuestion && <SampleQuestionPreview question={sampleQuestion} />}

          {/* Test List Section (Free tests + Locked tests) */}
          <ExamTestList
            examName={examDisplayName}
            tests={tests}
            onStartTest={handleStartTest}
            onUnlockPress={handleUnlockScroll}
            isSubscribed={isSubscribed}
          />

          {/* Conversion Offer Card Section (Only for non-subscribers) */}
          {!isSubscribed && (
            <View id="offer-card-section" ref={offerSectionRef}>
              <OfferCard
                cardHeading="Get the full series"
                seriesName={`${examDisplayName} Complete Test Series 2026`}
                description={planDescription}
                originalPrice={originalPrice}
                currentPrice={seriesPrice}
                planId={planId}
                features={planFeatures}
                isUnlocked={isSubscribed}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: 'center',
  },
  innerWrapper: {
    maxWidth: 820,
    width: '100%',
  },
});
