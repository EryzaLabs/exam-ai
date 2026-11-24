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
  Check,
  ChevronRight,
  Search,
  CheckCircle2,
} from 'lucide-react-native';
import { useAuth } from '@/context/auth-context';
import { useSub } from '@/context/subscription-context';
import { useExam, EXAMS } from '@/context/exam-context';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';
import { SSCCGLService } from '@/services/ssc-cgl-service';
import PaperService, {
  ServerPaper,
  INITIAL_TGT_PGT_PAPERS,
  INITIAL_TOPIC_PAPERS,
  INITIAL_FULL_MOCKS,
  INITIAL_PAPERS_CATALOG,
} from '@/services/paper-service';
import AiTestService from '@/services/ai-test-service';
import { resolveQuestionTopic } from '@/utils/topic-resolver';
import AppShell from '@/components/chalkboard/AppShell';
import Card from '@/components/chalkboard/Card';
import Button from '@/components/chalkboard/Button';
import Pill from '@/components/chalkboard/Pill';
import Modal from '@/components/chalkboard/Modal';
import QuizView, { QuizQuestionItem } from '@/components/first-visit/QuizView';
import ResultView from '@/components/first-visit/ResultView';

export default function PracticeScreen() {
  const { user } = useAuth();
  const { isSubscribed } = useSub();
  const { examMode, examInfo } = useExam();
  const { colors, typography, radii } = useChalkboardTheme();
  const params = useLocalSearchParams<{ topic?: string }>();

  const [loading, setLoading] = useState(false);
  const [activeQuizQuestions, setActiveQuizQuestions] = useState<QuizQuestionItem[] | null>(null);
  const [activeQuizTitle, setActiveQuizTitle] = useState('Practice Drill');
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});

  // Modals for Custom and AI test
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  // Custom Test state
  const [customQuestionCount, setCustomQuestionCount] = useState(15);
  const [customDuration, setCustomDuration] = useState(15);
  const [customDifficulty, setCustomDifficulty] = useState<'All' | 'Moderate' | 'Advanced'>('All');
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set(['Core Subject']));

  // AI Test state
  const [aiTopicInput, setAiTopicInput] = useState('');
  const [aiRemainingQuota, setAiRemainingQuota] = useState(3);
  const [aiLoading, setAiLoading] = useState(false);

  // Search topic list
  const [topicSearchQuery, setTopicSearchQuery] = useState('');

  // Topic Sets Modal state
  const [selectedTopicGroup, setSelectedTopicGroup] = useState<{
    topic: string;
    papers: ServerPaper[];
    totalQuestions: number;
  } | null>(null);

  // Group exam papers by syllabus topic
  const topicGroups = useMemo(() => {
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
      const topicName = (p.subject || '').replace(/_/g, ' ').trim() || (p.title || '').replace(/^Topic Test:\s*/i, '').trim();
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
      entry.totalQuestions += (p.totalQuestions || 20);
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

  const syllabusTopics = useMemo(() => {
    return topicGroups.map((g) => g.topic);
  }, [topicGroups]);

  const filteredTopicGroups = useMemo(() => {
    if (!topicSearchQuery.trim()) return topicGroups;
    const q = topicSearchQuery.toLowerCase();
    return topicGroups.filter((g) => g.topic.toLowerCase().includes(q));
  }, [topicGroups, topicSearchQuery]);

  // Handle immediate topic drill if routed with param: ?topic=...
  useEffect(() => {
    if (params.topic) {
      startTopicDrill(params.topic);
    }
  }, [params.topic]);

  // 1. Quick Practice: 10 random questions
  const startQuickPractice = async () => {
    setLoading(true);
    try {
      let pool = INITIAL_TOPIC_PAPERS;
      if (examMode === 'tgt') {
        pool = INITIAL_TGT_PGT_PAPERS.filter((p) => p.series === 'tgt' || p.filename.includes('tgt'));
      } else if (examMode === 'pgt') {
        pool = INITIAL_TGT_PGT_PAPERS.filter((p) => p.series === 'pgt' || p.filename.includes('pgt'));
      } else {
        pool = INITIAL_TOPIC_PAPERS.length > 0 ? INITIAL_TOPIC_PAPERS : INITIAL_FULL_MOCKS;
      }

      if (!pool || pool.length === 0) {
        pool = INITIAL_PAPERS_CATALOG;
      }

      const match = pool[Math.floor(Math.random() * pool.length)];
      const paper = await SSCCGLService.fetchPaper(match.filename);

      if (paper && paper.sections && paper.sections.length > 0) {
        const all = paper.sections.flatMap((s) => s.questions);
        const shuffled = [...all].sort(() => 0.5 - Math.random()).slice(0, 10);

        const mapped: QuizQuestionItem[] = shuffled.map((q) => ({
          id: q.id,
          questionText: q.questionText,
          options: q.options || [],
          correctAnswerIndex: q.correctAnswerIndex ?? 0,
          explanation:
            typeof q.explanation === 'string'
              ? q.explanation
              : q.explanation?.english || 'Standard step-by-step derivation.',
          topic: resolveQuestionTopic(q, undefined, paper.title) || 'Quick Practice',
        }));

        setActiveQuizTitle('10-Question Quick Practice');
        setActiveQuizQuestions(mapped);
        setQuizCompleted(false);
      }
    } catch (e) {
      console.warn('Quick practice load error:', e);
    } finally {
      setLoading(false);
    }
  };

  // 2. Topic Drill and CBT launchers
  const startPaperDrill = async (paperMeta: ServerPaper, topicName?: string) => {
    setSelectedTopicGroup(null);
    setLoading(true);
    try {
      const paper = await SSCCGLService.fetchPaper(paperMeta.filename);
      if (paper && paper.sections && paper.sections.length > 0) {
        // Load all questions in the official paper without artificial truncation
        const all = paper.sections.flatMap((s) => s.questions);
        const mapped: QuizQuestionItem[] = all.map((q) => ({
          id: q.id,
          questionText: q.questionText,
          options: q.options || [],
          correctAnswerIndex: q.correctAnswerIndex ?? 0,
          explanation:
            typeof q.explanation === 'string'
              ? q.explanation
              : q.explanation?.english || 'Official solution derivation.',
          topic: topicName || paper.title || 'Practice Set',
        }));

        setActiveQuizTitle(paper.title || `${topicName || 'Topic'} Practice Set`);
        setActiveQuizQuestions(mapped);
        setQuizCompleted(false);
      }
    } catch (e) {
      console.warn('Paper drill load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const startPaperCBT = (paperMeta: ServerPaper) => {
    setSelectedTopicGroup(null);
    router.push({
      pathname: '/test-instructions',
      params: {
        testId: paperMeta.testId || paperMeta.id,
        filename: paperMeta.filename,
      },
    } as any);
  };

  const startTopicDrill = async (topicName: string) => {
    const group = topicGroups.find(
      (g) => g.topic.toLowerCase() === topicName.toLowerCase() ||
             topicName.toLowerCase().includes(g.topic.toLowerCase())
    );
    if (group && group.papers.length > 0) {
      setSelectedTopicGroup(group);
    } else {
      const fallbackPaper = INITIAL_TOPIC_PAPERS[0] || INITIAL_PAPERS_CATALOG[0];
      if (fallbackPaper) {
        startPaperDrill(fallbackPaper, topicName);
      }
    }
  };

  // 3. Custom Test generation
  const handleLaunchCustomTest = async () => {
    setCustomModalOpen(false);
    setLoading(true);
    try {
      let pool = INITIAL_TOPIC_PAPERS;
      if (examMode === 'tgt') {
        pool = INITIAL_TGT_PGT_PAPERS.filter((p) => p.series === 'tgt' || p.filename.includes('tgt'));
      } else if (examMode === 'pgt') {
        pool = INITIAL_TGT_PGT_PAPERS.filter((p) => p.series === 'pgt' || p.filename.includes('pgt'));
      } else {
        pool = INITIAL_FULL_MOCKS.length > 0 ? INITIAL_FULL_MOCKS : INITIAL_TOPIC_PAPERS;
      }

      const match = pool[Math.floor(Math.random() * pool.length)] || INITIAL_PAPERS_CATALOG[0];
      const paper = await SSCCGLService.fetchPaper(match.filename);
      const all = (paper?.sections || []).flatMap((s) => s.questions);
      const shuffled = [...all].sort(() => 0.5 - Math.random()).slice(0, customQuestionCount);

      const mapped: QuizQuestionItem[] = shuffled.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        options: q.options || [],
        correctAnswerIndex: q.correctAnswerIndex ?? 0,
        explanation:
          typeof q.explanation === 'string'
            ? q.explanation
            : q.explanation?.english || 'Official solution derivation.',
        topic: resolveQuestionTopic(q, undefined, paper?.title) || 'Custom Mock',
      }));

      setActiveQuizTitle(`Custom Test (${mapped.length} Questions)`);
      setActiveQuizQuestions(mapped);
      setQuizCompleted(false);
    } catch (e) {
      console.warn('Custom test launch error:', e);
    } finally {
      setLoading(false);
    }
  };

  // 4. AI Test generation
  const handleLaunchAITest = async () => {
    if (!aiTopicInput.trim()) return;
    setAiLoading(true);

    try {
      // Call existing AiTestService
      const aiData = await AiTestService.generateTest({
        topic: aiTopicInput.trim(),
        subject: examInfo.shortName,
        questionCount: 10,
        difficulty: 'Medium',
      });

      if (aiData && aiData.questions && aiData.questions.length > 0) {
        const mapped: QuizQuestionItem[] = aiData.questions.map((q: any) => ({
          id: q.id,
          questionText: q.questionText,
          options: q.options,
          correctAnswerIndex: q.correctAnswerIndex,
          explanation: q.explanation?.english || q.explanation || 'AI-generated detailed concept rationale.',
          topic: aiTopicInput.trim(),
        }));

        setAiModalOpen(false);
        setActiveQuizTitle(`AI Drill: ${aiTopicInput.trim()}`);
        setActiveQuizQuestions(mapped);
        setQuizCompleted(false);
        setAiRemainingQuota((q) => Math.max(0, q - 1));
      }
    } catch (e) {
      console.warn('AI test generation error:', e);
      // Graceful fallback to topic questions
      await startTopicDrill(aiTopicInput.trim());
      setAiModalOpen(false);
    } finally {
      setAiLoading(false);
    }
  };

  // Active Quiz View / Result View
  if (activeQuizQuestions && activeQuizQuestions.length > 0) {
    if (quizCompleted) {
      let correct = 0;
      const missed: any[] = [];
      const topicAgg: Record<string, { total: number; correct: number; incorrect: number }> = {};

      activeQuizQuestions.forEach((q, idx) => {
        const tName = q.topic || 'Practice';
        if (!topicAgg[tName]) topicAgg[tName] = { total: 0, correct: 0, incorrect: 0 };
        topicAgg[tName].total++;

        const userChoice = userAnswers[idx];
        const isRight = userChoice !== undefined && userChoice === q.correctAnswerIndex;

        if (isRight) {
          correct++;
          topicAgg[tName].correct++;
        } else {
          topicAgg[tName].incorrect++;
          missed.push({
            id: q.id,
            questionNumber: idx + 1,
            questionText: q.questionText,
            topic: q.topic,
            options: q.options,
            chosenIndex: userChoice !== undefined ? userChoice : -1,
            correctIndex: q.correctAnswerIndex,
            explanation: q.explanation,
          });
        }
      });

      const topicStats = Object.keys(topicAgg).map((name) => ({
        topic: name,
        total: topicAgg[name].total,
        correct: topicAgg[name].correct,
        incorrect: topicAgg[name].incorrect,
        accuracy: Math.round((topicAgg[name].correct / topicAgg[name].total) * 100),
      }));

      return (
        <ResultView
          examId={examMode}
          examName={examInfo.shortName}
          testTitle={activeQuizTitle}
          totalQuestions={activeQuizQuestions.length}
          correctCount={correct}
          topicStats={topicStats}
          missedQuestions={missed}
          offerData={{
            seriesName: `${examInfo.shortName} Complete Pass`,
            description: examInfo.tagline,
            originalPrice: examMode === 'pgt' || examMode === 'tgt' ? 999 : 399,
            currentPrice: 199,
            planId: examMode === 'pgt' ? 'pgt-series' : examMode === 'tgt' ? 'tgt-series' : 'monthly',
            features: [
              'All official solved previous year papers',
              'Full-length timed CBT mock tests with rank prediction',
              'Step-by-step explanations for all questions',
            ],
            isUnlocked: isSubscribed,
          }}
          onRetake={() => {
            setUserAnswers({});
            setQuizCompleted(false);
          }}
          onBackToExam={() => {
            setActiveQuizQuestions(null);
            setQuizCompleted(false);
          }}
        />
      );
    }

    return (
      <QuizView
        examId={examMode}
        examName={examInfo.shortName}
        testId="practice_active"
        testTitle={activeQuizTitle}
        questions={activeQuizQuestions}
        isSubscribed={isSubscribed}
        exitLabel="Exit practice"
        onFinishTest={(ans) => {
          setUserAnswers(ans);
          setQuizCompleted(true);
        }}
        onExitTest={() => setActiveQuizQuestions(null)}
      />
    );
  }

  // Filtered topics in search list
  const filteredTopics = syllabusTopics.filter((t) =>
    t.toLowerCase().includes(topicSearchQuery.toLowerCase())
  );

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
            Practice Hub
          </Text>
          <Text style={[styles.screenSubtitle, { color: colors.muted }]}>
            Target your specific weak topics, generate personalized sets, or practice quick 10-question drills.
          </Text>
        </View>

        {loading && (
          <View style={styles.loadingBanner}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={[styles.loadingBannerText, { color: colors.muted }]}>
              Loading questions...
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
            accessibilityLabel="Start 10-question quick practice"
          >
            <View style={styles.cardTopRow}>
              <View style={[styles.iconBox, { backgroundColor: colors.surface2 }]}>
                <Zap size={20} color={colors.accent} />
              </View>
              <Pill label="10 Qs · 10 Mins" variant="neutral" />
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
              10 random syllabus questions with instant explanations to test recall and maintain your daily pace.
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
              const el = document.getElementById('syllabus-topics-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            accessibilityLabel="Browse syllabus topics"
          >
            <View style={styles.cardTopRow}>
              <View style={[styles.iconBox, { backgroundColor: colors.surface2 }]}>
                <BookOpen size={20} color={colors.accent} />
              </View>
              <Pill label={`${syllabusTopics.length} Topics`} variant="neutral" />
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
              Drill down by syllabus subject. Filter questions by subject area and view per-topic accuracy.
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
            onPress={() => setCustomModalOpen(true)}
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
              Build your own test session. Choose question count, duration, and specific syllabus subjects.
            </Text>

            <View style={[styles.cardFooter, { borderTopColor: colors.line }]}>
              <Text style={[styles.cardActionText, { color: colors.accent }]}>
                Configure test parameters
              </Text>
              <ArrowRight size={14} color={colors.accent} />
            </View>
          </Card>

          {/* 4. AI Adaptive Test */}
          <Card
            style={styles.entryCard}
            onPress={() => setAiModalOpen(true)}
            accessibilityLabel="Open AI test generator"
          >
            <View style={styles.cardTopRow}>
              <View style={[styles.iconBox, { backgroundColor: colors.surface2 }]}>
                <Sparkles size={20} color={colors.accent} />
              </View>
              <Pill
                label={isSubscribed ? 'Premium Pass' : `${aiRemainingQuota} free today`}
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
              Enter any concept or past question topic. AI dynamically crafts 10 pedagogical questions with step-by-step logic.
            </Text>

            <View style={[styles.cardFooter, { borderTopColor: colors.line }]}>
              <Text style={[styles.cardActionText, { color: colors.accent }]}>
                Generate AI questions
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
              ? 'Choose any syllabus topic to practice full official question sets with instant step-by-step explanations or timed CBT tests.'
              : 'Tap any topic to browse official question sets with instant feedback.'}
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
                onPress={() => setSelectedTopicGroup(group)}
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
                    {group.papers.length > 1 ? 'View Sets' : 'Practice'}
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

                      <View style={styles.setRowActions}>
                        <TouchableOpacity
                          style={[
                            styles.setActionButton,
                            {
                              backgroundColor: colors.surface,
                              borderColor: colors.line,
                              borderRadius: radii.button,
                            },
                          ]}
                          onPress={() => startPaperDrill(paper, selectedTopicGroup.topic)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.setActionText, { color: colors.text }]}>
                            Drill
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.setActionButton,
                            {
                              backgroundColor: colors.accent,
                              borderRadius: radii.button,
                            },
                          ]}
                          onPress={() => startPaperCBT(paper)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.setActionText, { color: colors.accentText }]}>
                            CBT Test
                          </Text>
                        </TouchableOpacity>
                      </View>
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

      {/* Custom Test Modal */}
      <Modal
        visible={customModalOpen}
        onClose={() => setCustomModalOpen(false)}
        title="Configure Custom Test"
      >
        <View style={styles.modalContent}>
          <Text style={[styles.modalLabel, { color: colors.text }]}>
            Number of Questions
          </Text>
          <View style={styles.paramSelectorRow}>
            {[10, 15, 25, 50].map((num) => (
              <TouchableOpacity
                key={num}
                style={[
                  styles.paramPill,
                  {
                    backgroundColor: customQuestionCount === num ? colors.accent : colors.surface2,
                    borderColor: colors.line,
                  },
                ]}
                onPress={() => setCustomQuestionCount(num)}
              >
                <Text
                  style={[
                    styles.paramPillText,
                    { color: customQuestionCount === num ? colors.accentText : colors.text },
                  ]}
                >
                  {num} Qs
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.modalLabel, { color: colors.text, marginTop: 14 }]}>
            Duration
          </Text>
          <View style={styles.paramSelectorRow}>
            {[15, 30, 45, 60].map((mins) => (
              <TouchableOpacity
                key={mins}
                style={[
                  styles.paramPill,
                  {
                    backgroundColor: customDuration === mins ? colors.accent : colors.surface2,
                    borderColor: colors.line,
                  },
                ]}
                onPress={() => setCustomDuration(mins)}
              >
                <Text
                  style={[
                    styles.paramPillText,
                    { color: customDuration === mins ? colors.accentText : colors.text },
                  ]}
                >
                  {mins} mins
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalActionsRow}>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={() => setCustomModalOpen(false)}
              style={{ flex: 1 }}
            />
            <Button
              title="Launch Test"
              variant="primary"
              onPress={handleLaunchCustomTest}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </Modal>

      {/* AI Test Modal */}
      <Modal
        visible={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        title="AI Custom Test Generator"
      >
        <View style={styles.modalContent}>
          <Text style={[styles.modalLabel, { color: colors.text }]}>
            Which topic or concept do you want to test?
          </Text>

          <TextInput
            style={[
              styles.aiInput,
              {
                backgroundColor: colors.surface2,
                borderColor: colors.line,
                color: colors.text,
                borderRadius: radii.button,
              },
            ]}
            placeholder="e.g. Constitutional Provisions for Education, Optics, Bloom's Taxonomy"
            placeholderTextColor={colors.muted}
            value={aiTopicInput}
            onChangeText={setAiTopicInput}
          />

          <View style={styles.aiQuotaRow}>
            <Text style={[styles.aiQuotaText, { color: colors.muted }]}>
              {isSubscribed ? 'Unlimited AI tests with Pass' : `Remaining today: ${aiRemainingQuota} free drills`}
            </Text>
          </View>

          <View style={styles.modalActionsRow}>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={() => setAiModalOpen(false)}
              style={{ flex: 1 }}
            />
            <Button
              title="Generate & Start"
              variant="primary"
              loading={aiLoading}
              disabled={!aiTopicInput.trim() || aiLoading}
              onPress={handleLaunchAITest}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </Modal>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  headerBlock: {
    marginBottom: 24,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginBottom: 6,
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
    gap: 16,
    marginBottom: 36,
  },
  entryCard: {
    padding: 20,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 13.5,
    lineHeight: 19,
    marginBottom: 16,
  },
  cardFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardActionText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  topicsSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13.5,
    lineHeight: 19,
    marginBottom: 16,
  },
  topicSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    minHeight: 40,
    marginBottom: 16,
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
  modalLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    marginBottom: 8,
  },
  paramSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  paramPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  paramPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  aiInput: {
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 46,
    marginBottom: 8,
  },
  aiQuotaRow: {
    marginBottom: 20,
  },
  aiQuotaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  setRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
  setActionText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
});
