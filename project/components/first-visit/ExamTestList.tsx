import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Lock, Play, RotateCcw, CheckCircle } from 'lucide-react-native';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';

export interface TestRowItem {
  id: string;
  testId?: string;
  filename: string;
  title: string;
  questionCount: number;
  durationMinutes: number;
  marks?: number;
  isFree?: boolean;
  isLocked?: boolean;
  isAttempted?: boolean;
  score?: number;
}

interface ExamTestListProps {
  examName: string;
  tests: TestRowItem[];
  onStartTest: (test: TestRowItem) => void;
  onUnlockPress: (test: TestRowItem) => void;
  isSubscribed?: boolean;
}

export default function ExamTestList({
  examName,
  tests,
  onStartTest,
  onUnlockPress,
  isSubscribed = false,
}: ExamTestListProps) {
  const { colors, typography, radii } = useChalkboardTheme();

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
          Tests in the {examName} series
        </Text>
        <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
          {isSubscribed
            ? 'All full-length mock tests and previous papers are unlocked and ready for your preparation.'
            : "Try the official free sample papers first. Unlock the full bank when you're ready to test your rank."}
        </Text>
      </View>

      <View style={styles.testList}>
        {tests.map((test, index) => {
          const isFree = !isSubscribed && Boolean(test.isFree);
          const isLocked = !isSubscribed && Boolean(test.isLocked);
          const isAttempted = Boolean(test.isAttempted);

          return (
            <View
              key={test.id || `test_${index}`}
              style={[
                styles.testRowCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.line,
                  borderRadius: radii.card,
                  opacity: isLocked ? 0.85 : 1,
                },
              ]}
            >
              <View style={styles.testInfoLeft}>
                <View style={styles.titleAndPillRow}>
                  <Text
                    style={[
                      styles.testTitle,
                      { color: isLocked ? colors.muted : colors.text },
                    ]}
                    numberOfLines={2}
                  >
                    {test.title}
                  </Text>
                </View>

                {/* Sub details: Qs, time, marks */}
                <View style={styles.detailsRow}>
                  {isFree ? (
                    <View
                      style={[
                        styles.freePill,
                        { backgroundColor: colors.successBg, borderColor: colors.success },
                      ]}
                    >
                      <Text style={[styles.freePillText, { color: colors.success }]}>
                        Free
                      </Text>
                    </View>
                  ) : isLocked ? (
                    <View
                      style={[
                        styles.lockedPill,
                        { backgroundColor: colors.surface2, borderColor: colors.line },
                      ]}
                    >
                      <Lock size={11} color={colors.muted} />
                      <Text style={[styles.lockedPillText, { color: colors.muted }]}>
                        Series Pass
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.unlockedPill,
                        { backgroundColor: colors.surface2, borderColor: colors.line },
                      ]}
                    >
                      <CheckCircle size={11} color={colors.success} />
                      <Text style={[styles.unlockedPillText, { color: colors.success }]}>
                        Unlocked
                      </Text>
                    </View>
                  )}

                  <Text style={[styles.detailItemText, { color: colors.muted }]}>
                    {test.questionCount} Questions
                  </Text>
                  <Text style={[styles.detailBullet, { color: colors.line }]}>•</Text>
                  <Text style={[styles.detailItemText, { color: colors.muted }]}>
                    {test.durationMinutes} Mins
                  </Text>
                  {test.marks ? (
                    <>
                      <Text style={[styles.detailBullet, { color: colors.line }]}>•</Text>
                      <Text style={[styles.detailItemText, { color: colors.muted }]}>
                        {test.marks} Marks
                      </Text>
                    </>
                  ) : null}
                </View>
              </View>

              {/* Action Button Right */}
              <View style={styles.actionRight}>
                {isLocked ? (
                  <TouchableOpacity
                    style={[
                      styles.unlockActionButton,
                      {
                        borderColor: colors.line,
                        backgroundColor: colors.surface2,
                        borderRadius: radii.button,
                      },
                    ]}
                    onPress={() => onUnlockPress(test)}
                    activeOpacity={0.8}
                  >
                    <Lock size={13} color={colors.muted} />
                    <Text style={[styles.unlockButtonText, { color: colors.text }]}>
                      Unlock
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.freeActionButton,
                      {
                        backgroundColor: colors.accent,
                        borderRadius: radii.button,
                      },
                    ]}
                    onPress={() => onStartTest(test)}
                    activeOpacity={0.8}
                  >
                    {isAttempted ? (
                      <>
                        <RotateCcw size={13} color={colors.accentText} />
                        <Text style={[styles.actionButtonText, { color: colors.accentText }]}>
                          Retake
                        </Text>
                      </>
                    ) : (
                      <>
                        <Play size={13} color={colors.accentText} fill={colors.accentText} />
                        <Text style={[styles.actionButtonText, { color: colors.accentText }]}>
                          {isFree ? 'Start free' : 'Start'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
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
  testList: {
    gap: 12,
  },
  testRowCard: {
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  testInfoLeft: {
    flex: 1,
  },
  titleAndPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  testTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  freePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    borderWidth: 1,
  },
  freePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  lockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9999,
    borderWidth: 1,
  },
  lockedPillText: {
    fontSize: 11,
    fontWeight: '500',
  },
  unlockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9999,
    borderWidth: 1,
  },
  unlockedPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  detailItemText: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailBullet: {
    fontSize: 12,
  },
  actionRight: {
    alignItems: 'flex-end',
  },
  freeActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  unlockActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  unlockButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
