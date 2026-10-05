"use strict";
/**
 * PDF Processor (Server-side)
 * Uses the core processing pipeline
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PDFProcessor = void 0;
const pipeline_1 = require("./pdf-processor-core/pipeline");
class PDFProcessor {
    pipeline;
    constructor() {
        const config = {
            vlm: {
                provider: (process.env.VLM_PROVIDER || 'qwen'),
                model: process.env.VLM_PROVIDER === 'nemotron'
                    ? process.env.NEMOTRON_MODEL
                    : process.env.QWEN_MODEL,
                apiKey: process.env.VLM_API_KEY,
                endpoint: process.env.VLM_PROVIDER === 'nemotron'
                    ? process.env.NEMOTRON_ENDPOINT
                    : process.env.QWEN_ENDPOINT,
                maxTokens: 4096,
                temperature: 0.1,
            },
            processing: {
                batchSize: parseInt(process.env.MAX_PAGES_PER_BATCH || '10'),
                maxConcurrentPages: 5,
                imageResolution: 300,
                enableCaching: true,
                cacheDirectory: process.env.CACHE_DIR || './cache',
                enableResume: true,
            },
            translation: {
                enabled: true,
                sourceLanguage: 'hindi',
                targetLanguages: ['english'],
                useVLMForTranslation: true,
            },
            extraction: {
                minConfidenceScore: 0.6,
                enableQuestionNumberValidation: true,
                enableCrossPageStitching: true,
                detectDifficulty: true,
                estimateTimeToSolve: true,
            },
            export: {
                formats: ['json'],
                outputDirectory: process.env.OUTPUT_DIR || './output',
                prettifyJson: true,
                includeMetadata: true,
            },
        };
        this.pipeline = new pipeline_1.PDFProcessingPipeline(config);
    }
    async processPDF(filePath) {
        return await this.pipeline.processPDF(filePath);
    }
}
exports.PDFProcessor = PDFProcessor;
//# sourceMappingURL=pdf-processor.js.map