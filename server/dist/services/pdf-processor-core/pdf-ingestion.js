"use strict";
/**
 * PDF Ingestion Service
 * Handles PDF file processing and page rendering using Python script
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
exports.PDFIngestionService = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
class PDFIngestionService {
    DEFAULT_DPI = 300;
    /**
     * Convert PDF to images using Python script
     */
    async convertPDFToImages(pdfPath, maxPages, dpi = this.DEFAULT_DPI) {
        return new Promise((resolve, reject) => {
            const scriptPath = path.join(__dirname, '../../../../scripts/pdf_to_images.py');
            console.log(`Calling Python script: ${scriptPath}`);
            console.log(`PDF path: ${pdfPath}, DPI: ${dpi}, Max pages: ${maxPages || 'all'}`);
            const args = [scriptPath, pdfPath, dpi.toString()];
            if (maxPages) {
                args.push(maxPages.toString());
            }
            const pythonProcess = (0, child_process_1.spawn)('python', args);
            let stdout = '';
            let stderr = '';
            pythonProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            pythonProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Python script failed with code ${code}: ${stderr}`));
                    return;
                }
                try {
                    const results = JSON.parse(stdout);
                    console.log(`Successfully converted ${results.length} pages`);
                    resolve(results);
                }
                catch (error) {
                    reject(new Error(`Failed to parse Python output: ${error}`));
                }
            });
            pythonProcess.on('error', (error) => {
                reject(new Error(`Failed to spawn Python process: ${error.message}. Make sure Python and PyMuPDF are installed.`));
            });
        });
    }
    /**
     * Render all pages of a PDF to images
     * Returns array of base64-encoded images
     */
    async renderAllPages(pdfPath, maxPages, dpi = this.DEFAULT_DPI) {
        try {
            console.log(`Converting PDF to images: ${pdfPath}`);
            // Use Python script to convert PDF
            const allPages = await this.convertPDFToImages(pdfPath, maxPages, dpi);
            console.log(`Converted ${allPages.length} pages`);
            return allPages;
        }
        catch (error) {
            console.error('Error rendering PDF pages:', error);
            throw error;
        }
    }
    /**
     * Load PDF file from path
     */
    async loadPDF(source) {
        try {
            if (typeof source === 'string') {
                // Verify file exists
                await fs.access(source);
                return source;
            }
            throw new Error('Unsupported PDF source type');
        }
        catch (error) {
            console.error('Error loading PDF:', error);
            throw error;
        }
    }
    /**
     * Extract PDF metadata (placeholder)
     */
    async extractMetadata(pdfPath) {
        return {
            title: '',
            author: '',
            subject: '',
            creator: '',
            producer: '',
            creationDate: null,
            modificationDate: null,
        };
    }
    /**
     * Validate PDF file exists and is readable
     */
    async validatePDF(pdfPath) {
        try {
            await fs.access(pdfPath);
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.PDFIngestionService = PDFIngestionService;
//# sourceMappingURL=pdf-ingestion.js.map