import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useExam, EXAMS, ExamTarget } from '@/context/exam-context';
import { useTheme } from '@/context/theme-context';
import { Sparkles, Building2, GraduationCap } from 'lucide-react-native';

interface ExamSelectorProps {
  compact?: boolean;
  showTagline?: boolean;
  style?: any;
}

export default function ExamSelector({ compact = false, showTagline = false, style }: ExamSelectorProps) {
  const { examMode, setExamMode, examInfo } = useExam();
  const { isDark, colors } = useTheme();

  const options: { id: ExamTarget; label: string; icon: any }[] = [
    { id: 'all', label: 'All Exams', icon: Sparkles },
    { id: 'upsc', label: 'UPSC Principal', icon: Building2 },
    { id: 'uppsc', label: 'UP Principal', icon: GraduationCap },
  ];

  return (
    <View style={[styles.container, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {options.map((opt) => {
          const isActive = examMode === opt.id;
          const Icon = opt.icon;

          return (
            <TouchableOpacity
              key={opt.id}
              style={[
                styles.pill,
                compact && styles.pillCompact,
                {
                  backgroundColor: isActive
                    ? '#2563EB'
                    : isDark
                    ? colors.surfaceHighlight
                    : '#FFFFFF',
                  borderColor: isActive
                    ? '#1D4ED8'
                    : isDark
                    ? colors.border
                    : '#E2E8F0',
                },
              ]}
              onPress={() => setExamMode(opt.id)}
              activeOpacity={0.8}
            >
              <Icon
                size={compact ? 13 : 15}
                color={isActive ? '#FFFFFF' : isDark ? colors.textSecondary : '#475569'}
              />
              <Text
                style={[
                  styles.pillText,
                  compact && styles.pillTextCompact,
                  {
                    color: isActive
                      ? '#FFFFFF'
                      : isDark
                      ? colors.textPrimary
                      : '#334155',
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
              >
                {opt.label}
              </Text>
              {isActive && (
                <View style={styles.activeDot} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {showTagline && (
        <View style={styles.taglineBox}>
          <Text style={[styles.taglineText, { color: colors.textSecondary }]}>
            🎯 Active Target: <Text style={{ color: colors.accent, fontWeight: '700' }}>{examInfo.fullName}</Text>
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  scrollContent: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingVertical: 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  pillCompact: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 5,
  },
  pillText: {
    fontSize: 13,
  },
  pillTextCompact: {
    fontSize: 12,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#93C5FD',
    marginLeft: 2,
  },
  taglineBox: {
    marginTop: 6,
    paddingHorizontal: 2,
  },
  taglineText: {
    fontSize: 12,
  },
});
