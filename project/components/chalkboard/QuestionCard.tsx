import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Bookmark, Flag, Globe, CheckCircle2 } from 'lucide-react-native';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';
import OptionButton from './OptionButton';

export interface QuestionCardProps {
  questionNumber: number;
  totalQuestions?: number;
  topic?: string;
  section?: string;
  questionText: string;
  options: string[];
  selectedIndex?: number;
  correctIndex?: number;
  showFeedback?: boolean;
  disabled?: boolean;
  onSelectOption: (index: number) => void;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  isMarkedForReview?: boolean;
  onToggleMarkForReview?: () => void;
  language?: 'english' | 'hindi';
  onToggleLanguage?: () => void;
  hasHindi?: boolean;
  explanation?: string;
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

export default function QuestionCard({
  questionNumber,
  totalQuestions,
  topic,
  section,
  questionText,
  options,
  selectedIndex,
  correctIndex,
  showFeedback = false,
  disabled = false,
  onSelectOption,
  isBookmarked = false,
  onToggleBookmark,
  isMarkedForReview = false,
  onToggleMarkForReview,
  language = 'english',
  onToggleLanguage,
  hasHindi = false,
  explanation,
}: QuestionCardProps) {
  const { colors, radii, typography } = useChalkboardTheme();

  return (
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
      {/* Header bar: Question number, topic, actions */}
      <View style={[styles.headerRow, { borderBottomColor: colors.line }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.qNumBadge, { backgroundColor: colors.surface2 }]}>
            <Text style={[styles.qNumText, { color: colors.text }]}>
              Q{questionNumber}
              {totalQuestions ? ` of ${totalQuestions}` : ''}
            </Text>
          </View>

          {topic ? (
            <Text style={[styles.topicText, { color: colors.muted }]} numberOfLines={1}>
              {topic}
            </Text>
          ) : section ? (
            <Text style={[styles.topicText, { color: colors.muted }]} numberOfLines={1}>
              {section}
            </Text>
          ) : null}
        </View>

        <View style={styles.headerRight}>
          {hasHindi && onToggleLanguage && (
            <TouchableOpacity
              style={[
                styles.iconButton,
                {
                  backgroundColor: colors.surface2,
                  borderColor: colors.line,
                },
              ]}
              onPress={onToggleLanguage}
              accessibilityLabel={`Switch to ${language === 'english' ? 'Hindi' : 'English'}`}
            >
              <Globe size={14} color={colors.text} />
              <Text style={[styles.langText, { color: colors.text }]}>
                {language === 'english' ? 'हिं' : 'EN'}
              </Text>
            </TouchableOpacity>
          )}

          {onToggleMarkForReview && (
            <TouchableOpacity
              style={[
                styles.iconButton,
                {
                  backgroundColor: isMarkedForReview ? colors.accent : colors.surface2,
                  borderColor: isMarkedForReview ? colors.accent : colors.line,
                },
              ]}
              onPress={onToggleMarkForReview}
              accessibilityLabel="Mark for review"
            >
              <Flag
                size={14}
                color={isMarkedForReview ? colors.accentText : colors.muted}
                fill={isMarkedForReview ? colors.accentText : 'none'}
              />
            </TouchableOpacity>
          )}

          {onToggleBookmark && (
            <TouchableOpacity
              style={[
                styles.iconButton,
                {
                  backgroundColor: isBookmarked ? colors.accent : colors.surface2,
                  borderColor: isBookmarked ? colors.accent : colors.line,
                },
              ]}
              onPress={onToggleBookmark}
              accessibilityLabel="Bookmark question"
            >
              <Bookmark
                size={14}
                color={isBookmarked ? colors.accentText : colors.muted}
                fill={isBookmarked ? colors.accentText : 'none'}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Question Text */}
      <View style={styles.questionBody}>
        <Text
          style={[
            styles.questionText,
            {
              color: colors.text,
              fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
            },
          ]}
        >
          {cleanHtml(questionText)}
        </Text>
      </View>

      {/* Options List */}
      <View style={styles.optionsList}>
        {options.map((opt, idx) => {
          const letter = String.fromCharCode(65 + idx);
          const isSelected = selectedIndex === idx;
          const isCorrect = correctIndex !== undefined && idx === correctIndex;

          return (
            <OptionButton
              key={idx}
              letter={letter}
              text={cleanHtml(opt)}
              isSelected={isSelected}
              isCorrect={isCorrect}
              showFeedback={showFeedback}
              disabled={disabled}
              onPress={() => onSelectOption(idx)}
              keyboardShortcut={String(idx + 1)}
            />
          );
        })}
      </View>

      {/* Immediate Explanation Box (if in instant-feedback mode and answered) */}
      {showFeedback && explanation ? (
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
              Explanation & Rationale:
            </Text>
          </View>
          <Text style={[styles.explanationText, { color: colors.text }]}>
            {cleanHtml(explanation)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  qNumBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  qNumText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  topicText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  langText: {
    fontSize: 11,
    fontWeight: '700',
  },
  questionBody: {
    padding: 20,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  optionsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 10,
  },
  explanationBox: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 14,
    borderWidth: 1,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  explanationTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  explanationText: {
    fontSize: 13.5,
    lineHeight: 20,
  },
});
