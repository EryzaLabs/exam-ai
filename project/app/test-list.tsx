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
  Calendar,
  BookOpen,
  Filter,
  TrendingUp,
  PlayCircle,
  History,
  CheckCircle2,
  Circle,
  Eye,
  RotateCcw,
} from 'lucide-react-native';
import SSCCGLService, { ParsedMockTest } from '@/services/ssc-cgl-service';
import { TestProgressService, SavedTestState, TestResult } from '@/services/test-progress-service';
import userService from '@/services/user-service';
import { initiatePayment } from '@/utils/cashfree';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';

const { width } = Dimensions.get('window');

// Interface matching the server response for list items
interface ServerPaper {
    id: string; // filename
    title: string;
    filename: string;
    hasAnswers: boolean;
}

export default function TestListScreen({ isTab = false }: { isTab?: boolean }) {
  const { isDark, colors } = useTheme();
  const [tests, setTests] = useState<ServerPaper[]>([]);
  const [filteredTests, setFilteredTests] = useState<ServerPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTestId, setLoadingTestId] = useState<string | null>(null);
  const params = useLocalSearchParams<{ q?: string; category?: string; filter?: string }>();
  const [searchQuery, setSearchQuery] = useState(typeof params.q === 'string' ? params.q : '');
  const initialCategory = params.category === 'full' || params.category === 'topic' ? params.category : 'all';
  const [category, setCategory] = useState<'all' | 'full' | 'topic'>(initialCategory);
  const initialFilter = params.filter === 'attempted' || params.filter === 'unattempted' ? params.filter : 'all';
  const [attemptFilter, setAttemptFilter] = useState<'all' | 'attempted' | 'unattempted'>(initialFilter);
  const [history, setHistory] = useState<TestResult[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [activeTests, setActiveTests] = useState<SavedTestState[]>([]);
  const { user, isSubscribed: authSubscribed, isSubscriptionLoading, refreshSubscription, requireAuth } = useAuth();
  const [localSubscribed, setLocalSubscribed] = useState<boolean | null>(null);
  const isSubscribed = localSubscribed !== null ? localSubscribed : authSubscribed;
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  const { width: windowWidth } = useWindowDimensions();
  const isLargeScreen = windowWidth >= 1024;

  useEffect(() => {
    if (params.category === 'full' || params.category === 'topic' || params.category === 'all') {
      setCategory(params.category);
      if (params.category !== 'topic') {
        setSelectedTopic(null);
      }
    }
  }, [params.category]);

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

  const getTopicFromFilename = (filename: string): string | null => {
    if (!filename.includes('topic_wise/')) return null;
    const base = filename.split('topic_wise/')[1];
    const topicId = base.split('_test_')[0];
    return topicId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const uniqueTopics = useMemo(() => {
    const topics = new Set<string>();
    tests.forEach(t => {
      const topic = getTopicFromFilename(t.filename);
      if (topic) topics.add(topic);
    });
    return Array.from(topics).sort();
  }, [tests]);

  const attemptedMaps = useMemo(() => {
    const byId = new Map<string, TestResult>();
    const byFilename = new Map<string, TestResult>();
    const byTitle = new Map<string, TestResult>();

    history.forEach(h => {
      const hDate = new Date(h.date).getTime();

      if (h.testId) {
        const existing = byId.get(h.testId);
        if (!existing || hDate > new Date(existing.date).getTime()) {
          byId.set(h.testId, h);
        }
      }

      if (h.filename) {
        const existing = byFilename.get(h.filename);
        if (!existing || hDate > new Date(existing.date).getTime()) {
          byFilename.set(h.filename, h);
        }
      }

      if (h.testTitle) {
        const cleanTitle = h.testTitle.toLowerCase().trim().replace(/\s+/g, ' ');
        const existing = byTitle.get(cleanTitle);
        if (!existing || hDate > new Date(existing.date).getTime()) {
          byTitle.set(cleanTitle, h);
        }
      }
    });

    return { byId, byFilename, byTitle };
  }, [history]);

  const getAttemptForTest = useCallback((test: ServerPaper): TestResult | undefined => {
    if (!test) return undefined;
    if (attemptedMaps.byId.has(test.id)) {
      return attemptedMaps.byId.get(test.id);
    }
    if (test.filename && attemptedMaps.byFilename.has(test.filename)) {
      return attemptedMaps.byFilename.get(test.filename);
    }
    if (test.filename && attemptedMaps.byId.has(test.filename)) {
      return attemptedMaps.byId.get(test.filename);
    }
    if (test.title) {
      const cleanTitle = test.title.toLowerCase().trim().replace(/\s+/g, ' ');
      if (attemptedMaps.byTitle.has(cleanTitle)) {
        return attemptedMaps.byTitle.get(cleanTitle);
      }
    }
    return undefined;
  }, [attemptedMaps]);

  const attemptedCount = useMemo(() => {
    return tests.filter(t => !!getAttemptForTest(t)).length;
  }, [tests, getAttemptForTest]);

  const unattemptedCount = useMemo(() => {
    return Math.max(0, tests.length - attemptedCount);
  }, [tests, attemptedCount]);

  useEffect(() => {
    filterTests();
  }, [searchQuery, category, selectedTopic, tests, attemptFilter, getAttemptForTest]);

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

  // Not needed globally, we compute it per test in render

  const handleRefresh = () => {
      loadTests();
      loadActiveTest();
      loadHistory();
      checkSubscription();
  };

  const handlePayment = () => {
    // We allow guests to purchase via local AsyncStorage caching
    setPaymentLoading(true);
    initiatePayment(
      async () => {
        // On success: backend writes to Firestore, onSnapshot updates state automatically
        await refreshSubscription();
        setLocalSubscribed(true);
        setPaymentLoading(false);
        alert('Payment successful! You now have full access.');
      },
      (error) => {
        setPaymentLoading(false);
        alert(`Payment failed: ${error}`);
      }
    );
  };

  const loadTests = async () => {
    setLoading(true);
    try {
      // Fetch from server
      const availablePapers = await SSCCGLService.fetchPapersList();
      // Filter if needed, e.g. only with answers
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
      }
    }

    // Filter by attempted / unattempted status
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

  const getUniqueYears = (): number[] => {
    // Simple year extraction from titles
    const years = new Set<number>();
    tests.forEach((test) => {
       const match = test.title.match(/20\d{2}/);
       if (match) {
         years.add(parseInt(match[0]));
       }
    });
    return Array.from(years).sort((a, b) => b - a);
  };

  const handleTestSelect = async (paper: ServerPaper) => {
    const isFirstTest = tests.length > 0 && tests[0].id === paper.id;

    // Direct cloud verification: verify against Firestore before opening test
    const verifiedProfile = await userService.getUserProfile(user?.uid);
    const hasActiveSubscription = verifiedProfile?.isSubscribed === true;

    if (!hasActiveSubscription && !isFirstTest) {
      setLocalSubscribed(false);
      router.push('/premium');
      return;
    }
    
    try {
      setLoadingTestId(paper.id);
      
      // Allow UI to update
      await new Promise(resolve => setTimeout(resolve, 50));

      // Fetch paper content from server
      const loadedTest = await SSCCGLService.fetchPaper(paper.filename);

      router.push({
        pathname: '/test-instructions',
        params: { testId: loadedTest.id },
      });
    } catch (error) {
       console.error(error);
       // Alert.alert('Error', 'Failed to open test'); 
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

  const renderTestCard = (test: ServerPaper) => {
    // Dynamic calculations based on test type
    const isMock = test.filename.includes('full_mocks');
    const totalQuestions = isMock ? 120 : 20;
    const duration = isMock ? 7200 : 1200; // 2 hours for mocks, 20 mins for topics
    const totalMarks = totalQuestions * 2.5; // 2.5 marks per question
    const isFirstTest = tests.length > 0 && tests[0].id === test.id;
    const isLocked = !isSubscribed && !isFirstTest;
    const attempt = getAttemptForTest(test);
    const isAttempted = !!attempt;

    return (
      <TouchableOpacity
        style={[
          styles.newTestCard,
          { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: isDark ? 1 : 0 },
          isLocked && styles.newTestCardLocked
        ]}
        onPress={() => handleTestSelect(test)}
        activeOpacity={0.7}
        disabled={!!loadingTestId}
      >
        <View style={styles.testCardHeaderNew}>
          <View style={[styles.testCardIconNew, isLocked ? { backgroundColor: isDark ? '#422006' : '#FEF3C7' } : isAttempted ? { backgroundColor: isDark ? '#064E3B' : '#DCFCE7' } : { backgroundColor: isDark ? '#1E3A5F' : '#E3F2FD' }]}>
             {isLocked ? (
               <Text style={{ fontSize: 18 }}>🔒</Text>
             ) : isAttempted ? (
               <CheckCircle2 size={22} color="#16A34A" />
             ) : (
               <FileText size={24} color="#4A90E2" />
             )}
          </View>
          <View style={styles.testCardBadgesNew}>
            {isAttempted ? (
              <View style={[styles.testCardBadgeAttempted, isDark && { backgroundColor: '#064E3B' }]}>
                <CheckCircle2 size={12} color="#15803D" style={{marginRight: 4}} />
                <Text style={[styles.testCardBadgeTextAttempted, isDark && { color: '#34D399' }]}>Attempted • {Math.round(attempt.accuracy || 0)}%</Text>
              </View>
            ) : (
              <View style={[styles.testCardBadgeUnattempted, isDark && { backgroundColor: colors.surfaceHighlight }]}>
                <Circle size={10} color={colors.textSecondary} style={{marginRight: 4}} />
                <Text style={[styles.testCardBadgeTextUnattempted, { color: colors.textSecondary }]}>Not Attempted</Text>
              </View>
            )}

            {isLocked ? (
              <View style={styles.testCardBadgeLocked}>
                <Text style={styles.testCardBadgeTextLocked}>🔒 Premium</Text>
              </View>
            ) : isFirstTest && !isSubscribed ? (
              <View style={styles.testCardBadgeFree}>
                <Text style={styles.testCardBadgeTextFree}>✨ Free Demo</Text>
              </View>
            ) : (
              <View style={[styles.testCardBadgePrimary, isDark && { backgroundColor: '#1E3A5F' }]}>
                <Text style={[styles.testCardBadgeTextPrimary, isDark && { color: '#60A5FA' }]}>UPSC Principal</Text>
              </View>
            )}
            {test.hasAnswers && (
              <View style={[styles.testCardBadgeSuccess, isDark && { backgroundColor: '#064E3B' }]}>
                <BookOpen size={12} color="#4CAF50" style={{marginRight: 4}} />
                <Text style={[styles.testCardBadgeTextSuccess, isDark && { color: '#34D399' }]}>With Solutions</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={[styles.testCardTitleNew, { color: colors.textPrimary }]} numberOfLines={2}>
          {test.title}
        </Text>

        <View style={[styles.testCardBottomNew, { borderTopColor: colors.borderLight }]}>
           <View style={styles.testCardStatsRowNew}>
             <View style={styles.testCardStatNew}>
                <HelpCircle size={18} color={colors.textSecondary} style={{marginBottom: 4}} />
                <View style={styles.statTextGroupNew}>
                  <Text style={[styles.statValueNew, { color: colors.textPrimary }]}>{totalQuestions}</Text>
                  <Text style={[styles.statLabelNew, { color: colors.textSecondary }]}>Questions</Text>
                </View>
             </View>
             <View style={styles.testCardStatNew}>
                <Clock size={18} color={colors.textSecondary} style={{marginBottom: 4}} />
                <View style={styles.statTextGroupNew}>
                  <Text style={[styles.statValueNew, { color: colors.textPrimary }]}>{formatDuration(duration)}</Text>
                  <Text style={[styles.statLabelNew, { color: colors.textSecondary }]}>Duration</Text>
                </View>
             </View>
             <View style={styles.testCardStatNew}>
                <Award size={18} color={colors.textSecondary} style={{marginBottom: 4}} />
                <View style={styles.statTextGroupNew}>
                  <Text style={[styles.statValueNew, { color: colors.textPrimary }]}>{totalMarks}</Text>
                  <Text style={[styles.statLabelNew, { color: colors.textSecondary }]}>Marks</Text>
                </View>
             </View>
           </View>
           
           {isAttempted ? (
             <View style={styles.actionButtonsRowNew}>
               <TouchableOpacity
                 style={styles.viewResultButtonNew}
                 onPress={() => router.push({ pathname: '/test-result', params: { attemptId: attempt.attemptId, testId: test.id, filename: test.filename, testTitle: test.title } })}
                 activeOpacity={0.8}
               >
                 <Eye size={13} color="#fff" style={{ marginRight: 4 }} />
                 <Text style={styles.viewResultButtonTextNew}>Result</Text>
               </TouchableOpacity>

               <TouchableOpacity 
                 style={styles.retakeTestButtonNew}
                 onPress={() => handleTestSelect(test)}
                 disabled={!!loadingTestId}
                 activeOpacity={0.8}
               >
                 <RotateCcw size={13} color="#1D4ED8" style={{ marginRight: 4 }} />
                 <Text style={styles.retakeTestButtonTextNew}>
                   {loadingTestId === test.id ? 'Loading' : 'Retake'}
                 </Text>
               </TouchableOpacity>
             </View>
           ) : (
             <TouchableOpacity 
               style={[styles.startTestButtonNew, isLocked && styles.unlockTestButtonNew]}
               onPress={() => handleTestSelect(test)}
               disabled={!!loadingTestId}
             >
               <Text style={[styles.startTestButtonTextNew, isLocked && styles.unlockTestButtonTextNew]}>
                  {loadingTestId === test.id
                    ? 'Loading'
                    : isLocked
                    ? 'Unlock from ₹9'
                    : isFirstTest && !isSubscribed
                    ? 'Start Free Demo'
                    : 'Start Test'}
               </Text>
               {isLocked ? (
                 <Text style={{ fontSize: 13, marginLeft: 4 }}>🔒</Text>
               ) : (
                 <ArrowRight size={16} color="#fff" style={{ marginLeft: 4 }} />
               )}
             </TouchableOpacity>
           )}
        </View>
      </TouchableOpacity>
    );
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
          style={styles.resumeCardNew} 
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
                         <PlayCircle color="#F57C00" size={40} strokeWidth={1.5} />
                     </View>
                     <View style={styles.resumeInfoNew}>
                         <Text style={styles.resumeTitleNew}>CONTINUE TEST</Text>
                         <Text style={styles.resumeSubtitleNew} numberOfLines={1}>
                              {title}
                         </Text>
                         <Text style={styles.resumeMetaNew}>
                             {attemptedCount} questions attempted • {minutesLeft}m left
                         </Text>
                     </View>
                     <View style={styles.resumeButtonNew}>
                         <Text style={styles.resumeButtonTextNew}>Resume</Text>
                         <ArrowRight color="#fff" size={16} style={{marginLeft: 4}} />
                     </View>
                 </View>
                 <View style={styles.resumeProgressContainerNew}>
                    <View style={styles.resumeProgressBarNew}>
                       <View style={[styles.resumeProgressFillNew, { width: `${percent}%` }]} />
                    </View>
                    <Text style={styles.resumeProgressTextNew}>{percent}%</Text>
                 </View>
             </View>
         </TouchableOpacity>
      );
    });
  };

  const renderCategoryTabs = () => {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.categoryTabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
        contentContainerStyle={styles.categoryTabsContent}
      >
        <TouchableOpacity
          style={[styles.categoryTab, { backgroundColor: colors.surfaceHighlight }, category === 'all' && styles.categoryTabActive]}
          onPress={() => { setCategory('all'); setSelectedTopic(null); }}
        >
          <LayoutGrid size={16} color={category === 'all' ? '#fff' : colors.textSecondary} style={{marginRight: 6}} />
          <Text style={[styles.categoryTabText, { color: colors.textSecondary }, category === 'all' && styles.categoryTabTextActive]}>All Tests</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.categoryTab, { backgroundColor: colors.surfaceHighlight }, category === 'full' && styles.categoryTabActive]}
          onPress={() => { setCategory('full'); setSelectedTopic(null); }}
        >
          <FileText size={16} color={category === 'full' ? '#fff' : colors.textSecondary} style={{marginRight: 6}} />
          <Text style={[styles.categoryTabText, { color: colors.textSecondary }, category === 'full' && styles.categoryTabTextActive]}>Full Mocks</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.categoryTab, { backgroundColor: colors.surfaceHighlight }, category === 'topic' && styles.categoryTabActive]}
          onPress={() => setCategory('topic')}
        >
          <BookOpen size={16} color={category === 'topic' ? '#fff' : colors.textSecondary} style={{marginRight: 6}} />
          <Text style={[styles.categoryTabText, { color: colors.textSecondary }, category === 'topic' && styles.categoryTabTextActive]}>Topic Wise</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.categoryTab, { backgroundColor: isDark ? '#1E3A5F' : '#EEF2FF', borderColor: isDark ? '#3B82F6' : '#C7D2FE', borderWidth: 1 }]}
          onPress={() => router.push(isSubscribed ? '/custom-test' : '/premium')}
        >
          <SlidersHorizontal size={16} color={colors.accent} style={{marginRight: 6}} />
          <Text style={[styles.categoryTabText, { color: colors.accent, fontWeight: '700' }]}>Custom Test 👑</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const getTopicColor = (index: number) => {
    const colorsArr = [
      { bg: isDark ? '#1E3A5F' : '#E3F2FD', icon: '#3B82F6' },
      { bg: isDark ? '#064E3B' : '#E8F5E9', icon: '#10B981' },
      { bg: isDark ? '#2D1B69' : '#F3E5F5', icon: '#8B5CF6' },
      { bg: isDark ? '#450A0A' : '#FFEBEE', icon: '#EF4444' },
      { bg: isDark ? '#431407' : '#FFF3E0', icon: '#F97316' },
    ];
    return colorsArr[index % colorsArr.length];
  };

  const renderTopicGrid = () => {
    return (
      <View style={styles.topicGrid}>
        <View style={styles.topicGridHeader}>
          <Text style={[styles.topicGridTitle, { color: colors.textPrimary }]}>Topics</Text>
          <View style={styles.topicGridSort}>
             <Text style={[styles.topicGridSortText, { color: colors.textSecondary }]}>Sort: Default</Text>
             <ChevronRight size={16} color={colors.textTertiary} style={{transform: [{rotate: '90deg'}]}} />
          </View>
        </View>

        {uniqueTopics.map((topic, index) => {
          const count = tests.filter(t => getTopicFromFilename(t.filename) === topic).length;
          if (searchQuery && !topic.toLowerCase().includes(searchQuery.toLowerCase())) return null;
          
          const theme = getTopicColor(index);
          const attempted = tests.filter(t => getTopicFromFilename(t.filename) === topic && !!getAttemptForTest(t)).length;
          const progress = count > 0 ? (attempted / count) * 100 : 0;

          return (
            <TouchableOpacity
              key={topic}
              style={[styles.topicCardNew, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}
              onPress={() => setSelectedTopic(topic)}
              activeOpacity={0.7}
            >
              <View style={[styles.topicIconContainerNew, { backgroundColor: theme.bg }]}>
                {index % 4 === 0 && <BookOpen size={24} color={theme.icon} />}
                {index % 4 === 1 && <Folder size={24} color={theme.icon} />}
                {index % 4 === 2 && <Award size={24} color={theme.icon} />}
                {index % 4 === 3 && <FileText size={24} color={theme.icon} />}
              </View>
              
              <View style={styles.topicContentNew}>
                <View style={styles.topicCardHeaderNewContainer}>
                  <Text style={[styles.topicCardTitleNew, { color: colors.textPrimary }]}>{topic}</Text>
                  <Text style={[styles.topicCardAttemptedNew, { color: colors.textSecondary }]}>{attempted}/{count} attempted</Text>
                </View>
                <Text style={[styles.topicCardSubtitleNew, { color: colors.textSecondary }]}>{count} Tests</Text>
                
                <View style={[styles.topicProgressBarContainer, { backgroundColor: colors.progressBarBg }]}>
                   <View style={[styles.topicProgressBarFill, { width: `${progress}%`, backgroundColor: theme.icon }]} />
                </View>
              </View>
              
              <ChevronRight size={20} color={colors.textTertiary} style={{marginLeft: 12}} />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const isPageLoading = loading || isSubscriptionLoading || (user && localSubscribed === null && checkingSubscription);

  if (isPageLoading) {
    const loadingView = (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Verifying test access & loading mocks...</Text>
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

  const content = (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }, isLargeScreen && { flex: undefined, minHeight: 600 }]} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={['#4A90E2', '#357ABD']} style={styles.headerNew}>
        <View style={styles.headerTopNew}>
            {!isTab && (
              <TouchableOpacity
                onPress={handleBack}
                style={styles.backButtonTop}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.7}
                accessibilityLabel="Go back"
                accessibilityRole="button"
              >
                <ArrowLeft size={24} color="#fff" />
              </TouchableOpacity>
            )}
            <View style={{flex: 1}}>
                <Text style={styles.headerTitleNew}>UPSC Principal{'\n'}Mock Tests</Text>
                <Text style={styles.headerSubtitleNew}>
                {filteredTests.length} tests available  •  {category === 'full' ? '26 Full Mock Tests (120 Qs each)' : category === 'topic' ? '158 Topic-wise Tests' : '26 Full Mocks & 158 Topic Tests'}
                </Text>
            </View>
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainerNew}>
        <View style={[styles.searchBarNew, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
          <Search size={20} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInputNew, { color: colors.textPrimary }]}
            placeholder="Search tests, topics..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textTertiary}
          />
        </View>
        <TouchableOpacity 
          style={[styles.filterButtonNew, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }, attemptFilter !== 'all' && styles.filterButtonNewActive]}
          onPress={() => {
            if (attemptFilter === 'all') setAttemptFilter('attempted');
            else if (attemptFilter === 'attempted') setAttemptFilter('unattempted');
            else setAttemptFilter('all');
          }}
          activeOpacity={0.7}
        >
           <SlidersHorizontal size={20} color={attemptFilter !== 'all' ? '#4A90E2' : colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Category Tabs */}
      {renderCategoryTabs()}

      {/* Attempted / Unattempted Filter Pills */}
      <View style={styles.statusFilterRow}>
        <TouchableOpacity
          style={[styles.statusFilterChip, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }, attemptFilter === 'all' && styles.statusFilterChipActive]}
          onPress={() => setAttemptFilter('all')}
          activeOpacity={0.7}
        >
          <Text style={[styles.statusFilterText, { color: colors.textSecondary }, attemptFilter === 'all' && styles.statusFilterTextActive]}>
            All ({tests.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statusFilterChip, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }, attemptFilter === 'attempted' && styles.statusFilterChipActive]}
          onPress={() => setAttemptFilter('attempted')}
          activeOpacity={0.7}
        >
          <CheckCircle2 size={13} color={attemptFilter === 'attempted' ? '#fff' : '#16A34A'} style={{marginRight: 4}} />
          <Text style={[styles.statusFilterText, { color: colors.textSecondary }, attemptFilter === 'attempted' && styles.statusFilterTextActive]}>
            Attempted ({attemptedCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statusFilterChip, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }, attemptFilter === 'unattempted' && styles.statusFilterChipActive]}
          onPress={() => setAttemptFilter('unattempted')}
          activeOpacity={0.7}
        >
          <Circle size={11} color={attemptFilter === 'unattempted' ? '#fff' : colors.textSecondary} style={{marginRight: 4}} />
          <Text style={[styles.statusFilterText, { color: colors.textSecondary }, attemptFilter === 'unattempted' && styles.statusFilterTextActive]}>
            Unattempted ({unattemptedCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Selected Topic Header */}
      {category === 'topic' && selectedTopic && (
        <View style={[styles.selectedTopicHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setSelectedTopic(null)} style={styles.backButton}>
            <ArrowLeft size={20} color="#4A90E2" />
            <Text style={styles.backButtonText}>All Topics</Text>
          </TouchableOpacity>
          <Text style={[styles.selectedTopicTitle, { color: colors.textPrimary }]}>{selectedTopic}</Text>
        </View>
      )}

      {/* Test List */}
      <ScrollView
        style={[styles.content, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} colors={['#4A90E2']} />
        }
      >
        {!isSubscribed && (
          <TouchableOpacity
            style={styles.premiumListBanner}
            onPress={() => router.push('/premium')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#1E1B4B', '#3730A3']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.premiumListBannerGradient}
            >
              <View style={{ flex: 1, marginRight: 12 }}>
                <View style={styles.premiumListBannerTag}>
                  <Text style={styles.premiumListBannerTagText}>⚡ PASSES FROM ₹9 • UPSC 2026</Text>
                </View>
                <Text style={styles.premiumListBannerTitle}>UPSC Principal 2026 Test Pass</Text>
                <Text style={styles.premiumListBannerSub}>
                  Unlock all 50+ Full Mocks, AI Diagnostics & Bilingual Explanations
                </Text>
              </View>
              <View style={styles.premiumListBannerButton}>
                <Text style={styles.premiumListBannerButtonText}>Upgrade</Text>
                <ArrowRight size={14} color="#3730A3" style={{ marginLeft: 4 }} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {renderResumeCards()}

        {category === 'topic' && !selectedTopic ? (
          renderTopicGrid()
        ) : filteredTests.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={64} color={colors.textTertiary} />
            <Text style={[styles.emptyStateTitle, { color: colors.textPrimary }]}>No tests found</Text>
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
              {searchQuery
                ? 'Try adjusting your search'
                : 'No tests available at the moment'}
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
    </SafeAreaView>
  );

  if (isLargeScreen) {
    return <DesktopDashboard>{content}</DesktopDashboard>;
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  categoryTabs: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    maxHeight: 56,
  },
  categoryTabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryTabActive: {
    backgroundColor: '#4A90E2',
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  categoryTabTextActive: {
    color: '#fff',
  },
  selectedTopicHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButtonText: {
    color: '#4A90E2',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 4,
  },
  selectedTopicTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  topicGrid: {
    padding: 16,
    gap: 12,
  },
  topicCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  topicIcon: {
    marginRight: 16,
  },
  topicContent: {
    flex: 1,
  },
  topicCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  topicCardSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
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
    width: '48%', // For a 2-column grid on tablets/desktop
    marginBottom: 4,
  },
  testCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  testCardGradient: {
    padding: 16,
  },
  testCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  testCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  testCardBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  testCardBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  testCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    lineHeight: 22,
  },
  testCardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  testCardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  testCardMetaText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  testCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  testCardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  testCardStatText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  testCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  testCardSections: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  testCardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  testCardActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
  },
  headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  historyButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
  },
  resumeCard: {
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 20,
      elevation: 4,
      shadowColor: '#F57C00',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
  },
  resumeGradient: {
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
  },
  resumeContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
  },
  resumeIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
  },
  resumeInfo: {
      flex: 1,
  },
  resumeTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#fff',
      marginBottom: 2,
  },
  resumeSubtitle: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.9)',
      marginBottom: 2,
  },
  // --- NEW STYLES FOR OVERHAUL ---
  headerNew: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTopNew: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  backButtonTop: {
    marginRight: 16,
    marginTop: 4,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  headerTitleNew: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    lineHeight: 34,
  },
  headerSubtitleNew: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  searchContainerNew: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  searchBarNew: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInputNew: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  filterButtonNew: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  resumeCardNew: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  resumeGradientNew: {
    backgroundColor: '#FFF3E0',
    padding: 16,
  },
  resumeContentNew: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resumeIconNew: {
    marginRight: 16,
  },
  resumeInfoNew: {
    flex: 1,
  },
  resumeTitleNew: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F57C00',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  resumeSubtitleNew: {
    fontSize: 18,
    fontWeight: '800',
    color: '#333',
    marginBottom: 4,
  },
  resumeMetaNew: {
    fontSize: 13,
    color: '#666',
  },
  resumeButtonNew: {
    backgroundColor: '#F57C00',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  resumeButtonTextNew: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  resumeProgressContainerNew: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  resumeProgressBarNew: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(245, 124, 0, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  resumeProgressFillNew: {
    height: '100%',
    backgroundColor: '#F57C00',
    borderRadius: 3,
  },
  resumeProgressTextNew: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  newTestCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  testCardHeaderNew: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  testCardIconNew: {
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 12,
    marginRight: 12,
  },
  testCardBadgesNew: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  testCardBadgePrimary: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  testCardBadgeTextPrimary: {
    color: '#4A90E2',
    fontSize: 12,
    fontWeight: '600',
  },
  testCardBadgeSuccess: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  testCardBadgeTextSuccess: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  testCardTitleNew: {
    fontSize: 18,
    fontWeight: '800',
    color: '#333',
    marginBottom: 16,
    lineHeight: 24,
  },
  testCardBottomNew: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  testCardStatsRowNew: {
    flexDirection: 'row',
    gap: 16,
  },
  testCardStatNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statTextGroupNew: {
    flexDirection: 'column',
  },
  statValueNew: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  statLabelNew: {
    fontSize: 11,
    color: '#888',
  },
  startTestButtonNew: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  startTestButtonTextNew: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  topicGridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  topicGridTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111',
  },
  topicGridSort: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  topicGridSortText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
    marginRight: 4,
  },
  topicCardNew: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  topicIconContainerNew: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  topicContentNew: {
    flex: 1,
  },
  topicCardHeaderNewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  topicCardTitleNew: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  topicCardAttemptedNew: {
    fontSize: 12,
    color: '#888',
  },
  topicCardSubtitleNew: {
    fontSize: 13,
    color: '#888',
    marginBottom: 12,
  },
  topicProgressBarContainer: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  topicProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  newTestCardLocked: {
    borderColor: '#FDE68A',
    borderWidth: 1,
  },
  testCardBadgeLocked: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  testCardBadgeTextLocked: {
    color: '#D97706',
    fontSize: 12,
    fontWeight: '700',
  },
  testCardBadgeFree: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  testCardBadgeTextFree: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '700',
  },
  unlockTestButtonNew: {
    backgroundColor: '#D97706',
  },
  unlockTestButtonTextNew: {
    color: '#fff',
    fontWeight: '700',
  },
  premiumListBanner: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#3730A3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  premiumListBannerGradient: {
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  premiumListBannerTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  premiumListBannerTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FBBF24',
    letterSpacing: 0.4,
  },
  premiumListBannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 3,
  },
  premiumListBannerSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.82)',
  },
  premiumListBannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  premiumListBannerButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#3730A3',
  },
  statusFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 8,
  },
  statusFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusFilterChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  statusFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  statusFilterTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  filterButtonNewActive: {
    borderColor: '#4A90E2',
    borderWidth: 1.5,
    backgroundColor: '#EFF6FF',
  },
  testCardBadgeAttempted: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  testCardBadgeTextAttempted: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
  },
  testCardBadgeUnattempted: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  testCardBadgeTextUnattempted: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  actionButtonsRowNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewResultButtonNew: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewResultButtonTextNew: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  retakeTestButtonNew: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retakeTestButtonTextNew: {
    color: '#1D4ED8',
    fontWeight: '700',
    fontSize: 13,
  },
});
