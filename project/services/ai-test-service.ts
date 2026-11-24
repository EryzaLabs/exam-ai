/**
 * AI Test Service
 * Handles custom AI mock test generation, daily quotas, background job polling,
 * and test preparation for UPSC Principal preparation.
 */

import SSCCGLService, { ParsedMockTest } from './ssc-cgl-service';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://astra-backend.eryzalabs.cloud/api';

export interface AiDailyStatus {
  canGenerate: boolean;
  today: string;
  limit: number;
  freeUsed?: boolean;
  paidCredits?: number;
  allowPaidOption?: boolean;
  paidTestPrice?: number;
  message: string;
}

export interface StartAiTestParams {
  userId: string;
  topic: string;
  title?: string;
  orderId?: string;
  questionCount: number;
  durationMinutes: number;
  difficulty?: string;
}

export interface AiTestJobStatus {
  id: string;
  status: 'queued' | 'generating' | 'completed' | 'failed';
  progress: number;
  step: string;
  etaSeconds: number;
  error?: string;
  testId?: string;
  filename?: string;
  paper?: any;
}

class AiTestService {
  /**
   * Direct AI Test generation with polling or API fallback
   */
  async generateTest(params: {
    topic: string;
    subject?: string;
    questionCount?: number;
    difficulty?: string;
  }): Promise<{ questions: any[] }> {
    try {
      const response = await fetch(`${API_URL}/ai-tests/quick-drill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.questions)) return data;
      }
    } catch {}

    // Fallback: start background generation and poll for completion
    try {
      const job = await this.startGeneration({
        userId: 'drill-user',
        topic: params.topic,
        questionCount: params.questionCount || 10,
        durationMinutes: 15,
        difficulty: params.difficulty || 'Medium',
      });

      if (job?.jobId) {
        let attempts = 0;
        while (attempts < 15) {
          await new Promise((r) => setTimeout(r, 1000));
          attempts++;
          const status = await this.getJobStatus(job.jobId);
          if (status.status === 'completed' && status.paper) {
            const raw = status.paper.questions || status.paper.sections?.[0]?.questions || [];
            return {
              questions: raw.map((q: any, idx: number) => ({
                id: q.id || `q_${idx}`,
                questionText: q.question_english || q.en?.value || q.questionText || '',
                options: q.options_english || q.options || q.en?.options?.map((o: any) => o.value) || [],
                correctAnswerIndex: typeof q.correct_answer === 'number' ? q.correct_answer : 0,
                explanation: q.explanation_english || q.explanation || '',
              })),
            };
          }
        }
      }
    } catch {}

    throw new Error('Quick AI generation failed');
  }

  /**
   * Check if user has available AI test generation quota for today (1 per account per day)
   */
  async checkDailyQuota(userId: string): Promise<AiDailyStatus> {
    const cleanUid = userId || 'anonymous';
    const response = await fetch(`${API_URL}/ai-tests/daily-status/${encodeURIComponent(cleanUid)}`);
    if (!response.ok) {
      throw new Error(`Failed to check daily quota: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Start AI mock test generation in background for any topic in the world
   */
  async startGeneration(params: StartAiTestParams): Promise<{
    success: boolean;
    jobId: string;
    etaSeconds: number;
    message: string;
  }> {
    const response = await fetch(`${API_URL}/ai-tests/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || 'AI generator service is currently busy or out of credits. Please try again later.'
      );
    }

    return response.json();
  }

  /**
   * Unlock a paid AI test credit after successful ₹9 payment
   */
  async unlockPaidCredit(userId: string, orderId?: string): Promise<{ success: boolean; paidCredits: number }> {
    const cleanUid = userId || 'anonymous';
    const response = await fetch(`${API_URL}/ai-tests/unlock-paid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: cleanUid, orderId }),
    });
    if (!response.ok) {
      throw new Error(`Failed to unlock paid credit: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Poll status of background AI generation job
   */
  async getJobStatus(jobId: string): Promise<AiTestJobStatus> {
    const response = await fetch(`${API_URL}/ai-tests/status/${encodeURIComponent(jobId)}`);
    if (!response.ok) {
      throw new Error(`Failed to check generation status: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Register the generated AI paper into active memory so mock test engine starts immediately
   */
  async prepareAndCachePaper(paperData: any, filename?: string): Promise<ParsedMockTest> {
    const rawQuestions = paperData?.questions || paperData?.data?.questions;
    if (Array.isArray(rawQuestions) && rawQuestions.length > 0) {
      return SSCCGLService.loadPaper(paperData, undefined, filename);
    }

    // If paperData lacks questions, fetch full paper content from server
    if (filename) {
      try {
        return await SSCCGLService.fetchPaper(filename);
      } catch (e) {
        console.warn('prepareAndCachePaper: fetchPaper by filename failed:', e);
      }
    }

    const testId = paperData?.test_id || paperData?.id;
    if (testId) {
      try {
        const fetched = await SSCCGLService.fetchPaperById(testId);
        if (fetched && fetched.sections.some(s => s.questions.length > 0)) {
          return fetched;
        }
      } catch (e) {
        console.warn('prepareAndCachePaper: fetchPaperById failed:', e);
      }
    }

    return SSCCGLService.loadPaper(paperData, undefined, filename);
  }
}

export default new AiTestService();
