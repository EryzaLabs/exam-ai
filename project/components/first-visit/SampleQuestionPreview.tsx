import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Check, CheckCircle2, HelpCircle } from 'lucide-react-native';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';

export interface SampleQuestionData {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  topic?: string;
}

interface SampleQuestionPreviewProps {
  question?: SampleQuestionData | null;
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

export default function SampleQuestionPreview({ question }: SampleQuestionPreviewProps) {
  const { colors, typography, radii } = useChalkboardTheme();

  if (!question) {
    return null;
  }

  const cleanQ = cleanHtml(question.questionText);
  const cleanExp = cleanHtml(question.explanation);
  const correctIdx = question.correctAnswerIndex >= 0 ? question.correctAnswerIndex : 0;

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.text,
              fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
            },
          ]}
        >
          This is how every answer is explained
        </Text>
        <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
          No mystery answer keys. Every single question comes with step-by-step reasoning and official references.
        </Text>
      </View>

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.line,
            borderRadius: radii.card,
          },
        ]}
      >
        {question.topic ? (
          <View style={styles.topicRow}>
            <View style={[styles.topicBadge, { backgroundColor: colors.surface2, borderColor: colors.line }]}>
              <Text style={[styles.topicBadgeText, { color: colors.muted }]}>
                {question.topic}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Question Text */}
        <Text style={[styles.questionText, { color: colors.text }]}>
          {cleanQ}
        </Text>

        {/* Options */}
        <View style={styles.optionsList}>
          {question.options.map((opt, idx) => {
            const isCorrect = idx === correctIdx;
            const letter = String.fromCharCode(65 + idx); // A, B, C, D

            return (
              <View
                key={idx}
                style={[
                  styles.optionRow,
                  {
                    borderRadius: radii.button,
                    borderColor: isCorrect ? colors.success : colors.line,
                    backgroundColor: isCorrect ? colors.successBg : colors.surface,
                  },
                ]}
              >
                <View
                  style={[
                    styles.optionBadge,
                    {
                      backgroundColor: isCorrect ? colors.success : colors.surface2,
                      borderColor: isCorrect ? colors.success : colors.line,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionBadgeText,
                      { color: isCorrect ? colors.white : colors.text },
                    ]}
                  >
                    {letter}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.optionText,
                    {
                      color: isCorrect ? colors.text : colors.muted,
                      fontWeight: isCorrect ? '600' : '400',
                    },
                  ]}
                >
                  {cleanHtml(opt)}
                </Text>

                {isCorrect && (
                  <View style={styles.correctIconWrap}>
                    <Check size={16} color={colors.success} />
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Explanation Box */}
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
          <View style={styles.explanationHeader}>
            <CheckCircle2 size={16} color={colors.success} />
            <Text style={[styles.explanationTitle, { color: colors.text }]}>
              Official Answer & In-Depth Explanation
            </Text>
          </View>
          <Text style={[styles.explanationText, { color: colors.text }]}>
            {cleanExp}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: 36,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    borderWidth: 1,
    padding: 20,
  },
  topicRow: {
    flexDirection: 'row',
    marginBottom: 12,
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
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    marginBottom: 16,
  },
  optionsList: {
    gap: 10,
    marginBottom: 18,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  optionBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  correctIconWrap: {
    marginLeft: 8,
  },
  explanationBox: {
    borderWidth: 1,
    padding: 14,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  explanationTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  explanationText: {
    fontSize: 13,
    lineHeight: 20,
  },
});
