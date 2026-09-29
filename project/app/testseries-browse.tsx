import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Search } from 'lucide-react-native';
import DesktopDashboard from '@/components/DesktopDashboard';
import TestSeriesService, { TestSeries } from '@/services/testseries-service';

export default function TestSeriesBrowseScreen() {
  const [testSeries, setTestSeries] = useState<TestSeries[]>([]);
  const [filteredSeries, setFilteredSeries] = useState<TestSeries[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadTestSeries();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSeries(testSeries);
    } else {
      const filtered = testSeries.filter((series) =>
        series.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSeries(filtered);
    }
  }, [searchQuery, testSeries]);

  const loadTestSeries = async (page: number = 1, append: boolean = false) => {
    try {
      if (page === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      
      const data = await TestSeriesService.fetchTestSeries(page, 20);
      
      const upscSeries = data.testSeries.filter(series => 
        series.title.toLowerCase().includes('upsc')
      );
      
      const newSeries = append ? [...testSeries, ...upscSeries] : upscSeries;
      setTestSeries(newSeries);
      setFilteredSeries(searchQuery ? newSeries.filter((s) =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase())
      ) : newSeries);
      
      setHasMore(data.hasMore);
      setCurrentPage(page);
      setTotalCount(data.total);
    } catch (error) {
      console.error('Error loading test series:', error);
      Alert.alert('Error', 'Failed to load test series');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!isLoadingMore && hasMore && searchQuery === '') {
      loadTestSeries(currentPage + 1, true);
    }
  };

  const handleSeriesPress = (series: TestSeries) => {
    router.push({
      pathname: '/testseries-detail',
      params: {
        seriesId: series.id,
        seriesFolder: series.folderName,
        seriesTitle: series.title,
      },
    });
  };

  const content = (
    <SafeAreaView style={[styles.container, isLargeScreen && { flex: undefined, minHeight: 600 }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        {!isLargeScreen && (
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color="#007AFF" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Test Series</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search test series..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#8E8E93"
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading test series...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredSeries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={filteredSeries.length === 0 ? styles.scrollView : undefined}
          ListHeaderComponent={
            filteredSeries.length > 0 ? (
              <Text style={styles.countText}>
                {filteredSeries.length} of {totalCount} test series • {filteredSeries.reduce((sum, s) => sum + s.totalTests, 0)} tests
              </Text>
            ) : null
          }
          renderItem={({ item: series }) => (
            <TouchableOpacity
              style={styles.seriesCard}
              onPress={() => handleSeriesPress(series)}
            >
              <View style={styles.seriesHeader}>
                <Text style={styles.seriesTitle} numberOfLines={2}>
                  {series.title}
                </Text>
              </View>

              <View style={styles.seriesStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{series.totalSections}</Text>
                  <Text style={styles.statLabel}>Sections</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{series.totalTests}</Text>
                  <Text style={styles.statLabel}>Tests</Text>
                </View>
              </View>

              <View style={styles.seriesFooter}>
                <Text style={styles.exploreText}>Tap to explore →</Text>
              </View>
            </TouchableOpacity>
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No test series found</Text>
                <Text style={styles.emptySubtext}>Try a different search term</Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#667eea" />
                <Text style={styles.loadingMoreText}>Loading more...</Text>
              </View>
            ) : null
          }
        />
      )}
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
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1E',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1C1C1E',
    paddingVertical: 12,
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
  countText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#8E8E93',
    marginBottom: 12,
  },
  seriesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  seriesHeader: {
    marginBottom: 12,
  },
  seriesTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1E',
    lineHeight: 24,
  },
  seriesStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#667eea',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E5EA',
  },
  seriesFooter: {
    marginTop: 8,
  },
  exploreText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#007AFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1E',
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    marginTop: 8,
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingMoreText: {
    marginLeft: 10,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#667eea',
  },
});
