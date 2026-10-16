import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Crown, Sparkles, Lock } from 'lucide-react-native';
import TestSeriesService, { Section, Test } from '@/services/testseries-service';
import SSCCGLService from '@/services/ssc-cgl-service';
import userService from '@/services/user-service';

type SectionWithTests = Section & { tests?: Test[] };

export default function TestSeriesDetailScreen() {
  const params = useLocalSearchParams();
  const { seriesFolder, seriesTitle } = params;

  const [sections, setSections] = useState<SectionWithTests[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [loadingTestId, setLoadingTestId] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    loadSections();
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const profile = await userService.getUserProfile();
      setIsSubscribed(!!profile?.isSubscribed);
    } catch (e) {
      console.error('Error checking subscription:', e);
    }
  };

  const loadSections = async () => {
    try {
      setIsLoading(true);
      const series = await TestSeriesService.fetchAllTestSeries();
      const currentSeries = series.find((s) => s.folderName === seriesFolder);
      
      if (currentSeries) {
        setSections(currentSeries.sections);
      }
    } catch (error) {
      console.error('Error loading sections:', error);
      Alert.alert('Error', 'Failed to load sections');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = async (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
      
      // Load tests for this section if not already loaded
      const section = sections.find(s => s.id === sectionId || s.folderName === sectionId);
      if (section && !section.tests) {
        try {
          const { tests } = await TestSeriesService.fetchSectionTests(
            seriesFolder as string,
            section.folderName
          );
          setSections(prev => prev.map(s => 
            (s.id === sectionId || s.folderName === sectionId) ? { ...s, tests } : s
          ));
        } catch (error) {
          console.error('Error loading section tests:', error);
          Alert.alert('Error', 'Failed to load tests for this section');
        }
      }
    }
    setExpandedSections(newExpanded);
  };

  const handleTestPress = async (sectionFolder: string, test: Test, isLocked: boolean = false) => {
    if (isLocked) {
      router.push('/premium');
      return;
    }

    try {
      setLoadingTestId(test.id);

      // Fetch the test paper
      const testPaper = await TestSeriesService.fetchTestPaper(
        seriesFolder as string,
        sectionFolder,
        test.id
      );

      // Check if answers exist, if not trigger generation NOW (before test starts)
      const testFilePath = `testseries/${seriesFolder}/${sectionFolder}/${test.id}.json.gz`;
      TestSeriesService.checkAnswerGenerationStatus(test.id)
        .then((status) => {
          if (!status.answersAvailable && status.status === 'not-found') {
            console.log('Answers not available, starting generation in background...');
            // Trigger generation in background (non-blocking)
            TestSeriesService.requestAnswerGeneration(test.id, testFilePath)
              .then(() => console.log('Answer generation started for', test.id))
              .catch((err) => console.error('Failed to start answer generation:', err));
          } else {
            console.log('Answers already available or being generated:', status.status);
          }
        })
        .catch((err) => console.error('Failed to check answer status:', err));

      // Store test paper in SSC CGL service
      // The testPaper already has the correct format from server
      console.log('Storing test paper with ID:', testPaper.data?._id || testPaper._id, 'Expected:', test.id);
      await SSCCGLService.storePaperInMemory(testPaper);

      // Navigate to test - use the ID from the stored paper
      const storedId = testPaper.data?._id || testPaper._id || test.id;
      console.log('Navigating to test with ID:', storedId);
      
      router.push({
        pathname: '/mock-test',
        params: {
          testId: storedId,
          source: 'testseries',
          seriesFolder: seriesFolder,
          sectionFolder: sectionFolder,
        },
      });
    } catch (error) {
      console.error('Error starting test:', error);
      Alert.alert('Error', 'Failed to start test: ' + (error as any).message);
    } finally {
      setLoadingTestId(null);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading sections...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {seriesTitle}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        {!isSubscribed && (
          <TouchableOpacity
            style={styles.premiumBanner}
            onPress={() => router.push('/premium')}
            activeOpacity={0.9}
          >
            <View style={{ flex: 1, marginRight: 12 }}>
              <View style={styles.premiumBannerTag}>
                <Crown size={12} color="#F59E0B" />
                <Text style={styles.premiumBannerTagText}>SPECIAL PASS • ₹499</Text>
              </View>
              <Text style={styles.premiumBannerTitle}>Unlock All Tests in This Series</Text>
              <Text style={styles.premiumBannerSubtitle}>
                Get unlimited attempts, bilingual solutions & performance rank
              </Text>
            </View>
            <View style={styles.premiumBannerBtn}>
              <Text style={styles.premiumBannerBtnText}>Upgrade</Text>
            </View>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionCountText}>
          {sections.length} sections • {sections.reduce((sum, s) => sum + s.availableTests, 0)} tests
        </Text>

        {sections.map((section, sectionIndex) => (
          <View key={section.id} style={styles.sectionCard}>
            <TouchableOpacity
              onPress={() => toggleSection(section.id)}
              style={styles.sectionHeader}
            >
              <View style={styles.sectionHeaderContent}>
                <Text style={styles.sectionTitle} numberOfLines={2}>
                  {section.title}
                </Text>
                <Text style={styles.sectionTestCount}>
                  {section.availableTests || section.tests?.length || 0} tests
                </Text>
              </View>
              <Text style={styles.expandIcon}>
                {expandedSections.has(section.id) ? '▼' : '▶'}
              </Text>
            </TouchableOpacity>

            {expandedSections.has(section.id) && section.tests && section.tests.length > 0 && (
              <View style={styles.testsContainer}>
                {section.tests.slice(0, 10).map((test, testIndex) => {
                  const isLocked = !isSubscribed && (sectionIndex > 0 || testIndex > 0);
                  return (
                    <TouchableOpacity
                      key={test.id}
                      style={[styles.testItem, isLocked && styles.testItemLocked]}
                      onPress={() => handleTestPress(section.folderName || section.id, test, isLocked)}
                      disabled={loadingTestId === test.id}
                    >
                      <View style={styles.testInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                          {isLocked ? (
                            <View style={styles.badgeLocked}>
                              <Text style={styles.badgeLockedText}>🔒 Premium</Text>
                            </View>
                          ) : !isSubscribed && sectionIndex === 0 && testIndex === 0 ? (
                            <View style={styles.badgeFree}>
                              <Text style={styles.badgeFreeText}>✨ Free Demo</Text>
                            </View>
                          ) : null}
                          <Text style={styles.testTitle} numberOfLines={2}>
                            {test.title}
                          </Text>
                        </View>
                        {test.description && (
                          <Text style={styles.testDescription} numberOfLines={1}>
                            {test.description}
                          </Text>
                        )}
                        <View style={styles.testMeta}>
                          {test.questionCount && (
                            <Text style={styles.testMetaText}>
                              {test.questionCount} Qs
                            </Text>
                          )}
                          {test.duration && (
                            <Text style={styles.testMetaText}>• {test.duration} min</Text>
                          )}
                          {test.totalMark && (
                            <Text style={styles.testMetaText}>• {test.totalMark} marks</Text>
                          )}
                        </View>
                      </View>
                      {loadingTestId === test.id ? (
                        <ActivityIndicator size="small" color="#667eea" />
                      ) : isLocked ? (
                        <View style={styles.unlockButton}>
                          <Text style={styles.unlockButtonText}>🔒 Unlock</Text>
                        </View>
                      ) : (
                        <View style={styles.startButton}>
                          <Text style={styles.startButtonText}>
                            {!isSubscribed && sectionIndex === 0 && testIndex === 0 ? 'Free Demo' : 'Start'}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
                {section.tests.length > 10 && (
                  <Text style={styles.moreTestsText}>
                    +{section.tests.length - 10} more tests available
                  </Text>
                )}
              </View>
            )}
          </View>
        ))}

        {sections.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No sections found</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1E',
    marginHorizontal: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionCountText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#8E8E93',
    marginVertical: 12,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  sectionHeaderContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  sectionTestCount: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  expandIcon: {
    fontSize: 16,
    color: '#667eea',
    marginLeft: 12,
  },
  testsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  testItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  testInfo: {
    flex: 1,
  },
  testTitle: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  testDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    marginBottom: 4,
  },
  testMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  testMetaText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  startButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 12,
  },
  startButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  moreTestsText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#667eea',
    textAlign: 'center',
    paddingVertical: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  premiumBanner: {
    backgroundColor: '#1E1B4B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  premiumBannerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  premiumBannerTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FBBF24',
  },
  premiumBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  premiumBannerSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  premiumBannerBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  premiumBannerBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  testItemLocked: {
    backgroundColor: '#FFFBEB',
  },
  badgeLocked: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6,
  },
  badgeLockedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  badgeFree: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6,
  },
  badgeFreeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  unlockButton: {
    backgroundColor: '#D97706',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 12,
  },
  unlockButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
