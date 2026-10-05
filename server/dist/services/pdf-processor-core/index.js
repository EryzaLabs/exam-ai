"use strict";
/**
 * Main PDF Processor Entry Point
 * Simplified API for processing exam PDFs
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PDFProcessor = void 0;
const pipeline_1 = require("./pipeline");
class PDFProcessor {
    pipeline;
    config;
    constructor(config) {
        this.config = this.createDefaultConfig(config);
        this.pipeline = new pipeline_1.PDFProcessingPipeline(this.config);
    }
    /**
     * Process a single PDF file
     */
    async processPDF(filePath) {
        console.log(`Starting PDF processing: ${filePath}`);
        return await this.pipeline.processPDF(filePath);
    }
    /**
     * Process multiple PDF files
     */
    async processPDFs(filePaths) {
        const results = [];
        for (const filePath of filePaths) {
            try {
                const result = await this.processPDF(filePath);
                results.push(result);
            }
            catch (error) {
                console.error(`Failed to process ${filePath}:`, error);
            }
        }
        return results;
    }
    /**
     * Process a folder of PDFs
     */
    async processFolder(folderPath) {
        // Implementation would scan folder for PDFs
        throw new Error('Folder processing not yet implemented');
    }
    /**
     * Get processing configuration
     */
    getConfig() {
        return this.config;
    }
    /**
     * Update configuration
     */
    updateConfig(updates) {
        this.config = { ...this.config, ...updates };
        this.pipeline = new pipeline_1.PDFProcessingPipeline(this.config);
    }
    /**
     * Create default configuration
     */
    createDefaultConfig(overrides) {
        return {
            vlm: {
                provider: (overrides?.vlm?.provider || 'qwen'),
                model: overrides?.vlm?.model ||
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
                cacheDirectory: overrides?.processing?.cacheDirectory || './cache',
                enableResume: overrides?.processing?.enableResume !== false,
            },
            translation: {
                enabled: overrides?.translation?.enabled !== false,
                sourceLanguage: overrides?.translation?.sourceLanguage || 'hindi',
                targetLanguages: overrides?.translation?.targetLanguages || ['english'],
                useVLMForTranslation: overrides?.translation?.useVLMForTranslation !== false,
            },
            extraction: {
                minConfidenceScore: overrides?.extraction?.minConfidenceScore || 0.6,
                enableQuestionNumberValidation: overrides?.extraction?.enableQuestionNumberValidation !== false,
                enableCrossPageStitching: overrides?.extraction?.enableCrossPageStitching !== false,
                detectDifficulty: overrides?.extraction?.detectDifficulty !== false,
                estimateTimeToSolve: overrides?.extraction?.estimateTimeToSolve !== false,
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
exports.PDFProcessor = PDFProcessor;
// Export all types and services
__exportStar(require("./types"), exports);
__exportStar(require("./vlm-service"), exports);
__exportStar(require("./pdf-ingestion"), exports);
__exportStar(require("./question-extraction"), exports);
__exportStar(require("./translation-service"), exports);
__exportStar(require("./data-export"), exports);
__exportStar(require("./pipeline"), exports);
//# sourceMappingURL=index.js.map