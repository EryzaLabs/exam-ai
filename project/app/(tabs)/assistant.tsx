import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {
  Send,
  Bot,
  Trash2,
  Sparkles,
  Play,
  ArrowRight,
  Compass,
  Globe,
  SlidersHorizontal,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage as AIMessage } from '@/services/ai-assistant-service';
import { askVidyaAgent, VidyaAgentAction } from '@/services/vidya-agent-service';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';
import { useExam } from '@/context/exam-context';
import { useLanguage } from '@/context/language-context';
import { useWalkthrough } from '@/context/walkthrough-context';
import MarkdownText from '@/components/MarkdownText';
import { AppShell, Pill, Button } from '@/components/chalkboard';

const CHAT_HISTORY_KEY = '@vidya_chat_history_tab_v2';
const DAILY_LIMIT = 5;

interface Message extends AIMessage {
  id: string;
  timestamp: string;
  actions?: VidyaAgentAction[];
}

const PROMPT_CHIPS_EN = [
  'Suggest a test for me to practice',
  'Create an AI test on Indian Constitution',
  'How do full CBT mocks and analytics work?',
  'Explain CCS (Conduct) Rules 1964',
  'RTE Act 2009 key provisions & penalties',
];

const PROMPT_CHIPS_HI = [
  'मेरे लिए एक टेस्ट सुझाएँ',
  'भारतीय संविधान पर एक AI टेस्ट बनाओ',
  'फुल CBT मॉक और एनालिटिक्स कैसे काम करते हैं?',
  'CCS आचरण नियम 1964 समझाएँ',
  'RTE अधिनियम 2009 के मुख्य नियम',
];

export default function AssistantScreen() {
  const { dashboardStats, performance } = useDashboardData();
  const { user, isSubscribed, showAuthPrompt } = useAuth();
  const { colors, isDark } = useTheme();
  const { examMode, setExamMode } = useExam();
  const { lang, isHindi, setLang, t } = useLanguage();
  const { startWalkthrough } = useWalkthrough();
  const params = useLocalSearchParams();
  const PROMPT_CHIPS = isHindi ? PROMPT_CHIPS_HI : PROMPT_CHIPS_EN;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [queriesUsedToday, setQueriesUsedToday] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const initialPromptProcessed = useRef(false);

  const todayKey = `@vidya_daily_queries_${new Date().toISOString().slice(0, 10)}`;

  // Load daily count
  useEffect(() => {
    const loadDailyCount = async () => {
      try {
        const stored = await AsyncStorage.getItem(todayKey);
        if (stored) setQueriesUsedToday(parseInt(stored, 10) || 0);
      } catch (e) {
        // ignore
      }
    };
    loadDailyCount();
  }, [todayKey]);

  // Load chat history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const saved = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setMessages(parsed);
        } else {
          setMessages([
            {
              id: 'initial',
              role: 'assistant',
              content:
                '**Namaste! I am Vidya**, your AI tutor for Indian School Principal & Teacher Recruitment exams (UPSC, UP Principal, DSSSB TGT/PGT).\n\nAsk me about:\n- Administrative & Financial Rules (CCS, GFR, FR/SR)\n- Educational Acts & Policies (RTE 2009, NEP 2020, POCSO)\n- Pedagogy, Mnemonics & Doubt Clearing in English or Hindi',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }
      } catch (e) {
        console.error('Failed to load chat history', e);
      }
    };
    loadHistory();
  }, []);

  // Save chat history
  useEffect(() => {
    if (messages.length > 0) {
      AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages)).catch(() => {});
    }
  }, [messages]);

  // Handle prefill or prompt from router params (e.g. from test-result "Ask AI")
  useEffect(() => {
    const incomingPrompt = (params.prefill || params.prompt) as string | undefined;
    if (incomingPrompt && !initialPromptProcessed.current) {
      initialPromptProcessed.current = true;
      setInputText(incomingPrompt);
      setTimeout(() => {
        handleSendMessage(incomingPrompt);
      }, 400);
    }
  }, [params.prefill, params.prompt]);

  // Auto-scroll on new messages
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }, [messages]);

  const remainingQueries = Math.max(0, DAILY_LIMIT - queriesUsedToday);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    // Check limit if not subscribed
    if (!isSubscribed && remainingQueries <= 0) {
      Alert.alert(
        'Daily Free Limit Reached',
        `You have used your ${DAILY_LIMIT} free questions for today. Unlock the full test series for unlimited AI tutoring.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'View Series',
            onPress: () => {
              // Can navigate to test-list or offer
            },
          },
        ]
      );
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const history: AIMessage[] = [
        ...messages
          .filter((m) => m.id !== 'initial')
          .map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: text },
      ];

      const weakTopicsList = Array.isArray(performance)
        ? performance
            .filter((p: any) => (p.accuracy ?? 100) < 55)
            .slice(0, 5)
            .map((p: any) => p.topic || p.name)
            .filter(Boolean)
        : [];

      const agentRes = await askVidyaAgent(history, {
        examMode,
        lang,
        isSubscribed,
        totalTestsCompleted: dashboardStats?.questionsAttempted || 0,
        overallAccuracy: dashboardStats?.accuracy || 0,
        weakTopics: weakTopicsList,
      });

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: agentRes.text,
        actions: agentRes.actions,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Increment daily counter if not subscribed
      if (!isSubscribed) {
        const nextCount = queriesUsedToday + 1;
        setQueriesUsedToday(nextCount);
        AsyncStorage.setItem(todayKey, nextCount.toString()).catch(() => {});
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an issue: ${err.message || 'Unable to fetch response. Please try again.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    Alert.alert('Clear Chat History', 'Are you sure you want to clear your conversation with Vidya?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          const resetMsg: Message = {
            id: 'initial',
            role: 'assistant',
            content: 'Chat cleared. How can I assist you with your exam prep today?',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages([resetMsg]);
          AsyncStorage.removeItem(CHAT_HISTORY_KEY).catch(() => {});
        },
      },
    ]);
  };

  return (
    <AppShell title="AI Assistant">
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Control Bar */}
        <View
          style={[
            styles.topBar,
            { backgroundColor: colors.surface, borderBottomColor: colors.line },
          ]}
        >
          <View style={styles.topBarLeft}>
            <View style={[styles.avatar, { backgroundColor: colors.surface2, borderColor: colors.line }]}>
              <Image
                source={require('@/assets/images/vidya.png')}
                style={styles.avatarImg}
                resizeMode="contain"
              />
            </View>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>Vidya (विद्या) AI</Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>
                Concept tutor, rules & acts, mnemonics
              </Text>
            </View>
          </View>

          <View style={styles.topBarRight}>
            {isSubscribed ? (
              <Pill label="Unlimited Pass" variant="success" />
            ) : (
              <Pill
                label={`${remainingQueries} free left`}
                variant={remainingQueries <= 1 ? 'danger' : 'neutral'}
              />
            )}
            {messages.length > 1 && (
              <TouchableOpacity
                onPress={handleClearChat}
                style={[styles.clearBtn, { borderColor: colors.line }]}
                accessibilityLabel="Clear chat"
              >
                <Trash2 size={16} color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Suggestion Chips */}
        {messages.length <= 2 && (
          <View style={[styles.chipsContainer, { backgroundColor: colors.surface, borderBottomColor: colors.line }]}>
            <View style={styles.chipsLabelRow}>
              <Sparkles size={14} color={colors.muted} />
              <Text style={[styles.chipsLabel, { color: colors.muted }]}>Suggested prompts</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScroll}
            >
              {PROMPT_CHIPS.map((chip, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.chip,
                    { backgroundColor: colors.surface2, borderColor: colors.line },
                  ]}
                  onPress={() => {
                    setInputText(chip);
                    handleSendMessage(chip);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, { color: colors.text }]}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Chat Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesScroll}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length <= 1 && (
            <View
              style={[
                styles.vidyaHeroCard,
                { backgroundColor: colors.surface, borderColor: colors.line },
              ]}
            >
              <Image
                source={require('@/assets/images/vidya.png')}
                style={styles.vidyaHeroImg}
                resizeMode="contain"
              />
              <View style={styles.vidyaHeroText}>
                <Text style={[styles.vidyaHeroTitle, { color: colors.text }]}>
                  Meet Vidya, your AI study buddy
                </Text>
                <Text style={[styles.vidyaHeroDesc, { color: colors.muted }]}>
                  Ask any question about Administrative Rules (CCS, GFR, FR/SR), Educational Acts (RTE, NEP), or request a mnemonic to memorize tough topics.
                </Text>
              </View>
            </View>
          )}

          {messages.map((item) => {
            const isUser = item.role === 'user';
            return (
              <View
                key={item.id}
                style={[
                  styles.messageRow,
                  isUser ? styles.userRow : styles.assistantRow,
                ]}
              >
                {!isUser && (
                  <View
                    style={[
                      styles.msgAvatar,
                      { backgroundColor: colors.surface2, borderColor: colors.line },
                    ]}
                  >
                    <Image
                      source={require('@/assets/images/vidya.png')}
                      style={styles.msgAvatarImg}
                      resizeMode="contain"
                    />
                  </View>
                )}

                <View
                  style={[
                    styles.bubble,
                    isUser
                      ? [styles.userBubble, { backgroundColor: colors.surface2, borderColor: colors.line }]
                      : [styles.assistantBubble, { backgroundColor: colors.surface, borderColor: colors.line }],
                  ]}
                >
                  {!isUser ? (
                    <>
                      <MarkdownText content={item.content} role="assistant" />
                      {item.actions && item.actions.length > 0 && (
                        <View style={styles.actionsWrap}>
                          {item.actions.map((act, aIdx) => {
                            if (act.type === 'SUGGEST_TEST') {
                              return (
                                <TouchableOpacity
                                  key={aIdx}
                                  style={[
                                    styles.actionCard,
                                    { backgroundColor: colors.surface2, borderColor: colors.accent },
                                  ]}
                                  activeOpacity={0.8}
                                  onPress={() =>
                                    router.push({
                                      pathname: '/test-instructions',
                                      params: { testId: act.testId, filename: act.filename },
                                    } as any)
                                  }
                                >
                                  <View style={styles.actionCardLeft}>
                                    <Text style={[styles.actionCardTitle, { color: colors.text }]} numberOfLines={1}>
                                      {act.title}
                                    </Text>
                                    <Text style={[styles.actionCardSub, { color: colors.muted }]}>
                                      {act.questions || 20} {t('Qs', 'प्रश्न')} · {act.duration || 20} {t('mins', 'मिनट')}
                                    </Text>
                                  </View>
                                  <View style={[styles.actionCardBtn, { backgroundColor: colors.accent }]}>
                                    <Play size={12} color={colors.accentText} fill={colors.accentText} />
                                    <Text style={[styles.actionCardBtnText, { color: colors.accentText }]}>
                                      {t('Start Test', 'टेस्ट शुरू करें')}
                                    </Text>
                                  </View>
                                </TouchableOpacity>
                              );
                            }

                            if (act.type === 'CREATE_AI_TEST') {
                              return (
                                <TouchableOpacity
                                  key={aIdx}
                                  style={[
                                    styles.actionCard,
                                    { backgroundColor: colors.surface2, borderColor: colors.accent },
                                  ]}
                                  activeOpacity={0.8}
                                  onPress={() =>
                                    router.push({
                                      pathname: '/custom-ai-test',
                                      params: {
                                        topic: act.topic,
                                        count: String(act.questionCount || 10),
                                        difficulty: act.difficulty || 'medium',
                                      },
                                    } as any)
                                  }
                                >
                                  <View style={styles.actionCardLeft}>
                                    <Text style={[styles.actionCardTitle, { color: colors.text }]} numberOfLines={1}>
                                      {t(`AI Test: ${act.topic}`, `AI टेस्ट: ${act.topic}`)}
                                    </Text>
                                    <Text style={[styles.actionCardSub, { color: colors.muted }]}>
                                      {act.questionCount || 10} {t('Custom AI Qs', 'कस्टम AI प्रश्न')} · {act.difficulty || 'medium'}
                                    </Text>
                                  </View>
                                  <View style={[styles.actionCardBtn, { backgroundColor: colors.accent }]}>
                                    <Sparkles size={12} color={colors.accentText} />
                                    <Text style={[styles.actionCardBtnText, { color: colors.accentText }]}>
                                      {t('Create AI Test', 'AI टेस्ट बनाएं')}
                                    </Text>
                                  </View>
                                </TouchableOpacity>
                              );
                            }

                            if (act.type === 'START_DRILL') {
                              return (
                                <TouchableOpacity
                                  key={aIdx}
                                  style={[
                                    styles.actionCard,
                                    { backgroundColor: colors.surface2, borderColor: colors.line },
                                  ]}
                                  activeOpacity={0.8}
                                  onPress={() =>
                                    router.push({
                                      pathname: '/practice',
                                      params: { topic: act.topic },
                                    } as any)
                                  }
                                >
                                  <View style={styles.actionCardLeft}>
                                    <Text style={[styles.actionCardTitle, { color: colors.text }]} numberOfLines={1}>
                                      {t(`Topic Drill: ${act.topic}`, `टॉपिक ड्रिल: ${act.topic}`)}
                                    </Text>
                                  </View>
                                  <View style={[styles.actionCardBtn, { backgroundColor: colors.accent }]}>
                                    <ArrowRight size={12} color={colors.accentText} />
                                    <Text style={[styles.actionCardBtnText, { color: colors.accentText }]}>
                                      {t('Practice', 'अभ्यास')}
                                    </Text>
                                  </View>
                                </TouchableOpacity>
                              );
                            }

                            if (act.type === 'NAVIGATE') {
                              return (
                                <TouchableOpacity
                                  key={aIdx}
                                  style={[
                                    styles.actionCard,
                                    { backgroundColor: colors.surface2, borderColor: colors.line },
                                  ]}
                                  activeOpacity={0.8}
                                  onPress={() => router.push(act.route as any)}
                                >
                                  <View style={styles.actionCardLeft}>
                                    <Text style={[styles.actionCardTitle, { color: colors.text }]} numberOfLines={1}>
                                      {act.label}
                                    </Text>
                                  </View>
                                  <View style={[styles.actionCardBtn, { backgroundColor: colors.accent }]}>
                                    <ArrowRight size={12} color={colors.accentText} />
                                    <Text style={[styles.actionCardBtnText, { color: colors.accentText }]}>
                                      {t('Open', 'खोलें')}
                                    </Text>
                                  </View>
                                </TouchableOpacity>
                              );
                            }

                            if (act.type === 'SWITCH_EXAM') {
                              return (
                                <TouchableOpacity
                                  key={aIdx}
                                  style={[
                                    styles.actionCard,
                                    { backgroundColor: colors.surface2, borderColor: colors.line },
                                  ]}
                                  activeOpacity={0.8}
                                  onPress={() => {
                                    setExamMode(act.examMode);
                                  }}
                                >
                                  <View style={styles.actionCardLeft}>
                                    <Text style={[styles.actionCardTitle, { color: colors.text }]}>
                                      {act.label || t(`Switch to ${act.examMode.toUpperCase()}`, `${act.examMode.toUpperCase()} पर स्विच करें`)}
                                    </Text>
                                  </View>
                                  <View style={[styles.actionCardBtn, { backgroundColor: colors.accent }]}>
                                    <SlidersHorizontal size={12} color={colors.accentText} />
                                    <Text style={[styles.actionCardBtnText, { color: colors.accentText }]}>
                                      {t('Switch', 'बदलें')}
                                    </Text>
                                  </View>
                                </TouchableOpacity>
                              );
                            }

                            if (act.type === 'SWITCH_LANGUAGE') {
                              return (
                                <TouchableOpacity
                                  key={aIdx}
                                  style={[
                                    styles.actionCard,
                                    { backgroundColor: colors.surface2, borderColor: colors.line },
                                  ]}
                                  activeOpacity={0.8}
                                  onPress={() => setLang(act.lang)}
                                >
                                  <View style={styles.actionCardLeft}>
                                    <Text style={[styles.actionCardTitle, { color: colors.text }]}>
                                      {act.lang === 'hi' ? 'हिंदी में बदलें (Hindi)' : 'Switch to English'}
                                    </Text>
                                  </View>
                                  <View style={[styles.actionCardBtn, { backgroundColor: colors.accent }]}>
                                    <Globe size={12} color={colors.accentText} />
                                    <Text style={[styles.actionCardBtnText, { color: colors.accentText }]}>
                                      {t('Apply', 'लागू करें')}
                                    </Text>
                                  </View>
                                </TouchableOpacity>
                              );
                            }

                            if (act.type === 'START_WALKTHROUGH') {
                              return (
                                <TouchableOpacity
                                  key={aIdx}
                                  style={[
                                    styles.actionCard,
                                    { backgroundColor: colors.surface2, borderColor: colors.accent },
                                  ]}
                                  activeOpacity={0.8}
                                  onPress={() => {
                                    router.push('/');
                                    setTimeout(() => {
                                      startWalkthrough(user ? 'home' : 'guest');
                                    }, 350);
                                  }}
                                >
                                  <View style={styles.actionCardLeft}>
                                    <Text style={[styles.actionCardTitle, { color: colors.text }]}>
                                      {t('Interactive Voice Walkthrough', 'इंटरैक्टिव वॉयस वॉकथ्रू')}
                                    </Text>
                                  </View>
                                  <View style={[styles.actionCardBtn, { backgroundColor: colors.accent }]}>
                                    <Compass size={12} color={colors.accentText} />
                                    <Text style={[styles.actionCardBtnText, { color: colors.accentText }]}>
                                      {t('Start Tour', 'टूर शुरू करें')}
                                    </Text>
                                  </View>
                                </TouchableOpacity>
                              );
                            }

                            return null;
                          })}
                        </View>
                      )}
                    </>
                  ) : (
                    <Text style={[styles.userMessageText, { color: colors.text }]}>
                      {item.content}
                    </Text>
                  )}
                  <Text style={[styles.timestamp, { color: colors.muted }]}>{item.timestamp}</Text>
                </View>
              </View>
            );
          })}

          {isLoading && (
            <View style={[styles.messageRow, styles.assistantRow]}>
              <View
                style={[
                  styles.msgAvatar,
                  { backgroundColor: colors.surface2, borderColor: colors.line },
                ]}
              >
                <Image
                  source={require('@/assets/images/vidya.png')}
                  style={styles.msgAvatarImg}
                  resizeMode="contain"
                />
              </View>
              <View
                style={[
                  styles.bubble,
                  styles.assistantBubble,
                  { backgroundColor: colors.surface, borderColor: colors.line },
                ]}
              >
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={colors.text} />
                  <Text style={[styles.thinkingText, { color: colors.muted }]}>
                    Vidya is formulating answer...
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom Input Area */}
        <View
          style={[
            styles.inputContainer,
            { backgroundColor: colors.surface, borderTopColor: colors.line },
          ]}
        >
          <View
            style={[
              styles.inputBox,
              { backgroundColor: colors.surface2, borderColor: colors.line },
            ]}
          >
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask Vidya anything about rules, acts or concepts..."
              placeholderTextColor={colors.muted}
              multiline
              maxLength={1500}
              editable={!isLoading}
              onSubmitEditing={() => handleSendMessage()}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                {
                  backgroundColor: inputText.trim() && !isLoading ? colors.accent : colors.surface,
                  borderColor: colors.line,
                },
              ]}
              disabled={!inputText.trim() || isLoading}
              onPress={() => handleSendMessage()}
              accessibilityLabel="Send message"
            >
              <Send
                size={18}
                color={inputText.trim() && !isLoading ? colors.accentText : colors.muted}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: 34,
    height: 34,
  },
  title: {
    fontFamily: Platform.select({
      web: "'Newsreader', Georgia, serif",
      default: 'serif',
    }),
    fontSize: 17,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsContainer: {
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  chipsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  chipsLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 13.5,
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 14,
    maxWidth: 860,
    width: '100%',
    alignSelf: 'center',
  },
  messageRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  msgAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    overflow: 'hidden',
  },
  msgAvatarImg: {
    width: 28,
    height: 28,
  },
  vidyaHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 6,
  },
  vidyaHeroImg: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  vidyaHeroText: {
    flex: 1,
    gap: 4,
  },
  vidyaHeroTitle: {
    fontFamily: Platform.select({
      web: "'Newsreader', Georgia, serif",
      default: 'serif',
    }),
    fontSize: 18,
    fontWeight: '600',
  },
  vidyaHeroDesc: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    borderBottomLeftRadius: 4,
  },
  userMessageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  thinkingText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  inputContainer: {
    borderTopWidth: 1,
    padding: 12,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: 860,
    width: '100%',
    alignSelf: 'center',
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 6,
    outlineStyle: 'none',
  } as any,
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  actionsWrap: {
    marginTop: 10,
    gap: 8,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionCardLeft: {
    flex: 1,
    gap: 2,
  },
  actionCardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  actionCardSub: {
    fontSize: 11.5,
  },
  actionCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionCardBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
