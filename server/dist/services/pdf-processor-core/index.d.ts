/**
 * Main PDF Processor Entry Point
 * Simplified API for processing exam PDFs
 */
import { ProcessorConfig, ProcessingJob } from './types';
export declare class PDFProcessor {
    private pipeline;
    private config;
    constructor(config?: Partial<ProcessorConfig>);
    /**
     * Process a single PDF file
     */
    processPDF(filePath: string): Promise<ProcessingJob>;
    /**
     * Process multiple PDF files
     */
    processPDFs(filePaths: string[]): Promise<ProcessingJob[]>;
    /**
     * Process a folder of PDFs
     */
    processFolder(folderPath: string): Promise<ProcessingJob[]>;
    /**
     * Get processing configuration
     */
    getConfig(): ProcessorConfig;
    /**
     * Update configuration
     */
    updateConfig(updates: Partial<ProcessorConfig>): void;
    /**
     * Create default configuration
     */
    private createDefaultConfig;
}
export * from './types';
export * from './vlm-service';
export * from './pdf-ingestion';
export * from './question-extraction';
export * from './translation-service';
export * from './data-export';
export * from './pipeline';
//# sourceMappingURL=index.d.ts.map