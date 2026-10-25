export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  subject: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  timeToSolve: number;
  metadata?: {
    examType?: string;
    year?: number;
    paperName?: string;
    topics?: string[];
    source?: string;
  };
}

export interface MockTest {
  id: string;
  name: string;
  description?: string;
  examType?: string;
  year?: number;
  paperName?: string;
  questions: Question[];
  duration: number;
  totalMarks: number;
  metadata?: Record<string, any>;
}

export interface TestCategory {
  id: string;
  name: string;
  type: 'exam_type' | 'subject' | 'year' | 'difficulty' | 'paper_type' | 'custom';
  icon?: string;
  count: number;
  subcategories?: TestCategory[];
}

export interface TestFilters {
  examTypes?: string[];
  subjects?: string[];
  topics?: string[];
  years?: number[];
  difficulties?: ('Easy' | 'Medium' | 'Hard')[];
  paperTypes?: string[];
  excludeAttempted?: boolean;
}

export interface TestResult {
  id: string;
  testId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeTaken: number;
  accuracy: number;
  date: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  streak: number;
  totalPractice: number;
  accuracy: number;
}

export interface ChatMessage {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: Date;
}

export interface ProgressData {
  date: string;
  accuracy: number;
  questionsAttempted: number;
  timeSpent: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  accuracy: number;
  avatar?: string;
}

export interface Bookmark {
  id: string;
  questionId: string;
  question: Question;
  notes?: string;
  createdAt: Date;
}