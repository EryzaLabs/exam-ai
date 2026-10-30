/**
 * AI Test Service
 * Handles custom AI mock test generation, daily quotas, background job polling,
 * and test preparation for UPSC Principal preparation.
 */

import SSCCGLService, { ParsedMockTest } from './ssc-cgl-service';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface AiDailyStatus {
  canGenerate: boolean;
  today: string;
  limit: number;
  message: string;
}

export interface StartAiTestParams {
  userId: string;
  topic: string;
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
