import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowLeft,
  UserPlus,
  AlertTriangle,
  Award,
  ChevronDown,
} from 'lucide-react-native';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';
import { useAuth } from '@/context/auth-context';
import FirstVisitHeader from './FirstVisitHeader';
import OfferCard from './OfferCard';

export interface MissedQuestionItem {
  id: string;
  questionNumber: number;
  questionText: string;
  topic?: string;
  options: string[];
  chosenIndex: number; // -1 if skipped
  correctIndex: number;
  explanation: string;
}

export interface TopicStatItem {
  topic: string;
  total: number;
  correct: number;
  incorrect: number;
  accuracy: number;
}

export interface ResultViewProps {
  examId: string;
  examName: string;
  testTitle: string;
  totalQuestions: number;
  correctCount: number;
  topicStats: TopicStatItem[];
  missedQuestions: MissedQuestionItem[];
  offerData: {
    seriesName: string;
    description: string;
    originalPrice: number;
    currentPrice: number;
    planId: string;
    features: string[];
    isUnlocked?: boolean;
  };
  onRetake: () => void;
  onBackToExam: () => void;
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

export default function ResultView({
  examId,
  examName,
  testTitle,
  totalQuestions,
  correctCount,
  topicStats,
  missedQuestions,
  offerData,
  onRetake,
  onBackToExam,
}: ResultViewProps) {
  const { colors, typography, radii } = useChalkboardTheme();
  const { user } = useAuth();

  const percentage =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  // Tier feedback message
  let tierTitle = 'Good base to build on';
  let tierDesc =
    'You have foundational knowledge in key areas. Strengthen weak topics to clear the competitive cutoff with confidence.';
  if (percentage >= 80) {
    tierTitle = 'Strong start!';
    tierDesc =
      'Outstanding grasp of the core concepts! Keep testing your pace with full-length timed mocks to secure a top merit rank.';
  } else if (percentage < 40) {
    tierTitle = 'Plenty of room to grow';
    tierDesc =
      'Do not worry — diagnosing your weak topics early is half the battle. Regular practice and reading in-depth explanations will rapidly improve your score.';
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FirstVisitHeader
        showChangeExam={true}
        onChangeExam={onBackToExam}
        examName={examName}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.innerWrapper}>
          {/* Back link */}
          <TouchableOpacity
            style={styles.backLink}
            onPress={onBackToExam}
            activeOpacity={0.7}
          >
            <ArrowLeft size={14} color={colors.muted} />
            <Text style={[styles.backLinkText, { color: colors.muted }]}>
              Back to {examName} tests
            </Text>
          </TouchableOpacity>

          {/* Section 1: Score Ring Card */}
          <View
            style={[
              styles.scoreCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.line,
                borderRadius: radii.card,
              },
            ]}
          >
            <View style={styles.scoreRow}>
              {/* Score circle */}
              <View
                style={[
                  styles.scoreRing,
                  {
                    borderColor:
                      percentage >= 80
                        ? colors.success
                        : percentage >= 40
                        ? colors.accent
                        : colors.danger,
                    backgroundColor: colors.surface2,
                  },
                ]}
              >
                <Text style={[styles.scoreNumber, { color: colors.text }]}>
                  {correctCount}
                </Text>
                <Text style={[styles.scoreTotalLabel, { color: colors.muted }]}>
                  of {totalQuestions}
                </Text>
              </View>

              <View style={styles.scoreDetails}>
                <View style={styles.percentagePill}>
                  <Text style={[styles.percentageText, { color: colors.accent }]}>
                    {percentage}% ACCURACY
                  </Text>
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
              </View>
            </View>

            {/* Soft sign-up banner if logged out (never blocking) */}
            {!user && (
              <View
                style={[
                  styles.softAuthBanner,
                  {
                    backgroundColor: colors.surface2,
                    borderColor: colors.line,
                    borderRadius: radii.button,
                  },
                ]}
              >
                <View style={styles.softAuthTextWrap}>
                  <Text style={[styles.softAuthTitle, { color: colors.text }]}>
                    Save your performance history
                  </Text>
                  <Text style={[styles.softAuthSub, { color: colors.muted }]}>
                    Create a free account to sync scores and track improvement over time.
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.softAuthBtn, { backgroundColor: colors.surface, borderColor: colors.line }]}
                  onPress={() => router.push('/signup')}
                  activeOpacity={0.7}
                >
                  <UserPlus size={13} color={colors.text} />
                  <Text style={[styles.softAuthBtnText, { color: colors.text }]}>
                    Sign up free
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Section 2: Your Topics Breakdown */}
          {topicStats && topicStats.length > 0 && (
            <View style={styles.sectionWrap}>
              <View style={styles.sectionTitleRow}>
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color: colors.text,
                      fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
                    },
                  ]}
                >
                  Your topics
                </Text>
                <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
                  Accuracy broken down by subject area. Weak areas require focused revision.
                </Text>
              </View>

              <View
                style={[
                  styles.topicsBox,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.line,
                    borderRadius: radii.card,
                  },
                ]}
              >
                {topicStats.map((item, idx) => {
                  const isWeak = item.accuracy < 50;
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.topicRow,
                        idx > 0 && { borderTopWidth: 1, borderTopColor: colors.line },
                      ]}
                    >
                      <View style={styles.topicNameRow}>
                        <Text
                          style={[
                            styles.topicName,
                            { color: isWeak ? colors.danger : colors.text },
                          ]}
                          numberOfLines={1}
                        >
                          {item.topic}
                        </Text>
                        <Text
                          style={[
                            styles.topicCountBadge,
                            {
                              color: isWeak ? colors.danger : colors.muted,
                              backgroundColor: isWeak ? colors.dangerBg : colors.surface2,
                            },
                          ]}
                        >
                          {item.correct}/{item.total} correct ({item.accuracy}%)
                        </Text>
                      </View>

                      {/* Progress Bar */}
                      <View style={[styles.topicBarTrack, { backgroundColor: colors.surface2 }]}>
                        <View
                          style={[
                            styles.topicBarFill,
                            {
                              width: `${Math.max(item.accuracy, 4)}%`,
                              backgroundColor: isWeak ? colors.danger : colors.success,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Section 3: Review What You Missed */}
          {missedQuestions && missedQuestions.length > 0 ? (
            <View style={styles.sectionWrap}>
              <View style={styles.sectionTitleRow}>
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color: colors.text,
                      fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
                    },
                  ]}
                >
                  Review what you missed ({missedQuestions.length})
                </Text>
                <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
                  Review the correct answers and explanations below to avoid repeating mistakes.
                </Text>
              </View>

              <View style={styles.missedList}>
                {missedQuestions.map((q, idx) => {
                  const chosenLetter =
                    q.chosenIndex >= 0 ? String.fromCharCode(65 + q.chosenIndex) : 'Skipped';
                  const correctLetter = String.fromCharCode(65 + q.correctIndex);

                  return (
                    <View
                      key={q.id || `miss_${idx}`}
                      style={[
                        styles.missedCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.line,
                          borderRadius: radii.card,
                        },
                      ]}
                    >
                      <View style={styles.missedCardHeader}>
                        <View style={[styles.qNumBadge, { backgroundColor: colors.surface2 }]}>
                          <Text style={[styles.qNumText, { color: colors.muted }]}>
                            Q{q.questionNumber}
                          </Text>
                        </View>
                        {q.topic ? (
                          <Text style={[styles.missedTopic, { color: colors.muted }]}>
                            {q.topic}
                          </Text>
                        ) : null}
                      </View>

                      <Text style={[styles.missedQuestionText, { color: colors.text }]}>
                        {cleanHtml(q.questionText)}
                      </Text>

                      {/* Options breakdown */}
                      <View style={styles.missedOptionsList}>
                        {q.options.map((opt, oIdx) => {
                          const isCorrect = oIdx === q.correctIndex;
                          const isUserChoice = oIdx === q.chosenIndex;
                          const letter = String.fromCharCode(65 + oIdx);

                          let optBg = colors.surface;
                          let optBorder = colors.line;
                          let textCol = colors.muted;

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
                              key={oIdx}
                              style={[
                                styles.missedOptionItem,
                                {
                                  backgroundColor: optBg,
                                  borderColor: optBorder,
                                  borderRadius: radii.button,
                                },
                              ]}
                            >
                              <View
                                style={[
                                  styles.optionLetterBadge,
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
                                    styles.optionLetterText,
                                    { color: isCorrect || isUserChoice ? colors.white : colors.text },
                                  ]}
                                >
                                  {letter}
                                </Text>
                              </View>
                              <Text style={[styles.missedOptionText, { color: textCol }]}>
                                {cleanHtml(opt)}
                              </Text>
                              {isCorrect && <CheckCircle2 size={16} color={colors.success} />}
                              {isUserChoice && !isCorrect && <XCircle size={16} color={colors.danger} />}
                            </View>
                          );
                        })}
                      </View>

                      {/* Explanation box */}
                      <View
                        style={[
                          styles.explanationBox,
                          {
                            backgroundColor: colors.surface2,
                            borderColor: colors.line,
                            borderRadius: radii.button,
                          },
                        ]}
                      >
                        <Text style={[styles.explanationTitle, { color: colors.text }]}>
                          Explanation
                        </Text>
                        <Text style={[styles.explanationBody, { color: colors.text }]}>
                          {cleanHtml(q.explanation)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <View
              style={[
                styles.perfectScoreCard,
                {
                  backgroundColor: colors.successBg,
                  borderColor: colors.success,
                  borderRadius: radii.card,
                },
              ]}
            >
              <CheckCircle2 size={24} color={colors.success} />
              <Text style={[styles.perfectScoreText, { color: colors.success }]}>
                Perfect score! You answered every question correctly!
              </Text>
            </View>
          )}

          {/* Section 4: Main Conversion Offer Card */}
          <OfferCard
            cardHeading="Keep going with the full series"
            seriesName={offerData.seriesName}
            description={offerData.description}
            originalPrice={offerData.originalPrice}
            currentPrice={offerData.currentPrice}
            planId={offerData.planId}
            features={offerData.features}
            isUnlocked={offerData.isUnlocked}
          />

          {/* Secondary Action Buttons */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[
                styles.secondaryActionBtn,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.line,
                  borderRadius: radii.button,
                },
              ]}
              onPress={onRetake}
              activeOpacity={0.8}
            >
              <RotateCcw size={15} color={colors.text} />
              <Text style={[styles.secondaryActionText, { color: colors.text }]}>
                Retake the sample
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryActionBtn,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.line,
                  borderRadius: radii.button,
                },
              ]}
              onPress={onBackToExam}
              activeOpacity={0.8}
            >
              <ArrowLeft size={15} color={colors.text} />
              <Text style={[styles.secondaryActionText, { color: colors.text }]}>
                Back to {examName} tests
              </Text>
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
    paddingVertical: 24,
    alignItems: 'center',
  },
  innerWrapper: {
    maxWidth: 820,
    width: '100%',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 18,
    alignSelf: 'flex-start',
  },
  backLinkText: {
    fontSize: 13,
    fontWeight: '500',
  },
  scoreCard: {
    borderWidth: 1,
    padding: 24,
    marginBottom: 32,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  scoreRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 34,
  },
  scoreTotalLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  scoreDetails: {
    flex: 1,
  },
  percentagePill: {
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  percentageText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tierHeadline: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  tierSubtext: {
    fontSize: 14,
    lineHeight: 20,
  },
  softAuthBanner: {
    marginTop: 20,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  softAuthTextWrap: {
    flex: 1,
  },
  softAuthTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  softAuthSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  softAuthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  softAuthBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionWrap: {
    marginBottom: 32,
  },
  sectionTitleRow: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  topicsBox: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  topicRow: {
    padding: 14,
  },
  topicNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  topicName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  topicCountBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  topicBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  topicBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  missedList: {
    gap: 16,
  },
  missedCard: {
    borderWidth: 1,
    padding: 18,
  },
  missedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  qNumBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  qNumText: {
    fontSize: 11,
    fontWeight: '700',
  },
  missedTopic: {
    fontSize: 12,
    fontWeight: '500',
  },
  missedQuestionText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 14,
  },
  missedOptionsList: {
    gap: 8,
    marginBottom: 14,
  },
  missedOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  optionLetterBadge: {
    width: 22,
    height: 22,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterText: {
    fontSize: 11,
    fontWeight: '700',
  },
  missedOptionText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  explanationBox: {
    borderWidth: 1,
    padding: 12,
  },
  explanationTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  explanationBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  perfectScoreCard: {
    borderWidth: 1,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
  },
  perfectScoreText: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  secondaryActionBtn: {
    flex: 1,
    minWidth: 160,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
