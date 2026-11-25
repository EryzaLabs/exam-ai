/**
 * AI Assistant Service using Hack Club Proxy
 * Provides AI-powered features like question explanations, doubt solving, and study assistance
 */

import { Platform } from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
const DIRECT_HACKCLUB_URL = 'https://ai.hackclub.com/proxy/v1/chat/completions';
const HACKCLUB_API_KEY = process.env.EXPO_PUBLIC_VLM_API_KEY || '';
const MODEL = 'openai/gpt-4o-mini';
const FALLBACK_FREE_MODEL = 'openrouter/free';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  message: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Send a chat message to the AI assistant
 */
export async function sendChatMessage(
  messages: ChatMessage[],
  temperature: number = 0.7
): Promise<AIResponse> {
  const payload = {
    model: MODEL,
    messages,
    temperature,
    max_tokens: 2000,
  };

  // Determine call strategies based on platform:
  // - On Native (iOS/Android): direct call to Hack Club works without CORS restrictions.
  // - On Web: browsers block direct cross-origin calls; route via backend /api/ai-chat or Netlify proxy.
  const endpointsToTry: Array<{ url: string; headers: Record<string, string> }> = [];

  if (Platform.OS === 'web') {
    // 1. App backend proxy (local or production)
    endpointsToTry.push({
      url: `${API_BASE_URL}/ai-chat`,
      headers: { 'Content-Type': 'application/json' },
    });
    // 2. Relative Netlify / reverse proxy rewrite
    endpointsToTry.push({
      url: '/api/hackclub/chat/completions',
      headers: {
        'Authorization': `Bearer ${HACKCLUB_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
  } else {
    // Native mobile: direct connection
    endpointsToTry.push({
      url: DIRECT_HACKCLUB_URL,
      headers: {
        'Authorization': `Bearer ${HACKCLUB_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    // Fallback to backend proxy
    endpointsToTry.push({
      url: `${API_BASE_URL}/ai-chat`,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let lastError: Error | null = null;

function classifyAIError(status: number, rawText: string): string {
  const lower = (rawText || '').toLowerCase();
  if (status === 429 || lower.includes('rate limit') || lower.includes('429')) {
    return 'RATE_LIMIT: Vidya is receiving many requests right now. Please wait a few seconds and try again.';
  }
  if (
    status === 402 ||
    lower.includes('402') ||
    lower.includes('payment required') ||
    lower.includes('spending limit')
  ) {
    return 'CREDITS_EXHAUSTED: AI service is temporarily busy. Please try again in a moment.';
  }
  if (status === 401 || lower.includes('authentication failed')) {
    return 'AUTH_ERROR: AI service authentication is temporarily unavailable.';
  }
  return 'SERVICE_UNAVAILABLE: Unable to reach Vidya AI right now. Please try again shortly.';
}

  for (const endpoint of endpointsToTry) {
    try {
      let response = await fetch(endpoint.url, {
        method: 'POST',
        headers: endpoint.headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const is402 =
          response.status === 402 ||
          errorText.includes('402') ||
          errorText.toLowerCase().includes('payment required') ||
          errorText.toLowerCase().includes('spending limit');

        if (is402) {
          console.warn(`[Vidya AI] 402 Payment Required at ${endpoint.url}, falling back to ${FALLBACK_FREE_MODEL}`);
          response = await fetch(endpoint.url, {
            method: 'POST',
            headers: endpoint.headers,
            body: JSON.stringify({ ...payload, model: FALLBACK_FREE_MODEL }),
          });
          if (response.status === 429) {
            // Brief backoff and single retry for free-tier per-minute rate limit
            await new Promise((r) => setTimeout(r, 1800));
            response = await fetch(endpoint.url, {
              method: 'POST',
              headers: endpoint.headers,
              body: JSON.stringify({ ...payload, model: FALLBACK_FREE_MODEL }),
            });
          }
          if (!response.ok) {
            const retryErr = await response.text();
            console.warn(`[Vidya AI] Fallback error (${response.status}):`, retryErr);
            throw new Error(classifyAIError(response.status, retryErr));
          }
        } else if (response.status === 429) {
          await new Promise((r) => setTimeout(r, 1800));
          response = await fetch(endpoint.url, {
            method: 'POST',
            headers: endpoint.headers,
            body: JSON.stringify(payload),
          });
          if (!response.ok) {
            const retryErr = await response.text();
            console.warn(`[Vidya AI] Rate limit retry error (${response.status}):`, retryErr);
            throw new Error(classifyAIError(response.status, retryErr));
          }
        } else {
          console.warn(`[Vidya AI] HTTP ${response.status} error:`, errorText);
          throw new Error(classifyAIError(response.status, errorText));
        }
      }

      const data = await response.json();
      if (!data?.choices?.[0]?.message?.content) {
        throw new Error('SERVICE_UNAVAILABLE: Received an empty response from Vidya AI.');
      }

      return {
        message: data.choices[0].message.content,
        usage: data.usage,
      };
    } catch (err: any) {
      lastError = err;
      console.warn(`[Vidya AI] Attempt at ${endpoint.url} failed:`, err.message || err);
    }
  }

  console.error('[Vidya AI] All endpoints failed:', lastError);
  throw lastError || new Error('Failed to connect to AI service. Please ensure the backend server is running.');
}

/**
 * Get detailed explanation for a question
 */
export async function explainQuestion(
  questionText: string,
  options: string[],
  correctAnswer: string,
  explanation?: string
): Promise<string> {
  const systemPrompt: ChatMessage = {
    role: 'system',
    content: 'You are an expert tutor helping students understand exam questions. Provide clear, detailed explanations that break down the concept, explain why the correct answer is right, and why other options are wrong. Use simple language and examples.',
  };

  const userPrompt: ChatMessage = {
    role: 'user',
    content: `Please explain this question in detail:

Question: ${questionText}

Options:
${options.map((opt, idx) => `${String.fromCharCode(65 + idx)}. ${opt}`).join('\n')}

Correct Answer: ${correctAnswer}
${explanation ? `\nExisting Explanation: ${explanation}` : ''}

Provide a comprehensive explanation covering:
1. The concept being tested
2. Why the correct answer is right
3. Why other options are incorrect
4. Tips to remember this concept`,
  };

  const response = await sendChatMessage([systemPrompt, userPrompt]);
  return response.message;
}

/**
 * Solve a doubt or answer a question
 */
export async function solveDoubt(
  doubtText: string,
  context?: string
): Promise<string> {
  const systemPrompt: ChatMessage = {
    role: 'system',
    content: 'You are a helpful study assistant. Answer student doubts clearly and concisely. Break down complex concepts into simple terms. Provide examples when helpful.',
  };

  const userPrompt: ChatMessage = {
    role: 'user',
    content: context 
      ? `Context: ${context}\n\nQuestion: ${doubtText}`
      : doubtText,
  };

  const response = await sendChatMessage([systemPrompt, userPrompt]);
  return response.message;
}

/**
 * Generate practice questions on a topic
 */
export async function generatePracticeQuestions(
  topic: string,
  examType: string,
  count: number = 5
): Promise<string> {
  const systemPrompt: ChatMessage = {
    role: 'system',
    content: `You are an expert exam question creator. Generate high-quality multiple-choice questions that match the difficulty and style of ${examType} exams.`,
  };

  const userPrompt: ChatMessage = {
    role: 'user',
    content: `Generate ${count} practice questions on the topic: "${topic}" for ${examType} exam.

Format each question as:
Q[number]. [Question text]
A. [Option 1]
B. [Option 2]
C. [Option 3]
D. [Option 4]
Correct Answer: [Letter]
Explanation: [Brief explanation]

Ensure questions test understanding, not just memorization.`,
  };

  const response = await sendChatMessage([systemPrompt, userPrompt], 0.8);
  return response.message;
}

/**
 * Get study tips for a specific topic or exam
 */
export async function getStudyTips(
  examType: string,
  subject?: string,
  weakAreas?: string[]
): Promise<string> {
  const systemPrompt: ChatMessage = {
    role: 'system',
    content: 'You are an experienced exam coach. Provide practical, actionable study tips tailored to the student\'s needs.',
  };

  let prompt = `Provide study tips and strategies for ${examType} exam`;
  if (subject) {
    prompt += ` focusing on ${subject}`;
  }
  if (weakAreas && weakAreas.length > 0) {
    prompt += `.\n\nStudent's weak areas: ${weakAreas.join(', ')}`;
  }
  prompt += '\n\nInclude:\n1. Study strategy\n2. Time management tips\n3. Resource recommendations\n4. Common mistakes to avoid';

  const userPrompt: ChatMessage = {
    role: 'user',
    content: prompt,
  };

  const response = await sendChatMessage([systemPrompt, userPrompt]);
  return response.message;
}

/**
 * Analyze test performance and provide insights
 */
export async function analyzePerformance(
  stats: {
    totalTests: number;
    averageScore: number;
    weakSubjects: string[];
    strongSubjects: string[];
    recentTrend: 'improving' | 'declining' | 'stable';
  }
): Promise<string> {
  const systemPrompt: ChatMessage = {
    role: 'system',
    content: 'You are a test performance analyst. Provide insightful, encouraging feedback with actionable recommendations.',
  };

  const userPrompt: ChatMessage = {
    role: 'user',
    content: `Analyze this student's performance and provide personalized recommendations:

Total Tests Taken: ${stats.totalTests}
Average Score: ${stats.averageScore}%
Strong Subjects: ${stats.strongSubjects.join(', ') || 'None identified yet'}
Weak Subjects: ${stats.weakSubjects.join(', ') || 'None identified yet'}
Recent Trend: ${stats.recentTrend}

Provide:
1. Performance analysis
2. Specific areas to focus on
3. Study plan recommendations
4. Motivational insights`,
  };

  const response = await sendChatMessage([systemPrompt, userPrompt]);
  return response.message;
}

/**
 * Chat with conversation history
 */
export async function chatWithHistory(
  conversationHistory: ChatMessage[],
  newMessage: string,
  userContext?: string
): Promise<AIResponse> {
  const systemPrompt: ChatMessage = {
    role: 'system',
    content: `You are Vidya (विद्या), a helpful study assistant for competitive exam preparation. Provide clear, accurate answers and explanations. Be encouraging and supportive. You can understand and speak Hindi.
    
User Context and App Data:
${userContext || 'No specific context available at the moment.'}`,
  };

  const messages: ChatMessage[] = [
    systemPrompt,
    ...conversationHistory,
    { role: 'user', content: newMessage },
  ];

  return sendChatMessage(messages);
}

/**
 * Simplify complex text for better understanding
 */
export async function simplifyText(
  text: string,
  targetLevel: 'beginner' | 'intermediate' = 'intermediate'
): Promise<string> {
  const systemPrompt: ChatMessage = {
    role: 'system',
    content: `You are an expert at explaining complex concepts simply. Rewrite text at a ${targetLevel} level while maintaining accuracy.`,
  };

  const userPrompt: ChatMessage = {
    role: 'user',
    content: `Simplify this text while keeping all important information:\n\n${text}`,
  };

  const response = await sendChatMessage([systemPrompt, userPrompt]);
  return response.message;
}

/**
 * Get mnemonic or memory trick for a concept
 */
export async function getMnemonic(
  concept: string,
  details?: string
): Promise<string> {
  const systemPrompt: ChatMessage = {
    role: 'system',
    content: 'You are creative at making memorable mnemonics and memory tricks. Make them fun, easy to remember, and culturally relevant.',
  };

  const userPrompt: ChatMessage = {
    role: 'user',
    content: `Create a memorable mnemonic or memory trick for: ${concept}${details ? `\n\nDetails: ${details}` : ''}`,
  };

  const response = await sendChatMessage([systemPrompt, userPrompt]);
  return response.message;
}
