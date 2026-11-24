import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import {
  Clock,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Check,
  Flag,
  Grid,
  Bookmark,
  CheckCircle2,
  Globe,
  RotateCcw,
  Send,
} from 'lucide-react-native';
import SSCCGLService, {
  ParsedMockTest,
  ParsedQuestion,
  TestAttempt,
  UserAnswer,
} from '@/services/ssc-cgl-service';
import { TestProgressService, SavedTestState } from '@/services/test-progress-service';
import { addBookmark } from '@/services/bookmark-service';
import { useAuth } from '@/context/auth-context';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';
import Button from '@/components/chalkboard/Button';
import Modal from '@/components/chalkboard/Modal';

interface QuestionState {
  answered: boolean;
  marked: boolean;
  selectedOption: number | null;
  timeTaken: number;
  visited?: boolean;
}

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

export default function MockTestScreen() {
  const { user } = useAuth();
  const { colors, typography, radii } = useChalkboardTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const params = useLocalSearchParams();
  const testId = params.testId as string;
  const resume = params.resume === 'true';
  const initialLang = (params.lang as string) || 'english';

  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<ParsedMockTest | null>(null);
  const [language, setLanguage] = useState<'english' | 'hindi'>(initialLang as any);
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionStates, setQuestionStates] = useState<Map<string, QuestionState>>(new Map());
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showQuestionPalette, setShowQuestionPalette] = useState(false);

  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<number | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const timerRef = useRef<any>(null);
  const autoSaveRef = useRef<any>(null);

  // 1. Flattened questions list
  const getAllQuestions = useCallback((): ParsedQuestion[] => {
    if (!test) return [];
    return test.sections.flatMap((s) => s.questions);
  }, [test]);

  const questions = getAllQuestions();
  const currentQuestion = questions[currentQuestionIndex];
  const currentState = currentQuestion ? questionStates.get(currentQuestion.id) : undefined;

  // 2. Load test & restore state
  useEffect(() => {
    let isCancelled = false;

    const loadTest = async () => {
      try {
        setLoading(true);
        let savedState: SavedTestState | null = null;
        if (resume) {
          savedState = await TestProgressService.getTestProgress(testId);
        }

        const targetFilename = (params.filename as string) || savedState?.filename;
        let paper: ParsedMockTest | null = null;

        if (targetFilename) {
          try {
            paper = await SSCCGLService.fetchPaper(targetFilename);
          } catch {}
        }

        if (!paper && testId) {
          paper = SSCCGLService.getPaper(testId) || null;
        }

        if (!paper) {
          try {
            paper = await SSCCGLService.fetchPaperById(testId);
          } catch {}
        }

        if (!paper) {
          const papers = await SSCCGLService.fetchPapersList();
          const match = papers.find((p: any) => p.id === testId || p.testId === testId);
          if (match && match.filename) {
            paper = await SSCCGLService.fetchPaper(match.filename);
          }
        }

        if (!paper || !paper.sections || paper.sections.length === 0) {
          Alert.alert('Unable to load test', 'Test questions could not be retrieved.');
          router.back();
          return;
        }

        if (isCancelled) return;
        setTest(paper);

        // Initialize attempt
        const newAttempt = SSCCGLService.startTest(paper.id, user?.uid || 'guest');
        setAttempt(newAttempt);

        // Calculate time
        let durationSecs = paper.duration || 7200;
        if (savedState && savedState.timeRemaining > 0) {
          durationSecs = savedState.timeRemaining;
        }
        setTimeRemaining(durationSecs);

        // Initialize question states
        const initialStates = new Map<string, QuestionState>();
        const allQs = paper.sections.flatMap((s) => s.questions);

        allQs.forEach((q) => {
          let selectedOpt: number | null = null;
          let isAnswered = false;
          let isMarked = false;
          let isVisited = false;

          if (savedState && savedState.questionStates && savedState.questionStates[q.id]) {
            const qs = savedState.questionStates[q.id];
            selectedOpt = qs.selectedOption ?? null;
            isAnswered = !!qs.answered;
            isMarked = !!qs.marked;
            isVisited = !!qs.visited;
          }

          initialStates.set(q.id, {
            answered: isAnswered,
            marked: isMarked,
            selectedOption: selectedOpt,
            timeTaken: 0,
            visited: isVisited,
          });
        });

        if (savedState && savedState.currentQuestionIndex >= 0) {
          setCurrentQuestionIndex(Math.min(savedState.currentQuestionIndex, allQs.length - 1));
        }

        setQuestionStates(initialStates);
        setLastSavedTime(Date.now());
      } catch (err) {
        console.error('Error loading mock test:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    loadTest();

    return () => {
      isCancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [testId, resume]);

  // 3. Timer Countdown
  useEffect(() => {
    if (!test || timeRemaining <= 0) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [test, timeRemaining > 0]);

  // 4. State Persistence
  const saveProgress = useCallback(async () => {
    if (!test || !attempt) return;

    const answersRecord: Record<string, number> = {};
    const questionStatesObj: Record<string, any> = {};

    questionStates.forEach((state, qId) => {
      if (state.selectedOption !== null && state.selectedOption !== undefined) {
        answersRecord[qId] = state.selectedOption;
      }
      questionStatesObj[qId] = state;
    });

    const questionOrder = test.sections.flatMap((s) => s.questions.map((q) => q.id));

    const state: SavedTestState = {
      testId: test.id,
      attemptId: attempt.id || `attempt_${Date.now()}`,
      currentQuestionIndex,
      timeRemaining,
      questionStates: questionStatesObj,
      answers: answersRecord,
      lastUpdated: Date.now(),
      questionOrder,
      testTitle: test.title,
      totalQuestions: questions.length,
      filename: (params.filename as string) || (test as any).filename,
    };

    try {
      await TestProgressService.saveCurrentTest(state);
      setLastSavedTime(Date.now());
    } catch (e) {
      console.warn('Failed to auto-save test state:', e);
    }
  }, [test, attempt, currentQuestionIndex, questionStates, timeRemaining, questions.length]);

  // Auto-save interval (every 25s)
  useEffect(() => {
    if (test && attempt && timeRemaining > 0) {
      autoSaveRef.current = setInterval(() => {
        saveProgress();
      }, 25000);

      return () => {
        if (autoSaveRef.current) clearInterval(autoSaveRef.current);
      };
    }
  }, [test, attempt, timeRemaining, saveProgress]);

  // 5. Option Selection
  const handleSelectOption = (optionIndex: number) => {
    if (!currentQuestion) return;

    setQuestionStates((prev) => {
      const next = new Map(prev);
      const existing = next.get(currentQuestion.id) || {
        answered: false,
        marked: false,
        selectedOption: null,
        timeTaken: 0,
        visited: true,
      };

      next.set(currentQuestion.id, {
        ...existing,
        selectedOption: optionIndex,
        answered: true,
        visited: true,
      });

      return next;
    });

    // Save immediately on option pick
    setTimeout(() => saveProgress(), 100);
  };

  const handleClearResponse = () => {
    if (!currentQuestion) return;

    setQuestionStates((prev) => {
      const next = new Map(prev);
      const existing = next.get(currentQuestion.id) || {
        answered: false,
        marked: false,
        selectedOption: null,
        timeTaken: 0,
        visited: true,
      };

      next.set(currentQuestion.id, {
        ...existing,
        selectedOption: null,
        answered: false,
      });

      return next;
    });
  };

  const handleToggleMark = () => {
    if (!currentQuestion) return;

    setQuestionStates((prev) => {
      const next = new Map(prev);
      const existing = next.get(currentQuestion.id) || {
        answered: false,
        marked: false,
        selectedOption: null,
        timeTaken: 0,
        visited: true,
      };

      next.set(currentQuestion.id, {
        ...existing,
        marked: !existing.marked,
        visited: true,
      });

      return next;
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);

      const nextQ = questions[nextIdx];
      if (nextQ) {
        setQuestionStates((prev) => {
          const nextMap = new Map(prev);
          const st = nextMap.get(nextQ.id);
          if (st && !st.visited) {
            nextMap.set(nextQ.id, { ...st, visited: true });
          }
          return nextMap;
        });
      }
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleJumpToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
      setShowQuestionPalette(false);
    }
  };

  // Keyboard navigation for desktop web
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        const opt = parseInt(e.key, 10) - 1;
        handleSelectOption(opt);
      } else if (e.key === 'm' || e.key === 'M') {
        handleToggleMark();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestionIndex, questions.length, currentQuestion]);

  // Back confirmation
  const handleExitAttempt = () => {
    saveProgress();
    router.replace('/(tabs)/practice');
  };

  // 6. Test Submission
  const handleAutoSubmit = () => {
    if (Platform.OS === 'web') {
      window.alert('Time is up. Your exam test is being automatically submitted.');
    } else {
      Alert.alert('Time Expired', 'Your test has been automatically submitted.');
    }
    performSubmit();
  };

  const performSubmit = async () => {
    try {
      setIsSubmitting(true);
      if (!attempt) return;

      const attemptId = attempt.id || `attempt_${Date.now()}`;
      const syncedAnswers: UserAnswer[] = [];

      questionStates.forEach((st, qId) => {
        if (st.answered && st.selectedOption !== null && st.selectedOption !== undefined) {
          const q = questions.find((item) => item.id === qId);
          if (q) {
            const isCorrect = st.selectedOption === q.correctAnswerIndex;
            syncedAnswers.push({
              questionId: qId,
              selectedOption: st.selectedOption,
              timeTaken: st.timeTaken || 0,
              isCorrect,
              marksAwarded: isCorrect ? (q.marks?.positive || 1) : -(q.marks?.negative || 0.25),
            });
          }
        }
      });

      attempt.answers = syncedAnswers;

      const analytics = SSCCGLService.submitTest(attemptId);
      if (analytics) {
        const questionStatesObj: Record<string, any> = {};
        questionStates.forEach((val, k) => {
          questionStatesObj[k] = val;
        });

        await TestProgressService.saveTestResult({
          ...analytics,
          answers: syncedAnswers,
          userAnswers: syncedAnswers.map((a) => a.selectedOption),
          questionStates: questionStatesObj,
          date: new Date().toISOString(),
          testTitle: test?.title,
          filename: (params.filename as string) || (test as any)?.filename,
          questionOrder: questions.map((q) => q.id),
        });
      }

      await TestProgressService.clearTestProgress(testId);

      router.replace({
        pathname: '/test-result',
        params: {
          attemptId,
          testId,
          filename: params.filename as string,
        },
      } as any);
    } catch (err) {
      console.error('Submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper Stats for Palette
  const getQuestionStatus = (qId: string, idx: number) => {
    const st = questionStates.get(qId);
    const isCurrent = idx === currentQuestionIndex;
    const isAns = !!st?.answered && st.selectedOption !== null && st.selectedOption !== undefined;
    const isMark = !!st?.marked;

    if (isAns && isMark) return 'answered-marked';
    if (isMark) return 'marked';
    if (isAns) return 'answered';
    if (st?.visited || isCurrent) return 'not-answered';
    return 'not-visited';
  };

  const stats = {
    answered: 0,
    notAnswered: 0,
    marked: 0,
    notVisited: 0,
  };

  questions.forEach((q, idx) => {
    const s = getQuestionStatus(q.id, idx);
    if (s === 'answered' || s === 'answered-marked') stats.answered++;
    else if (s === 'marked') stats.marked++;
    else if (s === 'not-answered') stats.notAnswered++;
    else stats.notVisited++;
  });

  // Time format
  const formatTime = (secs: number) => {
    const total = Math.max(0, secs);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Danger timer when under 5 mins
  const isTimeUrgent = timeRemaining > 0 && timeRemaining <= 300;

  if (loading || !test || !currentQuestion) {
    return (
      <View style={[styles.centerLoading, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.muted }]}>
          Preparing examination environment...
        </Text>
      </View>
    );
  }

  // Active question text & options depending on language
  const qText =
    language === 'hindi' && currentQuestion.questionTextHindi
      ? currentQuestion.questionTextHindi
      : currentQuestion.questionText;

  const qOpts =
    language === 'hindi' && currentQuestion.optionsHindi && currentQuestion.optionsHindi.length > 0
      ? currentQuestion.optionsHindi
      : currentQuestion.options;

  // Render Palette Content
  const renderPaletteContent = () => (
    <View style={styles.paletteInner}>
      {/* Legend / Status badges with shapes */}
      <View style={[styles.legendGrid, { borderBottomColor: colors.line }]}>
        <View style={styles.legendItem}>
          <View style={[styles.shapeBadge, { backgroundColor: colors.successBg, borderColor: colors.success }]}>
            <Check size={11} color={colors.success} />
          </View>
          <Text style={[styles.legendText, { color: colors.text }]}>
            Answered ({stats.answered})
          </Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.shapeBadge, { backgroundColor: colors.dangerBg, borderColor: colors.danger }]}>
            <View style={[styles.dotMarker, { backgroundColor: colors.danger }]} />
          </View>
          <Text style={[styles.legendText, { color: colors.text }]}>
            Unanswered ({stats.notAnswered})
          </Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.shapeBadge, { backgroundColor: colors.surface2, borderColor: colors.accent }]}>
            <Flag size={11} color={colors.accent} fill={colors.accent} />
          </View>
          <Text style={[styles.legendText, { color: colors.text }]}>
            Marked ({stats.marked})
          </Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.shapeBadge, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <View style={[styles.dotMarker, { backgroundColor: colors.muted }]} />
          </View>
          <Text style={[styles.legendText, { color: colors.muted }]}>
            Not Visited ({stats.notVisited})
          </Text>
        </View>
      </View>

      {/* Questions Matrix */}
      <ScrollView style={styles.paletteScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.gridNumbers}>
          {questions.map((q, idx) => {
            const status = getQuestionStatus(q.id, idx);
            const isCurrent = idx === currentQuestionIndex;

            let badgeBg: string = colors.surface;
            let badgeBorder: string = colors.line;
            let textCol: string = colors.muted;

            if (status === 'answered') {
              badgeBg = colors.successBg;
              badgeBorder = colors.success;
              textCol = colors.success;
            } else if (status === 'answered-marked') {
              badgeBg = colors.successBg;
              badgeBorder = colors.accent;
              textCol = colors.text;
            } else if (status === 'marked') {
              badgeBg = colors.surface2;
              badgeBorder = colors.accent;
              textCol = colors.accent;
            } else if (status === 'not-answered') {
              badgeBg = colors.dangerBg;
              badgeBorder = colors.danger;
              textCol = colors.danger;
            }

            if (isCurrent) {
              badgeBorder = colors.accent;
            }

            return (
              <TouchableOpacity
                key={q.id}
                style={[
                  styles.numButton,
                  {
                    backgroundColor: badgeBg,
                    borderColor: badgeBorder,
                    borderWidth: isCurrent ? 2 : 1,
                    borderRadius: radii.input,
                  },
                ]}
                onPress={() => handleJumpToQuestion(idx)}
                activeOpacity={0.7}
              >
                <Text style={[styles.numText, { color: textCol }]}>{idx + 1}</Text>
                {status === 'marked' && (
                  <View style={styles.cornerFlag}>
                    <Flag size={8} color={colors.accent} fill={colors.accent} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Sticky Distraction-Free Top Bar */}
      <View style={[styles.topBar, { borderBottomColor: colors.line, backgroundColor: colors.surface }]}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            style={[styles.exitBtn, { borderColor: colors.line, backgroundColor: colors.surface2 }]}
            onPress={() => setShowBackConfirm(true)}
            activeOpacity={0.7}
            accessibilityLabel="Exit test session"
          >
            <ArrowLeft size={16} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.testMetaWrap}>
            <Text
              style={[
                styles.testTitleText,
                {
                  color: colors.text,
                  fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
                },
              ]}
              numberOfLines={1}
            >
              {test.title}
            </Text>
            {test.sections && test.sections.length > 1 ? (
              <Text style={[styles.sectionMetaText, { color: colors.muted }]}>
                {test.sections[0].title}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.topBarRight}>
          {/* Saved indicator */}
          {lastSavedTime && (
            <View style={styles.savedBadge}>
              <CheckCircle2 size={12} color={colors.success} />
              <Text style={[styles.savedText, { color: colors.muted }]}>Saved</Text>
            </View>
          )}

          {/* Countdown Timer */}
          <View
            style={[
              styles.timerBadge,
              {
                backgroundColor: isTimeUrgent ? colors.dangerBg : colors.surface2,
                borderColor: isTimeUrgent ? colors.danger : colors.line,
              },
            ]}
          >
            <Clock size={14} color={isTimeUrgent ? colors.danger : colors.muted} />
            <Text
              style={[
                styles.timerText,
                {
                  color: isTimeUrgent ? colors.danger : colors.text,
                  fontWeight: isTimeUrgent ? '800' : '700',
                },
              ]}
            >
              {formatTime(timeRemaining)}
            </Text>
          </View>

          {/* Mobile Palette Trigger */}
          {!isDesktop && (
            <TouchableOpacity
              style={[styles.paletteTriggerBtn, { borderColor: colors.line, backgroundColor: colors.surface }]}
              onPress={() => setShowQuestionPalette(true)}
              activeOpacity={0.7}
            >
              <Grid size={15} color={colors.text} />
              <Text style={[styles.paletteTriggerText, { color: colors.text }]}>
                {stats.answered}/{questions.length}
              </Text>
            </TouchableOpacity>
          )}

          {/* Primary Submit Button */}
          <Button
            title="Submit"
            variant="primary"
            size="sm"
            onPress={() => setShowSubmitConfirm(true)}
            icon={<Send size={13} color={colors.accentText} />}
          />
        </View>
      </View>

      {/* Main Examination View (Two-column on wide screens) */}
      <View style={styles.workspaceRow}>
        {/* Left Column: Active Question */}
        <ScrollView
          style={styles.questionScroll}
          contentContainerStyle={styles.questionScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.questionCenterWrapper}>
            {/* Question Card */}
            <View
              style={[
                styles.questionBox,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.line,
                  borderRadius: radii.card,
                },
              ]}
            >
              {/* Question Sub-Header */}
              <View style={[styles.qHeaderRow, { borderBottomColor: colors.line }]}>
                <View style={styles.qNumWrap}>
                  <Text style={[styles.qIndexText, { color: colors.text }]}>
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </Text>
                </View>

                <View style={styles.qActionsRight}>
                  {currentQuestion.questionTextHindi && (
                    <TouchableOpacity
                      style={[styles.langToggleBtn, { backgroundColor: colors.surface2, borderColor: colors.line }]}
                      onPress={() => setLanguage((l) => (l === 'english' ? 'hindi' : 'english'))}
                    >
                      <Globe size={13} color={colors.text} />
                      <Text style={[styles.langToggleText, { color: colors.text }]}>
                        {language === 'english' ? 'हिंदी' : 'English'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.actionIconButton,
                      {
                        backgroundColor: currentState?.marked ? colors.accent : colors.surface2,
                        borderColor: currentState?.marked ? colors.accent : colors.line,
                      },
                    ]}
                    onPress={handleToggleMark}
                    accessibilityLabel="Mark question for review"
                  >
                    <Flag
                      size={14}
                      color={currentState?.marked ? colors.accentText : colors.muted}
                      fill={currentState?.marked ? colors.accentText : 'none'}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionIconButton,
                      {
                        backgroundColor: isBookmarked ? colors.accent : colors.surface2,
                        borderColor: isBookmarked ? colors.accent : colors.line,
                      },
                    ]}
                    onPress={() => {
                      setIsBookmarked(!isBookmarked);
                      if (user?.uid) {
                        addBookmark({
                          questionId: currentQuestion.id,
                          questionText: currentQuestion.questionText,
                          testTitle: test.title,
                        }).catch(() => {});
                      }
                    }}
                    accessibilityLabel="Bookmark question"
                  >
                    <Bookmark
                      size={14}
                      color={isBookmarked ? colors.accentText : colors.muted}
                      fill={isBookmarked ? colors.accentText : 'none'}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Question Body Text */}
              <View style={styles.qTextContainer}>
                <Text
                  style={[
                    styles.qText,
                    {
                      color: colors.text,
                      fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
                    },
                  ]}
                >
                  {cleanHtml(qText)}
                </Text>
              </View>

              {/* Options */}
              <View style={styles.optionsList}>
                {qOpts.map((opt, idx) => {
                  const letter = String.fromCharCode(65 + idx);
                  const isSelected = currentState?.selectedOption === idx;

                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.optionBtn,
                        {
                          backgroundColor: isSelected ? colors.surface2 : colors.surface,
                          borderColor: isSelected ? colors.accent : colors.line,
                          borderRadius: radii.button,
                        },
                      ]}
                      onPress={() => handleSelectOption(idx)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.optionBadge,
                          {
                            backgroundColor: isSelected ? colors.accent : colors.surface2,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionBadgeText,
                            { color: isSelected ? colors.accentText : colors.text },
                          ]}
                        >
                          {letter}
                        </Text>
                      </View>

                      <Text style={[styles.optionLabel, { color: colors.text }]}>
                        {cleanHtml(opt)}
                      </Text>

                      <View style={[styles.kbdNum, { backgroundColor: colors.surface2 }]}>
                        <Text style={[styles.kbdNumText, { color: colors.muted }]}>
                          {idx + 1}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Bottom Actions Row */}
            <View style={styles.bottomControls}>
              <Button
                title="Previous"
                variant="secondary"
                size="md"
                onPress={handlePrevious}
                disabled={currentQuestionIndex === 0}
                icon={<ChevronLeft size={16} color={colors.text} />}
              />

              <View style={styles.middleButtons}>
                {currentState?.selectedOption !== null && currentState?.selectedOption !== undefined && (
                  <Button
                    title="Clear"
                    variant="ghost"
                    size="sm"
                    onPress={handleClearResponse}
                    icon={<RotateCcw size={13} color={colors.muted} />}
                  />
                )}
                <Button
                  title={currentState?.marked ? 'Unmark' : 'Mark for Review'}
                  variant="secondary"
                  size="sm"
                  onPress={handleToggleMark}
                  icon={
                    <Flag
                      size={13}
                      color={currentState?.marked ? colors.accent : colors.muted}
                    />
                  }
                />
              </View>

              {currentQuestionIndex === questions.length - 1 ? (
                <Button
                  title="Submit Test"
                  variant="primary"
                  size="md"
                  onPress={() => setShowSubmitConfirm(true)}
                  iconRight={<Send size={15} color={colors.accentText} />}
                />
              ) : (
                <Button
                  title="Save & Next"
                  variant="primary"
                  size="md"
                  onPress={handleNext}
                  iconRight={<ChevronRight size={16} color={colors.accentText} />}
                />
              )}
            </View>
          </View>
        </ScrollView>

        {/* Right Column: Question Palette (Sticky on desktop) */}
        {isDesktop && (
          <View
            style={[
              styles.desktopPaletteRail,
              {
                backgroundColor: colors.surface,
                borderLeftColor: colors.line,
              },
            ]}
          >
            <View style={[styles.desktopPaletteHeader, { borderBottomColor: colors.line }]}>
              <Text style={[styles.desktopPaletteTitle, { color: colors.text }]}>
                Question Palette
              </Text>
              <Text style={[styles.desktopPaletteSub, { color: colors.muted }]}>
                {stats.answered} of {questions.length} Answered
              </Text>
            </View>
            {renderPaletteContent()}
          </View>
        )}
      </View>

      {/* Mobile Question Palette Modal */}
      {!isDesktop && (
        <Modal
          visible={showQuestionPalette}
          onClose={() => setShowQuestionPalette(false)}
          title="Question Palette"
          maxWidth={500}
        >
          {renderPaletteContent()}
        </Modal>
      )}

      {/* Submit Confirmation Dialog */}
      <Modal
        visible={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        title="Submit Examination?"
      >
        <View style={styles.confirmModalContent}>
          <Text style={[styles.confirmSubtitle, { color: colors.muted }]}>
            Review your progress before finalizing. Once submitted, your score and detailed solutions will be computed immediately.
          </Text>

          <View style={[styles.statsSummaryGrid, { backgroundColor: colors.surface2, borderColor: colors.line }]}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryVal, { color: colors.success }]}>
                {stats.answered}
              </Text>
              <Text style={[styles.summaryLbl, { color: colors.muted }]}>Answered</Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={[styles.summaryVal, { color: colors.danger }]}>
                {stats.notAnswered + stats.notVisited}
              </Text>
              <Text style={[styles.summaryLbl, { color: colors.muted }]}>Unanswered</Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={[styles.summaryVal, { color: colors.accent }]}>
                {stats.marked}
              </Text>
              <Text style={[styles.summaryLbl, { color: colors.muted }]}>Marked</Text>
            </View>
          </View>

          <View style={styles.modalActionRow}>
            <Button
              title="Continue Test"
              variant="secondary"
              onPress={() => setShowSubmitConfirm(false)}
              style={{ flex: 1 }}
            />
            <Button
              title="Yes, Submit Test"
              variant="primary"
              loading={isSubmitting}
              onPress={() => {
                setShowSubmitConfirm(false);
                performSubmit();
              }}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </Modal>

      {/* Back / Exit Confirmation Dialog */}
      <Modal
        visible={showBackConfirm}
        onClose={() => setShowBackConfirm(false)}
        title="Pause and Exit Test?"
      >
        <View style={styles.confirmModalContent}>
          <Text style={[styles.confirmSubtitle, { color: colors.muted }]}>
            Your answers and remaining time will be saved locally. You can resume this mock test anytime from your dashboard.
          </Text>

          <View style={styles.modalActionRow}>
            <Button
              title="Resume Test"
              variant="primary"
              onPress={() => setShowBackConfirm(false)}
              style={{ flex: 1 }}
            />
            <Button
              title="Save & Exit"
              variant="secondary"
              onPress={() => {
                setShowBackConfirm(false);
                handleExitAttempt();
              }}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
    fontSize: 14.5,
    fontWeight: '500',
  },
  topBar: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  exitBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testMetaWrap: {
    flex: 1,
  },
  testTitleText: {
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sectionMetaText: {
    fontSize: 12,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  savedText: {
    fontSize: 11,
    fontWeight: '600',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  timerText: {
    fontSize: 14,
    letterSpacing: 0.5,
  },
  paletteTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  paletteTriggerText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  workspaceRow: {
    flex: 1,
    flexDirection: 'row',
  },
  questionScroll: {
    flex: 1,
  },
  questionScrollContent: {
    padding: 16,
    alignItems: 'center',
  },
  questionCenterWrapper: {
    maxWidth: 780,
    width: '100%',
  },
  questionBox: {
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
  },
  qHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  qNumWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qIndexText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  qActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  langToggleText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  actionIconButton: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qTextContainer: {
    padding: 20,
  },
  qText: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  optionsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  optionBtn: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
  },
  optionBadge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionBadgeText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  optionLabel: {
    flex: 1,
    fontSize: 14.5,
    lineHeight: 21,
  },
  kbdNum: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  kbdNumText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 32,
    flexWrap: 'wrap',
  },
  middleButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  desktopPaletteRail: {
    width: 280,
    borderLeftWidth: 1,
    flexDirection: 'column',
  },
  desktopPaletteHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  desktopPaletteTitle: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  desktopPaletteSub: {
    fontSize: 12,
    marginTop: 2,
  },
  paletteInner: {
    flex: 1,
    padding: 14,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shapeBadge: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotMarker: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  paletteScroll: {
    flex: 1,
  },
  gridNumbers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  numButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  numText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cornerFlag: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  confirmModalContent: {
    paddingTop: 8,
  },
  confirmSubtitle: {
    fontSize: 13.5,
    lineHeight: 19,
    marginBottom: 18,
  },
  statsSummaryGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 14,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 20,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryVal: {
    fontSize: 22,
    fontWeight: '800',
  },
  summaryLbl: {
    fontSize: 12,
    marginTop: 2,
  },
  modalActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
