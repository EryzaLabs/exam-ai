/**
 * Main PDF Processing Pipeline
 * Orchestrates the entire PDF extraction workflow
 */
import { ProcessingJob, ProcessorConfig } from './types';
export declare class PDFProcessingPipeline {
    private config;
    private ingestionService;
    private vlmService;
    private extractionService;
    private translationService;
    private exportService;
    constructor(config: ProcessorConfig);
    /**
     * Process a PDF file end-to-end
     */
    processPDF(filePath: string): Promise<ProcessingJob>;
    /**
     * Analyze all pages using VLM
     */
    private analyzePages;
    /**
     * Validate extracted questions
     */
    private validateQuestions;
    /**
     * Generate processing statistics
     */
    private generateStatistics;
    /**
     * Create a new processing job
     */
    private createJob;
    /**
     * Rephrase explanations to avoid copyright
     */
    private rephraseExplanations;
    /**
     *  errors: [],
      };
    }
  
    /**
     * Generate unique job ID
     */
    private generateJobId;
    /**
     * Resume a failed job
     */
    resumeJob(jobId: string): Promise<ProcessingJob>;
    /**
     * Analyze page with retry logic for API errors
     */
    private analyzePageWithRetry;
    /**
     * Save intermediate results to disk for resume capability
     */
    private saveIntermediateResults;
    /**
     * Cancel a running job
     */
    cancelJob(jobId: string): Promise<void>;
    /**
     * Get job status
     */
    getJobStatus(jobId: string): Promise<ProcessingJob | null>;
}
//# sourceMappingURL=pipeline.d.ts.map