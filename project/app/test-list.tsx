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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
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
import { auth } from '@/services/firebaseConfig';

const { width } = Dimensions.get('window');

// Interface matching the server response for list items
interface ServerPaper {
    id: string; // filename
    title: string;
    filename: string;
    hasAnswers: boolean;
}

export default function TestListScreen() {
  const [tests, setTests] = useState<ServerPaper[]>([]);
  const [filteredTests, setFilteredTests] = useState<ServerPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTestId, setLoadingTestId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [activeTest, setActiveTest] = useState<SavedTestState | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    loadTests();
    loadActiveTest();
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    const profile = await userService.getUserProfile();
    if (profile?.isSubscribed) {
      setIsSubscribed(true);
    }
  };

  useEffect(() => {
    filterTests();
  }, [searchQuery, selectedYear, tests]);

  const loadActiveTest = async () => {
    const saved = await TestProgressService.getCurrentTest();
    setActiveTest(saved);
  };

  const activeTestTitle = useMemo(() => {
      if (!activeTest) return '';
      const t = tests.find(t => t.id === activeTest.testId);
      return t ? t.title : 'Unfinished Test';
  }, [activeTest, tests]);

  const handleRefresh = () => {
      loadTests();
      loadActiveTest();
      checkSubscription();
  };

  const handlePayment = () => {
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

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (test) =>
          test.title.toLowerCase().includes(query)
      );
    }

    // Filter by year
    // Note: We need to extract year from title since PaperDefinition doesn't have metadata prop yet
    if (selectedYear) {
      filtered = filtered.filter((test) => test.title.includes(selectedYear.toString()));
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
        pathname: '/mock-test',
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
    // Defaults for listing
    const duration = 60 * 60; // 60s * 60m = 1 hour
    const totalQuestions = 100;
    const totalMarks = 200;

    return (
      <TouchableOpacity
        style={styles.testCard}
        onPress={() => handleTestSelect(test)}
        activeOpacity={0.7}
        disabled={!!loadingTestId}
      >
        <LinearGradient
          colors={['#4A90E2', '#357ABD']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.testCardGradient, { opacity: loadingTestId === test.id ? 0.7 : 1 }]}
        >
          {loadingTestId === test.id && (
            <ActivityIndicator color="white" style={{position: 'absolute', top: 10, right: 10}} />
          )}
          <View style={styles.testCardHeader}>
            <View style={styles.testCardIcon}>
              <FileText size={24} color="#fff" />
            </View>
            <View style={styles.testCardBadge}>
              <Text style={styles.testCardBadgeText}>UPSC Principal</Text>
            </View>
             {test.hasAnswers && (
                <View style={[styles.testCardBadge, {backgroundColor: 'rgba(255,255,255,0.3)', marginLeft: 8}]}>
                  <Text style={styles.testCardBadgeText}>With Solutions</Text>
                </View>
             )}
          </View>

          <Text style={styles.testCardTitle} numberOfLines={2}>
            {test.title}
          </Text>

          {/* 
          <View style={styles.testCardMeta}>
             Meta data extracted from title is tricky without parsing, skipping for now
          </View> 
          */}

          <View style={styles.testCardStats}>
            <View style={styles.testCardStat}>
              <BookOpen size={18} color="#fff" />
              <Text style={styles.testCardStatText}>{totalQuestions} Qs</Text>
            </View>
            <View style={styles.testCardStat}>
              <Clock size={18} color="#fff" />
              <Text style={styles.testCardStatText}>{formatDuration(duration)}</Text>
            </View>
            <View style={styles.testCardStat}>
              <Award size={18} color="#fff" />
              <Text style={styles.testCardStatText}>{totalMarks} Marks</Text>
            </View>
          </View>

          <View style={styles.testCardFooter}>
            <Text style={styles.testCardSections}>
              4 Sections
            </Text>
            <View style={styles.testCardAction}>
              <Text style={styles.testCardActionText}>
                 {loadingTestId === test.id ? 'Loading...' : (isSubscribed ? 'Start Test' : 'Unlock - ₹500')}
              </Text>
              {isSubscribed ? <ChevronRight size={18} color="#fff" /> : <Text style={{color: '#fff', fontSize: 16}}>🔒</Text>}
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderResumeCard = () => {
    if (!activeTest) return null;
    
    return (
       <TouchableOpacity
        style={styles.resumeCard} 
        onPress={() => router.push({ pathname: '/mock-test', params: { testId: activeTest.testId, resume: 'true' } })}
        activeOpacity={0.9}
       >
           <LinearGradient colors={['#FF9800', '#F57C00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.resumeGradient}>
               <View style={styles.resumeContent}>
                   <View style={styles.resumeIcon}>
                       <PlayCircle color="#fff" size={32} />
                   </View>
                   <View style={styles.resumeInfo}>
                       <Text style={styles.resumeTitle}>Resume Test</Text>
                       <Text style={styles.resumeSubtitle} numberOfLines={1}>
                            {activeTestTitle || 'Continue your previous attempt'}
                       </Text>
                       <Text style={styles.resumeMeta}>
                           {activeTest.currentQuestionIndex + 1} questions attempted • {Math.floor(activeTest.timeRemaining / 60)}m left
                       </Text>
                   </View>
               </View>
               <ChevronRight color="#fff" size={24} />
           </LinearGradient>
       </TouchableOpacity>
    );
  };

  const renderYearFilters = () => {
    const years = getUniqueYears();
    if (years.length === 0) return null;

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.yearFilters}
        contentContainerStyle={styles.yearFiltersContent}
      >
        <TouchableOpacity
          style={[styles.yearFilterButton, !selectedYear && styles.yearFilterButtonActive]}
          onPress={() => setSelectedYear(null)}
        >
          <Text
            style={[
              styles.yearFilterButtonText,
              !selectedYear && styles.yearFilterButtonTextActive,
            ]}
          >
            All Years
          </Text>
        </TouchableOpacity>
        {years.map((year) => (
          <TouchableOpacity
            key={year}
            style={[
              styles.yearFilterButton,
              selectedYear === year && styles.yearFilterButtonActive,
            ]}
            onPress={() => setSelectedYear(year)}
          >
            <Text
              style={[
                styles.yearFilterButtonText,
                selectedYear === year && styles.yearFilterButtonTextActive,
              ]}
            >
              {year}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={['#4A90E2', '#357ABD']} style={styles.header}>
        <View style={styles.headerTop}>
            <View style={{flex: 1}}>
                <Text style={styles.headerTitle}>UPSC Principal Mock Tests</Text>
                <Text style={styles.headerSubtitle}>
                {filteredTests.length} test{filteredTests.length !== 1 ? 's' : ''} available
                </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/test-history')} style={styles.historyButton}>
                <History color="#fff" size={24} />
            </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tests..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {/* Year Filters */}
      {renderYearFilters()}

      {/* Test List */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} colors={['#4A90E2']} />
        }
      >
        {renderResumeCard()}

        {filteredTests.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No tests found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery || selectedYear
                ? 'Try adjusting your search or filters'
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
  yearFilters: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    maxHeight: 56,
  },
  yearFiltersContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  yearFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearFilterButtonActive: {
    backgroundColor: '#4A90E2',
  },
  yearFilterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  yearFilterButtonTextActive: {
    color: '#fff',
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
  resumeMeta: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.8)',
      fontWeight: '600',
  },
});
