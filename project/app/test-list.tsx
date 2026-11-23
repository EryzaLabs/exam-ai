import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Search,
  Filter,
  ArrowLeft,
  Lock,
  Play,
  RotateCcw,
  CheckCircle,
  Folder,
} from 'lucide-react-native';
import { useAuth } from '@/context/auth-context';
import { useSub } from '@/context/subscription-context';
import { useExam, EXAMS, ExamTarget } from '@/context/exam-context';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';
import { SSCCGLService } from '@/services/ssc-cgl-service';
import PaperService, { INITIAL_PAPERS_CATALOG, ServerPaper } from '@/services/paper-service';
import { TestProgressService } from '@/services/test-progress-service';
import AppShell from '@/components/chalkboard/AppShell';
import Card from '@/components/chalkboard/Card';
import Chip from '@/components/chalkboard/Chip';
import Pill from '@/components/chalkboard/Pill';
import Button from '@/components/chalkboard/Button';
import TestRow from '@/components/chalkboard/TestRow';
import SeriesCard from '@/components/chalkboard/SeriesCard';
import OfferCard from '@/components/chalkboard/OfferCard';

export default function TestListScreen({ isTab = false }: { isTab?: boolean }) {
  const { user } = useAuth();
  const { isSubscribed } = useSub();
  const { examMode, setExamMode, examInfo, formatTestTitle } = useExam();
  const { colors, typography, radii } = useChalkboardTheme();
  const params = useLocalSearchParams<{ q?: string; category?: string; examId?: string }>();

  const [loading, setLoading] = useState(true);
  const [papers, setPapers] = useState<ServerPaper[]>([]);
  const [completedAttempts, setCompletedAttempts] = useState<Map<string, any>>(new Map());
  const [activeAttempts, setActiveAttempts] = useState<Map<string, any>>(new Map());

  const [searchQuery, setSearchQuery] = useState(params.q || '');
  const [selectedType, setSelectedType] = useState<'all' | 'full' | 'pyq' | 'topic'>(
    (params.category as any) || 'all'
  );
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);

  // Sync examMode if examId param passed in URL
  useEffect(() => {
    if (params.examId) {
      const target = params.examId.toLowerCase();
      if (
        (target === 'upsc' || target === 'uppsc' || target === 'tgt' || target === 'pgt' || target === 'all') &&
        target !== examMode
      ) {
        setExamMode(target as ExamTarget);
      }
    }
  }, [params.examId]);

  // Sync category param if passed in URL
  useEffect(() => {
    if (params.category && ['all', 'full', 'pyq', 'topic'].includes(params.category)) {
      setSelectedType(params.category as any);
    }
  }, [params.category]);

  // Load test catalog & progress
  useEffect(() => {
    let isCancelled = false;

    const loadData = async () => {
      try {
        setLoading(true);

        let list: ServerPaper[] = [];
        try {
          list = await SSCCGLService.fetchPapersList();
        } catch {
          list = INITIAL_PAPERS_CATALOG || [];
        }
        if (!list || list.length === 0) {
          list = INITIAL_PAPERS_CATALOG || [];
        }

        const history = await TestProgressService.getTestHistory();
        const inProgress = await TestProgressService.getSavedTests();

        const historyMap = new Map<string, any>();
        history.forEach((h) => {
          if (h.testId) historyMap.set(h.testId, h);
          if (h.filename) historyMap.set(h.filename, h);
        });

        const activeMap = new Map<string, any>();
        inProgress.forEach((p) => {
          if (p.testId) activeMap.set(p.testId, p);
          if (p.filename) activeMap.set(p.filename, p);
        });

        if (!isCancelled) {
          setPapers(list);
          setCompletedAttempts(historyMap);
          setActiveAttempts(activeMap);
        }
      } catch (err) {
        console.error('Failed to load papers catalog:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [examMode]);

  // Filter papers matching selected exam
  const examPapers = useMemo(() => {
    return papers.filter((p) => {
      if (examMode === 'tgt') {
        return p.series === 'tgt' || p.filename?.includes('tgt');
      }
      if (examMode === 'pgt') {
        return p.series === 'pgt' || p.filename?.includes('pgt');
      }
      if (examMode === 'uppsc') {
        // UP Principal shares the comprehensive Principal syllabus full mocks & topic tests
        return (
          p.series === 'uppsc' ||
          p.series === 'upsc' ||
          p.filename?.includes('uppsc') ||
          p.title?.toLowerCase().includes('up principal') ||
          (!p.series &&
            (p.filename?.includes('full_mock') ||
              p.filename?.includes('SSC_CGL') ||
              p.filename?.includes('topic_wise')))
        );
      }
      if (examMode === 'upsc') {
        return (
          p.series === 'upsc' ||
          (!p.series &&
            (p.filename?.includes('full_mock') ||
              p.filename?.includes('SSC_CGL') ||
              p.filename?.includes('topic_wise')))
        );
      }
      return true; // all
    });
  }, [papers, examMode]);

  // Series Cards for this exam
  const seriesList = useMemo(() => {
    if (examMode === 'tgt') {
      const subjects = ['Mathematics', 'Science', 'Social Studies', 'English', 'Hindi', 'Special Education'];
      return subjects.map((sub) => {
        const subCount = examPapers.filter(
          (p) => p.subject?.toLowerCase() === sub.toLowerCase()
        ).length;
        return {
          id: `tgt-${sub.toLowerCase().replace(/\s+/g, '-')}`,
          title: `DSSSB TGT ${sub} Official Papers`,
          description: `Official previous year question papers and full CBT mocks for DSSSB TGT ${sub}.`,
          testCount: subCount || 10,
          isOwned: isSubscribed,
          price: 199,
          originalPrice: 999,
        };
      });
    }

    if (examMode === 'pgt') {
      const subjects = ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Commerce', 'History', 'Hindi'];
      return subjects.map((sub) => {
        const subCount = examPapers.filter(
          (p) => p.subject?.toLowerCase() === sub.toLowerCase()
        ).length;
        return {
          id: `pgt-${sub.toLowerCase().replace(/\s+/g, '-')}`,
          title: `DSSSB PGT ${sub} Official Papers`,
          description: `Complete solved question papers with bilingual step-by-step explanations for PGT ${sub}.`,
          testCount: subCount || 8,
          isOwned: isSubscribed,
          price: 199,
          originalPrice: 999,
        };
      });
    }

    const info = EXAMS[examMode] || EXAMS.upsc;
    return [
      {
        id: `${examMode}-main-series`,
        title: `${info.shortName} Full Mock Test Series`,
        description: info.tagline,
        testCount: examPapers.length || 20,
        isOwned: isSubscribed,
        price: 199,
        originalPrice: 399,
      },
    ];
  }, [examMode, examPapers, isSubscribed]);

  // Current filtered tests in active series
  const filteredTests = useMemo(() => {
    let pool = examPapers;

    if (selectedSeriesId && selectedSeriesId.startsWith('tgt-')) {
      const subSlug = selectedSeriesId.replace('tgt-', '').replace(/-/g, ' ');
      const subFiltered = pool.filter((p) =>
        (p.subject || '').toLowerCase().includes(subSlug.toLowerCase())
      );
      if (subFiltered.length > 0) pool = subFiltered;
    } else if (selectedSeriesId && selectedSeriesId.startsWith('pgt-')) {
      const subSlug = selectedSeriesId.replace('pgt-', '').replace(/-/g, ' ');
      const subFiltered = pool.filter((p) =>
        (p.subject || '').toLowerCase().includes(subSlug.toLowerCase())
      );
      if (subFiltered.length > 0) pool = subFiltered;
    }

    if (selectedType === 'full') {
      const fullMocks = pool.filter((p) => !p.filename?.includes('topic_wise'));
      if (fullMocks.length > 0) pool = fullMocks;
    } else if (selectedType === 'pyq') {
      const pyqs = pool.filter((p) => p.isPYQ || p.filename?.includes('tgt_pgt'));
      if (pyqs.length > 0) pool = pyqs;
    } else if (selectedType === 'topic') {
      const topics = pool.filter((p) => p.filename?.includes('topic_wise'));
      if (topics.length > 0) pool = topics;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      pool = pool.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.subject && p.subject.toLowerCase().includes(q))
      );
    }

    return pool;
  }, [examPapers, selectedSeriesId, selectedType, searchQuery]);

  // Start / Resume / Review test
  const handleStartTest = (paper: ServerPaper) => {
    router.push({
      pathname: '/mock-test',
      params: {
        testId: paper.testId || paper.id,
        filename: paper.filename,
      },
    } as any);
  };

  const handleReviewTest = (paper: ServerPaper) => {
    const attempt =
      completedAttempts.get(paper.id) ||
      completedAttempts.get(paper.testId || '') ||
      completedAttempts.get(paper.filename);

    if (attempt) {
      router.push({
        pathname: '/test-result',
        params: {
          attemptId: attempt.attemptId || attempt.id,
          testId: paper.testId || paper.id,
          filename: paper.filename,
        },
      } as any);
    }
  };

  const handleScrollToOffer = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const el = document.getElementById('tests-offer-card');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
  };

  const activeExamInfo = EXAMS[examMode] || EXAMS.upsc;
  const activePrice = examMode === 'pgt' || examMode === 'tgt' ? 199 : 199;
  const activeOriginal = examMode === 'pgt' || examMode === 'tgt' ? 999 : 399;

  if (loading) {
    return (
      <View style={[styles.centerLoading, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.muted }]}>
          Loading {activeExamInfo.shortName} series and tests...
        </Text>
      </View>
    );
  }

  return (
    <AppShell maxWidth={840}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerBlock}>
          {selectedSeriesId ? (
            <TouchableOpacity
              style={styles.backSeriesBtn}
              onPress={() => setSelectedSeriesId(null)}
            >
              <ArrowLeft size={14} color={colors.muted} />
              <Text style={[styles.backSeriesText, { color: colors.muted }]}>
                All {activeExamInfo.shortName} Series
              </Text>
            </TouchableOpacity>
          ) : null}

          <Text
            style={[
              styles.screenTitle,
              {
                color: colors.text,
                fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
              },
            ]}
          >
            {selectedSeriesId
              ? seriesList.find((s) => s.id === selectedSeriesId)?.title || 'Series Tests'
              : `${activeExamInfo.shortName} Test Series`}
          </Text>

          <Text style={[styles.screenSubtitle, { color: colors.muted }]}>
            {selectedSeriesId
              ? 'Complete timed mock examinations and previous year solved papers. Free samples are available below.'
              : 'Choose a subject series to browse official previous year papers and full-length CBT mocks.'}
          </Text>
        </View>

        {/* 1. SERIES LIST (When no specific subject is selected in multi-subject exams) */}
        {!selectedSeriesId && seriesList.length > 1 ? (
          <View style={styles.seriesGrid}>
            {seriesList.map((series) => (
              <SeriesCard
                key={series.id}
                id={series.id}
                title={series.title}
                description={series.description}
                testCount={series.testCount}
                isOwned={series.isOwned}
                price={series.price}
                originalPrice={series.originalPrice}
                onPress={() => setSelectedSeriesId(series.id)}
              />
            ))}
          </View>
        ) : (
          /* 2. TESTS BROWSER IN SELECTED SERIES */
          <View style={styles.testsContainer}>
            {/* Search & Filter Bar */}
            <View style={styles.searchBarRow}>
              <View
                style={[
                  styles.searchField,
                  { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radii.button },
                ]}
              >
                <Search size={16} color={colors.muted} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Search papers by year, shift, or topic..."
                  placeholderTextColor={colors.muted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>

            {/* Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChipsRow}
            >
              <Chip
                label="All Tests"
                count={examPapers.length}
                active={selectedType === 'all'}
                onPress={() => setSelectedType('all')}
              />
              {(examMode === 'upsc' || examMode === 'uppsc' || examMode === 'all') && (
                <Chip
                  label="Full Mocks"
                  active={selectedType === 'full'}
                  onPress={() => setSelectedType('full')}
                />
              )}
              {(examMode === 'tgt' || examMode === 'pgt' || examMode === 'all') && (
                <Chip
                  label="Official Solved Papers"
                  active={selectedType === 'pyq'}
                  onPress={() => setSelectedType('pyq')}
                />
              )}
              {(examMode === 'upsc' || examMode === 'uppsc' || examMode === 'all') && (
                <Chip
                  label="Topic Wise"
                  active={selectedType === 'topic'}
                  onPress={() => setSelectedType('topic')}
                />
              )}
            </ScrollView>

            {/* Test Rows List */}
            <View style={styles.testList}>
              {filteredTests.map((paper, idx) => {
                const isFreeSample = !isSubscribed && idx < 2;
                const isLocked = !isSubscribed && !isFreeSample;

                const comp =
                  completedAttempts.get(paper.id) ||
                  completedAttempts.get(paper.testId || '') ||
                  completedAttempts.get(paper.filename);

                const inProg =
                  activeAttempts.get(paper.id) ||
                  activeAttempts.get(paper.testId || '') ||
                  activeAttempts.get(paper.filename);

                const status = comp ? 'completed' : inProg ? 'in-progress' : 'not-started';
                const score = comp ? Math.round(comp.accuracy || 0) : undefined;
                const displayTitle = formatTestTitle ? formatTestTitle(paper.title, paper.filename) : paper.title;

                return (
                  <TestRow
                    key={paper.id || `test_${idx}`}
                    id={paper.id}
                    title={displayTitle}
                    questionCount={
                      paper.totalQuestions || (examMode === 'pgt' ? 300 : examMode === 'tgt' ? 200 : 120)
                    }
                    marks={examMode === 'pgt' || examMode === 'upsc' || examMode === 'uppsc' ? 300 : 200}
                    durationMinutes={examMode === 'pgt' ? 180 : 120}
                    isFree={isFreeSample}
                    isLocked={isLocked}
                    status={status}
                    score={score}
                    onStart={() => handleStartTest(paper)}
                    onUnlock={handleScrollToOffer}
                    onReview={() => handleReviewTest(paper)}
                  />
                );
              })}

              {filteredTests.length === 0 && (
                <Card style={styles.emptyCard}>
                  <Text style={[styles.emptyCardTitle, { color: colors.text }]}>
                    No tests found matching your criteria.
                  </Text>
                  <Text style={[styles.emptyCardSub, { color: colors.muted }]}>
                    Try clearing the search query or resetting your active filter.
                  </Text>
                  <View style={{ marginTop: 14, flexDirection: 'row', justifyContent: 'center' }}>
                    <Button
                      label="Reset All Filters"
                      variant="primary"
                      size="small"
                      onPress={() => {
                        setSearchQuery('');
                        setSelectedType('all');
                        setSelectedSeriesId(null);
                      }}
                    />
                  </View>
                </Card>
              )}
            </View>
          </View>
        )}

        {/* 3. Offer Card sits at the bottom, never above tests */}
        {!isSubscribed && (
          <View id="tests-offer-card" style={{ marginTop: 24 }}>
            <OfferCard
              cardHeading="Get the full series"
              seriesName={`${activeExamInfo.shortName} Complete Test Series 2026`}
              description={activeExamInfo.tagline}
              originalPrice={activeOriginal}
              currentPrice={activePrice}
              planId={
                examMode === 'pgt'
                  ? 'pgt-series'
                  : examMode === 'tgt'
                  ? 'tgt-series'
                  : 'monthly'
              }
              features={[
                'All official previous year solved papers',
                'Full-length timed CBT mock tests with rank prediction',
                'Step-by-step explanations for all questions',
                'Topic-wise weakness & accuracy analytics',
                'Unlimited retakes throughout the 2026 examination cycle',
              ]}
            />
          </View>
        )}
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14.5,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  headerBlock: {
    marginBottom: 20,
  },
  backSeriesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  backSeriesText: {
    fontSize: 13,
    fontWeight: '500',
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
  seriesGrid: {
    gap: 4,
  },
  testsContainer: {
    gap: 16,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14.5,
    padding: 0,
    borderWidth: 0,
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  testList: {
    gap: 6,
  },
  emptyCard: {
    padding: 28,
    alignItems: 'center',
    textAlign: 'center',
  },
  emptyCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyCardSub: {
    fontSize: 13.5,
    textAlign: 'center',
  },
});
