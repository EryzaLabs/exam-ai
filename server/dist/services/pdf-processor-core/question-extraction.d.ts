/**
 * Question Extraction and Structuring Service
 * Handles cross-page stitching, validation, and enhancement
 */
import { ExtractedQuestion, DocumentStructure } from './types';
import { VLMService } from './vlm-service';
export declare class QuestionExtractionService {
    private vlmService;
    private questionBuffer;
    constructor(vlmService: VLMService);
    /**
     * Extract questions from all pages with cross-page stitching
     */
    extractQuestions(pages: Array<{
        imageBase64: string;
        pageNumber: number;
    }>, documentStructure: DocumentStructure): Promise<ExtractedQuestion[]>;
    /**
     * Stitch questions that span multiple pages
     */
    private stitchCrossPageQuestions;
    /**
     * Check if question is a continuation of previous one
     */
    private isContinuation;
    /**
     * Check if question is incomplete
     */
    private isIncomplete;
    /**
     * Merge two questions (continuation)
     */
    private mergeQuestions;
    /**
     * Validate question numbering and fix gaps
     */
    private validateQuestionNumbering;
    /**
     * Enhance questions with additional metadata
     */
    private enhanceQuestions;
    /**
     * Find paper info for a given page number
     */
    private findPaperForPage;
    /**
     * Check if text ends with sentence terminator
     */
    private endsWithSentenceTerminator;
    /**
     * Generate unique question ID
     */
    generateQuestionId(question: ExtractedQuestion): string;
    /**
     * Validate extracted question
     */
    validateQuestion(question: ExtractedQuestion): {
        isValid: boolean;
        errors: string[];
    };
    /**
     * Group questions by category
     */
    groupQuestions(questions: ExtractedQuestion[], groupBy: 'subject' | 'paper' | 'difficulty' | 'year'): Map<string, ExtractedQuestion[]>;
}
//# sourceMappingURL=question-extraction.d.ts.map