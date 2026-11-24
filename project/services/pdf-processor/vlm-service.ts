/**
 * VLM Service - Vision-Language Model Integration
 * Supports: Qwen3-VL and Nemotron-Nano VLMs
 */

import {
  VLMConfig,
  VLMProvider,
  PageAnalysis,
  TranslationRequest,
  TranslationResponse,
  ExtractedQuestion,
  DocumentStructure,
  Language,
} from './types';

export class VLMService {
  private config: VLMConfig;
  private promptTemplates: Map<string, string>;

  constructor(config: VLMConfig) {
    this.config = config;
    this.promptTemplates = this.initializePromptTemplates();
  }

  /**
   * Initialize prompt templates for different VLM tasks
   */
  private initializePromptTemplates(): Map<string, string> {
    return new Map([
      [
        'page_analysis',
        `Analyze this page from an exam/study material PDF and provide a structured analysis.

Your task:
1. Identify the document type (exam paper, solution, explanation, cover page, index, etc.)
2. Detect all languages present (Hindi, English, mixed, other)
3. Identify the structure type (questions only, with answers, with explanations, etc.)
4. Extract all visible elements (questions, options, answers, headings, etc.)

Return a JSON object with:
{
  "documentType": "exam_paper|solution_key|explanation|cover_page|index|instructions|mixed|unknown",
  "languages": ["hindi", "english", "mixed", "other"],
  "structureType": "questions_only|questions_with_answers|questions_with_explanations|table_of_contents|header_footer_only|unstructured",
  "detectedElements": [
    {
      "type": "question|option|answer|heading|paragraph|etc",
      "content": "extracted text",
      "confidence": 0.0-1.0
    }
  ],
  "metadata": {
    "hasWatermark": true|false,
    "hasHeader": true|false,
    "hasFooter": true|false,
    "pageQuality": "high|medium|low",
    "isScanned": true|false,
    "orientation": "portrait|landscape"
  },
  "confidence": 0.0-1.0
}

Be thorough and accurate. Extract all visible content.`,
      ],
      [
        'document_structure',
        `You are analyzing multiple pages from an exam/study material. Based on the page analyses provided, infer the overall document structure.

Your task:
1. Identify exam name (e.g., UPSC CSE Prelims, SSC CGL, JEE Main, etc.)
2. Determine exam type category (UPSC, SSC, JEE, NEET, Banking, etc.)
3. Extract year if present
4. Identify paper divisions (GS Paper I, CSAT Paper II, Physics, Chemistry, etc.)
5. Map sections within each paper
6. List all subjects covered

Return a JSON object with:
{
  "examName": "Full exam name",
  "examType": "UPSC|SSC|JEE|NEET|etc",
  "year": 2024,
  "papers": [
    {
      "paperId": "unique_id",
      "paperName": "GS Paper I|CSAT|Physics|etc",
      "paperType": "GS|CSAT|Mains|Prelims|etc",
      "startPage": 1,
      "endPage": 50,
      "sections": [
        {
          "sectionId": "unique_id",
          "sectionName": "Section A|Part 1|etc",
          "startPage": 1,
          "endPage": 20,
          "startQuestionNumber": 1,
          "endQuestionNumber": 50,
          "subject": "History|Geography|etc"
        }
      ],
      "subjects": ["History", "Geography", "Polity"],
      "totalQuestions": 100
    }
  ],
  "totalPages": 150,
  "languages": ["hindi", "english"],
  "confidence": 0.0-1.0
}

DO NOT make assumptions. Only extract what you can clearly see in the document.`,
      ],
      [
        'question_extraction',
        `Extract structured question data from this exam page.

Your task:
1. Identify each question number and full question text
2. Extract all options (A, B, C, D or 1, 2, 3, 4, etc.)
3. Identify correct answer if shown
4. Extract explanation if present
5. Determine subject/topic if possible
6. Preserve original language

Return a JSON array:
[
  {
    "questionNumber": 1,
    "questionText": {
      "original": "Question in original language",
      "language": "hindi|english|mixed"
    },
    "options": [
      {
        "optionNumber": 1,
        "text": {
          "original": "Option text",
          "language": "hindi|english|mixed"
        }
      }
    ],
    "correctAnswer": 2,
    "explanation": {
      "original": "Explanation text if present",
      "language": "hindi|english|mixed"
    },
    "subject": "Inferred subject",
    "topics": ["topic1", "topic2"],
    "confidence": 0.0-1.0,
    "hasImage": true|false,
    "hasFormula": true|false
  }
]

Extract ONLY what is visible. Do not infer missing information.`,
      ],
      [
        'translation',
        `You are a professional academic translator. Translate the following text accurately while preserving:
- Academic terminology
- Formatting (line breaks, bullets, numbering)
- Technical terms
- Mathematical expressions

Source Language: {{sourceLanguage}}
Target Language: {{targetLanguage}}
Context: {{context}}

Text to translate:
{{text}}

Return ONLY the translated text without any additional commentary.`,
      ],
      [
        'difficulty_assessment',
        `Assess the difficulty level of this exam question.

Consider:
1. Complexity of concept
2. Required knowledge depth
3. Multi-step reasoning needed
4. Common exam patterns

Question:
{{question}}

Options:
{{options}}

Return a JSON object:
{
  "difficulty": "Easy|Medium|Hard",
  "reasoning": "Brief explanation",
  "estimatedTimeSeconds": 30-300,
  "confidence": 0.0-1.0
}`,
      ],
      [
        'subject_classification',
        `Classify the subject and topics for this question.

Question:
{{question}}

Provide a JSON object:
{
  "subject": "Primary subject (History, Geography, Science, Math, etc.)",
  "topics": ["Specific topic 1", "Specific topic 2"],
  "subtopics": ["More specific areas"],
  "confidence": 0.0-1.0
}

Be specific but not overly granular.`,
      ],
    ]);
  }

  /**
   * Analyze a single page using VLM
   */
  async analyzePage(
    imageBase64: string,
    pageNumber: number
  ): Promise<PageAnalysis> {
    const prompt = this.promptTemplates.get('page_analysis')!;

    try {
      const response = await this.callVLM(imageBase64, prompt);
      const analysis = this.parseVLMResponse(response);

      return {
        pageNumber,
        ...analysis,
      };
    } catch (error) {
      console.error(`Error analyzing page ${pageNumber}:`, error);
      throw error;
    }
  }

  /**
   * Infer document structure from multiple page analyses
   */
  async inferDocumentStructure(
    pageAnalyses: PageAnalysis[]
  ): Promise<DocumentStructure> {
    const prompt = this.promptTemplates.get('document_structure')!;
    
    // Create a summary of page analyses to send to VLM
    const analysisSummary = this.createAnalysisSummary(pageAnalyses);
    
    const response = await this.callVLM(null, prompt, analysisSummary);
    const structure = this.parseVLMResponse(response);

    return structure;
  }

  /**
   * Extract questions from a page
   */
  async extractQuestionsFromPage(
    imageBase64: string,
    pageNumber: number,
    context?: any
  ): Promise<ExtractedQuestion[]> {
    const prompt = this.promptTemplates.get('question_extraction')!;

    try {
      const response = await this.callVLM(imageBase64, prompt, context);
      const questions = this.parseVLMResponse(response);

      return questions.map((q: any, index: number) => ({
        ...q,
        questionId: `q_${pageNumber}_${index + 1}`,
        metadata: {
          pageNumber,
          confidence: q.confidence || 0.8,
          hasImage: q.hasImage || false,
          hasFormula: q.hasFormula || false,
          extractedAt: new Date(),
          ...context,
        },
      }));
    } catch (error) {
      console.error(`Error extracting questions from page ${pageNumber}:`, error);
      return [];
    }
  }

  /**
   * Translate text using VLM
   */
  async translate(request: TranslationRequest): Promise<TranslationResponse> {
    let prompt = this.promptTemplates.get('translation')!;
    
    // Replace template variables
    prompt = prompt
      .replace('{{sourceLanguage}}', request.sourceLanguage)
      .replace('{{targetLanguage}}', request.targetLanguage)
      .replace('{{context}}', request.context || 'exam question')
      .replace('{{text}}', request.text);

    try {
      const response = await this.callVLM(null, prompt);
      
      return {
        translatedText: response.trim(),
        confidence: 0.9,
        detectedLanguage: request.sourceLanguage,
      };
    } catch (error) {
      console.error('Translation error:', error);
      throw error;
    }
  }

  /**
   * Assess question difficulty
   */
  async assessDifficulty(question: string, options?: string[]): Promise<any> {
    let prompt = this.promptTemplates.get('difficulty_assessment')!;
    prompt = prompt
      .replace('{{question}}', question)
      .replace('{{options}}', options?.join('\n') || 'N/A');

    const response = await this.callVLM(null, prompt);
    return this.parseVLMResponse(response);
  }

  /**
   * Classify subject and topics
   */
  async classifySubject(question: string): Promise<any> {
    let prompt = this.promptTemplates.get('subject_classification')!;
    prompt = prompt.replace('{{question}}', question);

    const response = await this.callVLM(null, prompt);
    return this.parseVLMResponse(response);
  }

  /**
   * Core VLM API call - abstract implementation
   */
  private async callVLM(
    imageBase64: string | null,
    prompt: string,
    additionalContext?: any
  ): Promise<string> {
    // Prepare request based on provider
    const request = this.prepareVLMRequest(imageBase64, prompt, additionalContext);

    try {
      // Make API call based on provider
      const response = await this.makeAPICall(request);
      return this.extractResponse(response);
    } catch (error) {
      console.error('VLM API call failed:', error);
      throw error;
    }
  }

  /**
   * Prepare VLM request based on provider
   */
  private prepareVLMRequest(
    imageBase64: string | null,
    prompt: string,
    additionalContext?: any
  ): any {
    const contextStr = additionalContext 
      ? `\n\nAdditional Context:\n${JSON.stringify(additionalContext, null, 2)}`
      : '';

    if (this.config.provider === 'qwen') {
      // Qwen3-VL format
      return {
        model: this.config.model,
        messages: [
          {
            role: 'user',
            content: imageBase64
              ? [
                  { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
                  { type: 'text', text: prompt + contextStr },
                ]
              : [{ type: 'text', text: prompt + contextStr }],
          },
        ],
        max_tokens: this.config.maxTokens || 4096,
        temperature: this.config.temperature || 0.1,
      };
    } else if (this.config.provider === 'nemotron') {
      // Nemotron format
      return {
        model: this.config.model,
        messages: [
          {
            role: 'user',
            content: imageBase64
              ? `<image>${imageBase64}</image>\n\n${prompt}${contextStr}`
              : prompt + contextStr,
          },
        ],
        max_tokens: this.config.maxTokens || 4096,
        temperature: this.config.temperature || 0.1,
      };
    }

    throw new Error(`Unsupported VLM provider: ${this.config.provider}`);
  }

  /**
   * Make actual API call to VLM provider
   */
  private async makeAPICall(request: any): Promise<any> {
    const endpoint = this.config.endpoint || this.getDefaultEndpoint();
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`VLM API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get default endpoint for provider
   */
  private getDefaultEndpoint(): string {
    if (this.config.provider === 'qwen') {
      return 'https://ai.hackclub.com/proxy/v1/chat/completions';
    } else if (this.config.provider === 'nemotron') {
      return 'https://integrate.api.nvidia.com/v1/chat/completions';
    }
    throw new Error('No endpoint configured');
  }

  /**
   * Extract response text from API response
   */
  private extractResponse(response: any): string {
    if (this.config.provider === 'qwen' || this.config.provider === 'nemotron') {
      return response.choices[0]?.message?.content || '';
    }
    throw new Error('Unsupported response format');
  }

  /**
   * Parse VLM response (handle JSON or text)
   */
  private parseVLMResponse(response: string): any {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // Try direct JSON parse
      return JSON.parse(response);
    } catch {
      // If not JSON, return as text
      return response;
    }
  }

  /**
   * Create summary of page analyses for structure inference
   */
  private createAnalysisSummary(analyses: PageAnalysis[]): string {
    return analyses
      .map(
        (a) =>
          `Page ${a.pageNumber}:
  - Type: ${a.documentType}
  - Languages: ${a.languages.join(', ')}
  - Elements: ${a.detectedElements.length}
  - Key elements: ${a.detectedElements.slice(0, 3).map((e) => e.type).join(', ')}`
      )
      .join('\n\n');
  }
}
