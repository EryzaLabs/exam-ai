/**
 * VLM Service - Vision-Language Model Integration
 * Supports: Qwen3-VL and Nemotron-Nano VLMs
 */
import { VLMConfig, PageAnalysis, TranslationRequest, TranslationResponse, ExtractedQuestion, DocumentStructure } from './types';
export declare class VLMService {
    private config;
    private promptTemplates;
    constructor(config: VLMConfig);
    /**
     * Initialize prompt templates for different VLM tasks
     */
    private initializePromptTemplates;
    /**
     * Analyze a single page using VLM
     */
    analyzePage(imageBase64: string, pageNumber: number): Promise<PageAnalysis>;
    /**
     * Infer document structure from multiple page analyses
     */
    inferDocumentStructure(pageAnalyses: PageAnalysis[]): Promise<DocumentStructure>;
    /**
     * Extract questions from a page
     */
    extractQuestionsFromPage(imageBase64: string, pageNumber: number, context?: any): Promise<ExtractedQuestion[]>;
    /**
     * Translate text using VLM
     */
    translate(request: TranslationRequest): Promise<TranslationResponse>;
    /**
     * Assess question difficulty
     */
    assessDifficulty(question: string, options?: string[]): Promise<any>;
    /**
     * Classify subject and topics
     */
    classifySubject(question: string): Promise<any>;
    /**
     * Core VLM API call - abstract implementation
     */
    private callVLM;
    /**
     * Prepare VLM request based on provider
     */
    private prepareVLMRequest;
    /**
     * Make actual API call to VLM provider
     */
    private makeAPICall;
    /**
     * Get default endpoint for provider
     */
    private getDefaultEndpoint;
    /**
     * Extract response text from API response
     */
    private extractResponse;
    /**
     * Parse VLM response (handle JSON or text)
     */
    private parseVLMResponse;
    /**
     * Create summary of page analyses for structure inference
     */
    private createAnalysisSummary;
}
//# sourceMappingURL=vlm-service.d.ts.map