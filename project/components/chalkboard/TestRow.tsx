import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Lock, Play, RotateCcw, CheckCircle, ArrowRight } from 'lucide-react-native';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';
import Pill from './Pill';
import Button from './Button';

export interface TestRowProps {
  id: string;
  title: string;
  questionCount: number;
  marks?: number;
  durationMinutes: number;
  isFree?: boolean;
  isLocked?: boolean;
  status?: 'not-started' | 'in-progress' | 'completed';
  score?: number; // accuracy percentage or marks
  onStart: () => void;
  onUnlock?: () => void;
  onReview?: () => void;
}

export default function TestRow({
  id,
  title,
  questionCount,
  marks,
  durationMinutes,
  isFree = false,
  isLocked = false,
  status = 'not-started',
  score,
  onStart,
  onUnlock,
  onReview,
}: TestRowProps) {
  const { colors, radii } = useChalkboardTheme();

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: colors.line,
          borderRadius: radii.card,
          opacity: isLocked ? 0.8 : 1,
        },
      ]}
    >
      <View style={styles.leftInfo}>
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.title,
              { color: isLocked ? colors.muted : colors.text },
            ]}
            numberOfLines={2}
          >
            {title}
          </Text>
        </View>

        <View style={styles.metaRow}>
          {isFree ? (
            <Pill label="Free" variant="free" />
          ) : isLocked ? (
            <Pill
              label="Series Pass"
              variant="series"
              icon={<Lock size={11} color={colors.muted} />}
            />
          ) : status === 'completed' ? (
            <Pill
              label={score !== undefined ? `${Math.round(score)}% Score` : 'Completed'}
              variant="owned"
              icon={<CheckCircle size={11} color={colors.success} />}
            />
          ) : null}

          <Text style={[styles.metaText, { color: colors.muted }]}>
            {questionCount} Qs
          </Text>
          <Text style={[styles.bullet, { color: colors.line }]}>•</Text>
          <Text style={[styles.metaText, { color: colors.muted }]}>
            {durationMinutes} mins
          </Text>
          {marks ? (
            <>
              <Text style={[styles.bullet, { color: colors.line }]}>•</Text>
              <Text style={[styles.metaText, { color: colors.muted }]}>
                {marks} marks
              </Text>
            </>
          ) : null}
        </View>
      </View>

      <View style={styles.rightAction}>
        {isLocked ? (
          <Button
            title="Unlock"
            variant="secondary"
            size="sm"
            onPress={onUnlock}
            icon={<Lock size={13} color={colors.muted} />}
          />
        ) : status === 'completed' && onReview ? (
          <Button
            title="Review"
            variant="secondary"
            size="sm"
            onPress={onReview}
          />
        ) : status === 'in-progress' ? (
          <Button
            title="Resume"
            variant="primary"
            size="sm"
            onPress={onStart}
            iconRight={<ArrowRight size={13} color={colors.accentText} />}
          />
        ) : (
          <Button
            title={isFree ? 'Start free' : 'Start'}
            variant="primary"
            size="sm"
            onPress={onStart}
            iconRight={<Play size={12} color={colors.accentText} fill={colors.accentText} />}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 10,
  },
  leftInfo: {
    flex: 1,
  },
  titleRow: {
    marginBottom: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaText: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  bullet: {
    fontSize: 12,
  },
  rightAction: {
    alignItems: 'flex-end',
  },
});
