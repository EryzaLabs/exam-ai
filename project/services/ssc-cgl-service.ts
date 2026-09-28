/**
 * SSC CGL Mock Test Service
 * Loads and manages SSC CGL test papers with AI-generated answers
 */

import { Platform } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://exambc.alaotach.com/api';

export interface SSCCGLOption {
  prompt: string;
  value: string;
}

export interface SSCCGLQuestionLanguage {
  value: string;
  options: SSCCGLOption[];
  Range?: {
    start: string;
    end: string;
  };
}

export interface SSCCGLQuestionAI {
  question_id: string;
  correct_answer: string;
  explanation: string;
  key_concepts: string[];
}

export interface SSCCGLQuestion {
  _id: string;
  type: string;
  posMarks: number;
  negMarks: number;
  en: SSCCGLQuestionLanguage;
  hn?: SSCCGLQuestionLanguage;
  te?: SSCCGLQuestionLanguage;
  ai_generated?: {
    english: SSCCGLQuestionAI;
    hindi: SSCCGLQuestionAI;
  };
}

export interface SSCCGLSection {
  _id: string;
  title: string;
  qCount: number;
  time: number;
  questions: SSCCGLQuestion[];
}

export interface SSCCGLPaper {
  _id: string;
  title: string;
  course: string;
  duration: number;
  sections: SSCCGLSection[];
}

export interface SSCCGLPaperWithAnswers {
  test_id: string;
  test_name: string;
  generated_at: string;
  sections: Array<{
    section_name: string;
    questions: Array<{
      question_id: string;
      original_question: string;
      options: SSCCGLOption[];
      ai_generated: {
        english: SSCCGLQuestionAI;
        hindi: SSCCGLQuestionAI;
      };
    }>;
  }>;
}

export interface ParsedMockTest {
  id: string;
  title: string;
  examType: string;
  duration: number; // in seconds
  totalQuestions: number;
  totalMarks: number;
  sections: ParsedSection[];
  metadata: {
    year?: number;
    shift?: string;
    date?: string;
  };
}

export interface ParsedSection {
  id: string;
  title: string;
  questionCount: number;
  questions: ParsedQuestion[];
}

export interface ParsedQuestion {
  id: string;
  sectionId: string;
  questionText: string; // HTML content
  options: string[]; // Array of option values
  questionTextHindi?: string; // ADDED
  optionsHindi?: string[]; // ADDED
  correctAnswerIndex: number; // 0-based index
  correctAnswerText: string;
  explanation: {
    english: string;
    hindi?: string;
  };
  keyConcepts: string[];
  marks: {
    positive: number;
    negative: number;
  };
  metadata?: {
    language?: string;
  };
}

export interface UserAnswer {
  questionId: string;
  selectedOption: number; // 0-based index
  timeTaken: number; // in seconds
  isCorrect: boolean;
  marksAwarded: number;
}

export interface TestAttempt {
  id?: string;
  testId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  answers: UserAnswer[];
  currentQuestionIndex: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'submitted';
  score: number;
  totalMarks: number;
  accuracy: number;
}

export interface TestAnalytics {
  testId: string;
  attemptId: string;
  overallScore: number;
  totalMarks: number;
  accuracy: number;
  timeTaken: number;
  sectionAnalytics: SectionAnalytics[];
  strengthAreas: string[];
  weaknessAreas: string[];
  recommendations: string[];
  percentile?: number;
}

export interface SectionAnalytics {
  sectionId: string;
  sectionTitle: string;
  attempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
  accuracy: number;
  score: number;
  maxScore: number;
  timeTaken: number;
  averageTimePerQuestion: number;
}

class SSCCGLService {
  private papers: Map<string, ParsedMockTest> = new Map();
  private attempts: Map<string, TestAttempt> = new Map();
  private parsedTests: Map<string, ParsedMockTest> = new Map(); // For testseries tests

  /**
   * Fetch list of available papers from server
   */
  async fetchPapersList(): Promise<any[]> {
    try {
      const response = await fetch(`${API_URL}/papers`);
      if (!response.ok) throw new Error('Failed to fetch papers list');
      return await response.json();
    } catch (error) {
      console.error('Error fetching papers list:', error);
      return [];
    }
  }

  /**
   * Fetch paper content from server
   */
  async fetchPaper(filename: string): Promise<ParsedMockTest> {
    const response = await fetch(`${API_URL}/papers/${filename}`);
    if (!response.ok) throw new Error('Failed to fetch paper content');
    const paperData = await response.json();
    
    // Check if answers exist
    let answersData = undefined;
    try {
        const ansResponse = await fetch(`${API_URL}/papers/${filename}/answers`);
        if (ansResponse.ok) {
            answersData = await ansResponse.json();
        }
    } catch (e) {
        // Ignore answer fetch error
    }

    return this.loadPaper(paperData, answersData);
  }

  /**
   * Load a single SSC CGL paper from JSON
   */
  async loadPaper(paperData: any, answersData?: any): Promise<ParsedMockTest> {
    const paper = paperData.data || paperData;
    
    // Fallbacks for the new schema
    const testName = paper.test_name || 'UPSC Principal Exam Mock Test';
    const testId = paper.test_id || paper.id || 'unknown_id';
    
    // New schema doesn't have sections, just a flat array of questions
    const rawQuestions = paper.questions || [];
    
    const parsedQuestions = rawQuestions.map((q: any) => this.parseQuestion(q, 'main'));

    const section = {
      id: 'main',
      title: 'General',
      questionCount: parsedQuestions.length,
      questions: parsedQuestions
    };

    const sections = [section];
    const totalQuestions = parsedQuestions.length;
    const totalMarks = totalQuestions * 2.5; // 120 questions * 2.5 = 300 marks

    const mockTest: ParsedMockTest = {
      id: testId,
      title: testName,
      examType: 'UPSC Principal',
      duration: paper.duration || 7200, // 2 hours = 7200 seconds
      totalQuestions,
      totalMarks,
      sections,
      metadata: this.extractMetadata(testName),
    };

    this.papers.set(mockTest.id, mockTest);
    return mockTest;
  }

  /**
   * Process content to handle HTML entities, images, and LaTeX
   */
  private processContent(content: string): string {
    if (!content) return '';

    let decoded = content;

    // 0. Handle double encoding if present (e.g. &amp;quot;)
    decoded = decoded.replace(/&amp;/g, '&');

    // 1. Decode common HTML entities
    decoded = decoded
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&lsquo;/g, "‘")
      .replace(/&rsquo;/g, "’")
      .replace(/&ldquo;/g, "“")
      .replace(/&rdquo;/g, "”");

    // 2. Fix protocol-relative URLs in images (handle both " and ' quotes)
    // Matches src="//..." or src='//...'
    decoded = decoded.replace(/src=(["'])\/\//g, 'src=$1https://');

    // 3. Cleanup encoded quotes in attributes if any remain
    decoded = decoded.replace(/\\"/g, '"');
    
    // 4. Handle LaTeX/Math
    // Pattern: \( ... \) or \[ ... \]
    decoded = decoded.replace(/\\(\[|\()(.*?)\\(\]|\))/g, (match, open, latex, close) => {
        const encoded = encodeURIComponent(latex.trim());
        return `<img src="https://latex.codecogs.com/png.latex?${encoded}" style="height: 18px; vertical-align: middle; max-width: 100%;" />`;
    });
    
    // Pattern: $$ ... $$ (Display math)
    decoded = decoded.replace(/\$\$(.*?)\$\$/g, (match, latex) => {
        const encoded = encodeURIComponent(latex.trim());
        return `<div style="text-align: center; margin: 10px 0;"><img src="https://latex.codecogs.com/png.latex?${encoded}" style="height: 24px; max-width: 100%;" /></div>`;
    });

    return decoded;
  }

  /**
   * Parse a single question
   */
  private parseQuestion(
    question: any,
    sectionId: string
  ): ParsedQuestion {
    const optionsEn = question.options_english || [];
    const options = optionsEn.map((opt: string) => this.processContent(opt));
    
    let correctAnswerIndex = 0;
    if (typeof question.correct_answer === 'string') {
        const labels = ['a', 'b', 'c', 'd'];
        correctAnswerIndex = labels.indexOf(question.correct_answer.toLowerCase());
        if (correctAnswerIndex === -1) correctAnswerIndex = 0;
    } else if (typeof question.correct_answer === 'number') {
        correctAnswerIndex = question.correct_answer;
    }

    const correctAnswerText = options[correctAnswerIndex] || '';

    return {
      id: question.id || String(Math.random()),
      sectionId,
      questionText: this.processContent(question.question_english || ''),
      options,
      questionTextHindi: this.processContent(question.question_hindi || ''),
      optionsHindi: (question.options_hindi || []).map((opt: string) => this.processContent(opt)),
      correctAnswerIndex,
      correctAnswerText,
      explanation: {
        english: this.processContent(question.explanation_english || 'No explanation available'),
        hindi: this.processContent(question.explanation_hindi || ''),
      },
      keyConcepts: question.key_facts || [],
      marks: {
        positive: 2.5,
        negative: 0.833, // 33.33% of 2.5 marks
      },
      metadata: {
        language: 'en',
      },
    };
  }

  /**
   * Extract metadata from paper title
   */
  private extractMetadata(title: string): { year?: number; shift?: string; date?: string } {
    const yearMatch = title.match(/(\d{4})/);
    const shiftMatch = title.match(/Shift (\d+)/i);
    const dateMatch = title.match(/(\d{1,2}\s+\w+\s+\d{4})/);

    return {
      year: yearMatch ? parseInt(yearMatch[1]) : undefined,
      shift: shiftMatch ? shiftMatch[1] : undefined,
      date: dateMatch ? dateMatch[1] : undefined,
    };
  }

  /**
   * Get all loaded papers
   */
  getAllPapers(): ParsedMockTest[] {
    return Array.from(this.papers.values());
  }

  /**
   * Get paper by ID
   */
  getPaper(paperId: string): ParsedMockTest | undefined {
    // Check both regular papers and testseries tests
    const paper = this.papers.get(paperId) || this.parsedTests.get(paperId);
    console.log('[SSCCGLService] getPaper:', paperId, 'Found:', !!paper, 
      'Available tests:', Array.from(this.parsedTests.keys()));
    return paper;
  }

  /**
   * Start a new test attempt
   */
  startTestAttempt(testId: string, userId: string): TestAttempt {
    const attempt: TestAttempt = {
      testId,
      userId,
      startTime: new Date(),
      answers: [],
      currentQuestionIndex: 0,
      status: 'in_progress',
      score: 0,
      totalMarks: 0,
      accuracy: 0,
    };

    const attemptId = `${testId}_${userId}_${Date.now()}`;
    // Store attempt with the ID we will return attached to it, although interface doesn't have ID field yet.
    // The map key is the ID.
    this.attempts.set(attemptId, attempt);
    
    // We strictly need to return the ID so the caller can refer to it
    // But the interface TestAttempt doesn't have 'id'. We should probably add it or cast it.
    // Looking at usage in mock-test.tsx: const newAttempt = SSCCGLService.startTestAttempt(...); 
    // It expects an object with .id property? 
    // In mock-test.tsx: setAttempt(newAttempt); 
    // And usage: attempt.id
    
    // Let's patch the return to include ID just in case it's not in the interface but used at runtime
    return { ...attempt, id: attemptId } as TestAttempt & { id: string };
  }

  /**
   * Resume a test attempt from saved state
   */
  resumeTestAttempt(attemptId: string, savedAttempt: TestAttempt) {
      this.attempts.set(attemptId, savedAttempt);
  }

  /**
   * Record an answer
   */
  recordAnswer(
    attemptId: string,
    questionId: string,
    selectedOption: number,
    timeTaken: number,
    question: ParsedQuestion
  ): void {
    const attempt = this.attempts.get(attemptId);
    if (!attempt) return;

    const isCorrect = selectedOption === question.correctAnswerIndex;
    const marksAwarded = isCorrect ? question.marks.positive : -question.marks.negative;

    const answer: UserAnswer = {
      questionId,
      selectedOption,
      timeTaken,
      isCorrect,
      marksAwarded,
    };

    // Remove existing answer for this question if any
    attempt.answers = attempt.answers.filter((a) => a.questionId !== questionId);
    attempt.answers.push(answer);
  }

  /**
   * Submit test and calculate results
   */
  submitTest(attemptId: string): TestAnalytics | null {
    const attempt = this.attempts.get(attemptId);
    if (!attempt) return null;

    if (attempt.status !== 'submitted') {
      attempt.endTime = new Date();
      attempt.status = 'submitted';
    }
    const endTime = attempt.endTime || new Date();

    const paper = this.papers.get(attempt.testId);
    if (!paper) return null;

    // Calculate overall score
    const score = attempt.answers.reduce((sum, ans) => sum + ans.marksAwarded, 0);
    const correctAnswers = attempt.answers.filter((a) => a.isCorrect).length;
    const attemptedQuestions = attempt.answers.length;
    const accuracy = attemptedQuestions > 0 ? (correctAnswers / attemptedQuestions) * 100 : 0;
    const timeTaken = (endTime.getTime() - attempt.startTime.getTime()) / 1000;

    attempt.score = score;
    attempt.totalMarks = paper.totalMarks;
    attempt.accuracy = accuracy;

    // Calculate section-wise analytics
    const sectionAnalytics = this.calculateSectionAnalytics(paper, attempt);

    // Identify strengths and weaknesses
    const { strengthAreas, weaknessAreas } = this.identifyStrengthsWeaknesses(sectionAnalytics);

    // Generate recommendations
    const recommendations = this.generateRecommendations(sectionAnalytics, weaknessAreas);

    return {
      testId: attempt.testId,
      attemptId,
      overallScore: score,
      totalMarks: paper.totalMarks,
      accuracy,
      timeTaken,
      sectionAnalytics,
      strengthAreas,
      weaknessAreas,
      recommendations,
    };
  }

  /**
   * Calculate section-wise analytics
   */
  private calculateSectionAnalytics(paper: ParsedMockTest, attempt: TestAttempt): SectionAnalytics[] {
    return paper.sections.map((section) => {
      const sectionQuestionIds = new Set(section.questions.map((q) => q.id));
      const sectionAnswers = attempt.answers.filter((a) => sectionQuestionIds.has(a.questionId));

      const attempted = sectionAnswers.length;
      const correct = sectionAnswers.filter((a) => a.isCorrect).length;
      const incorrect = sectionAnswers.filter((a) => !a.isCorrect).length;
      const skipped = section.questionCount - attempted;
      const accuracy = attempted > 0 ? (correct / attempted) * 100 : 0;
      const score = sectionAnswers.reduce((sum, a) => sum + a.marksAwarded, 0);
      const maxScore = section.questions.reduce((sum, q) => sum + q.marks.positive, 0);
      const timeTaken = sectionAnswers.reduce((sum, a) => sum + a.timeTaken, 0);
      const averageTimePerQuestion = attempted > 0 ? timeTaken / attempted : 0;

      return {
        sectionId: section.id,
        sectionTitle: section.title,
        attempted,
        correct,
        incorrect,
        skipped,
        accuracy,
        score,
        maxScore,
        timeTaken,
        averageTimePerQuestion,
      };
    });
  }

  /**
   * Identify strength and weakness areas
   */
  private identifyStrengthsWeaknesses(
    sectionAnalytics: SectionAnalytics[]
  ): { strengthAreas: string[]; weaknessAreas: string[] } {
    const strengthAreas: string[] = [];
    const weaknessAreas: string[] = [];

    sectionAnalytics.forEach((section) => {
      if (section.accuracy >= 70) {
        strengthAreas.push(section.sectionTitle);
      } else if (section.accuracy < 50) {
        weaknessAreas.push(section.sectionTitle);
      }
    });

    return { strengthAreas, weaknessAreas };
  }

  /**
   * Generate recommendations based on performance
   */
  private generateRecommendations(
    sectionAnalytics: SectionAnalytics[],
    weaknessAreas: string[]
  ): string[] {
    const recommendations: string[] = [];

    // Check for low accuracy sections
    const lowAccuracySections = sectionAnalytics.filter((s) => s.accuracy < 60);
    if (lowAccuracySections.length > 0) {
      recommendations.push(
        `Focus on improving: ${lowAccuracySections.map((s) => s.sectionTitle).join(', ')}`
      );
    }

    // Check for time management
    const slowSections = sectionAnalytics.filter((s) => s.averageTimePerQuestion > 90);
    if (slowSections.length > 0) {
      recommendations.push(
        `Work on speed for: ${slowSections.map((s) => s.sectionTitle).join(', ')}`
      );
    }

    // Check for skipped questions
    const highSkipSections = sectionAnalytics.filter((s) => s.skipped > s.questionCount * 0.2);
    if (highSkipSections.length > 0) {
      recommendations.push(
        `Attempt more questions in: ${highSkipSections.map((s) => s.sectionTitle).join(', ')}`
      );
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Great performance! Keep practicing to maintain consistency.');
    }

    return recommendations;
  }

  /**
   * Get attempt by ID
   */
  getAttempt(attemptId: string): TestAttempt | undefined {
    return this.attempts.get(attemptId);
  }

  /**
   * Store a paper in memory for immediate use (for testseries tests)
   */
  async storePaperInMemory(testData: any): Promise<void> {
    const parsed = await this.loadPaper(testData, undefined);
    console.log('[SSCCGLService] Storing test with ID:', parsed.id, 'Title:', parsed.title);
    this.parsedTests.set(parsed.id, parsed);
  }
}

export default new SSCCGLService();
