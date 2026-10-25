/**
 * PDF Ingestion Service
 * Handles PDF file processing and page rendering
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { createCanvas } from '@napi-rs/canvas';

// PDF.js imports for rendering
let pdfjsLib: any;

async function loadPdfJs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';
  }
  return pdfjsLib;
}

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
   * Load PDF file from various sources
   */
  async loadPDF(source: string | Blob | File | Buffer): Promise<ArrayBuffer> {
    try {
      if (typeof source === 'string') {
        // Load from file path or URI
        if (source.startsWith('http')) {
          const response = await fetch(source);
          return await response.arrayBuffer();
        } else {
          // Node.js file system
          const buffer = await fs.readFile(source);
          return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        }
      } else if (Buffer.isBuffer(source)) {
        return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
      } else if (source instanceof Blob || source instanceof File) {
        return await source.arrayBuffer();
      }
      
      throw new Error('Unsupported PDF source type');
    } catch (error) {
      console.error('Error loading PDF:', error);
      throw error;
    }
  }

  /**
   * Get total number of pages in PDF
   */
  async getPageCount(pdfBuffer: ArrayBuffer): Promise<number> {
    const pdfjs = await loadPdfJs();
    const data = new Uint8Array(pdfBuffer);
    const loadingTask = pdfjs.getDocument({ data });
    const pdf = await loadingTask.promise;
    return pdf.numPages;
  }

  /**
   * Render PDF page to image
   * Returns base64 encoded image
   */
  async renderPage(
    pdfBuffer: ArrayBuffer,
    pageNumber: number,
    dpi: number = this.DEFAULT_DPI
  ): Promise<PDFPage> {
    try {
      const pdfjs = await loadPdfJs();
      const data = new Uint8Array(pdfBuffer);
      const loadingTask = pdfjs.getDocument({ data });
      const pdf = await loadingTask.promise;
      
      const page = await pdf.getPage(pageNumber);
      const scale = dpi / 72; // Convert DPI to scale
      const viewport = page.getViewport({ scale });
      
      // Create canvas
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');
      
      // Render PDF page to canvas
      await page.render({
        canvasContext: context as any,
        viewport: viewport,
      }).promise;
      
      // Convert canvas to base64 JPEG
      const buffer = canvas.toBuffer('image/jpeg');
      const imageBase64 = buffer.toString('base64');
      
      return {
        pageNumber,
        imageBase64,
        width: Math.round(viewport.width),
        height: Math.round(viewport.height),
        dpi,
      };
    } catch (error) {
      console.error(`Error rendering page ${pageNumber}:`, error);
      throw error;
    }
  }
  
  /**
   * Create a placeholder base64 image
   * TODO: Replace with actual PDF-to-image conversion
   */
  private async convertToBase64Placeholder(width: number, height: number): Promise<string> {
    // Return a minimal 1x1 white pixel as base64 for now
    // In production, use a proper PDF rendering service or library
    return '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA==';
  }

  /**
   * Render all pages in batches
   */
  async renderAllPages(
    pdfBuffer: ArrayBuffer,
    batchSize: number = 10,
    dpi: number = this.DEFAULT_DPI
  ): Promise<PDFPage[]> {
    const pageCount = await this.getPageCount(pdfBuffer);
    const pages: PDFPage[] = [];

    for (let i = 0; i < pageCount; i += batchSize) {
      const batch = [];
      const end = Math.min(i + batchSize, pageCount);

      for (let pageNum = i + 1; pageNum <= end; pageNum++) {
        batch.push(this.renderPage(pdfBuffer, pageNum, dpi));
      }

      const renderedBatch = await Promise.all(batch);
      pages.push(...renderedBatch);

      console.log(`Rendered pages ${i + 1}-${end} of ${pageCount}`);
    }

    return pages;
  }

  /**
   * Extract PDF metadata
   */
  async extractMetadata(pdfBuffer: ArrayBuffer): Promise<Record<string, any>> {
    // Placeholder for PDF metadata extraction
    // In production, implement proper PDF parsing
    return {
      title: '',
      author: '',
      subject: '',
      creator: '',
      producer: '',
      creationDate: null,
      modificationDate: null,
      pageCount: await this.getPageCount(pdfBuffer),
    };
  }

  /**
   * Validate PDF file
   */
  async validatePDF(pdfBuffer: ArrayBuffer): Promise<boolean> {
    // Check PDF signature
    const bytes = new Uint8Array(pdfBuffer.slice(0, 5));
    const signature = String.fromCharCode(...bytes);
    return signature === '%PDF-';
  }

  /**
   * Optimize PDF for processing
   */
  async optimizePDF(pdfBuffer: ArrayBuffer): Promise<ArrayBuffer> {
    // Placeholder for PDF optimization
    // Could include: compression, removing annotations, flattening, etc.
    return pdfBuffer;
  }

  // Helper methods

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

/**
 * PDF Rendering Implementation Notes:
 * 
 * For React Native, you'll need to implement one of these approaches:
 * 
 * 1. Native Module Approach (Recommended for production):
 *    - iOS: Use PDFKit
 *    - Android: Use PdfRenderer or Apache PDFBox
 *    - Create bridge to expose rendering to JS
 * 
 * 2. Backend Service Approach:
 *    - Create a Node.js service using pdf-poppler or pdf2pic
 *    - Upload PDF to backend, receive rendered images
 *    - Good for avoiding app size bloat
 * 
 * 3. WebView + pdf.js Approach:
 *    - Bundle pdf.js in a WebView
 *    - Render pages in WebView, capture screenshots
 *    - Use react-native-webview + postMessage
 * 
 * 4. Expo Development Client:
 *    - If using Expo dev client, can use config plugins
 *    - Integrate native PDF libraries
 * 
 * Example backend service (Node.js):
 * 
 * ```javascript
 * const { pdf } = require('pdf-to-img');
 * 
 * async function convertPdfToImages(pdfPath) {
 *   const document = await pdf(pdfPath, { scale: 3.0 });
 *   const images = [];
 *   
 *   for await (const image of document) {
 *     images.push(image);
 *   }
 *   
 *   return images;
 * }
 * ```
 */
