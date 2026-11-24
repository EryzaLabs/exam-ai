/**
 * Main PDF Processor Entry Point
 * Simplified API for processing exam PDFs
 */

import { PDFProcessingPipeline } from './pipeline';
import {
  ProcessorConfig,
  VLMProvider,
  ProcessingJob,
  QuestionDatabase,
} from './types';

export class PDFProcessor {
  private pipeline: PDFProcessingPipeline;
  private config: ProcessorConfig;

  constructor(config?: Partial<ProcessorConfig>) {
    this.config = this.createDefaultConfig(config);
    this.pipeline = new PDFProcessingPipeline(this.config);
  }

  /**
   * Process a single PDF file
   */
  async processPDF(filePath: string): Promise<ProcessingJob> {
    console.log(`Starting PDF processing: ${filePath}`);
    return await this.pipeline.processPDF(filePath);
  }

  /**
   * Process multiple PDF files
   */
  async processPDFs(filePaths: string[]): Promise<ProcessingJob[]> {
    const results: ProcessingJob[] = [];

    for (const filePath of filePaths) {
      try {
        const result = await this.processPDF(filePath);
        results.push(result);
      } catch (error) {
        console.error(`Failed to process ${filePath}:`, error);
      }
    }

    return results;
  }

  /**
   * Process a folder of PDFs
   */
  async processFolder(folderPath: string): Promise<ProcessingJob[]> {
    // Implementation would scan folder for PDFs
    throw new Error('Folder processing not yet implemented');
  }

  /**
   * Get processing configuration
   */
  getConfig(): ProcessorConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ProcessorConfig>): void {
    this.config = { ...this.config, ...updates };
    this.pipeline = new PDFProcessingPipeline(this.config);
  }

  /**
   * Create default configuration
   */
  private createDefaultConfig(
    overrides?: Partial<ProcessorConfig>
  ): ProcessorConfig {
    return {
      vlm: {
        provider: (overrides?.vlm?.provider || 'qwen') as VLMProvider,
        model:
          overrides?.vlm?.model ||
          'Qwen/Qwen2.5-VL-72B-Instruct',
        apiKey: overrides?.vlm?.apiKey || process.env.VLM_API_KEY,
        endpoint: overrides?.vlm?.endpoint,
        maxTokens: overrides?.vlm?.maxTokens || 4096,
        temperature: overrides?.vlm?.temperature || 0.1,
      },
      processing: {
        batchSize: overrides?.processing?.batchSize || 10,
        maxConcurrentPages: overrides?.processing?.maxConcurrentPages || 5,
        imageResolution: overrides?.processing?.imageResolution || 300,
        enableCaching: overrides?.processing?.enableCaching !== false,
        cacheDirectory:
          overrides?.processing?.cacheDirectory || './cache',
        enableResume: overrides?.processing?.enableResume !== false,
      },
      translation: {
        enabled: overrides?.translation?.enabled !== false,
        sourceLanguage: overrides?.translation?.sourceLanguage || 'hindi',
        targetLanguages: overrides?.translation?.targetLanguages || ['english'],
        useVLMForTranslation:
          overrides?.translation?.useVLMForTranslation !== false,
      },
      extraction: {
        minConfidenceScore: overrides?.extraction?.minConfidenceScore || 0.6,
        enableQuestionNumberValidation:
          overrides?.extraction?.enableQuestionNumberValidation !== false,
        enableCrossPageStitching:
          overrides?.extraction?.enableCrossPageStitching !== false,
        detectDifficulty: overrides?.extraction?.detectDifficulty !== false,
        estimateTimeToSolve:
          overrides?.extraction?.estimateTimeToSolve !== false,
      },
      export: {
        formats: overrides?.export?.formats || ['json'],
        outputDirectory: overrides?.export?.outputDirectory || './output',
        prettifyJson: overrides?.export?.prettifyJson !== false,
        includeMetadata: overrides?.export?.includeMetadata !== false,
      },
    };
  }
}

// Export all types and services
export * from './types';
export * from './vlm-service';
export * from './pdf-ingestion';
export * from './question-extraction';
export * from './translation-service';
export * from './data-export';
export * from './pipeline';
