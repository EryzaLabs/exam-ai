import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Award,
  BookOpen,
  Building2,
  GraduationCap,
  Sparkles,
  Zap,
  ArrowRight,
  Clock,
  CheckCircle2,
  Layers,
} from 'lucide-react-native';
import { useExam, ExamTarget } from '@/context/exam-context';
import { useTheme } from '@/context/theme-context';
import { useAuth } from '@/context/auth-context';

export interface FeaturedTrackItem {
  id: string;
  examTarget?: ExamTarget;
  route?: string;
  badge: string;
  title: string;
  subtitle: string;
  metrics: string;
  perks: string[];
  gradient: [string, string, ...string[]];
  accentColor: string;
  icon: any;
  category?: 'all' | 'full' | 'topic';
}

const FEATURED_ITEMS: FeaturedTrackItem[] = [
  {
    id: 'upsc-principal',
    examTarget: 'upsc',
    badge: '🏛️ UPSC PRINCIPAL 2026',
    title: 'UPSC Principal & Vice-Principal',
    subtitle: '26 Full Length CBT Mocks (120 Qs) • 158 Topic Wise Practice Sets with authentic explanations',
    metrics: '26 CBT Mocks • 158 Topics',
    perks: ['120 Qs / 300 Marks', '2 Hours Timed CBT', 'All Syllabus Topics'],
    gradient: ['#1E3A8A', '#2563EB', '#3B82F6'],
    accentColor: '#93C5FD',
    icon: Building2,
    category: 'all',
  },
  {
    id: 'tgt-series',
    examTarget: 'tgt',
    badge: '🎯 TGT SERIES • 200 QUESTIONS CBT',
    title: 'DSSSB TGT Official Exam Papers',
    subtitle: 'Complete 200 Questions CBT Papers (Section A: 100 Qs General + Section B: 100 Qs Subject) across English, Hindi, Maths, Natural Science, Social Studies, Special Education & CS',
    metrics: '200 Qs / 200 Marks • 2h CBT',
    perks: ['200 Qs Official Paper', '10-11 Exam Sections', 'Official Verified Keys'],
    gradient: ['#7C2D12', '#C2410C', '#EA580C'],
    accentColor: '#FDBA74',
    icon: BookOpen,
    category: 'all',
  },
  {
    id: 'pgt-series',
    examTarget: 'pgt',
    badge: '🎓 PGT SERIES • 300 QUESTIONS CBT',
    title: 'DSSSB PGT Official Exam Papers',
    subtitle: 'Complete 300 Questions CBT Papers (Section A: 100 Qs General + Section B: 200 Qs Subject) across Commerce, Economics, History, PolSci, Geography, Sociology, Physics, Biology, Fine Arts & Music',
    metrics: '300 Qs / 300 Marks • 3h CBT',
    perks: ['300 Qs Official Paper', '15 Exam Sections', 'Official Verified Keys'],
    gradient: ['#581C87', '#7E22CE', '#9333EA'],
    accentColor: '#D8B4FE',
    icon: Award,
    category: 'all',
  },
  {
    id: 'uppsc-principal',
    examTarget: 'uppsc',
    badge: '🏫 UP PRINCIPAL 2026',
    title: 'UP Principal & Headmaster Series',
    subtitle: 'Aligned with UPPSC Education Cadre syllabus, service rules, financial administration & leadership',
    metrics: 'UPPSC Syllabus Aligned',
    perks: ['Admin & Service Rules', 'Full CBT Mocks', 'State Rank Analytics'],
    gradient: ['#065F46', '#059669', '#10B981'],
    accentColor: '#6EE7B7',
    icon: GraduationCap,
    category: 'all',
  },
  {
    id: 'ai-custom',
    route: '/custom-ai-test',
    badge: '⚡ AI TEST BUILDER',
    title: 'Instant Custom AI Mock Exam',
    subtitle: 'Generate tailored CBT mock tests on any weak topic, custom question count (10-120), and timer with AI',
    metrics: 'Unlimited AI Generation',
    perks: ['Gemini AI Generated', 'Any Topic/Subject', 'Instant Solutions'],
    gradient: ['#831843', '#BE185D', '#DB2777'],
    accentColor: '#F472B6',
    icon: Sparkles,
  },
];

interface FeaturedTracksSliderProps {
  compact?: boolean;
}

export default function FeaturedTracksSlider({ compact = false }: FeaturedTracksSliderProps) {
  const { width } = useWindowDimensions();
  const { examMode, setExamMode } = useExam();
  const { isDark } = useTheme();
  const { isSubscribed, requireAuth } = useAuth();

  const isDesktop = width >= 1024;
  const isTablet = width >= 640 && width < 1024;

  const cardWidth = isDesktop
    ? Math.min(380, (width - 320) / 2.3)
    : isTablet
    ? width * 0.65
    : width * 0.85;

  const handleSelect = (item: FeaturedTrackItem) => {
    if (item.route) {
      requireAuth(() => router.push((isSubscribed ? item.route : '/premium') as any), {
        title: 'Sign In for Custom AI Tests',
        feature: 'Custom AI Tests',
      });
      return;
    }

    if (item.examTarget) {
      setExamMode(item.examTarget);
      router.push({
        pathname: '/test-list',
        params: { category: item.category || 'all' },
      });
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContainer,
          isDesktop && styles.scrollContainerDesktop,
        ]}
        decelerationRate="fast"
        snapToInterval={cardWidth + 16}
        snapToAlignment="start"
      >
        {FEATURED_ITEMS.map((item) => {
          const IconComp = item.icon;
          const isActive = item.examTarget === examMode;

          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.card,
                { width: cardWidth },
                compact && styles.cardCompact,
                isActive && { borderColor: '#FDE047', borderWidth: 2, transform: [{ scale: 1.01 }] }
              ]}
              onPress={() => handleSelect(item)}
              activeOpacity={0.92}
            >
              <LinearGradient
                colors={item.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                {/* Header Row: Badge & Metric */}
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.badgeContainer, isActive && { backgroundColor: 'rgba(253, 224, 71, 0.25)', borderColor: '#FDE047', borderWidth: 1 }]}>
                    <IconComp size={13} color={isActive ? '#FEF08A' : '#FFFFFF'} />
                    <Text style={[styles.badgeText, isActive && { color: '#FEF08A', fontWeight: '800' }]}>
                      {isActive ? `★ ACTIVE • ${item.badge}` : item.badge}
                    </Text>
                  </View>
                  <View style={styles.metricPill}>
                    <Text style={styles.metricPillText}>{item.metrics}</Text>
                  </View>
                </View>

                {/* Title & Subtitle */}
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.cardSubtitle} numberOfLines={2}>
                  {item.subtitle}
                </Text>

                {/* Key Perks */}
                <View style={styles.perksRow}>
                  {item.perks.map((perk, idx) => (
                    <View key={idx} style={styles.perkChip}>
                      <CheckCircle2 size={11} color={item.accentColor} />
                      <Text style={styles.perkText}>{perk}</Text>
                    </View>
                  ))}
                </View>

                {/* Footer CTA */}
                <View style={styles.cardFooter}>
                  <Text style={[styles.ctaText, { color: item.accentColor }]}>
                    Explore Tests
                  </Text>
                  <View style={[styles.arrowCircle, { backgroundColor: item.accentColor }]}>
                    <ArrowRight size={14} color="#0F172A" />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  scrollContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  scrollContainerDesktop: {
    paddingHorizontal: 0,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  cardCompact: {
    borderRadius: 16,
  },
  cardGradient: {
    padding: 18,
    minHeight: 185,
    justifyContent: 'space-between',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 6,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  metricPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
  metricPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  perksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  perkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  perkText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  arrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
