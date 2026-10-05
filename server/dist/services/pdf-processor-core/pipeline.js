"use strict";
/**
 * Main PDF Processing Pipeline
 * Orchestrates the entire PDF extraction workflow
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PDFProcessingPipeline = void 0;
const pdf_ingestion_1 = require("./pdf-ingestion");
const vlm_service_1 = require("./vlm-service");
const question_extraction_1 = require("./question-extraction");
const translation_service_1 = require("./translation-service");
const data_export_1 = require("./data-export");
class PDFProcessingPipeline {
    config;
    ingestionService;
    vlmService;
    extractionService;
    translationService;
    exportService;
    constructor(config) {
        this.config = config;
        this.ingestionService = new pdf_ingestion_1.PDFIngestionService();
        this.vlmService = new vlm_service_1.VLMService(config.vlm);
        this.extractionService = new question_extraction_1.QuestionExtractionService(this.vlmService);
        this.translationService = new translation_service_1.TranslationService(this.vlmService, {
            apiKey: config.vlm.apiKey,
            endpoint: config.vlm.endpoint,
            translationModel: config.vlm.translationModel,
        });
        this.exportService = new data_export_1.DataExportService(config.export);
    }
    /**
     * Process a PDF file end-to-end
     */
    async processPDF(filePath) {
        const job = this.createJob(filePath);
        try {
            // Stage 1: PDF Ingestion
            job.currentStage = 'ingestion';
            const pdfBuffer = await this.ingestionService.loadPDF(filePath);
            const isValid = await this.ingestionService.validatePDF(pdfBuffer);
            if (!isValid) {
                throw new Error('Invalid PDF file');
            }
            // Stage 2: Page Rendering
            job.currentStage = 'page_rendering';
            const pages = await this.ingestionService.renderAllPages(pdfBuffer, this.config.processing.batchSize, this.config.processing.imageResolution);
            job.totalPages = pages.length;
            job.progress = 20;
            // Stage 3: VLM Page Analysis
            job.currentStage = 'vlm_analysis';
            const pageAnalyses = await this.analyzePages(pages, job);
            // Filter out failed pages but continue with successful ones
            const successfulAnalyses = pageAnalyses.filter(a => a !== null);
            if (successfulAnalyses.length === 0) {
                throw new Error('All pages failed to analyze. Cannot proceed.');
            }
            console.log(`✅ Successfully analyzed ${successfulAnalyses.length}/${pages.length} pages`);
            // Save intermediate analysis results
            await this.saveIntermediateResults(job, { pageAnalyses: successfulAnalyses });
            job.progress = 40;
            // Stage 4: Document Structure Inference
            job.currentStage = 'structure_inference';
            const documentStructure = await this.vlmService.inferDocumentStructure(successfulAnalyses);
            job.progress = 50;
            // Stage 5: Question Extraction
            job.currentStage = 'question_extraction';
            const questions = await this.extractionService.extractQuestions(pages.map((p) => ({ imageBase64: p.imageBase64, pageNumber: p.pageNumber })), documentStructure);
            // Save questions immediately after extraction
            await this.saveIntermediateResults(job, {
                pageAnalyses: successfulAnalyses,
                documentStructure,
                questions
            });
            job.progress = 70;
            // Stage 6: Translation & Rephrasing
            job.currentStage = 'translation';
            let translatedQuestions = questions;
            if (this.config.translation.enabled) {
                translatedQuestions = await this.translationService.translateQuestions(questions, this.config.translation.targetLanguages[0]);
            }
            // Rephrase explanations to avoid copyright
            if (this.config.rephrasing?.enabled) {
                translatedQuestions = await this.rephraseExplanations(translatedQuestions);
            }
            // Save translated questions
            await this.saveIntermediateResults(job, {
                pageAnalyses: successfulAnalyses,
                documentStructure,
                translatedQuestions
            });
            job.progress = 85;
            // Stage 7: Validation
            job.currentStage = 'validation';
            const validatedQuestions = this.validateQuestions(translatedQuestions, job);
            job.progress = 90;
            // Stage 8: Export
            job.currentStage = 'export';
            const outputFiles = await this.exportService.exportQuestions(validatedQuestions, documentStructure, filePath);
            job.progress = 100;
            // Complete job
            job.status = 'completed';
            job.endTime = new Date();
            job.results = {
                documentStructure,
                extractedQuestions: validatedQuestions,
                statistics: this.generateStatistics(validatedQuestions, job),
                outputFiles,
            };
            return job;
        }
        catch (error) {
            job.status = 'failed';
            // Initialize errors array if not exists
            if (!job.errors) {
                job.errors = [];
            }
            job.errors.push({
                stage: job.currentStage,
                message: error instanceof Error ? error.message : 'Unknown error',
                severity: 'critical',
                timestamp: new Date(),
            });
            // Save whatever we got so far
            job.endTime = new Date();
            console.error('\n❌ Processing failed, but attempting to save partial results...');
            return job;
        }
    }
    /**
     * Analyze all pages using VLM
     */
    async analyzePages(pages, job) {
        const analyses = [];
        const { batchSize, maxConcurrentPages } = this.config.processing;
        for (let i = 0; i < pages.length; i += maxConcurrentPages) {
            const batch = pages.slice(i, i + maxConcurrentPages);
            try {
                const batchAnalyses = await Promise.all(batch.map((page) => this.analyzePageWithRetry(page.imageBase64, page.pageNumber)));
                analyses.push(...batchAnalyses.filter(Boolean));
                job.processedPages = analyses.length;
                console.log(`Analyzed ${analyses.length} of ${pages.length} pages`);
                // Save progress after each batch
                await this.saveIntermediateResults(job, {
                    pageAnalyses: analyses,
                    batchProgress: { current: i + maxConcurrentPages, total: pages.length }
                });
                // Rate limiting: wait between batches
                if (i + maxConcurrentPages < pages.length) {
                    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
                }
            }
            catch (error) {
                job.errors.push({
                    stage: 'vlm_analysis',
                    pageNumber: batch[0].pageNumber,
                    message: `Batch analysis failed: ${error}`,
                    severity: 'error',
                    timestamp: new Date(),
                });
            }
        }
        return analyses;
    }
    /**
     * Validate extracted questions
     */
    validateQuestions(questions, job) {
        const validated = [];
        for (const question of questions) {
            const validation = this.extractionService.validateQuestion(question);
            if (validation.isValid) {
                validated.push(question);
            }
            else if (question.metadata.confidence >= this.config.extraction.minConfidenceScore) {
                // Include with warnings
                validated.push(question);
                job.errors.push({
                    stage: 'validation',
                    pageNumber: question.metadata.pageNumber,
                    message: `Question ${question.questionNumber}: ${validation.errors.join(', ')}`,
                    severity: 'warning',
                    timestamp: new Date(),
                });
            }
            else {
                job.errors.push({
                    stage: 'validation',
                    pageNumber: question.metadata.pageNumber,
                    message: `Question ${question.questionNumber} rejected: ${validation.errors.join(', ')}`,
                    severity: 'error',
                    timestamp: new Date(),
                });
            }
        }
        return validated;
    }
    /**
     * Generate processing statistics
     */
    generateStatistics(questions, job) {
        const bySubject = {};
        const byDifficulty = {};
        let totalConfidence = 0;
        for (const question of questions) {
            // Count by subject
            bySubject[question.subject] = (bySubject[question.subject] || 0) + 1;
            // Count by difficulty
            if (question.difficulty) {
                byDifficulty[question.difficulty] =
                    (byDifficulty[question.difficulty] || 0) + 1;
            }
            totalConfidence += question.metadata.confidence;
        }
        const processingTime = job.endTime
            ? job.endTime.getTime() - job.startTime.getTime()
            : 0;
        return {
            totalPages: job.totalPages,
            totalQuestions: questions.length,
            questionsBySubject: bySubject,
            questionsByDifficulty: byDifficulty,
            averageConfidence: questions.length > 0 ? totalConfidence / questions.length : 0,
            processingTimeMs: processingTime,
            pagesWithErrors: new Set(job.errors.filter((e) => e.pageNumber).map((e) => e.pageNumber)).size,
        };
    }
    /**
     * Create a new processing job
     */
    createJob(filePath) {
        return {
            jobId: this.generateJobId(),
            status: 'pending',
            filePath,
            fileName: filePath.split('/').pop() || filePath,
            currentStage: 'ingestion',
            progress: 0,
            totalPages: 0,
            errors: [],
            processedPages: 0,
            startTime: new Date(),
        };
    }
    /**
     * Rephrase explanations to avoid copyright
     */
    async rephraseExplanations(questions) {
        const rephraseConfig = this.config.rephrasing;
        for (const question of questions) {
            if (question.explanation?.original) {
                try {
                    // Rephrase original explanation
                    const rephrasedOriginal = await this.translationService.rephraseExplanation(question.explanation.original, question.subject, rephraseConfig.style || 'academic');
                    question.explanation.original = rephrasedOriginal;
                    // Rephrase translated explanation if exists
                    if (question.explanation.translated) {
                        const rephrasedTranslated = await this.translationService.rephraseExplanation(question.explanation.translated, question.subject, rephraseConfig.style || 'academic');
                        question.explanation.translated = rephrasedTranslated;
                    }
                }
                catch (error) {
                    console.warn(`Failed to rephrase explanation for question ${question.questionNumber}:`, error);
                }
            }
        }
        return questions;
    }
    /**
     *  errors: [],
      };
    }
  
    /**
     * Generate unique job ID
     */
    generateJobId() {
        return `job_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
    /**
     * Resume a failed job
     */
    async resumeJob(jobId) {
        // TODO: Implement job resumption from cache
        throw new Error('Job resumption not yet implemented');
    }
    /**
     * Analyze page with retry logic for API errors
     */
    async analyzePageWithRetry(imageBase64, pageNumber, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await this.vlmService.analyzePage(imageBase64, pageNumber);
            }
            catch (error) {
                const errorMessage = error?.message || String(error);
                // Check if it's a rate limit or timeout error
                if (errorMessage.includes('524') || errorMessage.includes('429') || errorMessage.includes('timeout')) {
                    if (attempt < maxRetries) {
                        const delay = attempt * 5000; // Progressive delay: 5s, 10s, 15s
                        console.log(`⏳ Page ${pageNumber} failed (${errorMessage}), retrying in ${delay / 1000}s... (${attempt}/${maxRetries})`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }
                }
                // For other errors or final attempt, log and skip
                console.error(`❌ Page ${pageNumber} failed after ${attempt} attempts:`, errorMessage);
                return null;
            }
        }
        return null;
    }
    /**
     * Save intermediate results to disk for resume capability
     */
    async saveIntermediateResults(job, data) {
        try {
            const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
            const path = await Promise.resolve().then(() => __importStar(require('path')));
            // Create cache directory if needed
            const cacheDir = this.config.processing.cacheDirectory;
            if (cacheDir) {
                try {
                    await fs.mkdir(cacheDir, { recursive: true });
                }
                catch (error) {
                    // Directory might already exist
                }
                // Save to cache file
                const cacheFile = path.join(cacheDir, `job_${job.jobId}_progress.json`);
                const progressData = {
                    jobId: job.jobId,
                    status: job.status,
                    currentStage: job.currentStage,
                    progress: job.progress,
                    processedPages: job.processedPages,
                    totalPages: job.totalPages,
                    timestamp: new Date().toISOString(),
                    data
                };
                await fs.writeFile(cacheFile, JSON.stringify(progressData, null, 2), 'utf-8');
                console.log(`💾 Progress saved (${job.processedPages}/${job.totalPages} pages)`);
            }
        }
        catch (error) {
            // Don't fail the job if saving fails
            console.warn('⚠️  Failed to save intermediate results:', error);
        }
    }
    /**
     * Cancel a running job
     */
    async cancelJob(jobId) {
        // TODO: Implement job cancellation
        throw new Error('Job cancellation not yet implemented');
    }
    /**
     * Get job status
     */
    async getJobStatus(jobId) {
        // TODO: Implement job status tracking
        return null;
    }
}
exports.PDFProcessingPipeline = PDFProcessingPipeline;
//# sourceMappingURL=pipeline.js.map