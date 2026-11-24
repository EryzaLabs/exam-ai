import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Check,
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
} from 'lucide-react-native';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';
import FirstVisitHeader from './FirstVisitHeader';

export interface QuizQuestionItem {
  id: string;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  topic?: string;
  section?: string;
}

export interface QuizProgressPayload {
  currentIndex: number;
  answers: Record<number, number>; // questionIndex -> chosenOptionIndex
  completed: boolean;
}

interface QuizViewProps {
  examId: string;
  examName: string;
  testId: string;
  testTitle: string;
  questions: QuizQuestionItem[];
  isSubscribed?: boolean;
  exitLabel?: string;
  onFinishTest: (answers: Record<number, number>) => void;
  onExitTest: () => void;
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

export default function QuizView({
  examId,
  examName,
  testId,
  testTitle,
  questions,
  isSubscribed = false,
  exitLabel,
  onFinishTest,
  onExitTest,
}: QuizViewProps) {
  const { colors, typography, radii } = useChalkboardTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [hasLoadedSavedProgress, setHasLoadedSavedProgress] = useState(false);

  const storageKey = `@astra_sample_quiz_${examId}_${testId}`;

  // 1. Load saved progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (raw) {
          const parsed: QuizProgressPayload = JSON.parse(raw);
          if (parsed && typeof parsed.currentIndex === 'number') {
            setCurrentIndex(Math.min(parsed.currentIndex, questions.length - 1));
          }
          if (parsed && parsed.answers) {
            setAnswers(parsed.answers);
          }
        }
      } catch (e) {
        console.warn('Failed to restore quiz progress:', e);
      } finally {
        setHasLoadedSavedProgress(true);
      }
    };

    loadProgress();
  }, [storageKey, questions.length]);

  // 2. Persist progress whenever state updates
  const persistState = useCallback(
    async (newIndex: number, newAnswers: Record<number, number>, isComplete = false) => {
      try {
        const payload: QuizProgressPayload = {
          currentIndex: newIndex,
          answers: newAnswers,
          completed: isComplete,
        };
        await AsyncStorage.setItem(storageKey, JSON.stringify(payload));
      } catch (e) {
        console.warn('Failed to persist quiz progress:', e);
      }
    },
    [storageKey]
  );

  const currentQ = questions[currentIndex];
  const totalQuestions = questions.length;
  const isAnswered = answers[currentIndex] !== undefined;
  const chosenIndex = answers[currentIndex];
  const isLastQuestion = currentIndex === totalQuestions - 1;

  const handleOptionSelect = (optionIdx: number) => {
    if (isAnswered) return; // Locked once chosen

    const nextAnswers = { ...answers, [currentIndex]: optionIdx };
    setAnswers(nextAnswers);
    persistState(currentIndex, nextAnswers, false);
  };

  const handleNext = () => {
    if (!isAnswered) return;

    if (isLastQuestion) {
      persistState(currentIndex, answers, true);
      onFinishTest(answers);
    } else {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      persistState(nextIdx, answers, false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      persistState(prevIdx, answers, false);
    }
  };

  if (!currentQ) {
    return null;
  }

  const cleanQ = cleanHtml(currentQ.questionText);
  const cleanExp = cleanHtml(currentQ.explanation);
  const correctIdx =
    currentQ.correctAnswerIndex >= 0 ? currentQ.correctAnswerIndex : 0;
  const progressPercent = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FirstVisitHeader
        showChangeExam={true}
        onChangeExam={onExitTest}
        examName={examName}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.innerWrapper}>
          {/* Top Nav & Exit */}
          <View style={styles.navRow}>
            <TouchableOpacity
              style={styles.exitLink}
              onPress={onExitTest}
              activeOpacity={0.7}
            >
              <ArrowLeft size={14} color={colors.muted} />
              <Text style={[styles.exitLinkText, { color: colors.muted }]}>
                {exitLabel || (isSubscribed ? 'Exit practice' : 'Exit test')}
              </Text>
            </TouchableOpacity>

            <View style={styles.testTitleBadge}>
              <Text style={[styles.testTitleText, { color: colors.muted }]} numberOfLines={1}>
                {testTitle}
              </Text>
            </View>
          </View>

          {/* Progress Bar & Counter */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTextRow}>
              <Text style={[styles.questionCounterText, { color: colors.text }]}>
                Question {currentIndex + 1} of {totalQuestions}
              </Text>
              {currentQ.topic ? (
                <View style={[styles.topicBadge, { backgroundColor: colors.surface2, borderColor: colors.line }]}>
                  <Text style={[styles.topicBadgeText, { color: colors.muted }]}>
                    {currentQ.topic}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={[styles.progressTrack, { backgroundColor: colors.surface2 }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progressPercent}%`,
                    backgroundColor: colors.accent,
                  },
                ]}
              />
            </View>
          </View>

          {/* Question Card */}
          <View
            style={[
              styles.questionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.line,
                borderRadius: radii.card,
              },
            ]}
          >
            <Text style={[styles.questionText, { color: colors.text }]}>
              {cleanQ}
            </Text>

            {/* Options List */}
            <View style={styles.optionsList}>
              {currentQ.options.map((option, optIdx) => {
                const letter = String.fromCharCode(65 + optIdx);
                const isSelected = chosenIndex === optIdx;
                const isCorrect = optIdx === correctIdx;

                let optionBg: string = colors.surface;
                let optionBorder: string = colors.line;
                let textColor: string = colors.text;
                let badgeBg: string = colors.surface2;
                let badgeTextCol: string = colors.text;

                if (isAnswered) {
                  if (isCorrect) {
                    optionBg = colors.successBg;
                    optionBorder = colors.success;
                    badgeBg = colors.success;
                    badgeTextCol = colors.white;
                  } else if (isSelected && !isCorrect) {
                    optionBg = colors.dangerBg;
                    optionBorder = colors.danger;
                    badgeBg = colors.danger;
                    badgeTextCol = colors.white;
                    textColor = colors.danger;
                  } else {
                    textColor = colors.muted;
                  }
                }

                return (
                  <TouchableOpacity
                    key={optIdx}
                    style={[
                      styles.optionButton,
                      {
                        backgroundColor: optionBg,
                        borderColor: optionBorder,
                        borderRadius: radii.button,
                      },
                    ]}
                    onPress={() => handleOptionSelect(optIdx)}
                    disabled={isAnswered}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.optionLetterBadge, { backgroundColor: badgeBg }]}>
                      <Text style={[styles.optionLetterText, { color: badgeTextCol }]}>
                        {letter}
                      </Text>
                    </View>

                    <Text style={[styles.optionLabel, { color: textColor }]}>
                      {cleanHtml(option)}
                    </Text>

                    {isAnswered && isCorrect && (
                      <View style={styles.feedbackIconWrap}>
                        <Check size={18} color={colors.success} />
                      </View>
                    )}

                    {isAnswered && isSelected && !isCorrect && (
                      <View style={styles.feedbackIconWrap}>
                        <X size={18} color={colors.danger} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Instant Feedback & Explanation Box */}
            {isAnswered && (
              <View
                style={[
                  styles.explanationContainer,
                  {
                    backgroundColor: colors.surface2,
                    borderColor: colors.line,
                    borderRadius: radii.button,
                  },
                ]}
              >
                <View style={styles.explanationHeaderRow}>
                  <CheckCircle2 size={16} color={colors.success} />
                  <Text style={[styles.explanationHeaderTitle, { color: colors.text }]}>
                    {chosenIndex === correctIdx ? 'Correct!' : 'Incorrect'} — Explanation:
                  </Text>
                </View>
                <Text style={[styles.explanationText, { color: colors.text }]}>
                  {cleanExp}
                </Text>
              </View>
            )}
          </View>

          {/* Action Row */}
          <View style={styles.bottomNavRow}>
            {currentIndex > 0 ? (
              <TouchableOpacity
                style={[
                  styles.navBtnSecondary,
                  {
                    borderColor: colors.line,
                    backgroundColor: colors.surface,
                    borderRadius: radii.button,
                  },
                ]}
                onPress={handlePrevious}
                activeOpacity={0.8}
              >
                <ArrowLeft size={16} color={colors.text} />
                <Text style={[styles.navBtnSecondaryText, { color: colors.text }]}>
                  Previous
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={{ flex: 1 }} />
            )}

            <TouchableOpacity
              style={[
                styles.navBtnPrimary,
                {
                  backgroundColor: isAnswered ? colors.accent : colors.surface2,
                  borderRadius: radii.button,
                  opacity: isAnswered ? 1 : 0.6,
                },
              ]}
              onPress={handleNext}
              disabled={!isAnswered}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.navBtnPrimaryText,
                  { color: isAnswered ? colors.white : colors.muted },
                ]}
              >
                {isLastQuestion ? 'See my results' : 'Next question'}
              </Text>
              <ArrowRight
                size={16}
                color={isAnswered ? colors.white : colors.muted}
              />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  innerWrapper: {
    maxWidth: 820,
    width: '100%',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  exitLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exitLinkText: {
    fontSize: 13,
    fontWeight: '500',
  },
  testTitleBadge: {
    maxWidth: 260,
  },
  testTitleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  questionCounterText: {
    fontSize: 14,
    fontWeight: '700',
  },
  topicBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  topicBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  questionCard: {
    borderWidth: 1,
    padding: 24,
    marginBottom: 24,
  },
  questionText: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 25,
    marginBottom: 20,
  },
  optionsList: {
    gap: 12,
  },
  optionButton: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionLetterBadge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterText: {
    fontSize: 12,
    fontWeight: '700',
  },
  optionLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  feedbackIconWrap: {
    marginLeft: 8,
  },
  explanationContainer: {
    marginTop: 20,
    borderWidth: 1,
    padding: 16,
  },
  explanationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  explanationHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  explanationText: {
    fontSize: 13,
    lineHeight: 20,
  },
  bottomNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 32,
  },
  navBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  navBtnSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  navBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 48,
  },
  navBtnPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
