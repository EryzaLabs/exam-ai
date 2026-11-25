import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Zap,
  BookOpen,
  SlidersHorizontal,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Search,
  Play,
} from 'lucide-react-native';
import { useAuth } from '@/context/auth-context';
import { useSub } from '@/context/subscription-context';
import { useExam } from '@/context/exam-context';
import { useLanguage } from '@/context/language-context';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';
import {
  ServerPaper,
  INITIAL_TGT_PGT_PAPERS,
  INITIAL_TOPIC_PAPERS,
  INITIAL_FULL_MOCKS,
  INITIAL_PAPERS_CATALOG,
} from '@/services/paper-service';
import AppShell from '@/components/chalkboard/AppShell';
import Card from '@/components/chalkboard/Card';
import Button from '@/components/chalkboard/Button';
import Pill from '@/components/chalkboard/Pill';
import Modal from '@/components/chalkboard/Modal';
import { formatTopicDisplayName, formatCleanTestTitle } from '@/utils/topic-resolver';

export interface TopicGroup {
  topic: string;
  papers: ServerPaper[];
  totalQuestions: number;
}

export default function PracticeScreen() {
  const { user } = useAuth();
  const { isSubscribed } = useSub();
  const { examMode, examInfo } = useExam();
  const { t } = useLanguage();
  const { colors, typography, radii } = useChalkboardTheme();
  const params = useLocalSearchParams<{ topic?: string }>();

  const [loading, setLoading] = useState(false);
  const [topicSearchQuery, setTopicSearchQuery] = useState('');

  // Topic Sets Modal state
  const [selectedTopicGroup, setSelectedTopicGroup] = useState<TopicGroup | null>(null);

  // Group exam papers by syllabus topic
  const topicGroups: TopicGroup[] = useMemo(() => {
    let pool = INITIAL_TOPIC_PAPERS;
    if (examMode === 'tgt') {
      pool = INITIAL_TGT_PGT_PAPERS.filter((p) => p.series === 'tgt' || p.filename.includes('tgt'));
    } else if (examMode === 'pgt') {
      pool = INITIAL_TGT_PGT_PAPERS.filter((p) => p.series === 'pgt' || p.filename.includes('pgt'));
    } else {
      pool = INITIAL_TOPIC_PAPERS.length > 0 ? INITIAL_TOPIC_PAPERS : INITIAL_PAPERS_CATALOG;
    }

    const map = new Map<string, { topic: string; papers: ServerPaper[]; totalQuestions: number }>();

    pool.forEach((p) => {
      const rawTopic = p.subject || p.title || '';
      const topicName = formatTopicDisplayName(
        rawTopic.replace(/^Topic Test:\s*/i, '').replace(/ - Part \d+$/i, '').trim()
      );
      if (!topicName) return;
      if (!map.has(topicName)) {
        map.set(topicName, {
          topic: topicName,
          papers: [],
          totalQuestions: 0,
        });
      }
      const entry = map.get(topicName)!;
      entry.papers.push(p);
      entry.totalQuestions += p.totalQuestions || 20;
    });

    if (map.size === 0) {
      const fallbackList = [
        'GFR Rules & Financial Administration',
        'CCS Conduct & Pension Rules',
        'School Leadership & Administration',
        'RTE Act & POCSO Act',
        'NEP 2020 & Educational Policies',
        'General English',
        'General Hindi',
        'Logical Reasoning',
        'Quantitative Aptitude',
      ];
      fallbackList.forEach((fb) => {
        map.set(fb, {
          topic: fb,
          papers: [INITIAL_PAPERS_CATALOG[0]],
          totalQuestions: 20,
        });
      });
    }

    return Array.from(map.values()).sort((a, b) => a.topic.localeCompare(b.topic));
  }, [examMode]);

  const filteredTopicGroups = useMemo(() => {
    if (!topicSearchQuery.trim()) return topicGroups;
    const q = topicSearchQuery.toLowerCase();
    return topicGroups.filter((g) => g.topic.toLowerCase().includes(q));
  }, [topicGroups, topicSearchQuery]);

  // Handle immediate topic selection if routed with param: ?topic=...
  useEffect(() => {
    if (params.topic) {
      startTopicDrill(params.topic);
    }
  }, [params.topic]);

  // Launch a test in the official CBT Mock Test runner
  const startPaperTest = (paper: ServerPaper) => {
    setSelectedTopicGroup(null);
    router.push({
      pathname: '/test-instructions',
      params: {
        testId: paper.testId || paper.id,
        filename: paper.filename,
      },
    } as any);
  };

  // Quick Practice: picks an official practice test and launches examination
  const startQuickPractice = () => {
    let pool = INITIAL_TOPIC_PAPERS;
    if (examMode === 'tgt') {
      pool = INITIAL_TGT_PGT_PAPERS.filter((p) => p.series === 'tgt' || p.filename.includes('tgt'));
    } else if (examMode === 'pgt') {
      pool = INITIAL_TGT_PGT_PAPERS.filter((p) => p.series === 'pgt' || p.filename.includes('pgt'));
    } else {
      pool = INITIAL_TOPIC_PAPERS.length > 0 ? INITIAL_TOPIC_PAPERS : INITIAL_FULL_MOCKS;
    }
    const match = pool[Math.floor(Math.random() * pool.length)] || INITIAL_PAPERS_CATALOG[0];
    startPaperTest(match);
  };

  const startTopicDrill = (topicName: string) => {
    const group = topicGroups.find(
      (g) =>
        g.topic.toLowerCase() === topicName.toLowerCase() ||
        topicName.toLowerCase().includes(g.topic.toLowerCase())
    );
    if (group && group.papers.length > 1) {
      setSelectedTopicGroup(group);
    } else if (group && group.papers.length === 1) {
      startPaperTest(group.papers[0]);
    } else {
      const fallbackPaper = INITIAL_TOPIC_PAPERS[0] || INITIAL_PAPERS_CATALOG[0];
      if (fallbackPaper) startPaperTest(fallbackPaper);
    }
  };

  return (
    <AppShell maxWidth={840}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerBlock}>
          <Text
            style={[
              styles.screenTitle,
              {
                color: colors.text,
                fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
              },
            ]}
          >
            {t('Practice Hub', 'अभ्यास केंद्र (Practice Hub)')}
          </Text>
          <Text style={[styles.screenSubtitle, { color: colors.muted }]}>
            {t(
              'Target your specific weak topics, generate custom tests, or start timed topic examinations.',
              'अपने कमजोर विषयों का अभ्यास करें, कस्टम AI टेस्ट बनाएं, या टाइम्ड टॉपिक परीक्षा दें।'
            )}
          </Text>
        </View>

        {loading && (
          <View style={styles.loadingBanner}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={[styles.loadingBannerText, { color: colors.muted }]}>
              Loading tests...
            </Text>
          </View>
        )}

        {/* 4 Clear Entry Cards */}
        <View style={styles.cardsGrid}>
          {/* 1. Quick Practice */}
          <Card
            isHero
            style={styles.entryCard}
            onPress={startQuickPractice}
            accessibilityLabel="Start quick practice test"
          >
            <View style={styles.cardTopRow}>
              <View style={[styles.iconBox, { backgroundColor: colors.surface2 }]}>
                <Zap size={20} color={colors.accent} />
              </View>
              <Pill label="20 Qs · 20 Mins" variant="neutral" />
            </View>

            <Text
              style={[
                styles.cardTitle,
                {
                  color: colors.text,
                  fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
                },
              ]}
            >
              Quick Practice
            </Text>
            <Text style={[styles.cardDescription, { color: colors.muted }]}>
              Random syllabus test to test your recall under timed CBT conditions.
            </Text>

            <View style={[styles.cardFooter, { borderTopColor: colors.line }]}>
              <Text style={[styles.cardActionText, { color: colors.accent }]}>
                Start quick session
              </Text>
              <ArrowRight size={14} color={colors.accent} />
            </View>
          </Card>

          {/* 2. Topic Wise Practice */}
          <Card
            style={styles.entryCard}
            onPress={() => {
              if (Platform.OS === 'web' && typeof document !== 'undefined') {
                const el = document.getElementById('syllabus-topics-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            accessibilityLabel="Browse syllabus topics"
          >
            <View style={styles.cardTopRow}>
              <View style={[styles.iconBox, { backgroundColor: colors.surface2 }]}>
                <BookOpen size={20} color={colors.accent} />
              </View>
              <Pill label={`${topicGroups.length} Topics`} variant="neutral" />
            </View>

            <Text
              style={[
                styles.cardTitle,
                {
                  color: colors.text,
                  fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
                },
              ]}
            >
              Topic Wise Practice
            </Text>
            <Text style={[styles.cardDescription, { color: colors.muted }]}>
              Drill down by syllabus subject. Choose official question sets per topic.
            </Text>

            <View style={[styles.cardFooter, { borderTopColor: colors.line }]}>
              <Text style={[styles.cardActionText, { color: colors.accent }]}>
                Browse syllabus topics
              </Text>
              <ArrowRight size={14} color={colors.accent} />
            </View>
          </Card>

          {/* 3. Custom Test Generator */}
          <Card
            style={styles.entryCard}
            onPress={() => router.push('/custom-test')}
            accessibilityLabel="Open custom test builder"
          >
            <View style={styles.cardTopRow}>
              <View style={[styles.iconBox, { backgroundColor: colors.surface2 }]}>
                <SlidersHorizontal size={20} color={colors.accent} />
              </View>
              <Pill label="Customizable" variant="neutral" />
            </View>

            <Text
              style={[
                styles.cardTitle,
                {
                  color: colors.text,
                  fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
                },
              ]}
            >
              Custom Test Builder
            </Text>
            <Text style={[styles.cardDescription, { color: colors.muted }]}>
              Build your own examination. Choose question count, duration, and syllabus topics.
            </Text>

            <View style={[styles.cardFooter, { borderTopColor: colors.line }]}>
              <Text style={[styles.cardActionText, { color: colors.accent }]}>
                Build custom test
              </Text>
              <ArrowRight size={14} color={colors.accent} />
            </View>
          </Card>

          {/* 4. AI Adaptive Test */}
          <Card
            style={styles.entryCard}
            onPress={() => router.push('/custom-ai-test')}
            accessibilityLabel="Open AI test generator"
          >
            <View style={styles.cardTopRow}>
              <View style={[styles.iconBox, { backgroundColor: colors.surface2 }]}>
                <Sparkles size={20} color={colors.accent} />
              </View>
              <Pill
                label={isSubscribed ? 'Premium Pass' : 'AI Powered'}
                variant={isSubscribed ? 'owned' : 'accent'}
              />
            </View>

            <Text
              style={[
                styles.cardTitle,
                {
                  color: colors.text,
                  fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
                },
              ]}
            >
              AI Custom Generator
            </Text>
            <Text style={[styles.cardDescription, { color: colors.muted }]}>
              Enter any concept or topic. AI crafts focused questions with deep derivations.
            </Text>

            <View style={[styles.cardFooter, { borderTopColor: colors.line }]}>
              <Text style={[styles.cardActionText, { color: colors.accent }]}>
                Generate with AI
              </Text>
              <ArrowRight size={14} color={colors.accent} />
            </View>
          </Card>
        </View>

        {/* Searchable Topic List Section */}
        <View id="syllabus-topics-section" style={styles.topicsSection}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.text,
                fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
              },
            ]}
          >
            Syllabus Topics & Practice Sets
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
            {isSubscribed
              ? 'Select any syllabus topic below to take full official practice tests in the CBT examination engine.'
              : 'Tap any topic to browse official question sets.'}
          </Text>

          {/* Search Box */}
          <View
            style={[
              styles.topicSearchBox,
              { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radii.button },
            ]}
          >
            <Search size={15} color={colors.muted} />
            <TextInput
              style={[styles.topicSearchInput, { color: colors.text }]}
              placeholder="Filter topics..."
              placeholderTextColor={colors.muted}
              value={topicSearchQuery}
              onChangeText={setTopicSearchQuery}
            />
          </View>

          {/* Topic Rows */}
          <View style={styles.topicRowsList}>
            {filteredTopicGroups.map((group, idx) => (
              <Card
                key={idx}
                style={styles.topicRowCard}
                onPress={() => {
                  if (group.papers.length === 1) {
                    startPaperTest(group.papers[0]);
                  } else {
                    setSelectedTopicGroup(group);
                  }
                }}
              >
                <View style={styles.topicRowLeft}>
                  <Text style={[styles.topicRowName, { color: colors.text }]}>
                    {group.topic}
                  </Text>
                  <Text style={[styles.topicRowSub, { color: colors.muted }]}>
                    {group.papers.length} Practice {group.papers.length === 1 ? 'Set' : 'Sets'} · {group.totalQuestions} Questions Total
                  </Text>
                </View>

                <View style={styles.topicRowRight}>
                  <Text style={[styles.drillBtnText, { color: colors.accent }]}>
                    {group.papers.length > 1 ? 'View Sets' : 'Start Test'}
                  </Text>
                  <ChevronRight size={14} color={colors.accent} />
                </View>
              </Card>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Topic Practice Sets Modal */}
      <Modal
        visible={Boolean(selectedTopicGroup)}
        onClose={() => setSelectedTopicGroup(null)}
        title={selectedTopicGroup?.topic || 'Topic Practice Sets'}
      >
        {selectedTopicGroup && (
          <View style={styles.modalContent}>
            <Text style={[styles.topicModalSubtitle, { color: colors.muted }]}>
              {selectedTopicGroup.papers.length} official practice {selectedTopicGroup.papers.length === 1 ? 'set' : 'sets'} · {selectedTopicGroup.totalQuestions} questions total
            </Text>

            <ScrollView style={{ maxHeight: 380, marginTop: 12 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 10 }}>
                {selectedTopicGroup.papers.map((paper, idx) => {
                  const partMatch = paper.filename.match(/test_(\d+)\.json/i);
                  const partNum = partMatch ? partMatch[1] : `${idx + 1}`;

                  return (
                    <View
                      key={paper.id || idx}
                      style={[
                        styles.setRowCard,
                        {
                          backgroundColor: colors.surface2,
                          borderColor: colors.line,
                          borderRadius: radii.card,
                        },
                      ]}
                    >
                      <View style={styles.setRowInfo}>
                        <Text style={[styles.setRowTitle, { color: colors.text }]}>
                          Practice Set {partNum}
                        </Text>
                        <Text style={[styles.setRowMeta, { color: colors.muted }]}>
                          {paper.totalQuestions || 20} Questions · {paper.duration || 20} Mins
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.setActionButton,
                          {
                            backgroundColor: colors.accent,
                            borderRadius: radii.button,
                          },
                        ]}
                        onPress={() => startPaperTest(paper)}
                        activeOpacity={0.8}
                      >
                        <Play size={12} color={colors.accentText} fill={colors.accentText} />
                        <Text style={[styles.setActionText, { color: colors.accentText }]}>
                          Start Test
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            <View style={{ marginTop: 16 }}>
              <Button
                title="Close"
                variant="secondary"
                onPress={() => setSelectedTopicGroup(null)}
              />
            </View>
          </View>
        )}
      </Modal>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
  },
  headerBlock: {
    marginBottom: 24,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  screenSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    padding: 12,
  },
  loadingBannerText: {
    fontSize: 13,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 32,
  },
  entryCard: {
    flex: 1,
    minWidth: 280,
    padding: 20,
    justifyContent: 'space-between',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  cardActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  topicsSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  topicSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    marginBottom: 14,
    gap: 8,
  },
  topicSearchInput: {
    flex: 1,
    fontSize: 13.5,
    padding: 0,
    borderWidth: 0,
  },
  topicRowsList: {
    gap: 8,
  },
  topicRowCard: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topicRowLeft: {
    flex: 1,
    marginRight: 12,
  },
  topicRowName: {
    fontSize: 14.5,
    fontWeight: '600',
    marginBottom: 3,
  },
  topicRowSub: {
    fontSize: 12,
  },
  topicRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  drillBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalContent: {
    paddingTop: 8,
  },
  topicModalSubtitle: {
    fontSize: 13,
    marginBottom: 6,
  },
  setRowCard: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  setRowInfo: {
    flex: 1,
    marginRight: 10,
  },
  setRowTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  setRowMeta: {
    fontSize: 12,
  },
  setActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  setActionText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
});
