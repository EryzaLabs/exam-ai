import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { TestProgressService, TestResult } from '@/services/test-progress-service';
import {
  ChevronRight,
  Calendar,
  ArrowLeft,
  Search,
  SlidersHorizontal,
  ArrowDown,
  ArrowUp,
  Award,
  CheckCircle2,
} from 'lucide-react-native';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';
import AppShell from '@/components/chalkboard/AppShell';
import Card from '@/components/chalkboard/Card';
import Pill from '@/components/chalkboard/Pill';

export default function TestHistoryScreen() {
  const [history, setHistory] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<
    'date_desc' | 'date_asc' | 'score_desc' | 'score_asc'
  >('date_desc');

  const router = useRouter();
  const { colors, typography, radii } = useChalkboardTheme();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await TestProgressService.getTestHistory();
      setHistory(data || []);
    } catch (err) {
      console.warn('Failed to load test history:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedHistory = useMemo(() => {
    let result = [...history];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((item) =>
        (item.testTitle || '').toLowerCase().includes(query)
      );
    }

    result.sort((a, b) => {
      if (sortOption === 'date_desc') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (sortOption === 'date_asc') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortOption === 'score_desc') {
        return (b.accuracy || 0) - (a.accuracy || 0);
      } else if (sortOption === 'score_asc') {
        return (a.accuracy || 0) - (b.accuracy || 0);
      }
      return 0;
    });

    return result;
  }, [history, searchQuery, sortOption]);

  const toggleSort = () => {
    setSortOption((prev) => {
      if (prev === 'date_desc') return 'date_asc';
      if (prev === 'date_asc') return 'score_desc';
      if (prev === 'score_desc') return 'score_asc';
      return 'date_desc';
    });
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (Platform.OS === 'web' && typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const renderItem = ({ item }: { item: TestResult }) => {
    const accuracy = item.accuracy !== undefined ? Math.round(item.accuracy) : 0;
    const attempted =
      item.sectionAnalytics?.reduce((sum, sec) => sum + (sec.attempted || 0), 0) ||
      (item as any).userAnswers?.filter((a: number) => a !== -1 && a !== undefined)?.length ||
      0;

    const isGood = accuracy >= 50;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.line,
            borderRadius: radii.card,
          },
        ]}
        onPress={() =>
          router.push({
            pathname: '/test-result',
            params: {
              attemptId: item.attemptId,
              testId: item.testId,
              filename: (item as any).filename,
            },
          } as any)
        }
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <Text
            style={[
              styles.title,
              {
                color: colors.text,
                fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
              },
            ]}
            numberOfLines={2}
          >
            {item.testTitle || 'Mock Test'}
          </Text>

          <View style={styles.metaContainer}>
            <View
              style={[
                styles.metaBadge,
                { backgroundColor: colors.surface2, borderColor: colors.line },
              ]}
            >
              <Calendar size={12} color={colors.muted} style={{ marginRight: 4 }} />
              <Text style={[styles.subtitle, { color: colors.muted }]}>
                {new Date(item.date).toLocaleDateString()}
              </Text>
            </View>

            <View
              style={[
                styles.metaBadge,
                {
                  backgroundColor: isGood ? colors.success + '15' : colors.danger + '15',
                  borderColor: isGood ? colors.success + '30' : colors.danger + '30',
                },
              ]}
            >
              <Text
                style={[
                  styles.subtitle,
                  {
                    color: isGood ? colors.success : colors.danger,
                    fontWeight: '700',
                  },
                ]}
              >
                {accuracy}% Accuracy
              </Text>
            </View>

            <View
              style={[
                styles.metaBadge,
                { backgroundColor: colors.surface2, borderColor: colors.line },
              ]}
            >
              <Text style={[styles.subtitle, { color: colors.muted }]}>
                {attempted} Attempted
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.rightSection}>
          <View
            style={[
              styles.scoreCircle,
              {
                borderColor: isGood ? colors.success : colors.danger,
                backgroundColor: colors.surface2,
              },
            ]}
          >
            <Text
              style={[
                styles.scoreText,
                { color: isGood ? colors.success : colors.danger },
              ]}
            >
              {Number((item.overallScore || 0).toFixed(1))}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.muted} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <AppShell maxWidth={760}>
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.line }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <Text
            style={[
              styles.headerTitle,
              {
                color: colors.text,
                fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
              },
            ]}
          >
            Test Attempt History
          </Text>
        </View>

        {/* Filters */}
        <View style={[styles.filtersContainer, { borderBottomColor: colors.line }]}>
          <View
            style={[
              styles.searchBar,
              { backgroundColor: colors.surface2, borderColor: colors.line },
            ]}
          >
            <Search size={16} color={colors.muted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search past attempts..."
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.sortButton,
              {
                backgroundColor: colors.surface2,
                borderColor: colors.line,
                borderRadius: radii.button,
              },
            ]}
            onPress={toggleSort}
            activeOpacity={0.7}
          >
            <SlidersHorizontal size={14} color={colors.text} style={{ marginRight: 6 }} />
            <Text style={[styles.sortButtonText, { color: colors.text }]}>
              {sortOption.includes('date') ? 'Date' : 'Score'}
            </Text>
            {sortOption.includes('desc') ? (
              <ArrowDown size={13} color={colors.text} style={{ marginLeft: 4 }} />
            ) : (
              <ArrowUp size={13} color={colors.text} style={{ marginLeft: 4 }} />
            )}
          </TouchableOpacity>
        </View>

        {/* History List */}
        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <FlatList
            data={filteredAndSortedHistory}
            renderItem={renderItem}
            keyExtractor={(item) => item.attemptId}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.centerContent}>
                <Text style={[styles.emptyText, { color: colors.muted }]}>
                  {searchQuery
                    ? 'No tests found matching your search.'
                    : 'You have not completed any mock tests yet.'}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    padding: 0,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
  },
  cardContent: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 15.5,
    fontWeight: '700',
    marginBottom: 10,
    lineHeight: 22,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  subtitle: {
    fontSize: 12,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scoreCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
  },
});
