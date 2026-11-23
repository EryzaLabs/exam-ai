import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';
import ProgressBar from './ProgressBar';

export interface TopicBarProps {
  topic: string;
  accuracy: number; // 0 to 100
  attempted?: number;
  correct?: number;
  onDrill?: () => void;
  drillLabel?: string;
}

export default function TopicBar({
  topic,
  accuracy,
  attempted,
  correct,
  onDrill,
  drillLabel = 'Practice',
}: TopicBarProps) {
  const { colors } = useChalkboardTheme();
  const isWeak = accuracy < 50;
  const barColor = isWeak ? colors.danger : colors.success;

  return (
    <View style={[styles.container, { borderBottomColor: colors.line }]}>
      <View style={styles.headerRow}>
        <View style={styles.topicTextWrap}>
          <Text
            style={[
              styles.topicName,
              { color: isWeak ? colors.danger : colors.text },
            ]}
            numberOfLines={1}
          >
            {topic}
          </Text>
          {attempted !== undefined && correct !== undefined ? (
            <Text style={[styles.statsLabel, { color: colors.muted }]}>
              {correct}/{attempted} correct ({Math.round(accuracy)}%)
            </Text>
          ) : (
            <Text style={[styles.statsLabel, { color: colors.muted }]}>
              {Math.round(accuracy)}% accuracy
            </Text>
          )}
        </View>

        {onDrill && (
          <TouchableOpacity
            style={[
              styles.drillButton,
              {
                backgroundColor: isWeak ? colors.dangerBg : colors.surface2,
                borderColor: isWeak ? colors.danger : colors.line,
              },
            ]}
            onPress={onDrill}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.drillText,
                { color: isWeak ? colors.danger : colors.text },
              ]}
            >
              {drillLabel}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ProgressBar progress={accuracy} color={barColor} height={6} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  topicTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  topicName: {
    fontSize: 14.5,
    fontWeight: '600',
    marginBottom: 2,
  },
  statsLabel: {
    fontSize: 13.5,
  },
  drillButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  drillText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
