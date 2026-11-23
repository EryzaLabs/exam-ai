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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronRight, Sparkles, BookOpen, GraduationCap, School } from 'lucide-react-native';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';
import FirstVisitHeader from './FirstVisitHeader';

export interface ExamCardItem {
  id: 'upsc' | 'uppsc' | 'tgt' | 'pgt';
  title: string;
  tagline: string;
  descriptor: string;
  badge: string;
  iconName: string;
}

export const EXAM_CARDS: ExamCardItem[] = [
  {
    id: 'upsc',
    title: 'UPSC Principal and Vice-Principal',
    tagline: 'Delhi GNCTD, KVS & NVS Principal Cadre',
    descriptor: '120 questions · 300 marks · 120 mins',
    badge: '2 free tests',
    iconName: 'upsc',
  },
  {
    id: 'uppsc',
    title: 'UP Principal and Headmaster',
    tagline: 'Uttar Pradesh Principal & Headmaster Recruitment',
    descriptor: '120 questions · 300 marks · 120 mins',
    badge: '2 free tests',
    iconName: 'uppsc',
  },
  {
    id: 'tgt',
    title: 'DSSSB TGT',
    tagline: 'Trained Graduate Teacher (All Official Papers)',
    descriptor: '200 questions · 200 marks · 120 mins',
    badge: '2 free tests',
    iconName: 'tgt',
  },
  {
    id: 'pgt',
    title: 'DSSSB PGT',
    tagline: 'Post Graduate Teacher (All Official Papers)',
    descriptor: '300 questions · 300 marks · 180 mins',
    badge: '2 free tests',
    iconName: 'pgt',
  },
];

export const FIRST_VISIT_EXAM_STORAGE_KEY = '@astra_first_visit_exam';

export default function ExamPicker() {
  const { colors, typography, radii } = useChalkboardTheme();

  const handleSelectExam = async (examId: 'upsc' | 'uppsc' | 'tgt' | 'pgt') => {
    try {
      await AsyncStorage.setItem(FIRST_VISIT_EXAM_STORAGE_KEY, examId);
      await AsyncStorage.setItem('@astra_exam_target', examId);
    } catch (e) {
      // Safe fallback if storage fails
      console.warn('Failed to save exam selection to AsyncStorage:', e);
    }
    router.push(`/exam/${examId}` as any);
  };

  const renderIcon = (id: string) => {
    switch (id) {
      case 'upsc':
        return <GraduationCap size={24} color={colors.accent} />;
      case 'uppsc':
        return <School size={24} color={colors.accent} />;
      case 'tgt':
        return <BookOpen size={24} color={colors.accent} />;
      case 'pgt':
        return <Sparkles size={24} color={colors.accent} />;
      default:
        return <BookOpen size={24} color={colors.accent} />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FirstVisitHeader />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.innerWrapper}>
          {/* Header Typography */}
          <View style={styles.heroSection}>
            <Text
              style={[
                styles.headline,
                {
                  color: colors.text,
                  fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
                },
              ]}
            >
              Which exam are you preparing for?
            </Text>
            <Text style={[styles.subtext, { color: colors.muted }]}>
              Choose one and try a free test for it. No sign-up needed.
            </Text>
          </View>

          {/* Exam Cards Grid */}
          <View style={styles.cardsGrid}>
            {EXAM_CARDS.map((card) => (
              <TouchableOpacity
                key={card.id}
                style={[
                  styles.examCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.line,
                    borderRadius: radii.card,
                  },
                ]}
                onPress={() => handleSelectExam(card.id)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeaderRow}>
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: colors.surface2, borderColor: colors.line },
                    ]}
                  >
                    {renderIcon(card.id)}
                  </View>
                  <View
                    style={[
                      styles.freeBadge,
                      { backgroundColor: colors.successBg, borderColor: colors.success },
                    ]}
                  >
                    <Text style={[styles.freeBadgeText, { color: colors.success }]}>
                      {card.badge}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <Text
                    style={[
                      styles.cardTitle,
                      {
                        color: colors.text,
                        fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
                      },
                    ]}
                  >
                    {card.title}
                  </Text>
                  <Text style={[styles.cardTagline, { color: colors.muted }]}>
                    {card.tagline}
                  </Text>
                </View>

                <View style={[styles.cardFooter, { borderTopColor: colors.line }]}>
                  <Text style={[styles.cardDescriptor, { color: colors.muted }]}>
                    {card.descriptor}
                  </Text>
                  <View style={styles.actionArrow}>
                    <ChevronRight size={18} color={colors.accent} />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Calm trust micro-strip */}
          <View style={[styles.trustStrip, { borderColor: colors.line, backgroundColor: colors.surface2 }]}>
            <Text style={[styles.trustText, { color: colors.muted }]}>
              Official CBT pattern · Real previous year papers · In-depth bilingual explanations
            </Text>
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
    paddingVertical: 32,
    alignItems: 'center',
  },
  innerWrapper: {
    maxWidth: 820,
    width: '100%',
  },
  heroSection: {
    marginBottom: 28,
  },
  headline: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtext: {
    fontSize: 16,
    lineHeight: 22,
  },
  cardsGrid: {
    gap: 16,
  },
  examCard: {
    borderWidth: 1,
    padding: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
  },
  freeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  cardBody: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardTagline: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardFooter: {
    paddingTop: 14,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDescriptor: {
    fontSize: 13,
    fontWeight: '500',
  },
  actionArrow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trustStrip: {
    marginTop: 28,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  trustText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});
