import React, { useState, useEffect, useMemo } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
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
} from 'lucide-react-native';
import SSCCGLService, { ParsedMockTest } from '@/services/ssc-cgl-service';
import { TestProgressService, SavedTestState } from '@/services/test-progress-service';
import userService from '@/services/user-service';
import { initiatePayment } from '@/utils/razorpay';
import { useAuth } from '@/context/auth-context';

const { width } = Dimensions.get('window');

// Interface matching the server response for list items
interface ServerPaper {
    id: string; // filename
    title: string;
    filename: string;
    hasAnswers: boolean;
}

export default function TestListScreen({ isTab = false }: { isTab?: boolean }) {
  const [tests, setTests] = useState<ServerPaper[]>([]);
  const [filteredTests, setFilteredTests] = useState<ServerPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTestId, setLoadingTestId] = useState<string | null>(null);
  const { q } = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState(typeof q === 'string' ? q : '');
  const [category, setCategory] = useState<'all' | 'full' | 'topic'>('all');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [activeTests, setActiveTests] = useState<SavedTestState[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const { user } = useAuth();

  const { width: windowWidth } = useWindowDimensions();
  const isLargeScreen = windowWidth >= 1024;

  useEffect(() => {
    loadTests();
    loadActiveTest();
  }, []);

  useEffect(() => {
    if (user !== undefined) {
      checkSubscription();
    }
  }, [user]);

  const checkSubscription = async () => {
    const profile = await userService.getUserProfile(user?.uid);
    if (profile?.isSubscribed) {
      setIsSubscribed(true);
    } else {
      setIsSubscribed(false);
    }
  };

  useEffect(() => {
    filterTests();
  }, [searchQuery, category, selectedTopic, tests]);

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

  const loadActiveTest = async () => {
    const saved = await TestProgressService.getSavedTests();
    setActiveTests(saved);
  };

  // Not needed globally, we compute it per test in render

  const handleRefresh = () => {
      loadTests();
      loadActiveTest();
      checkSubscription();
  };

  const handlePayment = () => {
    // We allow guests to purchase via local AsyncStorage caching
    setPaymentLoading(true);
    initiatePayment(
      async () => {
        // On success
        await userService.setSubscriptionStatus(true);
        setIsSubscribed(true);
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
    if (!isSubscribed) {
      handlePayment();
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

    return (
      <TouchableOpacity
        style={styles.newTestCard}
        onPress={() => handleTestSelect(test)}
        activeOpacity={0.7}
        disabled={!!loadingTestId}
      >
        <View style={styles.testCardHeaderNew}>
          <View style={styles.testCardIconNew}>
             <FileText size={24} color="#4A90E2" />
          </View>
          <View style={styles.testCardBadgesNew}>
            <View style={styles.testCardBadgePrimary}>
              <Text style={styles.testCardBadgeTextPrimary}>UPSC Principal</Text>
            </View>
            {test.hasAnswers && (
              <View style={styles.testCardBadgeSuccess}>
                <BookOpen size={12} color="#4CAF50" style={{marginRight: 4}} />
                <Text style={styles.testCardBadgeTextSuccess}>With Solutions</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.testCardTitleNew} numberOfLines={2}>
          {test.title}
        </Text>

        <View style={styles.testCardBottomNew}>
           <View style={styles.testCardStatsRowNew}>
             <View style={styles.testCardStatNew}>
                <HelpCircle size={18} color="#666" style={{marginBottom: 4}} />
                <View style={styles.statTextGroupNew}>
                  <Text style={styles.statValueNew}>{totalQuestions}</Text>
                  <Text style={styles.statLabelNew}>Questions</Text>
                </View>
             </View>
             <View style={styles.testCardStatNew}>
                <Clock size={18} color="#666" style={{marginBottom: 4}} />
                <View style={styles.statTextGroupNew}>
                  <Text style={styles.statValueNew}>{formatDuration(duration)}</Text>
                  <Text style={styles.statLabelNew}>Duration</Text>
                </View>
             </View>
             <View style={styles.testCardStatNew}>
                <Award size={18} color="#666" style={{marginBottom: 4}} />
                <View style={styles.statTextGroupNew}>
                  <Text style={styles.statValueNew}>{totalMarks}</Text>
                  <Text style={styles.statLabelNew}>Marks</Text>
                </View>
             </View>
           </View>
           
           <TouchableOpacity 
             style={styles.startTestButtonNew}
             onPress={() => handleTestSelect(test)}
             disabled={!!loadingTestId}
           >
             <Text style={styles.startTestButtonTextNew}>
                {loadingTestId === test.id ? 'Loading' : (isSubscribed ? 'Start Test' : 'Unlock')}
             </Text>
             {isSubscribed ? <ArrowRight size={16} color="#fff" style={{marginLeft: 4}} /> : <Text style={{color: '#fff', fontSize: 12, marginLeft: 4}}>🔒</Text>}
           </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderResumeCards = () => {
    if (activeTests.length === 0) return null;
    
    return activeTests.map(testState => {
      const t = tests.find(x => x.id === testState.testId);
      const title = t ? t.title : 'Unfinished Test';

      return (
         <TouchableOpacity
          key={testState.testId}
          style={styles.resumeCardNew} 
          onPress={() => router.push({ pathname: '/mock-test', params: { testId: testState.testId, resume: 'true' } })}
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
                             {testState.currentQuestionIndex + 1} questions attempted • {Math.floor(testState.timeRemaining / 60)}m left
                         </Text>
                     </View>
                     <View style={styles.resumeButtonNew}>
                         <Text style={styles.resumeButtonTextNew}>Resume</Text>
                         <ArrowRight color="#fff" size={16} style={{marginLeft: 4}} />
                     </View>
                 </View>
                 <View style={styles.resumeProgressContainerNew}>
                    <View style={styles.resumeProgressBarNew}>
                       <View style={[styles.resumeProgressFillNew, { width: '10%' }]} />
                    </View>
                    <Text style={styles.resumeProgressTextNew}>10%</Text>
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
        style={styles.categoryTabs}
        contentContainerStyle={styles.categoryTabsContent}
      >
        <TouchableOpacity
          style={[styles.categoryTab, category === 'all' && styles.categoryTabActive]}
          onPress={() => { setCategory('all'); setSelectedTopic(null); }}
        >
          <LayoutGrid size={16} color={category === 'all' ? '#fff' : '#666'} style={{marginRight: 6}} />
          <Text style={[styles.categoryTabText, category === 'all' && styles.categoryTabTextActive]}>All Tests</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.categoryTab, category === 'full' && styles.categoryTabActive]}
          onPress={() => { setCategory('full'); setSelectedTopic(null); }}
        >
          <FileText size={16} color={category === 'full' ? '#fff' : '#666'} style={{marginRight: 6}} />
          <Text style={[styles.categoryTabText, category === 'full' && styles.categoryTabTextActive]}>Full Mocks</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.categoryTab, category === 'topic' && styles.categoryTabActive]}
          onPress={() => setCategory('topic')}
        >
          <BookOpen size={16} color={category === 'topic' ? '#fff' : '#666'} style={{marginRight: 6}} />
          <Text style={[styles.categoryTabText, category === 'topic' && styles.categoryTabTextActive]}>Topic Wise</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const getTopicColor = (index: number) => {
    const colors = [
      { bg: '#E3F2FD', icon: '#1976D2' },
      { bg: '#E8F5E9', icon: '#388E3C' },
      { bg: '#F3E5F5', icon: '#7B1FA2' },
      { bg: '#FFEBEE', icon: '#D32F2F' },
      { bg: '#FFF3E0', icon: '#F57C00' },
    ];
    return colors[index % colors.length];
  };

  const renderTopicGrid = () => {
    return (
      <View style={styles.topicGrid}>
        <View style={styles.topicGridHeader}>
          <Text style={styles.topicGridTitle}>Topics</Text>
          <View style={styles.topicGridSort}>
             <Text style={styles.topicGridSortText}>Sort: Default</Text>
             <ChevronRight size={16} color="#666" style={{transform: [{rotate: '90deg'}]}} />
          </View>
        </View>

        {uniqueTopics.map((topic, index) => {
          const count = tests.filter(t => getTopicFromFilename(t.filename) === topic).length;
          if (searchQuery && !topic.toLowerCase().includes(searchQuery.toLowerCase())) return null;
          
          const theme = getTopicColor(index);
          const attempted = 0; // Hardcoded for demo
          const progress = count > 0 ? (attempted / count) * 100 : 0;

          return (
            <TouchableOpacity
              key={topic}
              style={styles.topicCardNew}
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
                  <Text style={styles.topicCardTitleNew}>{topic}</Text>
                  <Text style={styles.topicCardAttemptedNew}>{attempted}/{count} attempted</Text>
                </View>
                <Text style={styles.topicCardSubtitleNew}>{count} Tests</Text>
                
                <View style={styles.topicProgressBarContainer}>
                   <View style={[styles.topicProgressBarFill, { width: `${progress}%`, backgroundColor: theme.icon }]} />
                </View>
              </View>
              
              <ChevronRight size={20} color="#ccc" style={{marginLeft: 12}} />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading tests...</Text>
      </View>
    );
  }

  const content = (
    <SafeAreaView style={[styles.container, isLargeScreen && { flex: undefined, minHeight: 600 }]} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={['#4A90E2', '#357ABD']} style={styles.headerNew}>
        <View style={styles.headerTopNew}>
            {!isTab && (
              <TouchableOpacity onPress={() => router.back()} style={{marginRight: 16, marginTop: 6}}>
                <ArrowLeft size={24} color="#fff" />
              </TouchableOpacity>
            )}
            <View style={{flex: 1}}>
                <Text style={styles.headerTitleNew}>UPSC Principal{'\n'}Mock Tests</Text>
                <Text style={styles.headerSubtitleNew}>
                {filteredTests.length} tests available  •  Practice by topic
                </Text>
            </View>
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainerNew}>
        <View style={styles.searchBarNew}>
          <Search size={20} color="#666" />
          <TextInput
            style={styles.searchInputNew}
            placeholder="Search tests, topics..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>
        <TouchableOpacity style={styles.filterButtonNew}>
           <SlidersHorizontal size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Category Tabs */}
      {renderCategoryTabs()}

      {/* Selected Topic Header */}
      {category === 'topic' && selectedTopic && (
        <View style={styles.selectedTopicHeader}>
          <TouchableOpacity onPress={() => setSelectedTopic(null)} style={styles.backButton}>
            <ArrowLeft size={20} color="#4A90E2" />
            <Text style={styles.backButtonText}>All Topics</Text>
          </TouchableOpacity>
          <Text style={styles.selectedTopicTitle}>{selectedTopic}</Text>
        </View>
      )}

      {/* Test List */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} colors={['#4A90E2']} />
        }
      >
        {renderResumeCards()}

        {category === 'topic' && !selectedTopic ? (
          renderTopicGrid()
        ) : filteredTests.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No tests found</Text>
            <Text style={styles.emptyStateText}>
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
});
