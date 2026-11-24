/**
 * Data Export Service
 * Handles exporting extracted questions to various formats
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  ExtractedQuestion,
  DocumentStructure,
  OutputFile,
  QuestionCategory,
  QuestionDatabase,
  CategoryType,
} from './types';

export class DataExportService {
  private outputDirectory: string;
  private prettifyJson: boolean;
  private includeMetadata: boolean;

  constructor(config: any) {
    this.outputDirectory = config.outputDirectory;
    this.prettifyJson = config.prettifyJson !== false;
    this.includeMetadata = config.includeMetadata !== false;
  }

  /**
   * Export questions to configured formats
   */
  async exportQuestions(
    questions: ExtractedQuestion[],
    structure: DocumentStructure,
    sourceFile: string
  ): Promise<OutputFile[]> {
    const outputFiles: OutputFile[] = [];

    // Create output directory structure
    await this.createOutputDirectories(structure);

    // Export by different categorizations
    const categorized = this.categorizeQuestions(questions, structure);

    // Export as JSON
    const jsonFile = await this.exportAsJSON(categorized, structure, sourceFile);
    outputFiles.push(jsonFile);

    // Export app-compatible format
    const appFile = await this.exportForApp(categorized, structure);
    outputFiles.push(appFile);

    return outputFiles;
  }

  /**
   * Categorize questions by exam, paper, subject, year
   */
  private categorizeQuestions(
    questions: ExtractedQuestion[],
    structure: DocumentStructure
  ): QuestionDatabase {
    const database: QuestionDatabase = {
      id: `db_${Date.now()}`,
      version: '1.0.0',
      lastUpdated: new Date(),
      categories: [],
      totalQuestions: questions.length,
    };

    // Create exam type category
    const examCategory = this.createExamCategory(questions, structure);
    database.categories.push(examCategory);

    // Create year category (if year is present)
    if (structure.year) {
      const yearCategory = this.createYearCategory(questions, structure);
      database.categories.push(yearCategory);
    }

    // Create subject categories
    const subjectCategories = this.createSubjectCategories(questions, structure);
    database.categories.push(...subjectCategories);

    // Create difficulty categories
    const difficultyCategories = this.createDifficultyCategories(questions);
    database.categories.push(...difficultyCategories);

    return database;
  }

  /**
   * Create exam type category
   */
  private createExamCategory(
    questions: ExtractedQuestion[],
    structure: DocumentStructure
  ): QuestionCategory {
    const paperCategories = structure.papers.map((paper) => {
      const paperQuestions = questions.filter(
        (q) => q.metadata.paperId === paper.paperId
      );

      return {
        id: paper.paperId,
        name: paper.paperName,
        type: 'paper_type' as CategoryType,
        description: `${paper.paperName} - ${paper.totalQuestions} questions`,
        metadata: {
          examType: structure.examType,
          year: structure.year,
          paperName: paper.paperName,
          questionCount: paperQuestions.length,
          createdAt: new Date(),
          source: structure.metadata.fileName,
        },
        questions: paperQuestions.map((q) => q.questionId),
        subcategories: this.createSectionCategories(paperQuestions, paper.sections),
      };
    });

    return {
      id: `exam_${structure.examType.toLowerCase().replace(/\s+/g, '_')}`,
      name: structure.examName,
      type: 'exam_type' as CategoryType,
      description: `${structure.examName} - ${structure.year || 'Multiple Years'}`,
      metadata: {
        examType: structure.examType,
        year: structure.year,
        questionCount: questions.length,
        createdAt: new Date(),
        source: structure.metadata.fileName,
      },
      questions: questions.map((q) => q.questionId),
      subcategories: paperCategories,
    };
  }

  /**
   * Create section categories within a paper
   */
  private createSectionCategories(
    questions: ExtractedQuestion[],
    sections: any[]
  ): QuestionCategory[] {
    return sections.map((section) => {
      const sectionQuestions = questions.filter(
        (q) => q.metadata.sectionId === section.sectionId
      );

      return {
        id: section.sectionId,
        name: section.sectionName,
        type: 'subject' as CategoryType,
        metadata: {
          subject: section.subject,
          questionCount: sectionQuestions.length,
          createdAt: new Date(),
          source: '',
        },
        questions: sectionQuestions.map((q) => q.questionId),
      };
    });
  }

  /**
   * Create year category
   */
  private createYearCategory(
    questions: ExtractedQuestion[],
    structure: DocumentStructure
  ): QuestionCategory {
    return {
      id: `year_${structure.year}`,
      name: `${structure.year}`,
      type: 'year' as CategoryType,
      metadata: {
        year: structure.year,
        examType: structure.examType,
        questionCount: questions.length,
        createdAt: new Date(),
        source: structure.metadata.fileName,
      },
      questions: questions.map((q) => q.questionId),
    };
  }

  /**
   * Create subject categories
   */
  private createSubjectCategories(
    questions: ExtractedQuestion[],
    structure: DocumentStructure
  ): QuestionCategory[] {
    const subjectMap = new Map<string, ExtractedQuestion[]>();

    for (const question of questions) {
      if (!subjectMap.has(question.subject)) {
        subjectMap.set(question.subject, []);
      }
      subjectMap.get(question.subject)!.push(question);
    }

    return Array.from(subjectMap.entries()).map(([subject, questions]) => ({
      id: `subject_${subject.toLowerCase().replace(/\s+/g, '_')}`,
      name: subject,
      type: 'subject' as CategoryType,
      metadata: {
        subject,
        examType: structure.examType,
        year: structure.year,
        questionCount: questions.length,
        createdAt: new Date(),
        source: structure.metadata.fileName,
      },
      questions: questions.map((q) => q.questionId),
    }));
  }

  /**
   * Create difficulty categories
   */
  private createDifficultyCategories(
    questions: ExtractedQuestion[]
  ): QuestionCategory[] {
    const difficulties = ['Easy', 'Medium', 'Hard'];

    return difficulties.map((difficulty) => {
      const difficultyQuestions = questions.filter(
        (q) => q.difficulty === difficulty
      );

      return {
        id: `difficulty_${difficulty.toLowerCase()}`,
        name: difficulty,
        type: 'difficulty' as CategoryType,
        metadata: {
          questionCount: difficultyQuestions.length,
          averageDifficulty: difficulty,
          createdAt: new Date(),
          source: '',
        },
        questions: difficultyQuestions.map((q) => q.questionId),
      };
    });
  }

  /**
   * Export as JSON
   */
  private async exportAsJSON(
    database: QuestionDatabase,
    structure: DocumentStructure,
    sourceFile: string
  ): Promise<OutputFile> {
    const fileName = `${structure.examType}_${structure.year || 'data'}.json`;
    const filePath = `${this.outputDirectory}/${fileName}`;

    const exportData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        sourceFile: sourceFile.split('/').pop(),
        examName: structure.examName,
        examType: structure.examType,
        year: structure.year,
        totalQuestions: database.totalQuestions,
      },
      database,
    };

    const jsonString = this.prettifyJson
      ? JSON.stringify(exportData, null, 2)
      : JSON.stringify(exportData);

    await fs.writeFile(filePath, jsonString, 'utf-8');

    return {
      format: 'json',
      filePath,
      size: jsonString.length,
      createdAt: new Date(),
    };
  }

  /**
   * Export in app-compatible format
   */
  private async exportForApp(
    database: QuestionDatabase,
    structure: DocumentStructure
  ): Promise<OutputFile> {
    const fileName = `app_data_${structure.examType}_${structure.year || 'data'}.json`;
    const filePath = `${this.outputDirectory}/${fileName}`;

    // Convert to app's Question format
    const appQuestions = this.convertToAppFormat(database);

    // Create tests by paper
    const tests = this.createMockTests(database, structure);

    const appData = {
      questions: appQuestions,
      tests,
      categories: database.categories.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        count: c.metadata.questionCount,
      })),
    };

    const jsonString = JSON.stringify(appData, null, 2);
    await fs.writeFile(filePath, jsonString, 'utf-8');

    return {
      format: 'json',
      filePath,
      size: jsonString.length,
      createdAt: new Date(),
    };
  }

  /**
   * Convert to app's Question format
   */
  private convertToAppFormat(database: QuestionDatabase): any[] {
    // This would need access to actual questions
    // For now, return structure
    return [];
  }

  /**
   * Create mock tests from categories
   */
  private createMockTests(
    database: QuestionDatabase,
    structure: DocumentStructure
  ): any[] {
    const tests = [];

    for (const paper of structure.papers) {
      tests.push({
        id: paper.paperId,
        name: `${structure.examName} - ${paper.paperName}`,
        examType: structure.examType,
        year: structure.year,
        paperName: paper.paperName,
        questionIds: [], // Would be populated with actual question IDs
        duration: 120, // Default
        totalMarks: paper.totalQuestions,
      });
    }

    return tests;
  }

  /**
   * Create output directory structure
   */
  private async createOutputDirectories(structure: DocumentStructure): Promise<void> {
    const dirs = [
      this.outputDirectory,
      `${this.outputDirectory}/${structure.examType}`,
      `${this.outputDirectory}/${structure.examType}/${structure.year || 'data'}`,
    ];

    for (const dir of dirs) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
      }
    }
  }
}
