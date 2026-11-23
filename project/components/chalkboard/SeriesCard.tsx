import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { ArrowRight, BookOpen, CheckCircle, ShieldCheck } from 'lucide-react-native';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';
import Pill from './Pill';
import ProgressBar from './ProgressBar';

export interface SeriesCardProps {
  id: string;
  title: string;
  description: string;
  testCount: number;
  isOwned?: boolean;
  progress?: number; // 0 to 100
  price?: number;
  originalPrice?: number;
  onPress: () => void;
}

export default function SeriesCard({
  id,
  title,
  description,
  testCount,
  isOwned = false,
  progress,
  price = 199,
  originalPrice = 999,
  onPress,
}: SeriesCardProps) {
  const { colors, radii, typography } = useChalkboardTheme();

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isOwned ? colors.success : colors.line,
          borderRadius: radii.card,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Open ${title}`}
    >
      <View style={styles.topRow}>
        <View style={styles.badgeGroup}>
          {isOwned ? (
            <Pill
              label="Owned"
              variant="owned"
              icon={<CheckCircle size={11} color={colors.success} />}
            />
          ) : (
            <Pill label={`${testCount} tests included`} variant="neutral" />
          )}
        </View>

        {!isOwned && price ? (
          <View style={styles.priceRow}>
            {originalPrice > price && (
              <Text style={[styles.strikePrice, { color: colors.muted }]}>
                ₹{originalPrice}
              </Text>
            )}
            <Text style={[styles.mainPrice, { color: colors.text }]}>
              ₹{price}
            </Text>
          </View>
        ) : null}
      </View>

      <Text
        style={[
          styles.title,
          {
            color: colors.text,
            fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
          },
        ]}
      >
        {title}
      </Text>

      <Text style={[styles.description, { color: colors.muted }]} numberOfLines={2}>
        {description}
      </Text>

      {/* Progress if owned */}
      {isOwned && progress !== undefined ? (
        <View style={styles.progressSection}>
          <View style={styles.progressLabelRow}>
            <Text style={[styles.progressLabel, { color: colors.muted }]}>
              Series Completion
            </Text>
            <Text style={[styles.progressVal, { color: colors.text }]}>
              {Math.round(progress)}%
            </Text>
          </View>
          <ProgressBar progress={progress} color={colors.success} />
        </View>
      ) : null}

      <View style={[styles.footer, { borderTopColor: colors.line }]}>
        <Text style={[styles.footerActionText, { color: colors.accent }]}>
          {isOwned ? 'Continue Series' : 'Explore Series & Free Tests'}
        </Text>
        <ArrowRight size={14} color={colors.accent} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  strikePrice: {
    fontSize: 13,
    textDecorationLine: 'line-through',
  },
  mainPrice: {
    fontSize: 18,
    fontWeight: '800',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 13.5,
    lineHeight: 19,
    marginBottom: 16,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerActionText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
});
