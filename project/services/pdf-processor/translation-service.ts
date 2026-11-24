/**
 * Translation Service
 * Handles multi-language translation using VLM or dedicated translation APIs
 */

import {
  TranslationRequest,
  TranslationResponse,
  Language,
  ExtractedQuestion,
  QuestionOption,
} from './types';
import { VLMService } from './vlm-service';

export class TranslationService {
  private vlmService: VLMService;
  private cache: Map<string, string> = new Map();
  private apiKey: string;
  private endpoint: string;
  private translationModel: string;

  constructor(vlmService: VLMService, config?: any) {
    this.vlmService = vlmService;
    this.apiKey = config?.apiKey || process.env.VLM_API_KEY || '';
    this.endpoint = config?.endpoint || 'https://ai.hackclub.com/proxy/v1/chat/completions';
    this.translationModel = config?.translationModel || 'openai/gpt-oss-120b';
  }

  /**
   * Translate a single text using GPT-OSS-120B
   */
  async translate(request: TranslationRequest): Promise<TranslationResponse> {
    // Check cache
    const cacheKey = this.getCacheKey(request);
    if (this.cache.has(cacheKey)) {
      return {
        translatedText: this.cache.get(cacheKey)!,
        confidence: 1.0,
        detectedLanguage: request.sourceLanguage,
      };
    }

    // Use dedicated translation model (GPT-OSS-120B)
    const prompt = this.buildTranslationPrompt(request);
    const response = await this.callTranslationAPI(prompt);

    // Cache result
    this.cache.set(cacheKey, response);

    return {
      translatedText: response,
      confidence: 0.95,
      detectedLanguage: request.sourceLanguage,
    };
  }

  /**
   * Build translation prompt
   */
  private buildTranslationPrompt(request: TranslationRequest): string {
    const contextNote = request.context ? `\nContext: ${request.context}` : '';
    
    return `You are a professional translator specializing in academic and exam content.

Translate the following text from ${request.sourceLanguage} to ${request.targetLanguage}.

Requirements:
- Maintain academic accuracy
- Preserve technical terms
- Keep formatting (line breaks, bullets, numbering)
- Natural, fluent translation${contextNote}

Text to translate:
${request.text}

Provide ONLY the translated text without any explanation or comments.`;
  }

  /**
   * Call translation API (GPT-OSS-120B)
   */
  private async callTranslationAPI(prompt: string): Promise<string> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.translationModel,
          messages: [
            {
              role: 'system',
              content: 'You are a professional translator. Provide only the translated text without any additional commentary.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        throw new Error(`Translation API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content?.trim() || '';
    } catch (error) {
      console.error('Translation API error:', error);
      throw error;
    }
  }

  /**
   * Translate question text
   */
  async translateQuestion(
    question: ExtractedQuestion,
    targetLanguage: Language
  ): Promise<ExtractedQuestion> {
    const sourceLanguage = question.questionText.language;

    // Skip if already in target language
    if (sourceLanguage === targetLanguage) {
      return question;
    }

    // Skip if already translated
    if (question.questionText.translated) {
      return question;
    }

    try {
      // Translate question text
      const questionTranslation = await this.translate({
        text: question.questionText.original,
        sourceLanguage,
        targetLanguage,
        context: `Exam question in ${question.subject}`,
        preserveFormatting: true,
      });

      question.questionText.translated = questionTranslation.translatedText;

      // Translate options
      if (question.options) {
        for (const option of question.options) {
          const optionTranslation = await this.translate({
            text: option.text.original,
            sourceLanguage: option.text.language,
            targetLanguage,
            context: 'Multiple choice option',
            preserveFormatting: true,
          });

          option.text.translated = optionTranslation.translatedText;
        }
      }

      // Translate explanation
      if (question.explanation) {
        const explanationTranslation = await this.translate({
          text: question.explanation.original,
          sourceLanguage: question.explanation.language,
          targetLanguage,
          context: `Explanation for ${question.subject} question`,
          preserveFormatting: true,
        });

        question.explanation.translated = explanationTranslation.translatedText;
      }

      return question;
    } catch (error) {
      console.error('Translation error:', error);
      return question;
    }
  }

  /**
   * Rephrase text to avoid copyright (using GPT-OSS-120B)
   */
  async rephraseExplanation(
    text: string,
    subject: string,
    style: 'academic' | 'simple' | 'detailed' = 'academic'
  ): Promise<string> {
    const cacheKey = `rephrase_${text.substring(0, 50)}_${style}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const prompt = this.buildRephrasePrompt(text, subject, style);
    const rephrased = await this.callTranslationAPI(prompt);

    this.cache.set(cacheKey, rephrased);
    return rephrased;
  }

  /**
   * Build rephrasing prompt
   */
  private buildRephrasePrompt(
    text: string,
    subject: string,
    style: string
  ): string {
    const styleInstructions = {
      academic: 'Use formal academic language with proper terminology',
      simple: 'Use simple, clear language that is easy to understand',
      detailed: 'Provide a comprehensive explanation with additional context',
    };

    return `You are an educational content writer creating original explanations for exam preparation.

Your task: Rewrite the following explanation in your own words to create completely original content while preserving accuracy.

Subject: ${subject}
Style: ${style} - ${styleInstructions[style as keyof typeof styleInstructions]}

Original explanation:
${text}

Requirements:
- Create completely original wording (avoid copying phrases)
- Maintain technical accuracy and correctness
- Keep the same meaning and educational value
- Preserve key concepts and facts
- Use different sentence structures
- ${style === 'detailed' ? 'Add helpful examples or context where appropriate' : ''}
- ${style === 'simple' ? 'Use everyday language and avoid jargon' : ''}

Provide ONLY the rewritten explanation without any meta-commentary.`;
  }

  /**
   *  return question;
    }
  }

  /**
   * Batch translate multiple questions
   */
  async translateQuestions(
    questions: ExtractedQuestion[],
    targetLanguage: Language,
    batchSize: number = 10
  ): Promise<ExtractedQuestion[]> {
    const translated: ExtractedQuestion[] = [];

    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((q) => this.translateQuestion(q, targetLanguage))
      );
      translated.push(...batchResults);

      console.log(
        `Translated ${Math.min(i + batchSize, questions.length)} of ${questions.length} questions`
      );
    }

    return translated;
  }

  /**
   * Detect language of text
   */
  detectLanguage(text: string): Language {
    // Check for Devanagari script (Hindi)
    const devanagariPattern = /[\u0900-\u097F]/;
    const hasDevanagari = devanagariPattern.test(text);

    // Check for Latin script (English)
    const latinPattern = /[a-zA-Z]/;
    const hasLatin = latinPattern.test(text);

    if (hasDevanagari && hasLatin) {
      return 'mixed';
    } else if (hasDevanagari) {
      return 'hindi';
    } else if (hasLatin) {
      return 'english';
    }

    return 'other';
  }

  /**
   * Get cache key for translation
   */
  private getCacheKey(request: TranslationRequest): string {
    return `${request.sourceLanguage}_${request.targetLanguage}_${request.text.substring(0, 100)}`;
  }

  /**
   * Clear translation cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // TODO: Track hits and misses
    };
  }
}
