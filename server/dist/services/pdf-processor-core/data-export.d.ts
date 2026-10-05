/**
 * Data Export Service
 * Handles exporting extracted questions to various formats
 */
import { ExtractedQuestion, DocumentStructure, OutputFile } from './types';
export declare class DataExportService {
    private outputDirectory;
    private prettifyJson;
    private includeMetadata;
    constructor(config: any);
    /**
     * Export questions to configured formats
     */
    exportQuestions(questions: ExtractedQuestion[], structure: DocumentStructure, sourceFile: string): Promise<OutputFile[]>;
    /**
     * Categorize questions by exam, paper, subject, year
     */
    private categorizeQuestions;
    /**
     * Create exam type category
     */
    private createExamCategory;
    /**
     * Create section categories within a paper
     */
    private createSectionCategories;
    /**
     * Create year category
     */
    private createYearCategory;
    /**
     * Create subject categories
     */
    private createSubjectCategories;
    /**
     * Create difficulty categories
     */
    private createDifficultyCategories;
    /**
     * Export as JSON
     */
    private exportAsJSON;
    /**
     * Export in app-compatible format
     */
    private exportForApp;
    /**
     * Convert to app's Question format
     */
    private convertToAppFormat;
    /**
     * Create mock tests from categories
     */
    private createMockTests;
    /**
     * Create output directory structure
     */
    private createOutputDirectories;
}
//# sourceMappingURL=data-export.d.ts.map