/**
 * Enhanced Question Database Service with BharatKosh Integration
 * AI-Powered Procedural Generation & Advanced Analytics
 */

import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// BharatKosh Question Interface
export interface BharatKoshQuestion {
  id: string;
  created_at: string;
  question_hindi: string;
  question_english: string;
  options_hindi: string[];
  options_english: string[];
  option_labels: string[];
  correct_answer: string; // 'a', 'b', 'c', 'd'
  explanation_english: string;
  explanation_hindi: string;
  topic: string;
  difficulty: string;
  key_facts: string[];
  source: string;
  page_number: number;
  question_number?: number;
  subject: string;
  ai_processed: boolean;
  processed_at: string;
}

// Enhanced App Question Interface
export interface AppQuestion {
  id: string;
  question: string;
  questionHindi?: string;
  options: string[];
  optionsHindi?: string[];
  correctAnswer: number; // 0-based index
  correctAnswerLabel: string; // 'a', 'b', 'c', 'd'
  explanation: string;
  explanationHindi?: string;
  subject: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeToSolve: number;
  keyFacts: string[];
  language: 'english' | 'hindi' | 'both';
  metadata: {
    examType: string;
    year?: number;
    paperName?: string;
    topics: string[];
    source: string;
    pageNumber?: number;
    questionNumber?: number;
    aiProcessed: boolean;
  };
}

// User Performance Tracking
export interface UserPerformance {
  userId: string;
  totalQuestionsAttempted: number;
  totalCorrectAnswers: number;
  overallAccuracy: number;
  timeSpent: number; // in seconds
  streakCurrent: number;
  streakBest: number;
  lastActivityDate: string;
  subjectWisePerformance: Record<string, SubjectPerformance>;
  topicWisePerformance: Record<string, TopicPerformance>;
  difficultyWisePerformance: Record<string, DifficultyPerformance>;
  weeklyProgress: WeeklyProgress[];
  achievements: Achievement[];
  personalizedRecommendations: Recommendation[];
}

export interface SubjectPerformance {
  subject: string;
  questionsAttempted: number;
  correctAnswers: number;
  accuracy: number;
  averageTime: number;
  strongTopics: string[];
  weakTopics: string[];
  improvementTrend: 'improving' | 'declining' | 'stable';
}

export interface TopicPerformance {
  topic: string;
  subject: string;
  questionsAttempted: number;
  correctAnswers: number;
  accuracy: number;
  averageTime: number;
  masteryLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  lastAttempted: string;
  confidenceScore: number; // 0-100
}

export interface DifficultyPerformance {
  difficulty: string;
  questionsAttempted: number;
  correctAnswers: number;
  accuracy: number;
  averageTime: number;
}

export interface WeeklyProgress {
  week: string; // YYYY-WW format
  questionsAttempted: number;
  accuracy: number;
  timeSpent: number;
  newTopicsMastered: number;
  improvementRate: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  type: 'accuracy' | 'streak' | 'speed' | 'topic_mastery' | 'consistency';
  icon: string;
  color: string;
  unlockedAt: string;
  progress: number; // 0-100
  target: number;
}

export interface Recommendation {
  type: 'topic_focus' | 'difficulty_adjustment' | 'time_management' | 'revision';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionItems: string[];
  estimatedImpact: number; // 0-100
}

// AI Test Generation
export interface AITestRequest {
  userId: string;
  targetDifficulty?: string;
  focusTopics?: string[];
  weakAreas?: string[];
  timeLimit?: number;
  questionCount: number;
  includeRevision: boolean;
  adaptiveMode: boolean;
  language: 'english' | 'hindi' | 'both';
}

export interface TestResult {
  testId: string;
  userId: string;
  questions: AppQuestion[];
  userAnswers: (number | null)[];
  timeTaken: number[];
  totalTime: number;
  score: number;
  accuracy: number;
  completedAt: string;
  analysis: TestAnalysis;
}

export interface TestAnalysis {
  overallPerformance: {
    score: number;
    accuracy: number;
    totalTime: number;
    averageTimePerQuestion: number;
    rank: string; // percentile
  };
  subjectWiseAnalysis: Record<string, {
    attempted: number;
    correct: number;
    accuracy: number;
    timeSpent: number;
    strengths: string[];
    improvements: string[];
  }>;
  difficultyAnalysis: {
    easy: { attempted: number; correct: number; time: number };
    medium: { attempted: number; correct: number; time: number };
    hard: { attempted: number; correct: number; time: number };
  };
  speedAnalysis: {
    fastQuestions: number;
    slowQuestions: number;
    optimalTimeQuestions: number;
    timeDistribution: number[];
  };
  recommendations: {
    studyPlan: string[];
    focusAreas: string[];
    practiceTopics: string[];
    nextDifficulty: string;
  };
  comparison: {
    previousTests: {
      accuracyTrend: number;
      speedTrend: number;
      difficultyProgression: string;
    };
    peerComparison: {
      percentile: number;
      averageAccuracy: number;
      averageTime: number;
    };
  };
}

export interface AppTest {
  id: string;
  name: string;
  description?: string;
  examType?: string;
  year?: number;
  paperName?: string;
  questions: AppQuestion[];
  duration: number;
  totalMarks: number;
  metadata?: Record<string, any>;
}

export class QuestionDatabaseService {
  private databasePath: string;
  private database: QuestionDatabase | null = null;
  private questionsMap: Map<string, AppQuestion> = new Map();

  constructor(databasePath?: string) {
    this.databasePath =
      databasePath || `${FileSystem.documentDirectory}question_database.json`;
  }

  /**
   * Load database from file
   */
  async loadDatabase(): Promise<void> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(this.databasePath);

      if (fileInfo.exists) {
        const content = await FileSystem.readAsStringAsync(this.databasePath);
        this.database = JSON.parse(content);
        await this.indexQuestions();
        console.log(`Loaded ${this.questionsMap.size} questions from database`);
      } else {
        console.log('No database found, creating new one');
        this.database = this.createEmptyDatabase();
      }
    } catch (error) {
      console.error('Error loading database:', error);
      this.database = this.createEmptyDatabase();
    }
  }

  /**
   * Save database to file
   */
  async saveDatabase(): Promise<void> {
    if (!this.database) {
      throw new Error('No database to save');
    }

    try {
      const content = JSON.stringify(this.database, null, 2);
      await FileSystem.writeAsStringAsync(this.databasePath, content);
      console.log('Database saved successfully');
    } catch (error) {
      console.error('Error saving database:', error);
      throw error;
    }
  }

  /**
   * Import questions from processed PDF
   */
  async importQuestions(
    questions: ExtractedQuestion[],
    categories: QuestionCategory[]
  ): Promise<void> {
    if (!this.database) {
      await this.loadDatabase();
    }

    // Convert to app format
    const appQuestions = questions.map((q) => this.convertToAppFormat(q));

    // Add to questions map
    for (const question of appQuestions) {
      this.questionsMap.set(question.id, question);
    }

    // Merge categories
    this.mergeCategories(categories);

    // Update database
    this.database!.totalQuestions = this.questionsMap.size;
    this.database!.lastUpdated = new Date();

    await this.saveDatabase();
  }

  /**
   * Generate test based on filters
   */
  async generateTest(request: TestGenerationRequest): Promise<AppTest> {
    if (!this.database) {
      await this.loadDatabase();
    }

    // Get questions matching filters
    const matchingQuestions = this.filterQuestions(request.filters);

    // Select questions
    let selectedQuestions = matchingQuestions;

    if (request.randomize) {
      selectedQuestions = this.shuffleArray([...matchingQuestions]);
    }

    selectedQuestions = selectedQuestions.slice(0, request.count);

    // Create test
    const test: AppTest = {
      id: this.generateTestId(),
      name: this.generateTestName(request),
      description: this.generateTestDescription(request),
      examType: request.filters.examTypes?.[0],
      year: request.filters.years?.[0],
      questions: selectedQuestions,
      duration: request.duration || this.estimateDuration(selectedQuestions),
      totalMarks: selectedQuestions.length,
      metadata: {
        testType: request.testType,
        filters: request.filters,
        generatedAt: new Date().toISOString(),
      },
    };

    return test;
  }

  /**
   * Get questions by category
   */
  async getQuestionsByCategory(categoryId: string): Promise<AppQuestion[]> {
    if (!this.database) {
      await this.loadDatabase();
    }

    const category = this.findCategory(categoryId, this.database!.categories);
    if (!category) {
      return [];
    }

    return category.questions
      .map((qId) => this.questionsMap.get(qId))
      .filter((q): q is AppQuestion => q !== undefined);
  }

  /**
   * Get all exam types
   */
  async getExamTypes(): Promise<string[]> {
    if (!this.database) {
      await this.loadDatabase();
    }

    const examCategories = this.database!.categories.filter(
      (c) => c.type === 'exam_type'
    );

    return examCategories.map((c) => c.metadata.examType!);
  }

  /**
   * Get subjects for an exam type
   */
  async getSubjects(examType?: string): Promise<string[]> {
    if (!this.database) {
      await this.loadDatabase();
    }

    let subjectCategories = this.database!.categories.filter(
      (c) => c.type === 'subject'
    );

    if (examType) {
      subjectCategories = subjectCategories.filter(
        (c) => c.metadata.examType === examType
      );
    }

    return Array.from(new Set(subjectCategories.map((c) => c.metadata.subject!)));
  }

  /**
   * Get available years
   */
  async getYears(examType?: string): Promise<number[]> {
    if (!this.database) {
      await this.loadDatabase();
    }

    let yearCategories = this.database!.categories.filter(
      (c) => c.type === 'year'
    );

    if (examType) {
      yearCategories = yearCategories.filter(
        (c) => c.metadata.examType === examType
      );
    }

    return yearCategories
      .map((c) => c.metadata.year!)
      .filter((y) => y !== undefined)
      .sort((a, b) => b - a);
  }

  /**
   * Search questions
   */
  async searchQuestions(query: string, filters?: TestFilters): Promise<AppQuestion[]> {
    if (!this.database) {
      await this.loadDatabase();
    }

    let questions = Array.from(this.questionsMap.values());

    // Apply filters
    if (filters) {
      questions = this.applyFilters(questions, filters);
    }

    // Search in question text
    const lowerQuery = query.toLowerCase();
    return questions.filter((q) =>
      q.question.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get statistics
   */
  async getStatistics(): Promise<any> {
    if (!this.database) {
      await this.loadDatabase();
    }

    const questions = Array.from(this.questionsMap.values());

    const byExamType: Record<string, number> = {};
    const bySubject: Record<string, number> = {};
    const byDifficulty: Record<string, number> = {};
    const byYear: Record<number, number> = {};

    for (const question of questions) {
      // Count by exam type
      if (question.metadata.examType) {
        byExamType[question.metadata.examType] =
          (byExamType[question.metadata.examType] || 0) + 1;
      }

      // Count by subject
      bySubject[question.subject] = (bySubject[question.subject] || 0) + 1;

      // Count by difficulty
      byDifficulty[question.difficulty] =
        (byDifficulty[question.difficulty] || 0) + 1;

      // Count by year
      if (question.metadata.year) {
        byYear[question.metadata.year] =
          (byYear[question.metadata.year] || 0) + 1;
      }
    }

    return {
      totalQuestions: questions.length,
      byExamType,
      bySubject,
      byDifficulty,
      byYear,
    };
  }

  /**
   * Reset all data (for testing purposes)
   */
  async resetDatabase(): Promise<void> {
    try {
      const documentsDir = FileSystem.documentDirectory + 'questions/';
      const dirExists = await FileSystem.getInfoAsync(documentsDir);
      
      if (dirExists.exists) {
        await FileSystem.deleteAsync(documentsDir, { idempotent: true });
      }
      
      console.log('Question database reset successfully');
    } catch (error) {
      console.error('Failed to reset database:', error);
      throw error;
    }
  }
}

class EnhancedQuestionDatabase {
  private static instance: EnhancedQuestionDatabase;
  private bharatkoshQuestions: BharatKoshQuestion[] = [];
  private userPerformance: UserPerformance | null = null;
  private apiKey: string;
  private baseURL: string;

  private constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_BHARATKOSH_API_KEY || '';
    const defaultUrl = 'https://ai.hackclub.com/proxy/v1';
    this.baseURL = process.env.EXPO_PUBLIC_BHARATKOSH_BASE_URL || 
      (Platform.OS === 'web' ? `https://corsproxy.io/?${encodeURIComponent(defaultUrl)}` : defaultUrl);
    // Load data asynchronously to prevent blocking app initialization
    this.initializeAsync();
  }

  private async initializeAsync(): Promise<void> {
    await this.loadBharatKoshQuestions();
    await this.loadUserPerformance();
  }

  public static getInstance(): EnhancedQuestionDatabase {
    if (!EnhancedQuestionDatabase.instance) {
      EnhancedQuestionDatabase.instance = new EnhancedQuestionDatabase();
    }
    return EnhancedQuestionDatabase.instance;
  }

  // Load BharatKosh Questions from local JSON
  private async loadBharatKoshQuestions(): Promise<void> {
    try {
      // BharatKosh data is not bundled with the app by default
      // This is a fallback mechanism - data can be loaded via API if needed
      console.log('ℹ️ BharatKosh questions loading skipped (not bundled in app)');
      this.bharatkoshQuestions = this.getSampleQuestions();
    } catch (error) {
      console.warn('⚠️ Failed to load BharatKosh questions, using sample data:', error);
      this.bharatkoshQuestions = this.getSampleQuestions();
    }
  }

  // Convert BharatKosh questions to App format
  private convertToAppQuestion(bharatkoshQ: BharatKoshQuestion, language: 'english' | 'hindi' | 'both' = 'english'): AppQuestion {
    const correctAnswerIndex = ['a', 'b', 'c', 'd'].indexOf(bharatkoshQ.correct_answer.toLowerCase());
    
    return {
      id: bharatkoshQ.id,
      question: language === 'hindi' ? bharatkoshQ.question_hindi : bharatkoshQ.question_english,
      questionHindi: bharatkoshQ.question_hindi,
      options: language === 'hindi' ? bharatkoshQ.options_hindi : bharatkoshQ.options_english,
      optionsHindi: bharatkoshQ.options_hindi,
      correctAnswer: correctAnswerIndex,
      correctAnswerLabel: bharatkoshQ.correct_answer,
      explanation: language === 'hindi' ? bharatkoshQ.explanation_hindi : bharatkoshQ.explanation_english,
      explanationHindi: bharatkoshQ.explanation_hindi,
      subject: 'History',
      topic: bharatkoshQ.topic,
      difficulty: bharatkoshQ.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard',
      timeToSolve: this.calculateTimeToSolve(bharatkoshQ.difficulty),
      keyFacts: bharatkoshQ.key_facts,
      language: language,
      metadata: {
        examType: 'BharatKosh History',
        year: 2026,
        paperName: 'History General Knowledge',
        topics: [bharatkoshQ.topic],
        source: bharatkoshQ.source,
        pageNumber: bharatkoshQ.page_number,
        questionNumber: bharatkoshQ.question_number,
        aiProcessed: bharatkoshQ.ai_processed,
      },
    };
  }

  private calculateTimeToSolve(difficulty: string): number {
    const timeMap = { easy: 30, medium: 45, hard: 60 };
    return timeMap[difficulty.toLowerCase() as keyof typeof timeMap] || 45;
  }

  // AI-Powered Question Generation
  public async generateAITest(request: AITestRequest): Promise<AppQuestion[]> {
    try {
      // Get user performance to inform AI selection
      const performance = await this.getUserPerformance(request.userId);
      
      // AI-powered question selection algorithm
      let availableQuestions = this.bharatkoshQuestions.map(q => 
        this.convertToAppQuestion(q, request.language)
      );

      // Filter by focus topics if specified
      if (request.focusTopics && request.focusTopics.length > 0) {
        availableQuestions = availableQuestions.filter(q => 
          request.focusTopics!.some(topic => q.topic.includes(topic))
        );
      }

      // Adaptive difficulty based on user performance
      if (request.adaptiveMode && performance) {
        availableQuestions = this.adaptiveDifficultySelection(availableQuestions, performance);
      }

      // Include weak areas for focused practice
      if (request.weakAreas && request.weakAreas.length > 0) {
        const weakAreaQuestions = availableQuestions.filter(q => 
          request.weakAreas!.some(topic => q.topic.includes(topic))
        );
        const regularQuestions = availableQuestions.filter(q => 
          !request.weakAreas!.some(topic => q.topic.includes(topic))
        );
        
        // 60% weak areas, 40% general
        const weakCount = Math.ceil(request.questionCount * 0.6);
        const regularCount = request.questionCount - weakCount;
        
        availableQuestions = [
          ...this.shuffleArray(weakAreaQuestions).slice(0, weakCount),
          ...this.shuffleArray(regularQuestions).slice(0, regularCount)
        ];
      }

      // Include revision questions if requested
      if (request.includeRevision && performance) {
        const revisionQuestions = this.getRevisionQuestions(performance);
        const revisionCount = Math.ceil(request.questionCount * 0.2);
        const newQuestionCount = request.questionCount - revisionCount;
        
        availableQuestions = [
          ...revisionQuestions.slice(0, revisionCount),
          ...this.shuffleArray(availableQuestions).slice(0, newQuestionCount)
        ];
      }

      // Final selection and shuffle
      const selectedQuestions = this.shuffleArray(availableQuestions).slice(0, request.questionCount);
      
      // AI-enhance questions based on user preferences
      return this.enhanceQuestionsWithAI(selectedQuestions, request);
    } catch (error) {
      console.error('❌ AI test generation failed:', error);
      // Fallback to random selection
      return this.shuffleArray(
        this.bharatkoshQuestions.map(q => this.convertToAppQuestion(q, request.language))
      ).slice(0, request.questionCount);
    }
  }

  private adaptiveDifficultySelection(questions: AppQuestion[], performance: UserPerformance): AppQuestion[] {
    const accuracy = performance.overallAccuracy;
    
    // Adaptive difficulty distribution based on user performance
    let difficultyDistribution: { easy: number; medium: number; hard: number };
    
    if (accuracy < 60) {
      difficultyDistribution = { easy: 0.6, medium: 0.3, hard: 0.1 };
    } else if (accuracy < 80) {
      difficultyDistribution = { easy: 0.3, medium: 0.5, hard: 0.2 };
    } else {
      difficultyDistribution = { easy: 0.2, medium: 0.4, hard: 0.4 };
    }

    const easyQuestions = questions.filter(q => q.difficulty === 'easy');
    const mediumQuestions = questions.filter(q => q.difficulty === 'medium');
    const hardQuestions = questions.filter(q => q.difficulty === 'hard');

    return [
      ...this.shuffleArray(easyQuestions).slice(0, Math.floor(questions.length * difficultyDistribution.easy)),
      ...this.shuffleArray(mediumQuestions).slice(0, Math.floor(questions.length * difficultyDistribution.medium)),
      ...this.shuffleArray(hardQuestions).slice(0, Math.floor(questions.length * difficultyDistribution.hard))
    ];
  }

  private getRevisionQuestions(performance: UserPerformance): AppQuestion[] {
    // Get questions from topics where user previously made mistakes
    const weakTopics = Object.entries(performance.topicWisePerformance)
      .filter(([_, perf]) => perf.accuracy < 70)
      .map(([topic, _]) => topic);
    
    return this.bharatkoshQuestions
      .filter(q => weakTopics.some(topic => q.topic.includes(topic)))
      .map(q => this.convertToAppQuestion(q));
  }

  private async enhanceQuestionsWithAI(questions: AppQuestion[], request: AITestRequest): Promise<AppQuestion[]> {
    // AI enhancement could include:
    // - Dynamic hint generation
    // - Personalized explanations
    // - Contextual examples
    // For now, return questions as-is
    return questions;
  }

  // User Performance Tracking
  public async recordTestResult(result: TestResult): Promise<void> {
    try {
      const performance = await this.getUserPerformance(result.userId) || this.createInitialPerformance(result.userId);
      
      // Update overall statistics
      performance.totalQuestionsAttempted += result.questions.length;
      performance.totalCorrectAnswers += result.score;
      performance.overallAccuracy = (performance.totalCorrectAnswers / performance.totalQuestionsAttempted) * 100;
      performance.timeSpent += result.totalTime;
      performance.lastActivityDate = new Date().toISOString();
      
      // Update streak
      if (result.accuracy >= 70) { // 70% threshold for maintaining streak
        performance.streakCurrent += 1;
        performance.streakBest = Math.max(performance.streakBest, performance.streakCurrent);
      } else {
        performance.streakCurrent = 0;
      }

      // Update subject-wise performance
      this.updateSubjectPerformance(performance, result);
      
      // Update topic-wise performance
      this.updateTopicPerformance(performance, result);
      
      // Update difficulty-wise performance
      this.updateDifficultyPerformance(performance, result);
      
      // Update weekly progress
      this.updateWeeklyProgress(performance, result);
      
      // Check for new achievements
      this.checkAchievements(performance);
      
      // Generate personalized recommendations
      performance.personalizedRecommendations = this.generateRecommendations(performance);
      
      // Save performance
      await this.saveUserPerformance(performance);
      
    } catch (error) {
      console.error('❌ Failed to record test result:', error);
    }
  }

  private updateSubjectPerformance(performance: UserPerformance, result: TestResult): void {
    const subjectStats: Record<string, { attempted: number; correct: number; time: number }> = {};
    
    result.questions.forEach((question, index) => {
      const subject = question.subject;
      if (!subjectStats[subject]) {
        subjectStats[subject] = { attempted: 0, correct: 0, time: 0 };
      }
      
      subjectStats[subject].attempted++;
      if (result.userAnswers[index] === question.correctAnswer) {
        subjectStats[subject].correct++;
      }
      subjectStats[subject].time += result.timeTaken[index];
    });

    Object.entries(subjectStats).forEach(([subject, stats]) => {
      if (!performance.subjectWisePerformance[subject]) {
        performance.subjectWisePerformance[subject] = {
          subject,
          questionsAttempted: 0,
          correctAnswers: 0,
          accuracy: 0,
          averageTime: 0,
          strongTopics: [],
          weakTopics: [],
          improvementTrend: 'stable'
        };
      }
      
      const subjectPerf = performance.subjectWisePerformance[subject];
      subjectPerf.questionsAttempted += stats.attempted;
      subjectPerf.correctAnswers += stats.correct;
      subjectPerf.accuracy = (subjectPerf.correctAnswers / subjectPerf.questionsAttempted) * 100;
      subjectPerf.averageTime = ((subjectPerf.averageTime * (subjectPerf.questionsAttempted - stats.attempted)) + stats.time) / subjectPerf.questionsAttempted;
    });
  }

  private updateTopicPerformance(performance: UserPerformance, result: TestResult): void {
    const topicStats: Record<string, { attempted: number; correct: number; time: number }> = {};
    
    result.questions.forEach((question, index) => {
      const topic = question.topic;
      if (!topicStats[topic]) {
        topicStats[topic] = { attempted: 0, correct: 0, time: 0 };
      }
      
      topicStats[topic].attempted++;
      if (result.userAnswers[index] === question.correctAnswer) {
        topicStats[topic].correct++;
      }
      topicStats[topic].time += result.timeTaken[index];
    });

    Object.entries(topicStats).forEach(([topic, stats]) => {
      if (!performance.topicWisePerformance[topic]) {
        performance.topicWisePerformance[topic] = {
          topic,
          subject: result.questions.find(q => q.topic === topic)?.subject || 'History',
          questionsAttempted: 0,
          correctAnswers: 0,
          accuracy: 0,
          averageTime: 0,
          masteryLevel: 'beginner',
          lastAttempted: new Date().toISOString(),
          confidenceScore: 0
        };
      }
      
      const topicPerf = performance.topicWisePerformance[topic];
      topicPerf.questionsAttempted += stats.attempted;
      topicPerf.correctAnswers += stats.correct;
      topicPerf.accuracy = (topicPerf.correctAnswers / topicPerf.questionsAttempted) * 100;
      topicPerf.averageTime = ((topicPerf.averageTime * (topicPerf.questionsAttempted - stats.attempted)) + stats.time) / topicPerf.questionsAttempted;
      topicPerf.lastAttempted = new Date().toISOString();
      
      // Update mastery level
      if (topicPerf.accuracy >= 90 && topicPerf.questionsAttempted >= 10) {
        topicPerf.masteryLevel = 'expert';
      } else if (topicPerf.accuracy >= 80 && topicPerf.questionsAttempted >= 8) {
        topicPerf.masteryLevel = 'advanced';
      } else if (topicPerf.accuracy >= 70 && topicPerf.questionsAttempted >= 5) {
        topicPerf.masteryLevel = 'intermediate';
      }
      
      topicPerf.confidenceScore = Math.min(100, (topicPerf.accuracy * 0.7) + (Math.min(topicPerf.questionsAttempted, 20) * 1.5));
    });
  }

  private updateDifficultyPerformance(performance: UserPerformance, result: TestResult): void {
    ['easy', 'medium', 'hard'].forEach(difficulty => {
      const difficultyQuestions = result.questions
        .map((q, index) => ({ question: q, index, answer: result.userAnswers[index], time: result.timeTaken[index] }))
        .filter(item => item.question.difficulty === difficulty);
      
      if (difficultyQuestions.length === 0) return;
      
      if (!performance.difficultyWisePerformance[difficulty]) {
        performance.difficultyWisePerformance[difficulty] = {
          difficulty,
          questionsAttempted: 0,
          correctAnswers: 0,
          accuracy: 0,
          averageTime: 0
        };
      }
      
      const diffPerf = performance.difficultyWisePerformance[difficulty];
      const correctAnswers = difficultyQuestions.filter(item => item.answer === item.question.correctAnswer).length;
      const totalTime = difficultyQuestions.reduce((sum, item) => sum + item.time, 0);
      
      diffPerf.questionsAttempted += difficultyQuestions.length;
      diffPerf.correctAnswers += correctAnswers;
      diffPerf.accuracy = (diffPerf.correctAnswers / diffPerf.questionsAttempted) * 100;
      diffPerf.averageTime = ((diffPerf.averageTime * (diffPerf.questionsAttempted - difficultyQuestions.length)) + totalTime) / diffPerf.questionsAttempted;
    });
  }

  private updateWeeklyProgress(performance: UserPerformance, result: TestResult): void {
    const currentWeek = this.getCurrentWeek();
    let weekProgress = performance.weeklyProgress.find(w => w.week === currentWeek);
    
    if (!weekProgress) {
      weekProgress = {
        week: currentWeek,
        questionsAttempted: 0,
        accuracy: 0,
        timeSpent: 0,
        newTopicsMastered: 0,
        improvementRate: 0
      };
      performance.weeklyProgress.push(weekProgress);
    }
    
    weekProgress.questionsAttempted += result.questions.length;
    weekProgress.accuracy = ((weekProgress.accuracy * (weekProgress.questionsAttempted - result.questions.length)) + (result.accuracy * result.questions.length)) / weekProgress.questionsAttempted;
    weekProgress.timeSpent += result.totalTime;
    
    // Calculate improvement rate compared to previous week
    const previousWeek = performance.weeklyProgress[performance.weeklyProgress.length - 2];
    if (previousWeek) {
      weekProgress.improvementRate = weekProgress.accuracy - previousWeek.accuracy;
    }
  }

  private checkAchievements(performance: UserPerformance): void {
    const newAchievements: Achievement[] = [];
    
    // Streak achievements
    if (performance.streakCurrent === 7 && !performance.achievements.find(a => a.id === 'streak_7')) {
      newAchievements.push({
        id: 'streak_7',
        title: '7 Day Streak',
        description: 'Maintained a 7-day practice streak!',
        type: 'streak',
        icon: '🔥',
        color: '#FF6B35',
        unlockedAt: new Date().toISOString(),
        progress: 100,
        target: 7
      });
    }
    
    // Accuracy achievements
    if (performance.overallAccuracy >= 90 && performance.totalQuestionsAttempted >= 100 && !performance.achievements.find(a => a.id === 'accuracy_master')) {
      newAchievements.push({
        id: 'accuracy_master',
        title: 'Accuracy Master',
        description: '90%+ accuracy on 100+ questions!',
        type: 'accuracy',
        icon: '🎯',
        color: '#4ECDC4',
        unlockedAt: new Date().toISOString(),
        progress: 100,
        target: 90
      });
    }
    
    // Topic mastery achievements
    const expertTopics = Object.values(performance.topicWisePerformance)
      .filter(t => t.masteryLevel === 'expert').length;
    
    if (expertTopics >= 5 && !performance.achievements.find(a => a.id === 'topic_expert')) {
      newAchievements.push({
        id: 'topic_expert',
        title: 'Topic Expert',
        description: 'Mastered 5+ topics to expert level!',
        type: 'topic_mastery',
        icon: '🧠',
        color: '#FFD700',
        unlockedAt: new Date().toISOString(),
        progress: 100,
        target: 5
      });
    }
    
    performance.achievements.push(...newAchievements);
  }

  private generateRecommendations(performance: UserPerformance): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // Analyze weak topics
    const weakTopics = Object.entries(performance.topicWisePerformance)
      .filter(([_, perf]) => perf.accuracy < 70 && perf.questionsAttempted >= 5)
      .sort(([_, a], [__, b]) => a.accuracy - b.accuracy)
      .slice(0, 3);
    
    if (weakTopics.length > 0) {
      recommendations.push({
        type: 'topic_focus',
        title: 'Focus on Weak Topics',
        description: `Improve your performance in ${weakTopics.map(([topic, _]) => topic).join(', ')}`,
        priority: 'high',
        actionItems: [
          'Practice 10 questions daily in these topics',
          'Review explanations carefully',
          'Use spaced repetition for better retention'
        ],
        estimatedImpact: 85
      });
    }
    
    // Time management recommendations
    const avgTime = performance.timeSpent / performance.totalQuestionsAttempted;
    if (avgTime > 60) { // More than 60 seconds per question
      recommendations.push({
        type: 'time_management',
        title: 'Improve Speed',
        description: "You're taking longer than optimal to answer questions",
        priority: 'medium',
        actionItems: [
          'Practice timed tests regularly',
          'Read questions more quickly',
          'Eliminate obviously wrong options first'
        ],
        estimatedImpact: 60
      });
    }
    
    // Consistency recommendations
    const recentWeeks = performance.weeklyProgress.slice(-4);
    const inconsistent = recentWeeks.some(week => Math.abs(week.accuracy - performance.overallAccuracy) > 15);
    
    if (inconsistent) {
      recommendations.push({
        type: 'consistency',
        title: 'Maintain Consistency',
        description: 'Your performance varies significantly week to week',
        priority: 'medium',
        actionItems: [
          'Practice daily for consistent results',
          'Review fundamentals regularly',
          'Maintain a study schedule'
        ],
        estimatedImpact: 70
      });
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // Comprehensive Test Analysis
  public async generateTestAnalysis(result: TestResult): Promise<TestAnalysis> {
    const performance = await this.getUserPerformance(result.userId);
    const totalTime = result.totalTime;
    const questionsCount = result.questions.length;
    
    return {
      overallPerformance: {
        score: result.score,
        accuracy: result.accuracy,
        totalTime: totalTime,
        averageTimePerQuestion: totalTime / questionsCount,
        rank: this.calculatePercentileRank(result.accuracy)
      },
      subjectWiseAnalysis: this.analyzeBySubject(result),
      difficultyAnalysis: this.analyzeByDifficulty(result),
      speedAnalysis: this.analyzeSpeed(result),
      recommendations: this.generateTestRecommendations(result, performance),
      comparison: {
        previousTests: this.compareToPreviousTests(result, performance),
        peerComparison: this.compareToPeers(result)
      }
    };
  }

  private analyzeBySubject(result: TestResult): Record<string, any> {
    const subjectAnalysis: Record<string, any> = {};
    
    result.questions.forEach((question, index) => {
      const subject = question.subject;
      if (!subjectAnalysis[subject]) {
        subjectAnalysis[subject] = {
          attempted: 0,
          correct: 0,
          accuracy: 0,
          timeSpent: 0,
          strengths: [],
          improvements: []
        };
      }
      
      subjectAnalysis[subject].attempted++;
      subjectAnalysis[subject].timeSpent += result.timeTaken[index];
      
      if (result.userAnswers[index] === question.correctAnswer) {
        subjectAnalysis[subject].correct++;
      }
    });
    
    Object.keys(subjectAnalysis).forEach(subject => {
      const analysis = subjectAnalysis[subject];
      analysis.accuracy = (analysis.correct / analysis.attempted) * 100;
    });
    
    return subjectAnalysis;
  }

  private analyzeByDifficulty(result: TestResult): any {
    const difficultyAnalysis = {
      easy: { attempted: 0, correct: 0, time: 0 },
      medium: { attempted: 0, correct: 0, time: 0 },
      hard: { attempted: 0, correct: 0, time: 0 }
    };
    
    result.questions.forEach((question, index) => {
      const difficulty = question.difficulty;
      difficultyAnalysis[difficulty].attempted++;
      difficultyAnalysis[difficulty].time += result.timeTaken[index];
      
      if (result.userAnswers[index] === question.correctAnswer) {
        difficultyAnalysis[difficulty].correct++;
      }
    });
    
    return difficultyAnalysis;
  }

  private analyzeSpeed(result: TestResult): any {
    const timeDistribution = result.timeTaken;
    const avgTime = result.totalTime / result.questions.length;
    
    let fastQuestions = 0;
    let slowQuestions = 0;
    let optimalTimeQuestions = 0;
    
    timeDistribution.forEach(time => {
      if (time < avgTime * 0.7) {
        fastQuestions++;
      } else if (time > avgTime * 1.3) {
        slowQuestions++;
      } else {
        optimalTimeQuestions++;
      }
    });
    
    return {
      fastQuestions,
      slowQuestions,
      optimalTimeQuestions,
      timeDistribution
    };
  }

  private generateTestRecommendations(result: TestResult, performance: UserPerformance | null): any {
    const studyPlan = [];
    const focusAreas = [];
    const practiceTopics = [];
    
    // Analyze incorrect answers
    const incorrectQuestions = result.questions.filter((_, index) => 
      result.userAnswers[index] !== result.questions[index].correctAnswer
    );
    
    const topicsToImprove = [...new Set(incorrectQuestions.map(q => q.topic))];
    focusAreas.push(...topicsToImprove.slice(0, 3));
    
    if (result.accuracy < 60) {
      studyPlan.push('Focus on fundamentals', 'Practice easier questions first', 'Review basic concepts');
      practiceTopics.push(...topicsToImprove);
    } else if (result.accuracy < 80) {
      studyPlan.push('Mix of practice and concept review', 'Focus on medium difficulty questions');
      practiceTopics.push(...topicsToImprove.slice(0, 5));
    } else {
      studyPlan.push('Challenge yourself with harder questions', 'Focus on time management');
    }
    
    const nextDifficulty = result.accuracy >= 80 ? 'hard' : result.accuracy >= 60 ? 'medium' : 'easy';
    
    return {
      studyPlan,
      focusAreas,
      practiceTopics,
      nextDifficulty
    };
  }

  private compareToPreviousTests(result: TestResult, performance: UserPerformance | null): any {
    // In a real implementation, you'd track test history
    return {
      accuracyTrend: performance ? result.accuracy - performance.overallAccuracy : 0,
      speedTrend: 0, // Would compare to previous average
      difficultyProgression: 'improving'
    };
  }

  private compareToPeers(result: TestResult): any {
    // Mock peer comparison - in real app, this would use aggregated anonymous data
    return {
      percentile: Math.min(95, Math.max(5, result.accuracy + Math.random() * 10 - 5)),
      averageAccuracy: 72.5,
      averageTime: 38.2
    };
  }

  private calculatePercentileRank(accuracy: number): string {
    if (accuracy >= 95) return '95th+ percentile';
    if (accuracy >= 90) return '90th+ percentile';
    if (accuracy >= 80) return '80th+ percentile';
    if (accuracy >= 70) return '70th+ percentile';
    if (accuracy >= 60) return '60th+ percentile';
    return '50th percentile';
  }

  // Utility functions
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private getCurrentWeek(): string {
    const now = new Date();
    const year = now.getFullYear();
    const week = Math.ceil(((now.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7);
    return `${year}-${week.toString().padStart(2, '0')}`;
  }

  private createInitialPerformance(userId: string): UserPerformance {
    return {
      userId,
      totalQuestionsAttempted: 0,
      totalCorrectAnswers: 0,
      overallAccuracy: 0,
      timeSpent: 0,
      streakCurrent: 0,
      streakBest: 0,
      lastActivityDate: new Date().toISOString(),
      subjectWisePerformance: {},
      topicWisePerformance: {},
      difficultyWisePerformance: {},
      weeklyProgress: [],
      achievements: [],
      personalizedRecommendations: []
    };
  }

  // Data persistence
  private async saveUserPerformance(performance: UserPerformance): Promise<void> {
    try {
      await AsyncStorage.setItem(`user_performance_${performance.userId}`, JSON.stringify(performance));
      this.userPerformance = performance;
    } catch (error) {
      console.error('❌ Failed to save user performance:', error);
    }
  }

  private async loadUserPerformance(): Promise<void> {
    try {
      // For demo purposes, using a default user ID
      const performance = await this.getUserPerformance('default_user');
      this.userPerformance = performance;
    } catch (error) {
      console.error('❌ Failed to load user performance:', error);
    }
  }

  public async getUserPerformance(userId: string): Promise<UserPerformance | null> {
    try {
      const stored = await AsyncStorage.getItem(`user_performance_${userId}`);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('❌ Failed to get user performance:', error);
      return null;
    }
  }

  // Public API methods
  public async getQuestionsByTopic(topic: string, limit: number = 10): Promise<AppQuestion[]> {
    const filtered = this.bharatkoshQuestions
      .filter(q => q.topic.toLowerCase().includes(topic.toLowerCase()))
      .map(q => this.convertToAppQuestion(q))
      .slice(0, limit);
    
    return this.shuffleArray(filtered);
  }

  public async getQuestionsByDifficulty(difficulty: string, limit: number = 10): Promise<AppQuestion[]> {
    const filtered = this.bharatkoshQuestions
      .filter(q => q.difficulty.toLowerCase() === difficulty.toLowerCase())
      .map(q => this.convertToAppQuestion(q))
      .slice(0, limit);
    
    return this.shuffleArray(filtered);
  }

  public async getAllTopics(): Promise<string[]> {
    const topics = [...new Set(this.bharatkoshQuestions.map(q => q.topic))];
    return topics.sort();
  }

  public async getQuestionStats(): Promise<{
    total: number;
    byDifficulty: Record<string, number>;
    byTopic: Record<string, number>;
  }> {
    const total = this.bharatkoshQuestions.length;
    
    const byDifficulty: Record<string, number> = {};
    const byTopic: Record<string, number> = {};
    
    this.bharatkoshQuestions.forEach(q => {
      byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] || 0) + 1;
      byTopic[q.topic] = (byTopic[q.topic] || 0) + 1;
    });
    
    return { total, byDifficulty, byTopic };
  }

  private getSampleQuestions(): BharatKoshQuestion[] {
    // Fallback sample data if main file can't be loaded
    return [
      {
        id: 'sample-1',
        created_at: new Date().toISOString(),
        question_hindi: 'भारत के पहले प्रधानमंत्री कौन थे?',
        question_english: 'Who was the first Prime Minister of India?',
        options_hindi: ['महात्मा गांधी', 'जवाहरलाल नेहरू', 'सरदार पटेल', 'डॉ. राजेंद्र प्रसाद'],
        options_english: ['Mahatma Gandhi', 'Jawaharlal Nehru', 'Sardar Patel', 'Dr. Rajendra Prasad'],
        option_labels: ['अ', 'ब', 'स', 'द'],
        correct_answer: 'b',
        explanation_english: 'Jawaharlal Nehru was the first Prime Minister of India, serving from 1947 to 1964.',
        explanation_hindi: 'जवाहरलाल नेहरू भारत के पहले प्रधानमंत्री थे, जिन्होंने 1947 से 1964 तक सेवा की।',
        topic: 'Indian Independence',
        difficulty: 'easy',
        key_facts: ['First PM of India', 'Served from 1947-1964'],
        source: 'sample',
        page_number: 1,
        question_number: 1,
        subject: 'इतिहास (History)',
        ai_processed: true,
        processed_at: new Date().toISOString()
      }
    ];
  }

  // Private helper methods

  private convertToAppFormat(question: ExtractedQuestion): AppQuestion {
    return {
      id: question.questionId,
      question: question.questionText.translated || question.questionText.original,
      options:
        question.options?.map(
          (o) => o.text.translated || o.text.original
        ) || [],
      correctAnswer: typeof question.correctAnswer === 'number' 
        ? question.correctAnswer 
        : 0,
      explanation:
        question.explanation?.translated ||
        question.explanation?.original ||
        '',
      subject: question.subject,
      difficulty: question.difficulty || 'Medium',
      timeToSolve: question.timeToSolve || 60,
      metadata: {
        examType: question.metadata.examType,
        year: question.metadata.year,
        paperName: question.metadata.paperName,
        topics: question.topics,
        source: question.metadata.paperId,
      },
    };
  }

  private async indexQuestions(): Promise<void> {
    if (!this.database) return;

    // This would need to load actual questions from storage
    // For now, we'll leave it empty
    this.questionsMap.clear();
  }

  private mergeCategories(newCategories: QuestionCategory[]): void {
    if (!this.database) return;

    for (const newCategory of newCategories) {
      const existing = this.findCategory(
        newCategory.id,
        this.database.categories
      );

      if (existing) {
        // Merge questions
        existing.questions = Array.from(
          new Set([...existing.questions, ...newCategory.questions])
        );
        existing.metadata.questionCount = existing.questions.length;
      } else {
        this.database.categories.push(newCategory);
      }
    }
  }

  private findCategory(
    id: string,
    categories: QuestionCategory[]
  ): QuestionCategory | null {
    for (const category of categories) {
      if (category.id === id) {
        return category;
      }

      if (category.subcategories) {
        const found = this.findCategory(id, category.subcategories);
        if (found) return found;
      }
    }

    return null;
  }

  private filterQuestions(filters: TestFilters): AppQuestion[] {
    let questions = Array.from(this.questionsMap.values());
    return this.applyFilters(questions, filters);
  }

  private applyFilters(
    questions: AppQuestion[],
    filters: TestFilters
  ): AppQuestion[] {
    let filtered = questions;

    if (filters.examTypes && filters.examTypes.length > 0) {
      filtered = filtered.filter((q) =>
        filters.examTypes!.includes(q.metadata.examType || '')
      );
    }

    if (filters.subjects && filters.subjects.length > 0) {
      filtered = filtered.filter((q) =>
        filters.subjects!.includes(q.subject)
      );
    }

    if (filters.years && filters.years.length > 0) {
      filtered = filtered.filter((q) =>
        filters.years!.includes(q.metadata.year || 0)
      );
    }

    if (filters.difficulties && filters.difficulties.length > 0) {
      filtered = filtered.filter((q) =>
        filters.difficulties!.includes(q.difficulty)
      );
    }

    if (filters.topics && filters.topics.length > 0) {
      filtered = filtered.filter((q) =>
        q.metadata.topics?.some((t) => filters.topics!.includes(t))
      );
    }

    return filtered;
  }

  private generateTestName(request: TestGenerationRequest): string {
    const parts: string[] = [];

    if (request.filters.examTypes && request.filters.examTypes.length === 1) {
      parts.push(request.filters.examTypes[0]);
    }

    if (request.filters.years && request.filters.years.length === 1) {
      parts.push(request.filters.years[0].toString());
    }

    if (request.filters.subjects && request.filters.subjects.length === 1) {
      parts.push(request.filters.subjects[0]);
    }

    if (parts.length === 0) {
      parts.push(request.testType.replace('_', ' '));
    }

    return parts.join(' - ');
  }

  private generateTestDescription(request: TestGenerationRequest): string {
    const count = request.count;
    const type = request.testType.replace('_', ' ');
    return `${count} questions - ${type}`;
  }

  private estimateDuration(questions: AppQuestion[]): number {
    const totalTime = questions.reduce((sum, q) => sum + q.timeToSolve, 0);
    return Math.ceil(totalTime / 60); // Convert to minutes
  }

  private generateTestId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private createEmptyDatabase(): QuestionDatabase {
    return {
      id: `db_${Date.now()}`,
      version: '1.0.0',
      lastUpdated: new Date(),
      categories: [],
      totalQuestions: 0,
    };
  }
}

export default EnhancedQuestionDatabase;