"use strict";
/**
 * Upload Routes
 * Handle PDF file uploads and trigger processing
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const pdf_processor_1 = require("../services/pdf-processor");
const database_1 = require("../services/database");
const router = (0, express_1.Router)();
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = process.env.UPLOAD_DIR || './uploads';
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB || '50')) * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        }
        else {
            cb(new Error('Only PDF files are allowed'));
        }
    },
});
/**
 * POST /api/upload
 * Upload and process a single PDF
 */
router.post('/', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded' });
        }
        const processor = new pdf_processor_1.PDFProcessor();
        const db = new database_1.QuestionDatabase();
        // Start processing in background
        const jobId = `job_${Date.now()}`;
        // Process asynchronously
        processor.processPDF(req.file.path).then(async (result) => {
            if (result.status === 'completed' && result.results) {
                // Import into database
                await db.importQuestions(result.results);
                // Clean up uploaded file
                fs_1.default.unlinkSync(req.file.path);
                console.log(`✅ Processed: ${req.file.originalname} - ${result.results.extractedQuestions.length} questions`);
            }
        }).catch((error) => {
            console.error(`❌ Processing failed: ${req.file.originalname}`, error);
        });
        res.json({
            success: true,
            jobId,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            message: 'PDF uploaded and processing started',
        });
    }
    catch (error) {
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
router.post('/batch', upload.array('pdfs', 10), async (req, res) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No PDF files uploaded' });
        }
        const processor = new pdf_processor_1.PDFProcessor();
        const db = new database_1.QuestionDatabase();
        const jobs = [];
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
                    fs_1.default.unlinkSync(file.path);
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
    }
    catch (error) {
        console.error('Batch upload error:', error);
        res.status(500).json({
            error: 'Failed to upload PDFs',
            message: error.message,
        });
    }
});
exports.default = router;
//# sourceMappingURL=upload.js.map