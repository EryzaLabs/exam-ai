/**
 * Translation Service
 * Handles multi-language translation using VLM or dedicated translation APIs
 */
import { TranslationRequest, TranslationResponse, Language, ExtractedQuestion } from './types';
import { VLMService } from './vlm-service';
export declare class TranslationService {
    private vlmService;
    private cache;
    private apiKey;
    private endpoint;
    private translationModel;
    constructor(vlmService: VLMService, config?: any);
    /**
     * Translate a single text using GPT-OSS-120B
     */
    translate(request: TranslationRequest): Promise<TranslationResponse>;
    /**
     * Build translation prompt
     */
    private buildTranslationPrompt;
    /**
     * Call translation API (GPT-OSS-120B)
     */
    private callTranslationAPI;
    /**
     * Translate question text
     */
    translateQuestion(question: ExtractedQuestion, targetLanguage: Language): Promise<ExtractedQuestion>;
    /**
     * Rephrase text to avoid copyright (using GPT-OSS-120B)
     */
    rephraseExplanation(text: string, subject: string, style?: 'academic' | 'simple' | 'detailed'): Promise<string>;
    /**
     * Build rephrasing prompt
     */
    private buildRephrasePrompt;
    /**
     *  return question;
      }
    }
  
    /**
     * Batch translate multiple questions
     */
    translateQuestions(questions: ExtractedQuestion[], targetLanguage: Language, batchSize?: number): Promise<ExtractedQuestion[]>;
    /**
     * Detect language of text
     */
    detectLanguage(text: string): Language;
    /**
     * Get cache key for translation
     */
    private getCacheKey;
    /**
     * Clear translation cache
     */
    clearCache(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        hitRate: number;
    };
}
//# sourceMappingURL=translation-service.d.ts.map