/**
 * Question Database Service (Server-side)
 * JSON-based storage for questions (no native dependencies)
 */

import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';

interface QuestionRecord {
  id: string;
  question: string;
  options?: string[];
  correct_answer?: number;
  explanation?: string;
  subject: string;
  difficulty?: string;
  time_to_solve?: number;
  exam_type?: string;
  year?: number;
  paper_name?: string;
  topics?: string[];
  metadata?: any;
  created_at: string;
}

export class QuestionDatabase {
  private dbPath: string;
  private questions: QuestionRecord[] = [];
  private loaded: boolean = false;

  constructor() {
    this.dbPath = process.env.DB_PATH || './data/questions.json';
    
    // Ensure directory exists
    const dir = path.dirname(this.dbPath);
    if (!fsSync.existsSync(dir)) {
      fsSync.mkdirSync(dir, { recursive: true });
    }

    this.loadData();
  }

  private loadData() {
    try {
      if (fsSync.existsSync(this.dbPath)) {
        const data = fsSync.readFileSync(this.dbPath, 'utf-8');
        this.questions = JSON.parse(data);
      } else {
        this.questions = [];
        this.saveDataSync();
      }
      this.loaded = true;
    } catch (error) {
      console.error('Error loading database:', error);
      this.questions = [];
      this.loaded = true;
    }
  }

  private async saveData() {
    try {
      await fs.writeFile(this.dbPath, JSON.stringify(this.questions, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving database:', error);
    }
  }

  private saveDataSync() {
    try {
      fsSync.writeFileSync(this.dbPath, JSON.stringify(this.questions, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving database:', error);
    }
  }

  async importQuestions(results: any): Promise<void> {
    const newQuestions = results.extractedQuestions.map((q: any) => ({
      id: q.questionId,
      question: q.questionText?.translated || q.questionText?.original || q.questionText,
      options: q.options?.map((o: any) => o.text?.translated || o.text?.original || o.text || o) || [],
      correct_answer: q.correctAnswer,
      explanation: q.explanation?.translated || q.explanation?.original || q.explanation || '',
      subject: q.subject,
      difficulty: q.difficulty,
      time_to_solve: q.timeToSolve,
      exam_type: q.metadata?.examType,
      year: q.metadata?.year,
      paper_name: q.metadata?.paperName,
      topics: q.topics || [],
      metadata: q.metadata,
      created_at: new Date().toISOString(),
    }));

    // Remove duplicates by ID
    const existingIds = new Set(this.questions.map(q => q.id));
    const toAdd = newQuestions.filter((q: QuestionRecord) => !existingIds.has(q.id));
    
    // Update existing
    for (const newQ of newQuestions) {
      const existingIndex = this.questions.findIndex(q => q.id === newQ.id);
      if (existingIndex >= 0) {
        this.questions[existingIndex] = newQ;
      }
    }

    this.questions.push(...toAdd);
    await this.saveData();
  }

  async getQuestions(filters: any): Promise<any[]> {
    let filtered = [...this.questions];

    if (filters.examTypes && filters.examTypes.length > 0) {
      filtered = filtered.filter(q => filters.examTypes.includes(q.exam_type));
    }

    if (filters.subjects && filters.subjects.length > 0) {
      filtered = filtered.filter(q => filters.subjects.includes(q.subject));
    }

    if (filters.years && filters.years.length > 0) {
      filtered = filtered.filter(q => filters.years.includes(q.year));
    }

    if (filters.difficulties && filters.difficulties.length > 0) {
      filtered = filtered.filter(q => filters.difficulties.includes(q.difficulty));
    }

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    
    return filtered.slice(offset, offset + limit).map(q => this.formatQuestion(q));
  }

  async getQuestionById(id: string): Promise<any> {
    const question = this.questions.find(q => q.id === id);
    return question ? this.formatQuestion(question) : null;
  }

  async searchQuestions(query: string, filters: any = {}): Promise<any[]> {
    const searchTerm = query.toLowerCase();
    let filtered = this.questions.filter(q => 
      q.question.toLowerCase().includes(searchTerm) ||
      (q.explanation && q.explanation.toLowerCase().includes(searchTerm))
    );

    if (filters.examTypes && filters.examTypes.length > 0) {
      filtered = filtered.filter(q => filters.examTypes.includes(q.exam_type));
    }

    if (filters.subjects && filters.subjects.length > 0) {
      filtered = filtered.filter(q => filters.subjects.includes(q.subject));
    }

    return filtered.slice(0, 100).map(q => this.formatQuestion(q));
  }

  async countQuestions(filters: any): Promise<number> {
    let filtered = [...this.questions];

    if (filters.examTypes && filters.examTypes.length > 0) {
      filtered = filtered.filter(q => filters.examTypes.includes(q.exam_type));
    }

    if (filters.subjects && filters.subjects.length > 0) {
      filtered = filtered.filter(q => filters.subjects.includes(q.subject));
    }

    return filtered.length;
  }

  async getExamTypes(): Promise<string[]> {
    const types = [...new Set(this.questions.map(q => q.exam_type).filter(Boolean))] as string[];
    return types.sort();
  }

  async getSubjects(examType?: string): Promise<string[]> {
    const filtered = examType 
      ? this.questions.filter(q => q.exam_type === examType)
      : this.questions;
    
    const subjects = [...new Set(filtered.map(q => q.subject))];
    return subjects.sort();
  }

  async getYears(examType?: string): Promise<number[]> {
    const filtered = examType 
      ? this.questions.filter(q => q.exam_type === examType && q.year)
      : this.questions.filter(q => q.year);
    
    const years = [...new Set(filtered.map(q => q.year!))] as number[];
    return years.sort((a, b) => b - a);
  }

  async generateTest(request: any): Promise<any> {
    const questions = await this.getQuestions({
      ...request.filters,
      limit: request.count * 2, // Get more for randomization
      offset: 0,
    });

    // Randomize if requested
    let selectedQuestions = questions;
    if (request.randomize) {
      selectedQuestions = questions.sort(() => Math.random() - 0.5);
    }

    selectedQuestions = selectedQuestions.slice(0, request.count);

    return {
      id: `test_${Date.now()}`,
      name: this.generateTestName(request),
      testType: request.testType,
      questions: selectedQuestions,
      duration: request.duration || this.estimateDuration(selectedQuestions),
      totalMarks: selectedQuestions.length,
      metadata: {
        filters: request.filters,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  async getStatistics(): Promise<any> {
    const total_questions = this.questions.length;
    const total_exams = new Set(this.questions.map(q => q.exam_type).filter(Boolean)).size;
    const total_subjects = new Set(this.questions.map(q => q.subject)).size;
    const total_years = new Set(this.questions.map(q => q.year).filter(Boolean)).size;

    const examTypeCounts = new Map<string, number>();
    const subjectCounts = new Map<string, number>();
    const difficultyCounts = new Map<string, number>();

    this.questions.forEach(q => {
      if (q.exam_type) {
        examTypeCounts.set(q.exam_type, (examTypeCounts.get(q.exam_type) || 0) + 1);
      }
      if (q.subject) {
        subjectCounts.set(q.subject, (subjectCounts.get(q.subject) || 0) + 1);
      }
      if (q.difficulty) {
        difficultyCounts.set(q.difficulty, (difficultyCounts.get(q.difficulty) || 0) + 1);
      }
    });

    return {
      total_questions,
      total_exams,
      total_subjects,
      total_years,
      byExamType: Array.from(examTypeCounts.entries()).map(([exam_type, count]) => ({ exam_type, count })),
      bySubject: Array.from(subjectCounts.entries()).map(([subject, count]) => ({ subject, count })),
      byDifficulty: Array.from(difficultyCounts.entries()).map(([difficulty, count]) => ({ difficulty, count })),
    };
  }

  async getExamStatistics(examType: string): Promise<any> {
    const filtered = this.questions.filter(q => q.exam_type === examType);
    
    return {
      total_questions: filtered.length,
      total_subjects: new Set(filtered.map(q => q.subject)).size,
      total_years: new Set(filtered.map(q => q.year).filter(Boolean)).size,
    };
  }

  async getSubjectStatistics(subject: string): Promise<any> {
    const filtered = this.questions.filter(q => q.subject === subject);
    
    return {
      total_questions: filtered.length,
      total_exams: new Set(filtered.map(q => q.exam_type).filter(Boolean)).size,
      total_years: new Set(filtered.map(q => q.year).filter(Boolean)).size,
    };
  }

  private formatQuestion(row: QuestionRecord): any {
    return {
      id: row.id,
      question: row.question,
      options: row.options,
      correctAnswer: row.correct_answer,
      explanation: row.explanation,
      subject: row.subject,
      difficulty: row.difficulty,
      timeToSolve: row.time_to_solve,
      examType: row.exam_type,
      year: row.year,
      paperName: row.paper_name,
      topics: row.topics,
      metadata: row.metadata,
      createdAt: row.created_at,
    };
  }

  private generateTestName(request: any): string {
    const parts: string[] = [];

    if (request.filters.examTypes?.length === 1) {
      parts.push(request.filters.examTypes[0]);
    }

    if (request.filters.years?.length === 1) {
      parts.push(request.filters.years[0].toString());
    }

    if (request.filters.subjects?.length === 1) {
      parts.push(request.filters.subjects[0]);
    }

    if (parts.length === 0) {
      parts.push(request.testType.replace('_', ' '));
    }

    return parts.join(' - ');
  }

  private estimateDuration(questions: any[]): number {
    const totalTime = questions.reduce((sum, q) => sum + (q.timeToSolve || 60), 0);
    return Math.ceil(totalTime / 60);
  }

  close() {
    // No-op for JSON storage, but kept for compatibility
  }
}
