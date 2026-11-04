import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Brain,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Layers,
  ChevronRight,
  ShieldAlert,
  HelpCircle,
  X,
  Sun,
  Moon,
  Tag,
  CreditCard,
} from 'lucide-react-native';
import AiTestService from '@/services/ai-test-service';
import SSCCGLService from '@/services/ssc-cgl-service';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';
import { initiatePayment } from '@/utils/cashfree';

const QUICK_TOPIC_SUGGESTIONS = [
  'AI & Machine Learning in Education',
  'Indian Constitutional Amendments',
  'Cognitive Psychology & Learning Theories',
  'Space Exploration & ISRO Missions',
  'Environmental Policies & Climate Change',
  'Ancient & Medieval Indian History',
];

const QUESTION_COUNT_OPTIONS = [5, 10, 15, 20];
const DURATION_OPTIONS = [10, 15, 20, 30, 45];
const DIFFICULTY_OPTIONS = [
  { id: 'medium', label: 'Balanced (Recommended)' },
  { id: 'hard', label: 'Advanced (UPSC Rigor)' },
  { id: 'easy', label: 'Foundational' },
];

export default function CustomAiTestScreen() {
  const { user, isSubscribed: authSubscribed, isSubscriptionLoading } = useAuth();
  const isSubscribed = authSubscribed;
  const { isDark, colors, toggleTheme } = useTheme();

  const [topic, setTopic] = useState('');
  const [testTitle, setTestTitle] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [difficulty, setDifficulty] = useState('medium');

  // Daily quota state
  const [checkingQuota, setCheckingQuota] = useState(true);
  const [canGenerateToday, setCanGenerateToday] = useState(true);
  const [freeUsed, setFreeUsed] = useState(false);
  const [paidCredits, setPaidCredits] = useState(0);
  const [isPaying, setIsPaying] = useState(false);
  const [dailyStatusMessage, setDailyStatusMessage] = useState('');

  // Generation progress state
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stepMessage, setStepMessage] = useState('');
  const [etaSeconds, setEtaSeconds] = useState(25);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedPaperInfo, setGeneratedPaperInfo] = useState<{
    testId: string;
    filename: string;
    paper?: any;
  } | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const etaTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { width: windowWidth } = useWindowDimensions();
  const isLargeScreen = windowWidth >= 1024;

  useEffect(() => {
    checkDailyQuota();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (etaTimerRef.current) clearInterval(etaTimerRef.current);
    };
  }, [user]);

  const checkDailyQuota = async () => {
    try {
      setCheckingQuota(true);
      const userId = user?.uid || 'anonymous';
      const status = await AiTestService.checkDailyQuota(userId);
      setCanGenerateToday(status.canGenerate);
      setFreeUsed(Boolean(status.freeUsed));
      setPaidCredits(status.paidCredits || 0);
      setDailyStatusMessage(status.message);
    } catch (e) {
      setCanGenerateToday(true);
    } finally {
      setCheckingQuota(false);
    }
  };

  const startCountdownTimer = (initialEta: number) => {
    setEtaSeconds(initialEta);
    if (etaTimerRef.current) clearInterval(etaTimerRef.current);
    etaTimerRef.current = setInterval(() => {
      setEtaSeconds((prev) => (prev > 1 ? prev - 1 : 1));
    }, 1000);
  };

  const suggestedDefaultTitle = useMemo(() => {
    if (!topic.trim()) return 'AI Practice Test';
    const cleanTopic = topic.trim().replace(/[_\-]+/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    return `${cleanTopic} • AI Practice Test (${questionCount} Qs)`;
  }, [topic, questionCount]);

  const titleSuggestions = useMemo(() => {
    if (!topic.trim()) return [];
    const cleanTopic = topic.trim().replace(/[_\-]+/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    return [
      `${cleanTopic} • AI Practice Test (${questionCount} Qs)`,
      `${cleanTopic} • UP Principal Practice Drill`,
      `${cleanTopic} • UPSC Principal Prep Series`,
      `${cleanTopic} • Conceptual Mastery Drill`,
      `Speed Practice: ${cleanTopic} (${durationMinutes}m)`,
    ];
  }, [topic, questionCount, durationMinutes]);

  const handleStartGeneration = async (orderId?: string) => {
    if (!isSubscribed) {
      router.push('/premium');
      return;
    }

    if (!topic.trim()) {
      Alert.alert('Topic Required', 'Please enter any topic you want to test your knowledge on.');
      return;
    }

    if (!canGenerateToday && !orderId && paidCredits <= 0) {
      handlePaidTestCheckout();
      return;
    }

    try {
      setIsGenerating(true);
      setGenerationError(null);
      setProgress(10);
      setStepMessage(`Analyzing topic: "${topic.trim()}"...`);
      setGeneratedPaperInfo(null);

      const userId = user?.uid || 'anonymous';
      const finalTitle = testTitle.trim() || suggestedDefaultTitle;

      const res = await AiTestService.startGeneration({
        userId,
        topic: topic.trim(),
        title: finalTitle,
        orderId,
        questionCount,
        durationMinutes,
        difficulty,
      });

      if (!res.success || !res.jobId) {
        throw new Error(res.message || 'Failed to start AI test generator');
      }

      setJobId(res.jobId);
      startCountdownTimer(res.etaSeconds || 25);

      // Begin status polling
      pollJobStatus(res.jobId);
    } catch (error: any) {
      console.warn('Failed to start AI test generation:', error);
      setIsGenerating(false);
      Alert.alert(
        'Generation Busy',
        'AI generator service is currently busy or out of credits. Please try again later.'
      );
    }
  };

  const handlePaidTestCheckout = async () => {
    if (!topic.trim()) {
      Alert.alert('Topic Required', 'Please enter a topic before generating your test.');
      return;
    }

    try {
      setIsPaying(true);
      const userId = user?.uid || 'anonymous';
      const userName = user?.displayName || 'Student';
      const userEmail = user?.email || 'student@exam-ai.com';

      await initiatePayment(
        async () => {
          setIsPaying(false);
          try {
            await AiTestService.unlockPaidCredit(userId);
            setPaidCredits((prev) => prev + 1);
            setCanGenerateToday(true);
          } catch (e) {
            console.warn('Unlock credit notice:', e);
          }
          await handleStartGeneration('cf_order_paid');
        },
        (errMsg) => {
          setIsPaying(false);
          Alert.alert('Payment Incomplete', errMsg || 'Payment was cancelled or failed. Please try again.');
        },
        {
          userId,
          userName,
          userEmail,
          amountInRupees: 9,
          planId: 'ai_test',
        }
      );
    } catch (e: any) {
      setIsPaying(false);
      Alert.alert('Payment Error', e.message || 'Could not initiate checkout.');
    }
  };

  const pollJobStatus = (targetJobId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const job = await AiTestService.getJobStatus(targetJobId);

        setProgress(job.progress);
        if (job.step) setStepMessage(job.step);
        if (typeof job.etaSeconds === 'number') setEtaSeconds(job.etaSeconds);

        if (job.status === 'completed') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          if (etaTimerRef.current) clearInterval(etaTimerRef.current);
          setProgress(100);
          setEtaSeconds(0);
          setCanGenerateToday(false);
          setDailyStatusMessage('Daily limit reached. Resets tomorrow at midnight.');

          setGeneratedPaperInfo({
            testId: job.testId!,
            filename: job.filename!,
            paper: job.paper,
          });
        } else if (job.status === 'failed') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          if (etaTimerRef.current) clearInterval(etaTimerRef.current);

          setGenerationError(
            job.error || 'AI generator service is currently busy or out of credits. Please try again later.'
          );
        }
      } catch (err: any) {
        console.warn('Polling error:', err);
      }
    }, 1500);
  };

  const handleLaunchExam = async () => {
    if (!generatedPaperInfo) return;

    try {
      if (generatedPaperInfo.paper) {
        await AiTestService.prepareAndCachePaper(
          generatedPaperInfo.paper,
          generatedPaperInfo.filename
        );
      }

      router.replace({
        pathname: '/mock-test',
        params: {
          testId: generatedPaperInfo.testId,
          filename: generatedPaperInfo.filename,
        },
      });
    } catch (e) {
      router.replace({
        pathname: '/mock-test',
        params: {
          testId: generatedPaperInfo.testId,
          filename: generatedPaperInfo.filename,
        },
      });
    }
  };

  const resetForm = () => {
    setIsGenerating(false);
    setJobId(null);
    setProgress(0);
    setGenerationError(null);
    setGeneratedPaperInfo(null);
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

  // 0. LOADING VIEW: Subscription or quota check in progress
  if (isSubscriptionLoading || checkingQuota) {
    const loadingView = (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading Custom AI Studio...</Text>
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
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleBack} style={[styles.backButton, { backgroundColor: isDark ? colors.surfaceHighlight : '#F1F5F9' }]}>
            <ArrowLeft size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Custom AI Test</Text>
          <TouchableOpacity
            style={[styles.themeToggleButton, { backgroundColor: isDark ? colors.surfaceHighlight : '#F1F5F9', borderColor: colors.border }]}
            onPress={toggleTheme}
            accessibilityLabel="Toggle Dark Mode"
          >
            {isDark ? <Sun size={18} color="#FBBF24" /> : <Moon size={18} color="#475569" />}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.lockedScrollContent} showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={['#1E1B4B', '#312E81', '#4338CA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.lockedHeroCard}
          >
            <View style={styles.lockedCrownBadge}>
              <Brain size={36} color="#F59E0B" />
            </View>
            <Text style={styles.lockedHeroTitle}>Universal AI Test Generator</Text>
            <Text style={styles.lockedHeroSubtitle}>
              Type ANY topic in the world. Our AI question pipeline crafts authentic, bilingual multiple-choice mock exams in real time.
            </Text>

            <View style={styles.lockedPerksList}>
              <View style={styles.lockedPerkItem}>
                <Sparkles size={18} color="#FBBF24" />
                <Text style={styles.lockedPerkText}>Any topic in the universe (History, Science, Law, AI, Pedagogy)</Text>
              </View>
              <View style={styles.lockedPerkItem}>
                <BookOpen size={18} color="#FBBF24" />
                <Text style={styles.lockedPerkText}>1 custom AI mock test generated per account per day</Text>
              </View>
              <View style={styles.lockedPerkItem}>
                <Zap size={18} color="#FBBF24" />
                <Text style={styles.lockedPerkText}>Real-time background generation with live progress & ETA</Text>
              </View>
              <View style={styles.lockedPerkItem}>
                <Layers size={18} color="#FBBF24" />
                <Text style={styles.lockedPerkText}>Full Hindi & English bilingual questions, keys & explanations</Text>
              </View>
            </View>

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

  // 2. ACTIVE GENERATION VIEW (Background job running, error, or completed)
  if (isGenerating) {
    const generatingView = (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleBack} style={[styles.backButton, { backgroundColor: isDark ? colors.surfaceHighlight : '#F1F5F9' }]}>
            <ArrowLeft size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>AI Generator Pipeline</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Assembling your custom mock test</Text>
          </View>
          <TouchableOpacity
            style={[styles.themeToggleButton, { backgroundColor: isDark ? colors.surfaceHighlight : '#F1F5F9', borderColor: colors.border }]}
            onPress={toggleTheme}
            accessibilityLabel="Toggle Dark Mode"
          >
            {isDark ? <Sun size={18} color="#FBBF24" /> : <Moon size={18} color="#475569" />}
          </TouchableOpacity>
        </View>

        <View style={styles.generatingContainer}>
          {/* FAILED STATE */}
          {generationError ? (
            <View style={[styles.statusBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.errorIconCircle}>
                <AlertTriangle size={36} color="#DC2626" />
              </View>
              <Text style={styles.errorTitle}>Generation Failed</Text>
              <Text style={[styles.errorSubtitle, { color: colors.textSecondary }]}>{generationError}</Text>

              <View style={[styles.quotaPreservedNote, isDark && { backgroundColor: 'rgba(5, 150, 105, 0.15)', borderColor: 'rgba(5, 150, 105, 0.3)' }]}>
                <ShieldAlert size={16} color="#059669" />
                <Text style={[styles.quotaPreservedText, isDark && { color: '#6EE7B7' }]}>
                  Your daily test generation quota has NOT been deducted. You can try again anytime.
                </Text>
              </View>

              <TouchableOpacity style={styles.tryAgainBtn} onPress={resetForm} activeOpacity={0.88}>
                <RotateCcw size={18} color="#FFFFFF" />
                <Text style={styles.tryAgainBtnText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : generatedPaperInfo ? (
            /* COMPLETED SUCCESS STATE */
            <View style={[styles.statusBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.successIconCircle}>
                <CheckCircle2 size={44} color="#059669" />
              </View>
              <Text style={[styles.successTitle, isDark && { color: '#34D399' }]}>Test Generated Successfully! 🎉</Text>
              <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
                Your custom mock test on <Text style={{ fontWeight: '700', color: colors.textPrimary }}>"{topic}"</Text> is assembled and ready.
              </Text>

              <View style={[styles.testMetaCard, { backgroundColor: isDark ? colors.surfaceHighlight : '#F8FAFC', borderColor: colors.border }]}>
                <View style={styles.testMetaItem}>
                  <BookOpen size={16} color="#4F46E5" />
                  <Text style={[styles.testMetaText, { color: colors.textPrimary }]}>{questionCount} Questions</Text>
                </View>
                <View style={styles.testMetaItem}>
                  <Clock size={16} color="#4F46E5" />
                  <Text style={[styles.testMetaText, { color: colors.textPrimary }]}>{durationMinutes} Minutes</Text>
                </View>
                <View style={styles.testMetaItem}>
                  <Brain size={16} color="#4F46E5" />
                  <Text style={[styles.testMetaText, { color: colors.textPrimary }]}>{questionCount * 2.5} Marks</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.launchExamBtn} onPress={handleLaunchExam} activeOpacity={0.9}>
                <LinearGradient
                  colors={['#4F46E5', '#6366F1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.launchExamGradient}
                >
                  <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
                  <Text style={styles.launchExamText}>Start Exam Now</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backToListBtn}
                onPress={() => router.push({ pathname: '/test-list', params: { category: 'all' } })}
              >
                <Text style={styles.backToListText}>View in All Tests →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ACTIVE RUNNING PROGRESS */
            <View style={[styles.statusBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.generatingAnimationCircle, { backgroundColor: isDark ? '#312E81' : '#EEF2FF' }]}>
                <ActivityIndicator size="large" color="#4F46E5" />
              </View>

              <Text style={[styles.generatingHeading, { color: colors.textPrimary }]}>AI Engine Working</Text>
              <Text style={styles.generatingTopic} numberOfLines={2}>
                "{topic}"
              </Text>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={[styles.progressBarBackground, { backgroundColor: isDark ? colors.surfaceHighlight : '#F1F5F9' }]}>
                  <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                </View>
                <View style={styles.progressStatsRow}>
                  <Text style={styles.progressPercentText}>{Math.round(progress)}% Complete</Text>
                  <Text style={[styles.etaText, { color: colors.textSecondary }]}>
                    {etaSeconds > 0 ? `~${etaSeconds}s remaining` : 'Finalizing...'}
                  </Text>
                </View>
              </View>

              {/* Real-time step status message */}
              <View style={[styles.stepBox, { backgroundColor: isDark ? colors.surfaceHighlight : '#F8FAFC' }]}>
                <Sparkles size={16} color="#6366F1" />
                <Text style={[styles.stepText, { color: colors.textPrimary }]}>{stepMessage || 'Initializing generation...'}</Text>
              </View>

              <Text style={[styles.backgroundHint, { color: colors.textTertiary }]}>
                Running securely in background. Your questions are being generated and verified with bilingual options.
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    );

    if (isLargeScreen) {
      return <DesktopDashboard disableScroll={false}>{generatingView}</DesktopDashboard>;
    }
    return generatingView;
  }

  // 3. DEFAULT FORM VIEW: Topic Input & Configuration
  const formView = (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleBack} style={[styles.backButton, { backgroundColor: isDark ? colors.surfaceHighlight : '#F1F5F9' }]}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Custom AI Test Studio</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Any topic in the world • AI Question Generator</Text>
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
        {/* Daily Quota Notice Card */}
        <View
          style={[
            styles.quotaCard,
            paidCredits > 0
              ? isDark
                ? { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.3)' }
                : { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }
              : !freeUsed
              ? isDark
                ? { backgroundColor: 'rgba(5, 150, 105, 0.15)', borderColor: 'rgba(5, 150, 105, 0.3)' }
                : styles.quotaCard
              : isDark
              ? { backgroundColor: 'rgba(217, 119, 6, 0.15)', borderColor: 'rgba(217, 119, 6, 0.3)' }
              : styles.quotaCardUsed,
          ]}
        >
          <View style={[styles.quotaIconBox, { backgroundColor: isDark ? colors.surfaceHighlight : '#FFFFFF' }]}>
            {paidCredits > 0 ? (
              <Crown size={20} color="#F59E0B" />
            ) : !freeUsed ? (
              <Zap size={20} color="#059669" />
            ) : (
              <Sparkles size={20} color="#D97706" />
            )}
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <Text
                style={[
                  styles.quotaTitle,
                  paidCredits > 0
                    ? { color: '#B45309' }
                    : !freeUsed
                    ? isDark
                      ? { color: '#34D399' }
                      : styles.quotaTitle
                    : isDark
                    ? { color: '#FBBF24' }
                    : styles.quotaTitleUsed,
                ]}
              >
                {paidCredits > 0
                  ? `Paid Credit: ${paidCredits} Extra Test${paidCredits > 1 ? 's' : ''} Ready`
                  : !freeUsed
                  ? 'Daily Quota: 1 Free AI Test Available'
                  : 'Daily Free Test Used (1/1 Today)'}
              </Text>
              {freeUsed && paidCredits === 0 && (
                <View style={[styles.microPriceTag, { backgroundColor: isDark ? '#92400E' : '#FEF3C7', borderColor: '#F59E0B' }]}>
                  <Text style={[styles.microPriceText, { color: isDark ? '#FDE68A' : '#92400E' }]}>₹9 / test</Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.quotaSubtitle,
                isDark && {
                  color: paidCredits > 0 ? '#FDE68A' : !freeUsed ? '#A7F3D0' : '#FDE68A',
                },
              ]}
            >
              {paidCredits > 0
                ? `You have ${paidCredits} purchased AI test credit(s). Ready to generate immediately!`
                : !freeUsed
                ? 'Each account gets 1 complimentary AI custom test every day. Resets tonight at midnight.'
                : 'Need another mock test right away? Build additional custom AI tests on any topic for just ₹9!'}
            </Text>
          </View>
        </View>

        {/* Step 1: Input Any Topic */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.stepNumberBadge, { backgroundColor: isDark ? '#312E81' : '#EEF2FF', borderColor: isDark ? '#4338CA' : '#C7D2FE' }]}>
              <Text style={[styles.stepNumberText, { color: isDark ? '#A5B4FC' : '#4F46E5' }]}>1</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Enter Any Topic</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                Literally anything from syllabus, science, history, or current affairs
              </Text>
            </View>
          </View>

          <View style={styles.topicInputWrapper}>
            <TextInput
              style={[
                styles.topicInput,
                {
                  backgroundColor: isDark ? colors.surfaceHighlight : '#F8FAFC',
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              placeholder="e.g., Quantum Computing, NEP 2020 Holistic Progress Card, POCSO 2012, Medieval Architecture..."
              placeholderTextColor={colors.textTertiary}
              value={topic}
              onChangeText={setTopic}
              multiline
              numberOfLines={3}
            />
            {topic.length > 0 && (
              <TouchableOpacity style={styles.clearTopicBtn} onPress={() => setTopic('')}>
                <X size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Suggestions */}
          <Text style={[styles.suggestionsHeading, { color: colors.textSecondary }]}>Quick Ideas & In-demand Topics:</Text>
          <View style={styles.suggestionsWrap}>
            {QUICK_TOPIC_SUGGESTIONS.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.suggestionPill,
                  {
                    backgroundColor: isDark ? colors.surfaceHighlight : '#F1F5F9',
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setTopic(item)}
                activeOpacity={0.7}
              >
                <Text style={[styles.suggestionPillText, { color: isDark ? '#CBD5E1' : '#334155' }]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Step 2: Number of Questions */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.stepNumberBadge, { backgroundColor: isDark ? '#312E81' : '#EEF2FF', borderColor: isDark ? '#4338CA' : '#C7D2FE' }]}>
              <Text style={[styles.stepNumberText, { color: isDark ? '#A5B4FC' : '#4F46E5' }]}>2</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Number of Questions</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                Target Marks: {questionCount * 2.5} Marks (2.5 marks each)
              </Text>
            </View>
          </View>

          <View style={styles.optionsRow}>
            {QUESTION_COUNT_OPTIONS.map((count) => {
              const active = questionCount === count;
              return (
                <TouchableOpacity
                  key={count}
                  onPress={() => setQuestionCount(count)}
                  style={[
                    styles.optionPill,
                    {
                      backgroundColor: active
                        ? isDark
                          ? '#312E81'
                          : '#EEF2FF'
                        : isDark
                        ? colors.surfaceHighlight
                        : '#F8FAFC',
                      borderColor: active ? '#4F46E5' : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionPillText,
                      { color: active ? (isDark ? '#A5B4FC' : '#4F46E5') : colors.textSecondary },
                      active && styles.optionPillTextActive,
                    ]}
                  >
                    {count} Qs
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Step 3: Test Duration */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.stepNumberBadge, { backgroundColor: isDark ? '#312E81' : '#EEF2FF', borderColor: isDark ? '#4338CA' : '#C7D2FE' }]}>
              <Text style={[styles.stepNumberText, { color: isDark ? '#A5B4FC' : '#4F46E5' }]}>3</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Time Limit</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                Pace: ~{(durationMinutes / questionCount).toFixed(1)} mins per question
              </Text>
            </View>
          </View>

          <View style={styles.optionsRow}>
            {DURATION_OPTIONS.map((dur) => {
              const active = durationMinutes === dur;
              return (
                <TouchableOpacity
                  key={dur}
                  onPress={() => setDurationMinutes(dur)}
                  style={[
                    styles.optionPill,
                    {
                      backgroundColor: active
                        ? isDark
                          ? '#312E81'
                          : '#EEF2FF'
                        : isDark
                        ? colors.surfaceHighlight
                        : '#F8FAFC',
                      borderColor: active ? '#4F46E5' : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionPillText,
                      { color: active ? (isDark ? '#A5B4FC' : '#4F46E5') : colors.textSecondary },
                      active && styles.optionPillTextActive,
                    ]}
                  >
                    {dur} mins
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Step 4: Difficulty */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.stepNumberBadge, { backgroundColor: isDark ? '#312E81' : '#EEF2FF', borderColor: isDark ? '#4338CA' : '#C7D2FE' }]}>
              <Text style={[styles.stepNumberText, { color: isDark ? '#A5B4FC' : '#4F46E5' }]}>4</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Difficulty Level</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                Adjust analytical depth and distractor complexity
              </Text>
            </View>
          </View>

          <View style={styles.difficultyColumn}>
            {DIFFICULTY_OPTIONS.map((opt) => {
              const active = difficulty === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setDifficulty(opt.id)}
                  style={[
                    styles.difficultyRow,
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
                  <View style={[styles.radioCircle, { borderColor: isDark ? '#475569' : '#94A3B8' }, active && styles.radioCircleActive]}>
                    {active && <View style={styles.radioInner} />}
                  </View>
                  <Text
                    style={[
                      styles.difficultyLabel,
                      { color: active ? (isDark ? '#E0E7FF' : '#1E1B4B') : colors.textPrimary },
                      active && styles.difficultyLabelActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Step 5: Professional Test Name */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.stepNumberBadge, { backgroundColor: isDark ? '#312E81' : '#EEF2FF', borderColor: isDark ? '#4338CA' : '#C7D2FE' }]}>
              <Text style={[styles.stepNumberText, { color: isDark ? '#A5B4FC' : '#4F46E5' }]}>5</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Test Title (Optional)</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                Leave blank to use auto-generated title
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
          {titleSuggestions.length > 0 && (
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
          )}
        </View>

        {/* Generate / Pay & Build CTA Button */}
        {freeUsed && paidCredits === 0 ? (
          <View style={{ gap: 8, marginTop: 8 }}>
            <TouchableOpacity
              style={[styles.generateButton, (!topic.trim() || isPaying) && styles.generateButtonDisabled]}
              onPress={handlePaidTestCheckout}
              disabled={!topic.trim() || isPaying}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={topic.trim() && !isPaying ? ['#F59E0B', '#D97706'] : ['#94A3B8', '#CBD5E1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.generateButtonGradient}
              >
                {isPaying ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Zap size={20} color="#FFFFFF" fill="#FFFFFF" />
                    <Text style={styles.generateButtonText}>Pay ₹9 & Build AI Test</Text>
                    <View style={styles.paidBadge}>
                      <Text style={styles.paidBadgeText}>Instant</Text>
                    </View>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.guaranteeRow}>
              <Sparkles size={13} color="#F59E0B" />
              <Text style={[styles.guaranteeText, { color: colors.textTertiary }]}>
                Instant Cashfree UPI/Cards · Bilingual questions · Complete explanations & solutions
              </Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.generateButton, (!canGenerateToday || !topic.trim()) && styles.generateButtonDisabled]}
            onPress={() => handleStartGeneration()}
            disabled={!canGenerateToday || !topic.trim()}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={canGenerateToday && topic.trim() ? ['#4F46E5', '#6366F1'] : ['#94A3B8', '#CBD5E1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.generateButtonGradient}
            >
              <Brain size={20} color="#FFFFFF" />
              <Text style={styles.generateButtonText}>
                {paidCredits > 0
                  ? `Generate Custom AI Mock Test (1 Credit) ✨`
                  : `Generate Custom AI Mock Test (Free) ✨`}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );

  if (isLargeScreen) {
    return <DesktopDashboard disableScroll={false}>{formView}</DesktopDashboard>;
  }
  return formView;
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
    marginTop: 14,
    fontSize: 15,
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
  quotaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    padding: 14,
  },
  quotaCardUsed: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  quotaIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quotaTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
  },
  quotaTitleUsed: {
    color: '#92400E',
  },
  quotaSubtitle: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
    lineHeight: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  stepNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  stepNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  topicInputWrapper: {
    position: 'relative',
  },
  topicInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    padding: 14,
    fontSize: 15,
    color: '#0F172A',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  clearTopicBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 6,
  },
  suggestionsHeading: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 14,
    marginBottom: 8,
  },
  suggestionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  suggestionPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#334155',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  optionPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  optionPillActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  optionPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  optionPillTextActive: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  difficultyColumn: {
    gap: 8,
  },
  difficultyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  difficultyRowActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  radioCircleActive: {
    borderColor: '#4F46E5',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4F46E5',
  },
  difficultyLabel: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  difficultyLabelActive: {
    color: '#1E1B4B',
    fontWeight: '700',
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
  generateButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  generateButtonDisabled: {
    opacity: 0.65,
    shadowOpacity: 0,
    elevation: 0,
  },
  generateButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  paidBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  paidBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  microPriceTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  microPriceText: {
    fontSize: 11,
    fontWeight: '700',
  },
  guaranteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    marginTop: 2,
  },
  guaranteeText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Generation & Status view
  generatingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  statusBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  generatingAnimationCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  generatingHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  generatingTopic: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 16,
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 5,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 5,
  },
  progressStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressPercentText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },
  etaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  stepBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
    marginBottom: 14,
  },
  stepText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
    flex: 1,
  },
  backgroundHint: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
  },
  // Error state
  errorIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#DC2626',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  quotaPreservedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
  },
  quotaPreservedText: {
    fontSize: 12,
    color: '#065F46',
    flex: 1,
    lineHeight: 16,
  },
  tryAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  tryAgainBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Success state
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#065F46',
    marginBottom: 6,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  testMetaCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  testMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  testMetaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  launchExamBtn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  launchExamGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  launchExamText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  backToListBtn: {
    paddingVertical: 10,
  },
  backToListText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
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
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  lockedHeroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
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
