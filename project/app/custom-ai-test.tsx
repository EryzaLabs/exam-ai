import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react-native';
import AiTestService from '@/services/ai-test-service';
import { useAuth } from '@/context/auth-context';

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

  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [difficulty, setDifficulty] = useState('medium');

  // Daily quota state
  const [checkingQuota, setCheckingQuota] = useState(true);
  const [canGenerateToday, setCanGenerateToday] = useState(true);
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
      setDailyStatusMessage(status.message);
    } catch (e) {
      // In case of network check failure, default to allow
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

  const handleStartGeneration = async () => {
    if (!isSubscribed) {
      router.push('/premium');
      return;
    }

    if (!topic.trim()) {
      Alert.alert('Topic Required', 'Please enter any topic you want to test your knowledge on.');
      return;
    }

    if (!canGenerateToday) {
      Alert.alert(
        'Daily Limit Reached',
        'You have already generated your 1 custom AI test for today. Resets tomorrow at midnight!'
      );
      return;
    }

    try {
      setIsGenerating(true);
      setGenerationError(null);
      setProgress(10);
      setStepMessage(`Analyzing topic: "${topic.trim()}"...`);
      setGeneratedPaperInfo(null);

      const userId = user?.uid || 'anonymous';
      const res = await AiTestService.startGeneration({
        userId,
        topic: topic.trim(),
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
      // Pre-load paper into service memory
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

  // 1. LOCKED VIEW: User is not subscribed
  if (!isSubscriptionLoading && !isSubscribed) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={22} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Custom AI Test</Text>
          <View style={{ width: 40 }} />
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
  }

  // 2. ACTIVE GENERATION VIEW (Background job running, error, or completed)
  if (isGenerating) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={22} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Generator Pipeline</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.generatingContainer}>
          {/* FAILED STATE */}
          {generationError ? (
            <View style={styles.statusBox}>
              <View style={styles.errorIconCircle}>
                <AlertTriangle size={36} color="#DC2626" />
              </View>
              <Text style={styles.errorTitle}>Generation Failed</Text>
              <Text style={styles.errorSubtitle}>{generationError}</Text>

              <View style={styles.quotaPreservedNote}>
                <ShieldAlert size={16} color="#059669" />
                <Text style={styles.quotaPreservedText}>
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
            <View style={styles.statusBox}>
              <View style={styles.successIconCircle}>
                <CheckCircle2 size={44} color="#059669" />
              </View>
              <Text style={styles.successTitle}>Test Generated Successfully! 🎉</Text>
              <Text style={styles.successSubtitle}>
                Your custom mock test on <Text style={{ fontWeight: '700', color: '#1E293B' }}>"{topic}"</Text> is assembled and added to your available tests.
              </Text>

              <View style={styles.testMetaCard}>
                <View style={styles.testMetaItem}>
                  <BookOpen size={16} color="#4F46E5" />
                  <Text style={styles.testMetaText}>{questionCount} Questions</Text>
                </View>
                <View style={styles.testMetaItem}>
                  <Clock size={16} color="#4F46E5" />
                  <Text style={styles.testMetaText}>{durationMinutes} Minutes</Text>
                </View>
                <View style={styles.testMetaItem}>
                  <Brain size={16} color="#4F46E5" />
                  <Text style={styles.testMetaText}>{questionCount * 2.5} Marks</Text>
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
            /* IN PROGRESS STATE (Real-time progress, percentage & ETA) */
            <View style={styles.statusBox}>
              <View style={styles.generatingAnimationCircle}>
                <Brain size={40} color="#6366F1" />
              </View>

              <Text style={styles.generatingHeading}>Generating AI Mock Test</Text>
              <Text style={styles.generatingTopic} numberOfLines={2}>
                Topic: "{topic}"
              </Text>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBarBackground}>
                  <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                </View>
                <View style={styles.progressStatsRow}>
                  <Text style={styles.progressPercentText}>{progress}% Complete</Text>
                  <Text style={styles.etaText}>
                    {etaSeconds > 0 ? `ETA: ~${etaSeconds}s remaining` : 'Finalizing...'}
                  </Text>
                </View>
              </View>

              {/* Dynamic Step description */}
              <View style={styles.stepBox}>
                <ActivityIndicator size="small" color="#6366F1" />
                <Text style={styles.stepText}>{stepMessage || 'Processing question pipeline...'}</Text>
              </View>

              <Text style={styles.backgroundHint}>
                Running securely in background. Your questions are being generated and verified with bilingual options.
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // 3. DEFAULT FORM VIEW: Topic Input & Configuration
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color="#1E293B" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.headerTitle}>Custom AI Test Studio</Text>
          <Text style={styles.headerSubtitle}>Any topic in the world • AI Question Generator</Text>
        </View>
        <View style={styles.premiumPill}>
          <Crown size={12} color="#F59E0B" />
          <Text style={styles.premiumPillText}>PREMIUM</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Daily Quota Notice Card */}
        <View style={[styles.quotaCard, !canGenerateToday && styles.quotaCardUsed]}>
          <View style={styles.quotaIconBox}>
            {canGenerateToday ? (
              <Zap size={20} color="#059669" />
            ) : (
              <Clock size={20} color="#D97706" />
            )}
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.quotaTitle, !canGenerateToday && styles.quotaTitleUsed]}>
              {canGenerateToday ? 'Daily Quota: 1 Generation Available' : 'Daily Quota Claimed (1/1 Today)'}
            </Text>
            <Text style={styles.quotaSubtitle}>
              {canGenerateToday
                ? 'Each account gets 1 free custom AI-generated mock exam per day.'
                : 'You have generated 1 custom AI exam today. Quota resets tomorrow at midnight!'}
            </Text>
          </View>
        </View>

        {/* Step 1: Input Any Topic */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.stepNumberBadge}><Text style={styles.stepNumberText}>1</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Enter Any Topic</Text>
              <Text style={styles.cardSubtitle}>Literally anything from syllabus, science, history, or current affairs</Text>
            </View>
          </View>

          <View style={styles.topicInputWrapper}>
            <TextInput
              style={styles.topicInput}
              placeholder="e.g., Quantum Computing, NEP 2020 Holistic Progress Card, POCSO 2012, Medieval Architecture..."
              placeholderTextColor="#94A3B8"
              value={topic}
              onChangeText={setTopic}
              multiline
              numberOfLines={3}
            />
            {topic.length > 0 && (
              <TouchableOpacity style={styles.clearTopicBtn} onPress={() => setTopic('')}>
                <X size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Suggestions */}
          <Text style={styles.suggestionsHeading}>Quick Ideas & In-demand Topics:</Text>
          <View style={styles.suggestionsWrap}>
            {QUICK_TOPIC_SUGGESTIONS.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.suggestionPill}
                onPress={() => setTopic(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.suggestionPillText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Step 2: Number of Questions */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.stepNumberBadge}><Text style={styles.stepNumberText}>2</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Number of Questions</Text>
              <Text style={styles.cardSubtitle}>Target Marks: {questionCount * 2.5} Marks (2.5 marks each)</Text>
            </View>
          </View>

          <View style={styles.optionsRow}>
            {QUESTION_COUNT_OPTIONS.map((count) => {
              const active = questionCount === count;
              return (
                <TouchableOpacity
                  key={count}
                  onPress={() => setQuestionCount(count)}
                  style={[styles.optionPill, active && styles.optionPillActive]}
                >
                  <Text style={[styles.optionPillText, active && styles.optionPillTextActive]}>
                    {count} Qs
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Step 3: Test Duration */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.stepNumberBadge}><Text style={styles.stepNumberText}>3</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Time Limit</Text>
              <Text style={styles.cardSubtitle}>Pace: ~{(durationMinutes / questionCount).toFixed(1)} mins per question</Text>
            </View>
          </View>

          <View style={styles.optionsRow}>
            {DURATION_OPTIONS.map((dur) => {
              const active = durationMinutes === dur;
              return (
                <TouchableOpacity
                  key={dur}
                  onPress={() => setDurationMinutes(dur)}
                  style={[styles.optionPill, active && styles.optionPillActive]}
                >
                  <Text style={[styles.optionPillText, active && styles.optionPillTextActive]}>
                    {dur} mins
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Step 4: Difficulty */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.stepNumberBadge}><Text style={styles.stepNumberText}>4</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Difficulty Level</Text>
              <Text style={styles.cardSubtitle}>Adjust analytical depth and distractor complexity</Text>
            </View>
          </View>

          <View style={styles.difficultyColumn}>
            {DIFFICULTY_OPTIONS.map((opt) => {
              const active = difficulty === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setDifficulty(opt.id)}
                  style={[styles.difficultyRow, active && styles.difficultyRowActive]}
                >
                  <View style={[styles.radioCircle, active && styles.radioCircleActive]}>
                    {active && <View style={styles.radioInner} />}
                  </View>
                  <Text style={[styles.difficultyLabel, active && styles.difficultyLabelActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Generate CTA Button */}
        <TouchableOpacity
          style={[styles.generateButton, (!canGenerateToday || !topic.trim()) && styles.generateButtonDisabled]}
          onPress={handleStartGeneration}
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
              {canGenerateToday ? 'Generate Custom AI Mock Test ✨' : 'Daily Limit Reached (Come back tomorrow)'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
