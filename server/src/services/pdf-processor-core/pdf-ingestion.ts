/**
 * PDF Ingestion Service
 * Handles PDF file processing and page rendering using Python script
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn } from 'child_process';

export interface PDFPage {
  pageNumber: number;
  imageBase64: string;
  width: number;
  height: number;
  dpi: number;
}

export class PDFIngestionService {
  private readonly DEFAULT_DPI = 300;

  /**
   * Convert PDF to images using Python script
   */
  async convertPDFToImages(pdfPath: string, maxPages?: number, dpi: number = this.DEFAULT_DPI): Promise<PDFPage[]> {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(__dirname, '../../../../scripts/pdf_to_images.py');
      
      console.log(`Calling Python script: ${scriptPath}`);
      console.log(`PDF path: ${pdfPath}, DPI: ${dpi}, Max pages: ${maxPages || 'all'}`);
      
      const args = [scriptPath, pdfPath, dpi.toString()];
      if (maxPages) {
        args.push(maxPages.toString());
      }
      
      const pythonProcess = spawn('python', args);
      
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
        } catch (error) {
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
  async renderAllPages(
    pdfPath: string,
    maxPages?: number,
    dpi: number = this.DEFAULT_DPI
  ): Promise<PDFPage[]> {
    try {
      console.log(`Converting PDF to images: ${pdfPath}`);
      
      // Use Python script to convert PDF
      const allPages = await this.convertPDFToImages(pdfPath, maxPages, dpi);
      
      console.log(`Converted ${allPages.length} pages`);
      return allPages;
    } catch (error) {
      console.error('Error rendering PDF pages:', error);
      throw error;
    }
  }

  /**
   * Load PDF file from path
   */
  async loadPDF(source: string): Promise<string> {
    try {
      if (typeof source === 'string') {
        // Verify file exists
        await fs.access(source);
        return source;
      }
      
      throw new Error('Unsupported PDF source type');
    } catch (error) {
      console.error('Error loading PDF:', error);
      throw error;
    }
  }

  /**
   * Extract PDF metadata (placeholder)
   */
  async extractMetadata(pdfPath: string): Promise<Record<string, any>> {
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
  async validatePDF(pdfPath: string): Promise<boolean> {
    try {
      await fs.access(pdfPath);
      return true;
    } catch {
      return false;
    }
  }
}
