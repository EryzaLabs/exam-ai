import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import DesktopDashboard from '@/components/DesktopDashboard';
import {
  ArrowLeft,
  Crown,
  Sparkles,
  Clock,
  BookOpen,
  Search,
  Check,
  CheckCircle2,
  Circle,
  SlidersHorizontal,
  Layers,
  Zap,
  Award,
  AlertCircle,
  Filter,
  X,
  Play,
  RotateCcw,
  Brain,
  ChevronRight,
  Sun,
  Moon,
  Tag,
} from 'lucide-react-native';
import SSCCGLService from '@/services/ssc-cgl-service';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';

interface TopicItem {
  id: string;
  name: string;
  category: string;
  questionCount: number;
  testCount: number;
}

const QUESTION_COUNT_PRESETS = [10, 20, 30, 50, 100, 120];
const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

export default function CustomTestScreen() {
  const { user, isSubscribed: authSubscribed, isSubscriptionLoading } = useAuth();
  const isSubscribed = authSubscribed;
  const { isDark, colors, toggleTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Configuration options
  const [questionCount, setQuestionCount] = useState<number>(30);
  const [customQuestionCount, setCustomQuestionCount] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [customDurationMinutes, setCustomDurationMinutes] = useState<string>('');
  const [testTitle, setTestTitle] = useState<string>('');

  const [isGenerating, setIsGenerating] = useState(false);

  const { width: windowWidth } = useWindowDimensions();
  const isLargeScreen = windowWidth >= 1024;

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    try {
      setLoading(true);
      const data = await SSCCGLService.fetchCustomTopics();
      if (data && data.topics) {
        setTopics(data.topics);
        setCategories(data.categories || ['All']);
      }
    } catch (error) {
      console.error('Failed to load custom test topics:', error);
      Alert.alert('Error', 'Failed to load topic catalog. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const filteredTopics = useMemo(() => {
    return topics.filter((t) => {
      const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [topics, selectedCategory, searchQuery]);

  const totalPoolQuestions = useMemo(() => {
    if (selectedTopics.length === 0) {
      return topics.reduce((sum, t) => sum + (t.questionCount || 0), 0);
    }
    return topics
      .filter((t) => selectedTopics.includes(t.id))
      .reduce((sum, t) => sum + (t.questionCount || 0), 0);
  }, [topics, selectedTopics]);

  const toggleTopic = (topicId: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]
    );
  };

  const selectAllFiltered = () => {
    const filteredIds = filteredTopics.map((t) => t.id);
    setSelectedTopics((prev) => Array.from(new Set([...prev, ...filteredIds])));
  };

  const clearSelection = () => {
    setSelectedTopics([]);
  };

  const effectiveQuestionCount = useMemo(() => {
    if (customQuestionCount.trim()) {
      const parsed = parseInt(customQuestionCount.trim(), 10);
      if (!isNaN(parsed) && parsed > 0) return Math.min(120, Math.max(5, parsed));
    }
    return questionCount;
  }, [questionCount, customQuestionCount]);

  const effectiveDurationMinutes = useMemo(() => {
    if (customDurationMinutes.trim()) {
      const parsed = parseInt(customDurationMinutes.trim(), 10);
      if (!isNaN(parsed) && parsed > 0) return Math.min(180, Math.max(5, parsed));
    }
    return durationMinutes;
  }, [durationMinutes, customDurationMinutes]);

  // Dynamic professional test title preview / fallback
  const suggestedDefaultTitle = useMemo(() => {
    if (selectedTopics.length === 1) {
      const single = topics.find((t) => t.id === selectedTopics[0]);
      return single ? `${single.name} • Practice Set (${effectiveQuestionCount} Qs)` : `Topic Practice (${effectiveQuestionCount} Qs)`;
    }
    if (selectedTopics.length > 1 && selectedTopics.length <= 3) {
      const names = selectedTopics.map((id) => topics.find((t) => t.id === id)?.name || id).join(' & ');
      return `${names} • Practice Set (${effectiveQuestionCount} Qs)`;
    }
    if (selectedTopics.length > 3) {
      return `Custom Mock (${selectedTopics.length} Topics • ${effectiveQuestionCount} Qs • ${effectiveDurationMinutes}m)`;
    }
    return `UPSC & UP Principal Comprehensive Mock (${effectiveQuestionCount} Qs • ${effectiveDurationMinutes}m)`;
  }, [selectedTopics, topics, effectiveQuestionCount, effectiveDurationMinutes]);

  const titleSuggestions = useMemo(() => {
    const list: string[] = [];
    if (selectedTopics.length === 1) {
      const single = topics.find((t) => t.id === selectedTopics[0]);
      if (single) {
        list.push(`${single.name} • Intensive Practice`);
        list.push(`${single.name} • Speed Test (${effectiveQuestionCount} Qs)`);
      }
    } else if (selectedTopics.length > 1) {
      list.push(`Custom Multi-Topic Drill (${selectedTopics.length} Topics)`);
      list.push(`Targeted Revision Exam (${effectiveQuestionCount} Qs)`);
    } else {
      list.push(`UPSC & UP Principal Full Mock (${effectiveQuestionCount} Qs)`);
      list.push(`UP Principal Targeted Practice (${effectiveDurationMinutes}m)`);
      list.push(`UPSC Principal CBT Simulation (${effectiveQuestionCount} Qs)`);
    }
    list.push(`Executive Principal Exam Drill • Set 1`);
    return list;
  }, [selectedTopics, topics, effectiveQuestionCount, effectiveDurationMinutes]);

  const handleCreateTest = async () => {
    if (!isSubscribed) {
      router.push('/premium');
      return;
    }

    try {
      setIsGenerating(true);

      const targetTopics = selectedTopics.length > 0 ? selectedTopics : ['all'];
      const finalTitle = testTitle.trim() || suggestedDefaultTitle;

      const response = await SSCCGLService.createCustomTest({
        topics: targetTopics,
        questionCount: effectiveQuestionCount,
        durationMinutes: effectiveDurationMinutes,
        title: finalTitle,
      });

      if (!response.success || !response.paper) {
        throw new Error('Failed to generate test questions');
      }

      // Pre-load into service memory
      await SSCCGLService.loadPaper(response.paper, undefined, response.filename);

      // Navigate to mock test runner
      router.replace({
        pathname: '/mock-test',
        params: {
          testId: response.testId,
          filename: response.filename,
        },
      });
    } catch (error: any) {
      console.error('Failed to create custom test:', error);
      Alert.alert('Test Creation Failed', error.message || 'Could not generate custom test. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (Platform.OS === 'web' && typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      router.replace('/(tabs)/practice');
    }
  };

  // If loading subscription status or topics initially
  if (isSubscriptionLoading || loading) {
    const loadingView = (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading Custom Test Studio...</Text>
      </View>
    );

    if (isLargeScreen) {
      return <DesktopDashboard>{loadingView}</DesktopDashboard>;
    }

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {loadingView}
      </SafeAreaView>
    );
  }

  // 1. LOCKED VIEW: User is not subscribed
  if (!isSubscribed) {
    const lockedView = (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleBack} style={[styles.backButton, { backgroundColor: isDark ? colors.surfaceHighlight : '#F1F5F9' }]}>
            <ArrowLeft size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Custom Test Studio</Text>
          <TouchableOpacity
            style={[styles.themeToggleButton, { backgroundColor: isDark ? colors.surfaceHighlight : '#F1F5F9', borderColor: colors.border }]}
            onPress={toggleTheme}
            accessibilityLabel="Toggle Dark Mode"
          >
            {isDark ? <Sun size={18} color="#FBBF24" /> : <Moon size={18} color="#475569" />}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.lockedScrollContent} showsVerticalScrollIndicator={false}>
          {/* Hero Lock Card */}
          <LinearGradient
            colors={['#1E1B4B', '#312E81', '#4338CA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.lockedHeroCard}
          >
            <View style={styles.lockedCrownBadge}>
              <Crown size={32} color="#F59E0B" />
            </View>
            <Text style={styles.lockedHeroTitle}>Premium Feature</Text>
            <Text style={styles.lockedHeroSubtitle}>
              Design bespoke mock tests tailored to your preparation strategy with our Custom Test Builder.
            </Text>

            <View style={styles.lockedPerksList}>
              <View style={styles.lockedPerkItem}>
                <Sparkles size={18} color="#FBBF24" />
                <Text style={styles.lockedPerkText}>Select from all 36 syllabus topics (NEP, POCSO, CBSE, etc.)</Text>
              </View>
              <View style={styles.lockedPerkItem}>
                <Clock size={18} color="#FBBF24" />
                <Text style={styles.lockedPerkText}>Choose custom duration (15m to 180m)</Text>
              </View>
              <View style={styles.lockedPerkItem}>
                <Layers size={18} color="#FBBF24" />
                <Text style={styles.lockedPerkText}>Choose exact question counts (10 to 120 questions)</Text>
              </View>
              <View style={styles.lockedPerkItem}>
                <Award size={18} color="#FBBF24" />
                <Text style={styles.lockedPerkText}>Bilingual questions, AI analytics & solutions</Text>
              </View>
            </View>

            {/* Promo Code Note */}
            <View style={styles.couponTipBox}>
              <Zap size={16} color="#34D399" />
              <Text style={styles.couponTipText}>
                Have a promo or coupon code? Enter it on the Premium page to unlock immediate access!
              </Text>
            </View>

            <TouchableOpacity
              style={styles.unlockButton}
              activeOpacity={0.9}
              onPress={() => router.push('/premium')}
            >
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.unlockButtonGradient}
              >
                <Crown size={20} color="#FFFFFF" />
                <Text style={styles.unlockButtonText}>Unlock Premium Access</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </ScrollView>
      </SafeAreaView>
    );

    if (isLargeScreen) {
      return <DesktopDashboard disableScroll={false}>{lockedView}</DesktopDashboard>;
    }
    return lockedView;
  }

  // 2. UNLOCKED VIEW: Premium Member Builder
  const builderView = (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top App Bar */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={handleBack}
          style={[styles.backButton, { backgroundColor: isDark ? colors.surfaceHighlight : '#F1F5F9' }]}
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Custom Test Builder</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Design your personalized practice session</Text>
        </View>

        {/* Theme Toggle Button */}
        <TouchableOpacity
          style={[styles.themeToggleButton, { backgroundColor: isDark ? colors.surfaceHighlight : '#F1F5F9', borderColor: colors.border }]}
          onPress={toggleTheme}
          accessibilityLabel="Toggle Dark Mode"
        >
          {isDark ? <Sun size={18} color="#FBBF24" /> : <Moon size={18} color="#475569" />}
        </TouchableOpacity>

        <View style={[styles.premiumPill, isDark && { backgroundColor: 'rgba(245, 158, 11, 0.2)', borderColor: 'rgba(245, 158, 11, 0.4)', borderWidth: 1 }]}>
          <Crown size={12} color="#F59E0B" />
          <Text style={[styles.premiumPillText, isDark && { color: '#FDE68A' }]}>PREMIUM</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Universal AI Generator Promo Banner */}
        <TouchableOpacity
          style={styles.aiPromoBanner}
          activeOpacity={0.88}
          onPress={() => router.push('/custom-ai-test')}
        >
          <LinearGradient
            colors={['#1E1B4B', '#3730A3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.aiPromoGradient}
          >
            <View style={styles.aiPromoIconBox}>
              <Brain size={22} color="#FBBF24" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.aiPromoTitle}>Test ANY topic in the world</Text>
                <Sparkles size={14} color="#FBBF24" />
              </View>
              <Text style={styles.aiPromoSubtitle}>
                Try Custom AI Test Studio (1 free test per day)
              </Text>
            </View>
            <ChevronRight size={18} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Step 1: Topics Selection */}
        <View style={[styles.sectionContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.stepBadge, { backgroundColor: isDark ? '#312E81' : '#EEF2FF', borderColor: isDark ? '#4338CA' : '#C7D2FE' }]}>
              <Text style={[styles.stepBadgeText, { color: isDark ? '#A5B4FC' : '#4F46E5' }]}>1</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Select Topics</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                {selectedTopics.length === 0
                  ? `All Topics included (${totalPoolQuestions} questions pool)`
                  : `${selectedTopics.length} selected (${totalPoolQuestions} questions pool)`}
              </Text>
            </View>
            <View style={styles.selectionActions}>
              <TouchableOpacity
                onPress={selectAllFiltered}
                style={[styles.actionSmallBtn, { backgroundColor: isDark ? colors.surfaceHighlight : '#EEF2FF' }]}
              >
                <Text style={[styles.actionSmallBtnText, { color: isDark ? '#A5B4FC' : '#4F46E5' }]}>Select All</Text>
              </TouchableOpacity>
              {selectedTopics.length > 0 && (
                <TouchableOpacity onPress={clearSelection} style={[styles.actionSmallBtn, { backgroundColor: isDark ? 'rgba(239,68,68,0.2)' : '#FEE2E2' }]}>
                  <Text style={[styles.actionSmallBtnText, { color: '#DC2626' }]}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Search Bar */}
          <View style={[styles.searchBar, { backgroundColor: isDark ? colors.surfaceHighlight : '#F8FAFC', borderColor: colors.border }]}>
            <Search size={18} color={colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search topics (e.g., NEP, POCSO, CBSE)..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {categories.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: active
                        ? '#4F46E5'
                        : isDark
                        ? colors.surfaceHighlight
                        : '#F1F5F9',
                      borderColor: active ? '#4F46E5' : colors.border,
                      borderWidth: isDark && !active ? 1 : 0,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: active ? '#FFFFFF' : colors.textSecondary },
                      active && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Topics Grid */}
          <View style={styles.topicsGrid}>
            {filteredTopics.map((topic) => {
              const isSelected = selectedTopics.includes(topic.id);
              return (
                <TouchableOpacity
                  key={topic.id}
                  onPress={() => toggleTopic(topic.id)}
                  style={[
                    styles.topicCard,
                    {
                      backgroundColor: isSelected
                        ? isDark
                          ? 'rgba(99, 102, 241, 0.2)'
                          : '#EEF2FF'
                        : isDark
                        ? colors.surfaceHighlight
                        : '#F8FAFC',
                      borderColor: isSelected ? '#6366F1' : colors.border,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={styles.topicCheckRow}>
                    <View
                      style={[
                        styles.checkbox,
                        { borderColor: isDark ? '#475569' : '#CBD5E1' },
                        isSelected && styles.checkboxSelected,
                      ]}
                    >
                      {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                    </View>
                    <View style={[styles.topicMetaBadge, { backgroundColor: isDark ? '#0F172A' : '#E2E8F0' }]}>
                      <Text style={[styles.topicMetaText, { color: colors.textSecondary }]}>{topic.questionCount} Qs</Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.topicName,
                      { color: isSelected ? (isDark ? '#A5B4FC' : '#312E81') : colors.textPrimary },
                    ]}
                    numberOfLines={2}
                  >
                    {topic.name}
                  </Text>
                  <Text style={[styles.topicCategoryLabel, { color: colors.textTertiary }]}>{topic.category}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Step 2: Number of Questions */}
        <View style={[styles.sectionContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.stepBadge, { backgroundColor: isDark ? '#312E81' : '#EEF2FF', borderColor: isDark ? '#4338CA' : '#C7D2FE' }]}>
              <Text style={[styles.stepBadgeText, { color: isDark ? '#A5B4FC' : '#4F46E5' }]}>2</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Number of Questions</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Total Marks: {effectiveQuestionCount * 2.5} Marks (2.5 marks per question)
              </Text>
            </View>
          </View>

          <View style={styles.presetsRow}>
            {QUESTION_COUNT_PRESETS.map((count) => {
              const active = !customQuestionCount && questionCount === count;
              return (
                <TouchableOpacity
                  key={count}
                  onPress={() => {
                    setCustomQuestionCount('');
                    setQuestionCount(count);
                  }}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: active
                        ? isDark
                          ? '#312E81'
                          : '#EEF2FF'
                        : isDark
                        ? colors.surfaceHighlight
                        : '#F8FAFC',
                      borderColor: active ? '#6366F1' : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      { color: active ? (isDark ? '#A5B4FC' : '#4F46E5') : colors.textSecondary },
                      active && styles.presetChipTextActive,
                    ]}
                  >
                    {count} Qs
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.customInputRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.customInputLabel, { color: colors.textSecondary }]}>Or enter custom count (5 - 120):</Text>
            <TextInput
              style={[
                styles.customNumberInput,
                {
                  backgroundColor: isDark ? colors.surfaceHighlight : '#F8FAFC',
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              placeholder="e.g. 25"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              maxLength={3}
              value={customQuestionCount}
              onChangeText={(val) => {
                const numeric = val.replace(/[^0-9]/g, '');
                setCustomQuestionCount(numeric);
              }}
            />
          </View>
        </View>

        {/* Step 3: Test Duration */}
        <View style={[styles.sectionContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.stepBadge, { backgroundColor: isDark ? '#312E81' : '#EEF2FF', borderColor: isDark ? '#4338CA' : '#C7D2FE' }]}>
              <Text style={[styles.stepBadgeText, { color: isDark ? '#A5B4FC' : '#4F46E5' }]}>3</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Time Limit</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Pace: ~{(effectiveDurationMinutes / effectiveQuestionCount).toFixed(1)} mins per question
              </Text>
            </View>
          </View>

          <View style={styles.presetsRow}>
            {DURATION_PRESETS.map((dur) => {
              const active = !customDurationMinutes && durationMinutes === dur;
              return (
                <TouchableOpacity
                  key={dur}
                  onPress={() => {
                    setCustomDurationMinutes('');
                    setDurationMinutes(dur);
                  }}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: active
                        ? isDark
                          ? '#312E81'
                          : '#EEF2FF'
                        : isDark
                        ? colors.surfaceHighlight
                        : '#F8FAFC',
                      borderColor: active ? '#6366F1' : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      { color: active ? (isDark ? '#A5B4FC' : '#4F46E5') : colors.textSecondary },
                      active && styles.presetChipTextActive,
                    ]}
                  >
                    {dur} mins
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.customInputRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.customInputLabel, { color: colors.textSecondary }]}>Or enter custom minutes (5 - 180):</Text>
            <TextInput
              style={[
                styles.customNumberInput,
                {
                  backgroundColor: isDark ? colors.surfaceHighlight : '#F8FAFC',
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              placeholder="e.g. 40"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              maxLength={3}
              value={customDurationMinutes}
              onChangeText={(val) => {
                const numeric = val.replace(/[^0-9]/g, '');
                setCustomDurationMinutes(numeric);
              }}
            />
          </View>
        </View>

        {/* Step 4: Professional Test Name */}
        <View style={[styles.sectionContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.stepBadge, { backgroundColor: isDark ? '#312E81' : '#EEF2FF', borderColor: isDark ? '#4338CA' : '#C7D2FE' }]}>
              <Text style={[styles.stepBadgeText, { color: isDark ? '#A5B4FC' : '#4F46E5' }]}>4</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Test Title (Optional)</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Leave blank to use smart generated title
              </Text>
            </View>
          </View>

          <View style={[styles.titleInputWrapper, { backgroundColor: isDark ? colors.surfaceHighlight : '#F8FAFC', borderColor: colors.border }]}>
            <TextInput
              style={[styles.titleInput, { color: colors.textPrimary }]}
              placeholder={suggestedDefaultTitle}
              placeholderTextColor={colors.textTertiary}
              value={testTitle}
              onChangeText={setTestTitle}
            />
            {testTitle.length > 0 && (
              <TouchableOpacity onPress={() => setTestTitle('')} style={{ padding: 4 }}>
                <X size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Smart Title Suggestions */}
          <View style={{ marginTop: 12 }}>
            <Text style={[styles.titleSuggestionsLabel, { color: colors.textTertiary }]}>Suggested Names:</Text>
            <View style={styles.titleSuggestionsWrap}>
              {titleSuggestions.map((suggestion, sIdx) => (
                <TouchableOpacity
                  key={sIdx}
                  style={[
                    styles.titleSuggestionChip,
                    {
                      backgroundColor: isDark ? colors.surfaceHighlight : '#F1F5F9',
                      borderColor: testTitle === suggestion ? '#6366F1' : colors.border,
                    },
                    testTitle === suggestion && { backgroundColor: isDark ? '#312E81' : '#EEF2FF' },
                  ]}
                  onPress={() => setTestTitle(suggestion)}
                  activeOpacity={0.7}
                >
                  <Tag size={12} color={testTitle === suggestion ? '#6366F1' : colors.textTertiary} />
                  <Text
                    style={[
                      styles.titleSuggestionText,
                      { color: testTitle === suggestion ? (isDark ? '#A5B4FC' : '#4F46E5') : colors.textSecondary },
                      testTitle === suggestion && { fontWeight: '700' },
                    ]}
                  >
                    {suggestion}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating Bottom Action Bar */}
      <View style={[styles.bottomBarContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <View style={styles.bottomSummary}>
          <Text style={[styles.bottomSummaryTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {testTitle.trim() || suggestedDefaultTitle}
          </Text>
          <Text style={[styles.bottomSummarySubtitle, { color: colors.textSecondary }]}>
            {selectedTopics.length === 0 ? 'All Topics' : `${selectedTopics.length} Topics`} • {effectiveQuestionCount} Qs • {effectiveDurationMinutes}m • {effectiveQuestionCount * 2.5} Marks
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.startButton, isGenerating && styles.startButtonDisabled]}
          onPress={handleCreateTest}
          disabled={isGenerating}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={['#4F46E5', '#6366F1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.startButtonGradient}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
                <Text style={styles.startButtonText}>Start Test</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  if (isLargeScreen) {
    return <DesktopDashboard disableScroll={false}>{builderView}</DesktopDashboard>;
  }
  return builderView;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  themeToggleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
  },
  premiumPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  premiumPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  aiPromoBanner: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#3730A3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  aiPromoGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  aiPromoIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiPromoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  aiPromoSubtitle: {
    fontSize: 12,
    color: '#E0E7FF',
    marginTop: 2,
  },
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  stepBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4F46E5',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  selectionActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionSmallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
  },
  actionSmallBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  categoryScroll: {
    marginBottom: 14,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#4F46E5',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  topicCard: {
    width: '48.5%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  topicCardSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  topicCheckRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  topicMetaBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  topicMetaText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  topicName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    lineHeight: 18,
    minHeight: 36,
  },
  topicNameSelected: {
    color: '#312E81',
  },
  topicCategoryLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 6,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  presetChip: {
    flex: 1,
    minWidth: '28%',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  presetChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  presetChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  presetChipTextActive: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  customInputLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  customNumberInput: {
    width: 80,
    height: 40,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  titleInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
  },
  titleInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  titleSuggestionsLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  titleSuggestionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  titleSuggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  titleSuggestionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  bottomBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  bottomSummary: {
    flex: 1,
    marginRight: 16,
  },
  bottomSummaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  bottomSummarySubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  startButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  startButtonDisabled: {
    opacity: 0.7,
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  startButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Locked styles
  lockedScrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  lockedHeroCard: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  lockedCrownBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  lockedHeroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  lockedHeroSubtitle: {
    fontSize: 14,
    color: '#E0E7FF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  lockedPerksList: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  lockedPerkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lockedPerkText: {
    fontSize: 13,
    color: '#FFFFFF',
    flex: 1,
  },
  couponTipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.4)',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    marginBottom: 20,
  },
  couponTipText: {
    fontSize: 12,
    color: '#D1FAE5',
    flex: 1,
    lineHeight: 18,
  },
  couponCodeHighlight: {
    fontWeight: '800',
    color: '#FBBF24',
  },
  unlockButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  unlockButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  unlockButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
