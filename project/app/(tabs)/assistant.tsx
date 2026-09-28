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
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Send, Bot, User, FileText, Brain, TrendingUp, Target } from 'lucide-react-native';
import {
  ChatMessage as AIMessage,
  chatWithHistory,
} from '@/services/ai-assistant-service';

interface Message extends AIMessage {
  id: string;
  timestamp: Date;
}

const QUICK_ACTIONS = [
  { icon: <FileText size={24} color="#667eea" />, label: 'Simplify Rule/Act', action: 'simplify' },
  { icon: <Brain size={24} color="#667eea" />, label: 'Create Mnemonic', action: 'mnemonic' },
  { icon: <TrendingUp size={24} color="#667eea" />, label: 'Analyze Weakness', action: 'analyze' },
  { icon: <Target size={24} color="#667eea" />, label: 'Generate Quiz', action: 'quiz' },
];

export default function AssistantScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your UPSC Principal AI Assistant. I can help you with:\n\n• Simplifying complex administrative rules\n• Creating mnemonics for memorization\n• Analyzing your test weaknesses\n• Generating quick quizzes on specific topics\n• Explaining concepts in English and Hindi\n\nWhat would you like to do?",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const params = useLocalSearchParams();
  const initialPromptProcessed = useRef(false);

  useEffect(() => {
    if (params.prompt && !initialPromptProcessed.current) {
      initialPromptProcessed.current = true;
      const promptText = params.prompt as string;
      setInputText(promptText);
      // Slight delay to ensure UI mounts before sending
      setTimeout(() => sendMessage(promptText), 500);
    }
  }, [params.prompt]);

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const history: AIMessage[] = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const response = await chatWithHistory(history, messageText);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMsg = (error as Error).message || 'Failed to get response.';
      Alert.alert('Error', errorMsg);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${errorMsg}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = async (action: string) => {
    let prompt = '';
    switch (action) {
      case 'simplify':
        prompt = 'Can you simplify the General Financial Rules (GFR) or CCS Conduct Rules for me in simple terms?';
        break;
      case 'mnemonic':
        prompt = 'Create a mnemonic to help me remember the components of the National Curriculum Framework (NCF) 2005.';
        break;
      case 'analyze':
        prompt = 'Analyze my mock test performance and tell me which areas of Educational Administration I need to focus on.';
        break;
      case 'quiz':
        prompt = 'Give me 5 quick practice questions specifically on the Right to Education (RTE) Act 2009.';
        break;
    }
    if (prompt) {
      setInputText(prompt);
      sendMessage(prompt);
    }
  };

  const clearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear the conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setMessages([
              {
                id: '1',
                role: 'assistant',
                content: "Chat cleared! How can I help you?",
                timestamp: new Date(),
              },
            ]);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.botIcon}>
              <Bot size={24} color="#667eea" />
            </View>
            <View>
              <Text style={styles.headerTitle}>AI Assistant</Text>
              <View style={styles.statusContainer}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Online</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={clearChat} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>

        {messages.length <= 1 && (
          <View style={styles.quickActionsContainer}>
            <Text style={styles.quickActionsTitle}>Quick Actions</Text>
            <View style={styles.quickActions}>
              {QUICK_ACTIONS.map((action) => (
                <TouchableOpacity
                  key={action.action}
                  style={styles.quickActionButton}
                  onPress={() => handleQuickAction(action.action)}
                >
                  <View style={styles.quickActionIcon}>{action.icon}</View>
                  <Text style={styles.quickActionLabel}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageRow,
                message.role === 'user' ? styles.userMessageRow : styles.assistantMessageRow,
              ]}
            >
              {message.role === 'assistant' && (
                <View style={styles.messageIcon}>
                  <Bot size={20} color="#667eea" />
                </View>
              )}
              <View
                style={[
                  styles.messageBubble,
                  message.role === 'user' ? styles.userBubble : styles.assistantBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    message.role === 'user' ? styles.userMessageText : styles.assistantMessageText,
                  ]}
                >
                  {message.content}
                </Text>
                <Text
                  style={[
                    styles.messageTime,
                    message.role === 'user' ? styles.userMessageTime : styles.assistantMessageTime,
                  ]}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              {message.role === 'user' && (
                <View style={styles.messageIcon}>
                  <User size={20} color="#fff" />
                </View>
              )}
            </View>
          ))}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <View style={styles.loadingBubble}>
                <ActivityIndicator size="small" color="#667eea" />
                <Text style={styles.loadingText}>Thinking...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Ask me anything..."
              placeholderTextColor="#9CA3AF"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
              onPress={() => sendMessage()}
              disabled={!inputText.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Send size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.disclaimer}>
            AI responses may not always be accurate. Verify important information.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  botIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 12,
    color: '#6B7280',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#DC2626',
  },
  quickActionsContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  quickActionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickActionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    gap: 4,
  },
  quickActionIcon: {
    marginBottom: 4,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 16,
  },
  messageRow: {
    flexDirection: 'row',
    gap: 8,
    maxWidth: '85%',
  },
  userMessageRow: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  assistantMessageRow: {
    alignSelf: 'flex-start',
  },
  messageIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  messageBubble: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
  },
  userBubble: {
    backgroundColor: '#667eea',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#fff',
  },
  assistantMessageText: {
    color: '#1F2937',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  userMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  assistantMessageTime: {
    color: '#9CA3AF',
  },
  loadingContainer: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 8,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    borderBottomLeftRadius: 4,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  inputContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 22,
    fontSize: 15,
    color: '#1F2937',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  disclaimer: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
