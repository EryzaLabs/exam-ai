import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { ArrowRight, CheckCircle2, Clock, ShieldCheck, Zap } from 'lucide-react-native';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';

interface ExamHeroProps {
  examName: string;
  sampleTestId?: string;
  sampleQuestionCount?: number;
  sampleDurationMinutes?: number;
  onStartSampleTest: () => void;
  isSubscribed?: boolean;
}

export default function ExamHero({
  examName,
  sampleQuestionCount = 20,
  sampleDurationMinutes = 20,
  onStartSampleTest,
  isSubscribed = false,
}: ExamHeroProps) {
  const { colors, typography, radii } = useChalkboardTheme();

  return (
    <View
      style={[
        styles.heroContainer,
        {
          backgroundColor: colors.surface,
          borderColor: colors.line,
          borderRadius: radii.card,
        },
      ]}
    >
      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: colors.surface2, borderColor: colors.line }]}>
          <Zap size={12} color={colors.accent} />
          <Text style={[styles.badgeText, { color: colors.text }]}>
            {isSubscribed ? 'SERIES PASS ACTIVE' : 'FREE SAMPLE TEST'}
          </Text>
        </View>
      </View>

      <Text
        style={[
          styles.headline,
          {
            color: colors.text,
            fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
          },
        ]}
      >
        {isSubscribed ? `Practice ${examName} Mock Tests` : `Try a free ${examName} test before you buy`}
      </Text>

      <Text style={[styles.subheadline, { color: colors.muted }]}>
        {isSubscribed
          ? 'Access all full-length timed CBT mocks, realistic exam simulations, and detailed bilingual solutions.'
          : 'Experience the exact CBT interface, realistic exam timing, and detailed bilingual explanations with zero commitment.'}
      </Text>

      <View style={styles.ctaRow}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            {
              backgroundColor: colors.accent,
              borderRadius: radii.button,
            },
          ]}
          onPress={onStartSampleTest}
          activeOpacity={0.8}
        >
          <Text style={[styles.primaryButtonText, { color: colors.accentText }]}>
            {isSubscribed ? 'Start Mock Test' : 'Start free sample test'}
          </Text>
          <ArrowRight size={16} color={colors.accentText} />
        </TouchableOpacity>
      </View>

      {/* Facts next to / below CTA */}
      <View style={[styles.factsStrip, { borderTopColor: colors.line }]}>
        <View style={styles.factItem}>
          <Clock size={15} color={colors.muted} />
          <Text style={[styles.factText, { color: colors.muted }]}>
            {sampleQuestionCount} questions · {sampleDurationMinutes} mins
          </Text>
        </View>

        <View style={styles.factItem}>
          <ShieldCheck size={15} color={colors.muted} />
          <Text style={[styles.factText, { color: colors.muted }]}>
            {isSubscribed ? 'All tests unlocked' : 'No payment or sign-up'}
          </Text>
        </View>

        <View style={styles.factItem}>
          <CheckCircle2 size={15} color={colors.muted} />
          <Text style={[styles.factText, { color: colors.muted }]}>
            Explanations included
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroContainer: {
    borderWidth: 1,
    padding: 24,
    marginBottom: 28,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headline: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    marginBottom: 10,
    letterSpacing: -0.4,
  },
  subheadline: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minHeight: 48,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  factsStrip: {
    paddingTop: 16,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  factItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  factText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
