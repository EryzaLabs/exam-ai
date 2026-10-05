/**
 * PDF Ingestion Service
 * Handles PDF file processing and page rendering using Python script
 */
export interface PDFPage {
    pageNumber: number;
    imageBase64: string;
    width: number;
    height: number;
    dpi: number;
}
export declare class PDFIngestionService {
    private readonly DEFAULT_DPI;
    /**
     * Convert PDF to images using Python script
     */
    convertPDFToImages(pdfPath: string, maxPages?: number, dpi?: number): Promise<PDFPage[]>;
    /**
     * Render all pages of a PDF to images
     * Returns array of base64-encoded images
     */
    renderAllPages(pdfPath: string, maxPages?: number, dpi?: number): Promise<PDFPage[]>;
    /**
     * Load PDF file from path
     */
    loadPDF(source: string): Promise<string>;
    /**
     * Extract PDF metadata (placeholder)
     */
    extractMetadata(pdfPath: string): Promise<Record<string, any>>;
    /**
     * Validate PDF file exists and is readable
     */
    validatePDF(pdfPath: string): Promise<boolean>;
}
//# sourceMappingURL=pdf-ingestion.d.ts.map