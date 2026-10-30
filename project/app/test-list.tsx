import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import DesktopDashboard from '@/components/DesktopDashboard';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Folder,
  ArrowLeft,
  ArrowRight,
  LayoutGrid,
  HelpCircle,
  SlidersHorizontal,
  FileText,
  Clock,
  Award,
  ChevronRight,
  Search,
  BookOpen,
  CheckCircle2,
  Circle,
  Eye,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Building2,
  GraduationCap,
  Briefcase,
  Compass,
  Zap,
  Target,
  PlayCircle,
  Check,
} from 'lucide-react-native';
import SSCCGLService, { ParsedMockTest } from '@/services/ssc-cgl-service';
import { TestProgressService, SavedTestState, TestResult } from '@/services/test-progress-service';
import userService from '@/services/user-service';
import { initiatePayment } from '@/utils/cashfree';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';

interface ServerPaper {
  id: string; // filename or identifier
  testId?: string; // unique UUID of test content
  title: string;
  filename: string;
  hasAnswers: boolean;
}

// Syllabus Category Definitions for Topic-Wise Tests
const SYLLABUS_CATEGORIES: {
  id: string;
  name: string;
  icon: any;
  color: string;
  keywords: string[];
}[] = [
  {
    id: 'policies',
    name: 'Policies & Acts',
    icon: ShieldCheck,
    color: '#3B82F6', // Blue
    keywords: ['nep-2020', 'ncf', 'pocso', 'rte', 'cpre', 'cprs', 'doe', 'constitutional', 'human-rights', 'pwbd', 'ews'],
  },
  {
    id: 'institutions',
    name: 'Institutions & Boards',
    icon: Building2,
    color: '#8B5CF6', // Purple
    keywords: ['cbse', 'ncert', 'kvs', 'navodaya', 'jnv', 'cabe', 'scert', 'nios', 'ugc', 'emrs', 'open-university'],
  },
  {
    id: 'pedagogy',
    name: 'Pedagogy & Assessment',
    icon: GraduationCap,
    color: '#10B981', // Emerald
    keywords: ['parakh', 'nipun', 'assessment', 'evaluation', 'cce', 'measurement', 'inclusive', 'cwsn', 'specially-abled', 'career-cards'],
  },
  {
    id: 'administration',
    name: 'Admin, Finance & Service Rules',
    icon: Briefcase,
    color: '#F59E0B', // Amber
    keywords: ['gfr', 'ccs', 'nps', 'conduct', 'smc', 'admission', 'safety', 'pmrc'],
  },
  {
    id: 'schemes',
    name: 'Schemes & Initiatives',
    icon: Compass,
    color: '#EC4899', // Pink
    keywords: ['pm-shri', 'pm-poshan', 'pm-vidya', 'ai-in-education', 'vidyanjali', 'yuva-sangam', 'kasturba', 'kgbv', 'sadhana', 'sakura', 'nasha', 'bharat-innovates', 'bhartiya-bhasha'],
  },
];

export default function TestListScreen({ isTab = false }: { isTab?: boolean }) {
  const { isDark, colors } = useTheme();
  const [tests, setTests] = useState<ServerPaper[]>([]);
  const [filteredTests, setFilteredTests] = useState<ServerPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTestId, setLoadingTestId] = useState<string | null>(null);

  const params = useLocalSearchParams<{ q?: string; category?: string; filter?: string; topic?: string }>();
  const [searchQuery, setSearchQuery] = useState(typeof params.q === 'string' ? params.q : '');
  const initialCategory = params.category === 'full' || params.category === 'topic' ? params.category : 'all';
  const [category, setCategory] = useState<'all' | 'full' | 'topic'>(initialCategory);
  const initialFilter = params.filter === 'attempted' || params.filter === 'unattempted' ? params.filter : 'all';
  const [attemptFilter, setAttemptFilter] = useState<'all' | 'attempted' | 'unattempted'>(initialFilter);
  const [selectedTopicCategory, setSelectedTopicCategory] = useState<string>('all');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(params.topic || null);

  const [history, setHistory] = useState<TestResult[]>([]);
  const [activeTests, setActiveTests] = useState<SavedTestState[]>([]);
  const { user, isSubscribed: authSubscribed, isSubscriptionLoading, refreshSubscription } = useAuth();
  const [localSubscribed, setLocalSubscribed] = useState<boolean | null>(null);
  const isSubscribed = localSubscribed !== null ? localSubscribed : authSubscribed;
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;

  useEffect(() => {
    if (typeof params.q === 'string') setSearchQuery(params.q);
  }, [params.q]);

  useEffect(() => {
    if (params.category === 'full' || params.category === 'topic' || params.category === 'all') {
      setCategory(params.category);
      if (params.category !== 'topic') {
        setSelectedTopic(null);
      }
    }
  }, [params.category]);

  useEffect(() => {
    if (params.topic) {
      setSelectedTopic(params.topic);
      setCategory('topic');
    }
  }, [params.topic]);

  useEffect(() => {
    loadTests();
    loadActiveTest();
    loadHistory();
  }, []);

  useEffect(() => {
    if (user !== undefined) {
      checkSubscription();
      loadHistory();
    }
  }, [user]);

  const loadHistory = async () => {
    try {
      const userHistory = await TestProgressService.getTestHistory();
      setHistory(userHistory);
    } catch (e) {
      console.error('Error loading history in test-list:', e);
    }
  };

  const checkSubscription = async () => {
    setCheckingSubscription(true);
    try {
      if (user?.uid) {
        const profile = await userService.getUserProfile(user.uid);
        setLocalSubscribed(profile?.isSubscribed === true);
      } else {
        setLocalSubscribed(false);
      }
    } catch (e) {
      console.error('Error checking subscription in test-list:', e);
    } finally {
      setCheckingSubscription(false);
    }
  };

  const getTopicSlugFromFilename = (filename: string): string => {
    if (!filename.includes('topic_wise/')) return '';
    const base = filename.split('topic_wise/')[1];
    return base.split('_test_')[0].toLowerCase();
  };

  const getTopicFromFilename = (filename: string): string | null => {
    if (!filename.includes('topic_wise/')) return null;
    const base = filename.split('topic_wise/')[1];
    const topicId = base.split('_test_')[0];
    return topicId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const getCategoryForTopicSlug = (slug: string): string => {
    for (const cat of SYLLABUS_CATEGORIES) {
      if (cat.keywords.some(k => slug.includes(k))) {
        return cat.id;
      }
    }
    return 'schemes'; // fallback category
  };

  const uniqueTopics = useMemo(() => {
    const map = new Map<string, { topicName: string; slug: string; categoryId: string }>();
    tests.forEach(t => {
      const topicName = getTopicFromFilename(t.filename);
      if (topicName) {
        const slug = getTopicSlugFromFilename(t.filename);
        const categoryId = getCategoryForTopicSlug(slug);
        map.set(topicName, { topicName, slug, categoryId });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.topicName.localeCompare(b.topicName));
  }, [tests]);

  const attemptedMaps = useMemo(() => {
    const byId = new Map<string, TestResult>();
    history.forEach(h => {
      const hDate = new Date(h.date).getTime();
      if (h.testId && !h.testId.includes('/') && !h.testId.endsWith('.json')) {
        const existing = byId.get(h.testId);
        if (!existing || hDate > new Date(existing.date).getTime()) {
          byId.set(h.testId, h);
        }
      }
    });
    return { byId };
  }, [history]);

  const getAttemptForTest = useCallback((test: ServerPaper): TestResult | undefined => {
    if (!test) return undefined;
    const testUUID = test.testId || (!test.id?.includes('/') && !test.id?.endsWith('.json') ? test.id : undefined);
    if (testUUID && attemptedMaps.byId.has(testUUID)) {
      return attemptedMaps.byId.get(testUUID);
    }
    return undefined;
  }, [attemptedMaps]);

  const attemptedCount = useMemo(() => {
    return tests.filter(t => !!getAttemptForTest(t)).length;
  }, [tests, getAttemptForTest]);

  const unattemptedCount = useMemo(() => {
    return Math.max(0, tests.length - attemptedCount);
  }, [tests, attemptedCount]);

  const fullMockCount = useMemo(() => tests.filter(t => t.filename.includes('full_mocks/')).length, [tests]);
  const topicTestCount = useMemo(() => tests.filter(t => t.filename.includes('topic_wise/')).length, [tests]);

  useEffect(() => {
    filterTests();
  }, [searchQuery, category, selectedTopic, selectedTopicCategory, tests, attemptFilter, getAttemptForTest]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
      loadActiveTest();
    }, [])
  );

  const loadActiveTest = async () => {
    const saved = await TestProgressService.getSavedTests();
    setActiveTests(saved);
  };

  const handleRefresh = () => {
    loadTests();
    loadActiveTest();
    loadHistory();
    checkSubscription();
  };

  const loadTests = async () => {
    setLoading(true);
    try {
      const availablePapers = await SSCCGLService.fetchPapersList();
      const withAnswers = availablePapers.filter((p: ServerPaper) => p.hasAnswers);
      setTests(withAnswers);
      setFilteredTests(withAnswers);
    } catch (error) {
      console.error('Error loading tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTests = () => {
    let filtered = [...tests];

    if (category === 'full') {
      filtered = filtered.filter(t => t.filename.includes('full_mocks/'));
    } else if (category === 'topic') {
      filtered = filtered.filter(t => t.filename.includes('topic_wise/'));
      if (selectedTopic) {
        filtered = filtered.filter(t => getTopicFromFilename(t.filename) === selectedTopic);
      } else if (selectedTopicCategory !== 'all') {
        filtered = filtered.filter(t => {
          const slug = getTopicSlugFromFilename(t.filename);
          return getCategoryForTopicSlug(slug) === selectedTopicCategory;
        });
      }
    }

    if (attemptFilter === 'attempted') {
      filtered = filtered.filter(t => !!getAttemptForTest(t));
    } else if (attemptFilter === 'unattempted') {
      filtered = filtered.filter(t => !getAttemptForTest(t));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((test) => test.title.toLowerCase().includes(query));
    }

    setFilteredTests(filtered);
  };

  const handleTestSelect = async (paper: ServerPaper) => {
    const isFirstTest = tests.length > 0 && tests[0].id === paper.id;
    const verifiedProfile = await userService.getUserProfile(user?.uid);
    const hasActiveSubscription = verifiedProfile?.isSubscribed === true;

    if (!hasActiveSubscription && !isFirstTest) {
      setLocalSubscribed(false);
      router.push('/premium');
      return;
    }

    try {
      setLoadingTestId(paper.id);
      await new Promise(resolve => setTimeout(resolve, 50));
      const loadedTest = await SSCCGLService.fetchPaper(paper.filename);
      router.push({
        pathname: '/test-instructions',
        params: { testId: loadedTest.id, filename: paper.filename },
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingTestId(null);
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  const renderResumeCards = () => {
    if (activeTests.length === 0) return null;

    return activeTests.map(testState => {
      const t = tests.find(x => x.id === testState.testId);
      const title = testState.testTitle || (t ? t.title : 'Unfinished Test');
      const attemptedCount = Object.keys(testState.answers || {}).length || (testState.currentQuestionIndex + 1);
      const totalQs = testState.totalQuestions || (t?.filename?.includes('full_mocks') ? 120 : 20);
      const percent = Math.min(100, Math.max(1, Math.round((attemptedCount / totalQs) * 100)));
      const minutesLeft = Math.floor((testState.timeRemaining || 0) / 60);

      return (
        <TouchableOpacity
          key={testState.testId}
          style={[styles.resumeCardNew, { backgroundColor: isDark ? '#2A1B0B' : '#FFF7ED', borderColor: '#F97316', borderWidth: 1 }]}
          onPress={() => router.push({
            pathname: '/mock-test',
            params: {
              testId: testState.testId,
              resume: 'true',
              filename: testState.filename || t?.filename || '',
            }
          })}
          activeOpacity={0.9}
        >
          <View style={styles.resumeGradientNew}>
            <View style={styles.resumeContentNew}>
              <View style={styles.resumeIconNew}>
                <PlayCircle color="#F97316" size={38} strokeWidth={1.8} />
              </View>
              <View style={styles.resumeInfoNew}>
                <View style={styles.resumeBadgeRow}>
                  <Text style={styles.resumeTitleNew}>IN PROGRESS</Text>
                  <Text style={styles.resumeMetaNew}>{minutesLeft}m left</Text>
                </View>
                <Text style={[styles.resumeSubtitleNew, { color: colors.textPrimary }]} numberOfLines={1}>
                  {title}
                </Text>
                <Text style={[styles.resumeQuestionsMeta, { color: colors.textSecondary }]}>
                  {attemptedCount} of {totalQs} questions answered
                </Text>
              </View>
              <View style={styles.resumeButtonNew}>
                <Text style={styles.resumeButtonTextNew}>Resume</Text>
                <ArrowRight color="#fff" size={14} style={{ marginLeft: 4 }} />
              </View>
            </View>
            <View style={styles.resumeProgressContainerNew}>
              <View style={[styles.resumeProgressBarNew, { backgroundColor: isDark ? 'rgba(249, 115, 22, 0.2)' : '#FED7AA' }]}>
                <View style={[styles.resumeProgressFillNew, { width: `${percent}%` }]} />
              </View>
              <Text style={[styles.resumeProgressTextNew, { color: '#F97316' }]}>{percent}%</Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    });
  };

  // Hero Section with Category Navigation Cards
  const renderHeroCategoryCards = () => {
    return (
      <View style={styles.heroSection}>
        <View style={styles.heroGrid}>
          {/* Full Mock Card */}
          <TouchableOpacity
            style={[
              styles.heroCard,
              { backgroundColor: colors.surface, borderColor: category === 'full' ? '#3B82F6' : colors.border },
              category === 'full' && (isDark ? styles.heroCardActiveDark : styles.heroCardActiveLight),
            ]}
            onPress={() => {
              setCategory('full');
              setSelectedTopic(null);
            }}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={category === 'full' ? ['#2563EB', '#1D4ED8'] : isDark ? ['#1E3A5F', '#172554'] : ['#EFF6FF', '#DBEAFE']}
              style={styles.heroCardIconBox}
            >
              <Clock size={22} color={category === 'full' ? '#fff' : '#2563EB'} />
            </LinearGradient>
            <View style={styles.heroCardTextBox}>
              <View style={styles.heroCardTitleRow}>
                <Text style={[styles.heroCardTitle, { color: colors.textPrimary }]}>Full Mocks</Text>
                <View style={[styles.heroCardBadge, { backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF' }]}>
                  <Text style={[styles.heroCardBadgeText, { color: '#3B82F6' }]}>{fullMockCount}</Text>
                </View>
              </View>
              <Text style={[styles.heroCardSub, { color: colors.textSecondary }]}>
                120 Qs • 300 Marks • 2h CBT
              </Text>
            </View>
          </TouchableOpacity>

          {/* Topic-Wise Card */}
          <TouchableOpacity
            style={[
              styles.heroCard,
              { backgroundColor: colors.surface, borderColor: category === 'topic' ? '#10B981' : colors.border },
              category === 'topic' && (isDark ? styles.heroCardActiveDarkEmerald : styles.heroCardActiveLightEmerald),
            ]}
            onPress={() => {
              setCategory('topic');
            }}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={category === 'topic' ? ['#059669', '#047857'] : isDark ? ['#064E3B', '#022C22'] : ['#ECFDF5', '#D1FAE5']}
              style={styles.heroCardIconBox}
            >
              <BookOpen size={22} color={category === 'topic' ? '#fff' : '#059669'} />
            </LinearGradient>
            <View style={styles.heroCardTextBox}>
              <View style={styles.heroCardTitleRow}>
                <Text style={[styles.heroCardTitle, { color: colors.textPrimary }]}>Topic Tests</Text>
                <View style={[styles.heroCardBadge, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
                  <Text style={[styles.heroCardBadgeText, { color: '#10B981' }]}>{topicTestCount}</Text>
                </View>
              </View>
              <Text style={[styles.heroCardSub, { color: colors.textSecondary }]}>
                20 Qs • 50 Marks • 20m
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Custom Test Prompt Banner */}
        <TouchableOpacity
          style={[styles.customBanner, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#3B82F6' : '#93C5FD' }]}
          onPress={() => router.push(isSubscribed ? '/custom-test' : '/premium')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={isDark ? ['#1E1B4B', '#1E293B'] : ['#EEF2FF', '#F8FAFC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.customBannerGradient}
          >
            <View style={styles.customBannerLeft}>
              <View style={styles.customBannerIcon}>
                <Zap size={20} color="#6366F1" />
              </View>
              <View>
                <View style={styles.customBannerTagRow}>
                  <Text style={styles.customBannerTag}>AI BUILDER</Text>
                  <Text style={styles.customBannerPremium}>👑 PREMIUM</Text>
                </View>
                <Text style={[styles.customBannerTitle, { color: colors.textPrimary }]}>Build a Custom Test</Text>
                <Text style={[styles.customBannerSub, { color: colors.textSecondary }]}>Pick any mix of topics, question count (10-120), and timer.</Text>
              </View>
            </View>
            <ChevronRight size={20} color={colors.accent} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  // Syllabus Category Filter Pills for Topic-Wise Mode
  const renderSyllabusPills = () => {
    return (
      <View style={[styles.syllabusPillContainer, { borderBottomColor: colors.borderLight }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.syllabusPillsContent}>
          <TouchableOpacity
            style={[
              styles.syllabusPill,
              { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
              selectedTopicCategory === 'all' && [styles.syllabusPillActive, { backgroundColor: colors.accent, borderColor: colors.accent }]
            ]}
            onPress={() => {
              setSelectedTopicCategory('all');
              setSelectedTopic(null);
            }}
          >
            <Text
              style={[
                styles.syllabusPillText,
                { color: colors.textSecondary },
                selectedTopicCategory === 'all' && styles.syllabusPillTextActive
              ]}
            >
              All Topics ({uniqueTopics.length})
            </Text>
          </TouchableOpacity>

          {SYLLABUS_CATEGORIES.map(cat => {
            const count = uniqueTopics.filter(t => t.categoryId === cat.id).length;
            const isSelected = selectedTopicCategory === cat.id && !selectedTopic;
            const IconComp = cat.icon;

            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.syllabusPill,
                  { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
                  isSelected && [styles.syllabusPillActive, { backgroundColor: cat.color, borderColor: cat.color }]
                ]}
                onPress={() => {
                  setSelectedTopicCategory(cat.id);
                  setSelectedTopic(null);
                }}
              >
                <IconComp size={14} color={isSelected ? '#fff' : cat.color} style={{ marginRight: 6 }} />
                <Text
                  style={[
                    styles.syllabusPillText,
                    { color: colors.textSecondary },
                    isSelected && styles.syllabusPillTextActive
                  ]}
                >
                  {cat.name} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderTopicCard = (topicObj: { topicName: string; slug: string; categoryId: string }, index: number) => {
    const { topicName, slug, categoryId } = topicObj;
    const cat = SYLLABUS_CATEGORIES.find(c => c.id === categoryId) || SYLLABUS_CATEGORIES[0];
    const matchingTests = tests.filter(t => getTopicFromFilename(t.filename) === topicName);
    const count = matchingTests.length;
    const attempted = matchingTests.filter(t => !!getAttemptForTest(t)).length;
    const progress = count > 0 ? (attempted / count) * 100 : 0;
    const CatIcon = cat.icon;

    return (
      <TouchableOpacity
        key={topicName}
        style={[
          styles.topicCardModern,
          { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }
        ]}
        onPress={() => setSelectedTopic(topicName)}
        activeOpacity={0.75}
      >
        <View style={styles.topicCardModernTop}>
          <View style={[styles.topicIconContainerModern, { backgroundColor: isDark ? `${cat.color}25` : `${cat.color}15` }]}>
            <CatIcon size={24} color={cat.color} />
          </View>
          <View style={styles.topicCardModernContent}>
            <View style={styles.topicCardBadgeRow}>
              <Text style={[styles.topicCategoryBadge, { color: cat.color, backgroundColor: isDark ? `${cat.color}20` : `${cat.color}10` }]}>
                {cat.name}
              </Text>
              <Text style={[styles.topicAttemptMeta, { color: colors.textSecondary }]}>
                {attempted > 0 ? `${attempted}/${count} done` : `${count} tests`}
              </Text>
            </View>
            <Text style={[styles.topicCardTitleModern, { color: colors.textPrimary }]} numberOfLines={2}>
              {topicName}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textTertiary} style={{ marginLeft: 8 }} />
        </View>

        {/* Progress Bar */}
        <View style={styles.topicCardProgressWrapper}>
          <View style={[styles.topicProgressBarTrack, { backgroundColor: colors.progressBarBg }]}>
            <View
              style={[
                styles.topicProgressBarFillModern,
                { width: `${progress}%`, backgroundColor: attempted === count && count > 0 ? '#10B981' : cat.color }
              ]}
            />
          </View>
          <Text style={[styles.topicProgressPercent, { color: colors.textTertiary }]}>{Math.round(progress)}%</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTestCard = (test: ServerPaper) => {
    const isMock = test.filename.includes('full_mocks');
    const totalQuestions = isMock ? 120 : 20;
    const duration = isMock ? 7200 : 1200; // 20 mins for topics, 2 hours for full mocks
    const totalMarks = totalQuestions * 2.5;
    const isFirstTest = tests.length > 0 && tests[0].id === test.id;
    const isLocked = !isSubscribed && !isFirstTest;
    const attempt = getAttemptForTest(test);
    const isAttempted = !!attempt;

    return (
      <TouchableOpacity
        style={[
          styles.modernTestCard,
          { backgroundColor: colors.surface, borderColor: isLocked ? '#FCD34D' : colors.border },
          isAttempted && (isDark ? styles.testCardAttemptedBorderDark : styles.testCardAttemptedBorderLight)
        ]}
        onPress={() => handleTestSelect(test)}
        activeOpacity={0.7}
        disabled={!!loadingTestId}
      >
        <View style={styles.testCardHeaderModern}>
          <View
            style={[
              styles.testCardIconModern,
              {
                backgroundColor: isLocked
                  ? isDark ? '#422006' : '#FEF3C7'
                  : isAttempted
                  ? isDark ? '#064E3B' : '#DCFCE7'
                  : isMock
                  ? isDark ? '#1E3A5F' : '#EFF6FF'
                  : isDark ? '#1E293B' : '#F1F5F9'
              }
            ]}
          >
            {isLocked ? (
              <Text style={{ fontSize: 18 }}>🔒</Text>
            ) : isAttempted ? (
              <CheckCircle2 size={22} color="#16A34A" />
            ) : isMock ? (
              <Award size={22} color="#2563EB" />
            ) : (
              <BookOpen size={22} color="#059669" />
            )}
          </View>

          <View style={styles.testCardBadgesModern}>
            <View style={styles.testBadgeLeftGroup}>
              <View
                style={[
                  styles.testTypeBadge,
                  {
                    backgroundColor: isMock
                      ? isDark ? '#1E3A5F' : '#DBEAFE'
                      : isDark ? '#064E3B' : '#D1FAE5'
                  }
                ]}
              >
                <Text
                  style={[
                    styles.testTypeBadgeText,
                    { color: isMock ? '#1D4ED8' : '#047857' }
                  ]}
                >
                  {isMock ? 'Full Mock' : 'Topic Test'}
                </Text>
              </View>

              {test.hasAnswers && (
                <View style={[styles.solutionBadge, { backgroundColor: isDark ? '#273549' : '#F1F5F9' }]}>
                  <Check size={11} color="#10B981" style={{ marginRight: 3 }} />
                  <Text style={[styles.solutionBadgeText, { color: colors.textSecondary }]}>Solutions</Text>
                </View>
              )}
            </View>

            {isLocked ? (
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumBadgeText}>Premium</Text>
              </View>
            ) : isFirstTest && !isSubscribed ? (
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>✨ Free Demo</Text>
              </View>
            ) : isAttempted ? (
              <View style={[styles.scoreBadge, { backgroundColor: isDark ? '#064E3B' : '#DCFCE7' }]}>
                <Text style={[styles.scoreBadgeText, { color: '#15803D' }]}>
                  {Math.round(attempt.accuracy || 0)}% Score
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <Text style={[styles.modernTestTitle, { color: colors.textPrimary }]} numberOfLines={2}>
          {test.title}
        </Text>

        <View style={[styles.modernTestFooter, { borderTopColor: colors.borderLight }]}>
          <View style={styles.metaStatPillRow}>
            <View style={styles.metaStatPill}>
              <HelpCircle size={14} color={colors.textSecondary} />
              <Text style={[styles.metaStatValue, { color: colors.textPrimary }]}>{totalQuestions}</Text>
              <Text style={[styles.metaStatLabel, { color: colors.textSecondary }]}>Qs</Text>
            </View>

            <View style={styles.metaStatDivider} />

            <View style={styles.metaStatPill}>
              <Clock size={14} color={colors.textSecondary} />
              <Text style={[styles.metaStatValue, { color: colors.textPrimary }]}>{formatDuration(duration)}</Text>
            </View>

            <View style={styles.metaStatDivider} />

            <View style={styles.metaStatPill}>
              <Award size={14} color={colors.textSecondary} />
              <Text style={[styles.metaStatValue, { color: colors.textPrimary }]}>{totalMarks}</Text>
              <Text style={[styles.metaStatLabel, { color: colors.textSecondary }]}>Marks</Text>
            </View>
          </View>

          {isAttempted ? (
            <View style={styles.actionButtonsRowModern}>
              <TouchableOpacity
                style={styles.viewResultButtonModern}
                onPress={() => router.push({ pathname: '/test-result', params: { attemptId: attempt.attemptId, testId: test.id, filename: test.filename, testTitle: test.title } })}
                activeOpacity={0.8}
              >
                <Eye size={13} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.viewResultButtonTextModern}>Result</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.retakeTestButtonModern, { borderColor: colors.border }]}
                onPress={() => handleTestSelect(test)}
                disabled={!!loadingTestId}
                activeOpacity={0.8}
              >
                <RotateCcw size={13} color={colors.accent} style={{ marginRight: 4 }} />
                <Text style={[styles.retakeTestButtonTextModern, { color: colors.accent }]}>
                  {loadingTestId === test.id ? 'Loading' : 'Retake'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.startTestButtonModern,
                isLocked ? styles.unlockTestButtonModern : { backgroundColor: colors.accent }
              ]}
              onPress={() => handleTestSelect(test)}
              disabled={!!loadingTestId}
            >
              <Text style={styles.startTestButtonTextModern}>
                {loadingTestId === test.id
                  ? 'Loading...'
                  : isLocked
                  ? 'Unlock'
                  : isFirstTest && !isSubscribed
                  ? 'Free Demo'
                  : 'Start Test'}
              </Text>
              {isLocked ? (
                <Text style={{ fontSize: 12, marginLeft: 4 }}>🔒</Text>
              ) : (
                <ArrowRight size={14} color="#fff" style={{ marginLeft: 4 }} />
              )}
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const isPageLoading = loading || isSubscriptionLoading || (user && localSubscribed === null && checkingSubscription);

  if (isPageLoading) {
    const loadingView = (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading tests & syllabus categories...</Text>
      </View>
    );

    if (isLargeScreen) {
      return <DesktopDashboard>{loadingView}</DesktopDashboard>;
    }
    return loadingView;
  }

  const handleBack = () => {
    if (category === 'topic' && selectedTopic) {
      setSelectedTopic(null);
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const ContainerComponent = isLargeScreen ? View : SafeAreaView;

  // Filter topics for the topic grid
  const visibleTopics = uniqueTopics.filter(t => {
    if (searchQuery && !t.topicName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (selectedTopicCategory !== 'all' && t.categoryId !== selectedTopicCategory) {
      return false;
    }
    return true;
  });

  const content = (
    <ContainerComponent style={[styles.container, { backgroundColor: colors.background, flex: 1 }]} edges={isLargeScreen ? [] : ['top']}>
      {/* Desktop Header */}
      {isLargeScreen ? (
        <View style={[styles.desktopHeaderRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={{ flex: 1, minWidth: 260, marginRight: 16 }}>
            <Text style={[styles.desktopHeaderTitle, { color: colors.textPrimary }]}>
              {category === 'full' ? 'Full Mock Tests' : category === 'topic' ? (selectedTopic || 'Topic-Wise Tests') : 'Test Center'}
            </Text>
            <Text style={[styles.desktopHeaderSubtitle, { color: colors.textSecondary }]}>
              {category === 'full'
                ? `${fullMockCount} Full Length Tests (120 Qs, 300 Marks, 2 Hours CBT)`
                : category === 'topic'
                ? selectedTopic
                  ? `Topic Tests for ${selectedTopic}`
                  : `${uniqueTopics.length} Syllabus Topics (${topicTestCount} Tests)`
                : `${fullMockCount} Full Mocks • ${topicTestCount} Topic Tests`}
            </Text>
          </View>
        </View>
      ) : (
        /* Mobile Top Bar */
        <LinearGradient colors={['#1E3A8A', '#2563EB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.mobileHero}>
          <View style={styles.mobileHeroTop}>
            {!isTab && (
              <TouchableOpacity
                onPress={handleBack}
                style={styles.backButtonTop}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.7}
              >
                <ArrowLeft size={22} color="#fff" />
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }}>
              <View style={styles.heroBadgeRow}>
                <Sparkles size={13} color="#FDE047" />
                <Text style={styles.heroBadgeText}>UPSC PRINCIPAL EXAM 2026</Text>
              </View>
              <Text style={styles.mobileHeroTitle}>Test Center</Text>
              <Text style={styles.mobileHeroSubtitle}>
                {fullMockCount} Full Mocks • {topicTestCount} Topic Tests
              </Text>
            </View>
          </View>
        </LinearGradient>
      )}

      {/* Search Bar & Status Filter */}
      <View style={[styles.searchControlsWrapper, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.searchBarRow}>
          <View style={[styles.searchBarInputContainer, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
            <Search size={18} color={colors.textTertiary} />
            <TextInput
              style={[styles.searchInputField, { color: colors.textPrimary }]}
              placeholder="Search tests, topics, laws, acts..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          {/* Quick Segmented Toggle (All / Full / Topic) */}
          <View style={[styles.segmentedSwitch, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.segmentBtn, category === 'all' && [styles.segmentBtnActive, { backgroundColor: colors.surface }]]}
              onPress={() => { setCategory('all'); setSelectedTopic(null); }}
            >
              <Text style={[styles.segmentBtnText, { color: category === 'all' ? colors.textPrimary : colors.textSecondary }]}>All</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentBtn, category === 'full' && [styles.segmentBtnActive, { backgroundColor: colors.surface }]]}
              onPress={() => { setCategory('full'); setSelectedTopic(null); }}
            >
              <Text style={[styles.segmentBtnText, { color: category === 'full' ? colors.textPrimary : colors.textSecondary }]}>Full</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentBtn, category === 'topic' && [styles.segmentBtnActive, { backgroundColor: colors.surface }]]}
              onPress={() => setCategory('topic')}
            >
              <Text style={[styles.segmentBtnText, { color: category === 'topic' ? colors.textPrimary : colors.textSecondary }]}>Topics</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Attempt Status Chips */}
        <View style={styles.statusChipsRow}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
              attemptFilter === 'all' && [styles.filterChipActive, { backgroundColor: colors.accent, borderColor: colors.accent }]
            ]}
            onPress={() => setAttemptFilter('all')}
          >
            <Text style={[styles.filterChipText, { color: colors.textSecondary }, attemptFilter === 'all' && styles.filterChipTextActive]}>
              All ({tests.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
              attemptFilter === 'attempted' && [styles.filterChipActive, { backgroundColor: '#16A34A', borderColor: '#16A34A' }]
            ]}
            onPress={() => setAttemptFilter('attempted')}
          >
            <CheckCircle2 size={12} color={attemptFilter === 'attempted' ? '#fff' : '#16A34A'} style={{ marginRight: 4 }} />
            <Text style={[styles.filterChipText, { color: colors.textSecondary }, attemptFilter === 'attempted' && styles.filterChipTextActive]}>
              Attempted ({attemptedCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
              attemptFilter === 'unattempted' && [styles.filterChipActive, { backgroundColor: colors.accent, borderColor: colors.accent }]
            ]}
            onPress={() => setAttemptFilter('unattempted')}
          >
            <Circle size={10} color={attemptFilter === 'unattempted' ? '#fff' : colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={[styles.filterChipText, { color: colors.textSecondary }, attemptFilter === 'unattempted' && styles.filterChipTextActive]}>
              Unattempted ({unattemptedCount})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Pills (Only visible when viewing Topics list or All) */}
      {(category === 'topic' || category === 'all') && !selectedTopic && renderSyllabusPills()}

      {/* Selected Topic Drill-Down Header */}
      {category === 'topic' && selectedTopic && (
        <View style={[styles.selectedTopicHeaderModern, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setSelectedTopic(null)} style={styles.backToTopicsButton}>
            <ArrowLeft size={16} color={colors.accent} />
            <Text style={[styles.backToTopicsText, { color: colors.accent }]}>All Topics</Text>
          </TouchableOpacity>
          <View style={styles.selectedTopicTitleRow}>
            <Text style={[styles.selectedTopicTitleText, { color: colors.textPrimary }]}>{selectedTopic}</Text>
            <View style={[styles.selectedTopicCountBadge, { backgroundColor: colors.surfaceHighlight }]}>
              <Text style={[styles.selectedTopicCountText, { color: colors.textSecondary }]}>
                {filteredTests.length} {filteredTests.length === 1 ? 'test' : 'tests'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Main Content Area */}
      <ScrollView
        style={[styles.content, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.contentContainer, isLargeScreen && { padding: 24, paddingBottom: 64 }]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={handleRefresh} colors={['#3B82F6']} />}
      >
        {/* Active Test Resume Card */}
        {renderResumeCards()}

        {/* Hero Category Navigation Cards (when on "All" view) */}
        {category === 'all' && !searchQuery && renderHeroCategoryCards()}

        {/* Section Heading */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionHeadingText, { color: colors.textPrimary }]}>
            {category === 'full'
              ? 'Full Length Mock Tests'
              : category === 'topic'
              ? selectedTopic
                ? `${selectedTopic} Tests`
                : 'Browse by Syllabus Topic'
              : 'Recommended Tests'}
          </Text>
          <Text style={[styles.sectionCountText, { color: colors.textSecondary }]}>
            {category === 'topic' && !selectedTopic ? `${visibleTopics.length} topics` : `${filteredTests.length} tests`}
          </Text>
        </View>

        {/* Grid Display: Either Topic Cards or Test Cards */}
        {category === 'topic' && !selectedTopic ? (
          visibleTopics.length === 0 ? (
            <View style={styles.emptyState}>
              <Folder size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyStateTitle, { color: colors.textPrimary }]}>No topics match your filter</Text>
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>Try selecting "All Topics" or clearing the search query.</Text>
            </View>
          ) : (
            <View style={styles.topicCardsGrid}>
              {visibleTopics.map((topicObj, index) => renderTopicCard(topicObj, index))}
            </View>
          )
        ) : filteredTests.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyStateTitle, { color: colors.textPrimary }]}>No tests found</Text>
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
              {searchQuery ? 'Try adjusting your search keywords' : 'No tests found in this category.'}
            </Text>
          </View>
        ) : (
          <View style={[styles.testsGrid, width > 768 && styles.testsGridWeb]}>
            {filteredTests.map((test) => (
              <View key={test.id} style={width > 768 ? styles.testCardWrapperWeb : undefined}>
                {renderTestCard(test)}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </ContainerComponent>
  );

  if (isLargeScreen) {
    return <DesktopDashboard disableScroll={true}>{content}</DesktopDashboard>;
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: '500',
  },
  desktopHeaderRow: {
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  desktopHeaderTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  desktopHeaderSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  mobileHero: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  mobileHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonTop: {
    marginRight: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    marginBottom: 4,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FDE047',
    letterSpacing: 0.5,
  },
  mobileHeroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  mobileHeroSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  searchControlsWrapper: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  searchBarInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInputField: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    paddingVertical: 0,
  },
  segmentedSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    padding: 2,
    height: 42,
  },
  segmentBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipActive: {},
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  syllabusPillContainer: {
    borderBottomWidth: 1,
  },
  syllabusPillsContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  syllabusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  syllabusPillActive: {},
  syllabusPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  syllabusPillTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  heroSection: {
    marginBottom: 16,
  },
  heroGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  heroCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  heroCardActiveLight: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  heroCardActiveDark: {
    backgroundColor: '#1E3A5F',
    borderColor: '#60A5FA',
  },
  heroCardActiveLightEmerald: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  heroCardActiveDarkEmerald: {
    backgroundColor: '#064E3B',
    borderColor: '#34D399',
  },
  heroCardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroCardTextBox: {
    flex: 1,
  },
  heroCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  heroCardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  heroCardBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  heroCardBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  heroCardSub: {
    fontSize: 11,
    lineHeight: 15,
  },
  customBanner: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  customBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  customBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  customBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customBannerTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  customBannerTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6366F1',
    letterSpacing: 0.5,
  },
  customBannerPremium: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
  },
  customBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  customBannerSub: {
    fontSize: 11,
    marginTop: 1,
    maxWidth: '90%',
  },
  selectedTopicHeaderModern: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backToTopicsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  backToTopicsText: {
    fontSize: 13,
    fontWeight: '600',
  },
  selectedTopicTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedTopicTitleText: {
    fontSize: 18,
    fontWeight: '800',
  },
  selectedTopicCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  selectedTopicCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeadingText: {
    fontSize: 17,
    fontWeight: '800',
  },
  sectionCountText: {
    fontSize: 13,
  },
  topicCardsGrid: {
    gap: 10,
  },
  topicCardModern: {
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  topicCardModernTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topicIconContainerModern: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  topicCardModernContent: {
    flex: 1,
  },
  topicCardBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  topicCategoryBadge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    textTransform: 'uppercase',
  },
  topicAttemptMeta: {
    fontSize: 11,
    fontWeight: '600',
  },
  topicCardTitleModern: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  topicCardProgressWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
  },
  topicProgressBarTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  topicProgressBarFillModern: {
    height: '100%',
    borderRadius: 3,
  },
  topicProgressPercent: {
    fontSize: 11,
    fontWeight: '700',
    width: 32,
    textAlign: 'right',
  },
  testsGrid: {
    gap: 12,
  },
  testsGridWeb: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  testCardWrapperWeb: {
    width: '48.5%',
  },
  modernTestCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  testCardAttemptedBorderLight: {
    borderColor: '#BBF7D0',
  },
  testCardAttemptedBorderDark: {
    borderColor: '#065F46',
  },
  testCardHeaderModern: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  testCardIconModern: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  testCardBadgesModern: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  testBadgeLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  testTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  testTypeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  solutionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  solutionBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  premiumBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  premiumBadgeText: {
    color: '#D97706',
    fontSize: 11,
    fontWeight: '700',
  },
  freeBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  freeBadgeText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  scoreBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modernTestTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 14,
  },
  modernTestFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  metaStatPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaStatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaStatValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  metaStatLabel: {
    fontSize: 11,
  },
  metaStatDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#94A3B8',
  },
  startTestButtonModern: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  unlockTestButtonModern: {
    backgroundColor: '#D97706',
  },
  startTestButtonTextModern: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  actionButtonsRowModern: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewResultButtonModern: {
    backgroundColor: '#16A34A',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewResultButtonTextModern: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  retakeTestButtonModern: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retakeTestButtonTextModern: {
    fontSize: 12,
    fontWeight: '700',
  },
  resumeCardNew: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  resumeGradientNew: {
    padding: 14,
  },
  resumeContentNew: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resumeIconNew: {
    marginRight: 12,
  },
  resumeInfoNew: {
    flex: 1,
  },
  resumeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  resumeTitleNew: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EA580C',
    letterSpacing: 0.5,
  },
  resumeMetaNew: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EA580C',
  },
  resumeSubtitleNew: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  resumeQuestionsMeta: {
    fontSize: 12,
  },
  resumeButtonNew: {
    backgroundColor: '#EA580C',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginLeft: 8,
  },
  resumeButtonTextNew: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  resumeProgressContainerNew: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  resumeProgressBarNew: {
    flex: 1,
    height: 5,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  resumeProgressFillNew: {
    height: '100%',
    backgroundColor: '#EA580C',
    borderRadius: 2.5,
  },
  resumeProgressTextNew: {
    fontSize: 11,
    fontWeight: '700',
    width: 32,
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyStateText: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
  },
});
