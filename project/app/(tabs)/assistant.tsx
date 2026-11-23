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
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Send, Bot, Trash2, Sparkles } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ChatMessage as AIMessage,
  chatWithHistory,
} from '@/services/ai-assistant-service';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';
import MarkdownText from '@/components/MarkdownText';
import { AppShell, Pill, Button } from '@/components/chalkboard';

const CHAT_HISTORY_KEY = '@vidya_chat_history_tab_v2';
const DAILY_LIMIT = 5;

interface Message extends AIMessage {
  id: string;
  timestamp: string;
}

const PROMPT_CHIPS = [
  'Explain CCS (Conduct) Rules 1964',
  'NCF 2005 5 Guiding Principles',
  'GFR 2017 Procurement rules summary',
  'RTE Act 2009 key provisions & penalties',
  'RTE Act Section 12(1)(c) details',
  'Create a mnemonic for Bloom taxonomy',
];

export default function AssistantScreen() {
  const { dashboardStats, performance } = useDashboardData();
  const { user, isSubscribed, showAuthPrompt } = useAuth();
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams();

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
      const history: AIMessage[] = messages
        .filter((m) => m.id !== 'initial')
        .map((m) => ({ role: m.role, content: m.content }));

      const contextStr = JSON.stringify({
        stats: dashboardStats,
        performance: performance,
      });

      const response = await chatWithHistory(history, text, contextStr);

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
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
              <Bot size={20} color={colors.text} />
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
                    <Bot size={16} color={colors.text} />
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
                    <MarkdownText content={item.content} role="assistant" />
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
                <Bot size={16} color={colors.text} />
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
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
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
});
