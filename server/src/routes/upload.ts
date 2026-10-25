/**
 * Upload Routes
 * Handle PDF file uploads and trigger processing
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PDFProcessor } from '../services/pdf-processor';
import { QuestionDatabase } from '../services/database';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB || '50')) * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

/**
 * POST /api/upload
 * Upload and process a single PDF
 */
router.post('/', upload.single('pdf'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const processor = new PDFProcessor();
    const db = new QuestionDatabase();

    // Start processing in background
    const jobId = `job_${Date.now()}`;
    
    // Process asynchronously
    processor.processPDF(req.file.path).then(async (result) => {
      if (result.status === 'completed' && result.results) {
        // Import into database
        await db.importQuestions(result.results);
        
        // Clean up uploaded file
        fs.unlinkSync(req.file!.path);
        
        console.log(`✅ Processed: ${req.file!.originalname} - ${result.results.extractedQuestions.length} questions`);
      }
    }).catch((error) => {
      console.error(`❌ Processing failed: ${req.file!.originalname}`, error);
    });

    res.json({
      success: true,
      jobId,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      message: 'PDF uploaded and processing started',
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Failed to upload PDF',
      message: error.message,
    });
  }
});

/**
 * POST /api/upload/batch
 * Upload and process multiple PDFs
 */
router.post('/batch', upload.array('pdfs', 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No PDF files uploaded' });
    }

    const processor = new PDFProcessor();
    const db = new QuestionDatabase();
    const jobs: any[] = [];

    // Process each file
    for (const file of files) {
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      jobs.push({
        jobId,
        fileName: file.originalname,
        fileSize: file.size,
        status: 'queued',
      });

      // Process asynchronously
      processor.processPDF(file.path).then(async (result) => {
        if (result.status === 'completed' && result.results) {
          await db.importQuestions(result.results);
          fs.unlinkSync(file.path);
          console.log(`✅ Processed: ${file.originalname}`);
        }
      }).catch((error) => {
        console.error(`❌ Processing failed: ${file.originalname}`, error);
      });
    }

    res.json({
      success: true,
      jobs,
      totalFiles: files.length,
      message: 'PDFs uploaded and processing started',
    });

  } catch (error: any) {
    console.error('Batch upload error:', error);
    res.status(500).json({
      error: 'Failed to upload PDFs',
      message: error.message,
    });
  }
});

export default router;
