import React, { useState } from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
  Image,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  BookOpen,
  BarChart2,
  Sparkles,
  GraduationCap,
  Clock,
  Target,
  Zap,
} from 'lucide-react-native';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';
import { AstraMark } from '@/components/chalkboard/AstraLogo';
import Button from '@/components/chalkboard/Button';
import Pill from '@/components/chalkboard/Pill';

export const WALKTHROUGH_STORAGE_KEY = '@astra_walkthrough_completed_v1';

export async function hasCompletedWalkthrough(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(WALKTHROUGH_STORAGE_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function markWalkthroughCompleted(): Promise<void> {
  try {
    await AsyncStorage.setItem(WALKTHROUGH_STORAGE_KEY, 'true');
  } catch {
    // Ignore storage write errors
  }
}

export async function resetWalkthrough(): Promise<void> {
  try {
    await AsyncStorage.removeItem(WALKTHROUGH_STORAGE_KEY);
  } catch {
    // Ignore storage removal errors
  }
}

export interface FirstTimeWalkthroughProps {
  visible: boolean;
  onComplete: () => void;
  onNavigate?: (route: string) => void;
}

interface WalkthroughStep {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  highlights: { title: string; desc: string }[];
  actionLabel?: string;
  actionRoute?: string;
}

const STEPS: WalkthroughStep[] = [
  {
    id: 'welcome',
    badge: 'STEP 1 OF 4 · WELCOME',
    title: 'Your Exam Command Center',
    subtitle:
      'Astra Exam AI is built specifically for UPSC Principal, UP Principal, DSSSB TGT, and DSSSB PGT aspirants. Switch your target exam anytime from the top bar to filter papers, topics, and analytics.',
    highlights: [
      {
        title: 'Tailored Exam Switcher',
        desc: 'Instantly switch between UPSC, UPPSC, TGT, and PGT tracks.',
      },
      {
        title: 'Bilingual Interface',
        desc: 'Questions and explanations in both English and Hindi where available.',
      },
      {
        title: 'Chalkboard Focus Mode',
        desc: 'High-contrast light and dark themes designed for long study sessions.',
      },
    ],
  },
  {
    id: 'cbt-mocks',
    badge: 'STEP 2 OF 4 · MOCK EXAMS',
    title: 'Real CBT Exam Simulator',
    subtitle:
      'Experience authentic Computer-Based Testing before exam day. Full-length mocks mirror official question counts, timing, and negative marking.',
    highlights: [
      {
        title: 'Live Question Palette',
        desc: 'Jump between sections, mark questions for review, and track answered status.',
      },
      {
        title: 'Auto-Save & Resume',
        desc: 'Your timer and answers auto-save continuously—never lose progress on reload.',
      },
      {
        title: 'Bookmark & Flag',
        desc: 'Save tricky questions during any test for quick revision in your Profile.',
      },
    ],
    actionLabel: 'Browse Mock Tests',
    actionRoute: '/test-list',
  },
  {
    id: 'practice-hub',
    badge: 'STEP 3 OF 4 · PRACTICE HUB',
    title: '950+ Topic Sets & AI Custom Tests',
    subtitle:
      'Master individual syllabus topics without sitting through a 2-hour mock. Drill high-weightage rules, policies, and subject papers at your own pace.',
    highlights: [
      {
        title: 'Syllabus Topic Sets',
        desc: 'Focused 20-question sets on NEP 2020, GFR 2017, CCS Rules, RTE Act, Hindi & more.',
      },
      {
        title: 'Quick 10-Question Drills',
        desc: 'Launch a rapid drill on any topic for fast daily revision.',
      },
      {
        title: 'AI Custom Test Builder',
        desc: 'Generate personalized tests by difficulty, topic mix, and question count.',
      },
    ],
    actionLabel: 'Open Practice Hub',
    actionRoute: '/(tabs)/practice',
  },
  {
    id: 'analytics-vidya',
    badge: 'STEP 4 OF 4 · ANALYTICS & VIDYA AI',
    title: 'Spot Weak Topics & Ask Vidya AI',
    subtitle:
      'Every test ends with a Topic Performance Breakdown so you know exactly what to revise next—backed by Vidya, your 24/7 AI study assistant.',
    highlights: [
      {
        title: 'Topic Accuracy Breakdown',
        desc: 'Weak topics below 50% are flagged with one-tap Practice Drill shortcuts.',
      },
      {
        title: 'Ask Vidya on Any Question',
        desc: 'Tap "Ask AI" on any solution to get step-by-step conceptual explanations.',
      },
      {
        title: 'Progress & Streak Tracking',
        desc: 'Monitor your accuracy trends and daily consistency in the Analytics tab.',
      },
    ],
    actionLabel: 'Meet Vidya AI',
    actionRoute: '/(tabs)/assistant',
  },
];

export default function FirstTimeWalkthrough({
  visible,
  onComplete,
  onNavigate,
}: FirstTimeWalkthroughProps) {
  const { colors, typography, radii } = useChalkboardTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isMobile = windowWidth < 640;

  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  const handleFinish = async () => {
    await markWalkthroughCompleted();
    setStepIndex(0);
    onComplete();
  };

  const handleSkip = async () => {
    await markWalkthroughCompleted();
    setStepIndex(0);
    onComplete();
  };

  const handleActionPress = async () => {
    const route = currentStep.actionRoute;
    await markWalkthroughCompleted();
    setStepIndex(0);
    onComplete();
    if (route && onNavigate) {
      onNavigate(route);
    }
  };

  const renderVisualBanner = () => {
    switch (currentStep.id) {
      case 'welcome':
        return (
          <View
            style={[
              styles.visualBox,
              {
                backgroundColor: colors.hero,
                borderColor: colors.line,
                borderRadius: radii.card,
              },
            ]}
          >
            <View style={styles.visualCenterRow}>
              <AstraMark size={44} />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.visualTitle,
                    {
                      color: colors.text,
                      fontFamily:
                        Platform.OS === 'web' ? typography.headingFamily : undefined,
                    },
                  ]}
                >
                  Astra Exam AI
                </Text>
                <Text style={[styles.visualCaption, { color: colors.muted }]}>
                  UPSC Principal · UP Principal · DSSSB TGT & PGT
                </Text>
              </View>
            </View>
            <View style={styles.chipPreviewRow}>
              {['UPSC Principal', 'UP Principal', 'DSSSB TGT', 'DSSSB PGT'].map((exam, idx) => (
                <View
                  key={exam}
                  style={[
                    styles.previewChip,
                    {
                      backgroundColor: idx === 0 ? colors.accent : colors.surface,
                      borderColor: idx === 0 ? colors.accent : colors.line,
                      borderRadius: radii.pill,
                    },
                  ]}
                >
                  <GraduationCap
                    size={12}
                    color={idx === 0 ? colors.accentText : colors.muted}
                  />
                  <Text
                    style={[
                      styles.previewChipText,
                      { color: idx === 0 ? colors.accentText : colors.text },
                    ]}
                  >
                    {exam}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );

      case 'cbt-mocks':
        return (
          <View
            style={[
              styles.visualBox,
              {
                backgroundColor: colors.hero,
                borderColor: colors.line,
                borderRadius: radii.card,
              },
            ]}
          >
            <View style={styles.cbtHeaderPreview}>
              <View style={styles.cbtBadgeRow}>
                <ClipboardCheck size={18} color={colors.accent} />
                <Text style={[styles.cbtTitle, { color: colors.text }]}>
                  Full Mock CBT Interface
                </Text>
              </View>
              <View
                style={[
                  styles.timerChip,
                  { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radii.pill },
                ]}
              >
                <Clock size={12} color={colors.accent} />
                <Text style={[styles.timerChipText, { color: colors.text }]}>119:45</Text>
              </View>
            </View>
            <View style={styles.palettePreviewRow}>
              {[
                { num: 1, state: 'answered' },
                { num: 2, state: 'answered' },
                { num: 3, state: 'marked' },
                { num: 4, state: 'current' },
                { num: 5, state: 'unvisited' },
                { num: 6, state: 'unvisited' },
              ].map((q) => {
                const bg =
                  q.state === 'answered'
                    ? colors.success
                    : q.state === 'marked'
                    ? colors.accent
                    : q.state === 'current'
                    ? colors.text
                    : colors.surface;
                const fg =
                  q.state === 'answered'
                    ? '#ffffff'
                    : q.state === 'marked'
                    ? colors.accentText
                    : q.state === 'current'
                    ? colors.bg
                    : colors.muted;
                return (
                  <View
                    key={q.num}
                    style={[
                      styles.paletteDot,
                      { backgroundColor: bg, borderColor: colors.line },
                    ]}
                  >
                    <Text style={[styles.paletteDotText, { color: fg }]}>{q.num}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        );

      case 'practice-hub':
        return (
          <View
            style={[
              styles.visualBox,
              {
                backgroundColor: colors.hero,
                borderColor: colors.line,
                borderRadius: radii.card,
              },
            ]}
          >
            <View style={styles.practicePreviewGrid}>
              <View
                style={[
                  styles.practiceMiniCard,
                  { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radii.button },
                ]}
              >
                <BookOpen size={16} color={colors.accent} />
                <Text style={[styles.practiceMiniTitle, { color: colors.text }]}>
                  950+ Topic Sets
                </Text>
                <Text style={[styles.practiceMiniSub, { color: colors.muted }]}>
                  NEP, GFR, CCS, Hindi
                </Text>
              </View>
              <View
                style={[
                  styles.practiceMiniCard,
                  { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radii.button },
                ]}
              >
                <Zap size={16} color={colors.success} />
                <Text style={[styles.practiceMiniTitle, { color: colors.text }]}>
                  10-Q Quick Drill
                </Text>
                <Text style={[styles.practiceMiniSub, { color: colors.muted }]}>
                  Instant feedback
                </Text>
              </View>
              <View
                style={[
                  styles.practiceMiniCard,
                  { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radii.button },
                ]}
              >
                <Sparkles size={16} color={colors.accent} />
                <Text style={[styles.practiceMiniTitle, { color: colors.text }]}>
                  AI Custom Test
                </Text>
                <Text style={[styles.practiceMiniSub, { color: colors.muted }]}>
                  Tailored to you
                </Text>
              </View>
            </View>
          </View>
        );

      case 'analytics-vidya':
        return (
          <View
            style={[
              styles.visualBox,
              {
                backgroundColor: colors.hero,
                borderColor: colors.line,
                borderRadius: radii.card,
              },
            ]}
          >
            <View style={styles.visualCenterRow}>
              <Image
                source={require('@/assets/images/vidya.png')}
                style={styles.vidyaAvatar}
                resizeMode="contain"
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.visualTitle, { color: colors.text }]}>
                  Vidya AI & Topic Analytics
                </Text>
                <Text style={[styles.visualCaption, { color: colors.muted }]}>
                  Pinpoint weak areas & get instant explanations
                </Text>
              </View>
            </View>
            <View style={styles.analyticsPreviewBars}>
              <View style={styles.barRow}>
                <Text style={[styles.barLabel, { color: colors.text }]}>NEP 2020</Text>
                <View style={[styles.barTrack, { backgroundColor: colors.surface }]}>
                  <View style={[styles.barFill, { width: '85%', backgroundColor: colors.success }]} />
                </View>
                <Text style={[styles.barPct, { color: colors.success }]}>85%</Text>
              </View>
              <View style={styles.barRow}>
                <Text style={[styles.barLabel, { color: colors.text }]}>GFR 2017</Text>
                <View style={[styles.barTrack, { backgroundColor: colors.surface }]}>
                  <View style={[styles.barFill, { width: '38%', backgroundColor: colors.danger }]} />
                </View>
                <Text style={[styles.barPct, { color: colors.danger }]}>38%</Text>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <View style={[styles.backdrop, isMobile && { paddingHorizontal: 12, paddingVertical: 16 }]}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.line,
              borderRadius: radii.card,
              maxWidth: 540,
              maxHeight: windowHeight ? Math.min(windowHeight * 0.9, 700) : '90%',
            },
          ]}
        >
          {/* Top Header */}
          <View style={[styles.header, { borderBottomColor: colors.line }]}>
            <Pill label={currentStep.badge} variant="accent" />
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.surface2 }]}
              onPress={handleSkip}
              accessibilityLabel="Skip walkthrough"
            >
              <X size={16} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Scrollable Body */}
          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {renderVisualBanner()}

            <Text
              style={[
                styles.title,
                {
                  color: colors.text,
                  fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
                },
              ]}
            >
              {currentStep.title}
            </Text>

            <Text style={[styles.subtitle, { color: colors.muted }]}>
              {currentStep.subtitle}
            </Text>

            <View style={styles.highlightsList}>
              {currentStep.highlights.map((item, idx) => (
                <View key={idx} style={styles.highlightRow}>
                  <CheckCircle2
                    size={16}
                    color={colors.success}
                    style={{ marginTop: 2, flexShrink: 0 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.highlightTitle, { color: colors.text }]}>
                      {item.title}
                    </Text>
                    <Text style={[styles.highlightDesc, { color: colors.muted }]}>
                      {item.desc}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Footer Navigation */}
          <View style={[styles.footer, { borderTopColor: colors.line }]}>
            {/* Step Dots */}
            <View style={styles.dotsRow}>
              {STEPS.map((s, idx) => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => setStepIndex(idx)}
                  accessibilityLabel={`Go to step ${idx + 1}`}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: idx === stepIndex ? colors.accent : colors.line,
                      width: idx === stepIndex ? 20 : 8,
                    },
                  ]}
                />
              ))}
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonsRow}>
              {!isFirst ? (
                <Button
                  label="Back"
                  variant="secondary"
                  size="small"
                  icon={<ArrowLeft size={14} color={colors.text} />}
                  onPress={() => setStepIndex((i) => Math.max(0, i - 1))}
                />
              ) : (
                <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
                  <Text style={[styles.skipText, { color: colors.muted }]}>Skip tour</Text>
                </TouchableOpacity>
              )}

              <View style={styles.rightBtns}>
                {currentStep.actionLabel && onNavigate && !isLast && (
                  <Button
                    label={currentStep.actionLabel}
                    variant="secondary"
                    size="small"
                    onPress={handleActionPress}
                  />
                )}
                {!isLast ? (
                  <Button
                    label="Next"
                    variant="primary"
                    size="small"
                    iconRight={<ArrowRight size={14} color={colors.accentText} />}
                    onPress={() => setStepIndex((i) => Math.min(STEPS.length - 1, i + 1))}
                  />
                ) : (
                  <Button
                    label="Get Started"
                    variant="primary"
                    size="small"
                    iconRight={<Target size={14} color={colors.accentText} />}
                    onPress={handleFinish}
                  />
                )}
              </View>
            </View>
          </View>
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 18, 15, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35)',
      },
      default: {
        elevation: 12,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: 20,
    gap: 14,
  },
  visualBox: {
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  visualCenterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  visualTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  visualCaption: {
    fontSize: 13,
    marginTop: 2,
  },
  chipPreviewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  previewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  previewChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cbtHeaderPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cbtBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cbtTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  timerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  timerChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  palettePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  paletteDot: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paletteDotText: {
    fontSize: 12,
    fontWeight: '700',
  },
  practicePreviewGrid: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  practiceMiniCard: {
    flex: 1,
    minWidth: 120,
    padding: 10,
    borderWidth: 1,
    gap: 4,
  },
  practiceMiniTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: 2,
  },
  practiceMiniSub: {
    fontSize: 11.5,
  },
  vidyaAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  analyticsPreviewBars: {
    gap: 8,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barLabel: {
    width: 68,
    fontSize: 12,
    fontWeight: '600',
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barPct: {
    width: 36,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14.5,
    lineHeight: 21,
  },
  highlightsList: {
    gap: 10,
    marginTop: 2,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  highlightTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  highlightDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    gap: 12,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  rightBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  skipText: {
    fontSize: 13.5,
    fontWeight: '500',
  },
});
