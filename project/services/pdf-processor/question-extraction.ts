/**
 * Question Extraction and Structuring Service
 * Handles cross-page stitching, validation, and enhancement
 */

import {
  ExtractedQuestion,
  PageAnalysis,
  DocumentStructure,
  QuestionMetadata,
  Language,
} from './types';
import { VLMService } from './vlm-service';

export class QuestionExtractionService {
  private vlmService: VLMService;
  private questionBuffer: Partial<ExtractedQuestion>[] = [];

  constructor(vlmService: VLMService) {
    this.vlmService = vlmService;
  }

  /**
   * Extract questions from all pages with cross-page stitching
   */
  async extractQuestions(
    pages: Array<{ imageBase64: string; pageNumber: number }>,
    documentStructure: DocumentStructure
  ): Promise<ExtractedQuestion[]> {
    const allQuestions: ExtractedQuestion[] = [];

    for (const page of pages) {
      const paperInfo = this.findPaperForPage(page.pageNumber, documentStructure);
      const context = {
        paperId: paperInfo?.paperId,
        paperName: paperInfo?.paperName,
        examType: documentStructure.examType,
        examName: documentStructure.examName,
        year: documentStructure.year,
      };

      const pageQuestions = await this.vlmService.extractQuestionsFromPage(
        page.imageBase64,
        page.pageNumber,
        context
      );

      allQuestions.push(...pageQuestions);
    }

    // Stitch questions that span multiple pages
    const stitchedQuestions = await this.stitchCrossPageQuestions(allQuestions);

    // Validate question numbering
    const validatedQuestions = this.validateQuestionNumbering(stitchedQuestions);

    // Enhance questions with additional metadata
    const enhancedQuestions = await this.enhanceQuestions(
      validatedQuestions,
      documentStructure
    );

    return enhancedQuestions;
  }

  /**
   * Stitch questions that span multiple pages
   */
  private async stitchCrossPageQuestions(
    questions: ExtractedQuestion[]
  ): Promise<ExtractedQuestion[]> {
    const stitched: ExtractedQuestion[] = [];
    let buffer: ExtractedQuestion | null = null;

    for (const question of questions) {
      if (buffer) {
        // Check if current question continues from buffer
        if (this.isContinuation(buffer, question)) {
          buffer = this.mergeQuestions(buffer, question);
          continue;
        } else {
          // Buffer question is complete
          stitched.push(buffer);
          buffer = null;
        }
      }

      // Check if question is incomplete
      if (this.isIncomplete(question)) {
        buffer = question;
      } else {
        stitched.push(question);
      }
    }

    // Add remaining buffer
    if (buffer) {
      stitched.push(buffer);
    }

    return stitched;
  }

  /**
   * Check if question is a continuation of previous one
   */
  private isContinuation(
    prev: ExtractedQuestion,
    curr: ExtractedQuestion
  ): boolean {
    // Same question number and consecutive pages
    if (
      prev.questionNumber === curr.questionNumber &&
      Math.abs(prev.metadata.pageNumber - curr.metadata.pageNumber) === 1
    ) {
      return true;
    }

    // Previous question is incomplete (no options or no question number on current)
    if (
      (!prev.options || prev.options.length < 2) &&
      curr.metadata.pageNumber === prev.metadata.pageNumber + 1
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check if question is incomplete
   */
  private isIncomplete(question: ExtractedQuestion): boolean {
    // Missing options for MCQ
    if (!question.options || question.options.length < 2) {
      return true;
    }

    // Question text seems cut off (ends mid-sentence)
    const text = question.questionText.original;
    if (text && !this.endsWithSentenceTerminator(text)) {
      return true;
    }

    return false;
  }

  /**
   * Merge two questions (continuation)
   */
  private mergeQuestions(
    prev: ExtractedQuestion,
    curr: ExtractedQuestion
  ): ExtractedQuestion {
    return {
      ...prev,
      questionText: {
        original:
          prev.questionText.original +
          (prev.questionText.original.endsWith(' ') ? '' : ' ') +
          curr.questionText.original,
        language: prev.questionText.language,
      },
      options: [...(prev.options || []), ...(curr.options || [])],
      correctAnswer: curr.correctAnswer ?? prev.correctAnswer,
      explanation: curr.explanation ?? prev.explanation,
      metadata: {
        ...prev.metadata,
        confidence: Math.min(prev.metadata.confidence, curr.metadata.confidence),
      },
    };
  }

  /**
   * Validate question numbering and fix gaps
   */
  private validateQuestionNumbering(
    questions: ExtractedQuestion[]
  ): ExtractedQuestion[] {
    // Sort by question number
    const sorted = [...questions].sort((a, b) => a.questionNumber - b.questionNumber);

    // Check for gaps
    const gaps: number[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const diff = sorted[i + 1].questionNumber - sorted[i].questionNumber;
      if (diff > 1) {
        for (let j = 1; j < diff; j++) {
          gaps.push(sorted[i].questionNumber + j);
        }
      }
    }

    if (gaps.length > 0) {
      console.warn(`Found gaps in question numbering: ${gaps.join(', ')}`);
    }

    return sorted;
  }

  /**
   * Enhance questions with additional metadata
   */
  private async enhanceQuestions(
    questions: ExtractedQuestion[],
    documentStructure: DocumentStructure
  ): Promise<ExtractedQuestion[]> {
    const enhanced = await Promise.all(
      questions.map(async (question) => {
        // Assess difficulty if not already set
        if (!question.difficulty) {
          try {
            const assessment = await this.vlmService.assessDifficulty(
              question.questionText.original,
              question.options?.map((o) => o.text.original)
            );
            question.difficulty = assessment.difficulty;
            question.timeToSolve = assessment.estimatedTimeSeconds;
          } catch (error) {
            console.warn('Failed to assess difficulty:', error);
            question.difficulty = 'Medium';
            question.timeToSolve = 60;
          }
        }

        // Classify subject if not set
        if (!question.subject || question.subject === 'Unknown') {
          try {
            const classification = await this.vlmService.classifySubject(
              question.questionText.original
            );
            question.subject = classification.subject;
            question.topics = classification.topics;
          } catch (error) {
            console.warn('Failed to classify subject:', error);
            question.subject = 'General';
          }
        }

        return question;
      })
    );

    return enhanced;
  }

  /**
   * Find paper info for a given page number
   */
  private findPaperForPage(
    pageNumber: number,
    structure: DocumentStructure
  ): any {
    for (const paper of structure.papers) {
      if (pageNumber >= paper.startPage && pageNumber <= paper.endPage) {
        return paper;
      }
    }
    return null;
  }

  /**
   * Check if text ends with sentence terminator
   */
  private endsWithSentenceTerminator(text: string): boolean {
    return /[.?!।॥]$/.test(text.trim());
  }

  /**
   * Generate unique question ID
   */
  generateQuestionId(question: ExtractedQuestion): string {
    const components = [
      question.metadata.examType?.toLowerCase().replace(/\s+/g, '-'),
      question.metadata.year,
      question.metadata.paperId,
      `q${question.questionNumber}`,
    ].filter(Boolean);

    return components.join('_');
  }

  /**
   * Validate extracted question
   */
  validateQuestion(question: ExtractedQuestion): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!question.questionText?.original) {
      errors.push('Missing question text');
    }

    if (!question.questionNumber || question.questionNumber < 1) {
      errors.push('Invalid question number');
    }

    if (question.options && question.options.length > 0) {
      if (question.options.length < 2) {
        errors.push('Insufficient options for MCQ');
      }

      if (
        question.correctAnswer !== undefined &&
        (question.correctAnswer < 0 || question.correctAnswer >= question.options.length)
      ) {
        errors.push('Correct answer index out of range');
      }
    }

    if (!question.subject) {
      errors.push('Missing subject classification');
    }

    if (question.metadata.confidence < 0.5) {
      errors.push('Low confidence score');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Group questions by category
   */
  groupQuestions(
    questions: ExtractedQuestion[],
    groupBy: 'subject' | 'paper' | 'difficulty' | 'year'
  ): Map<string, ExtractedQuestion[]> {
    const groups = new Map<string, ExtractedQuestion[]>();

    for (const question of questions) {
      let key: string;

      switch (groupBy) {
        case 'subject':
          key = question.subject;
          break;
        case 'paper':
          key = question.metadata.paperName || 'Unknown';
          break;
        case 'difficulty':
          key = question.difficulty || 'Unknown';
          break;
        case 'year':
          key = question.metadata.year?.toString() || 'Unknown';
          break;
        default:
          key = 'Other';
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(question);
    }

    return groups;
  }
}
