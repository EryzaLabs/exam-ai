/**
 * Main Server Entry Point
 * PDF Processing & Question Database API Server
 */

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Import routes
import uploadRoutes from './routes/upload';
import questionRoutes from './routes/questions';
import testRoutes from './routes/tests';
import statsRoutes from './routes/stats';
import processingRoutes from './routes/processing';
import paperRoutes from './routes/papers';
import testseriesRoutes from './routes/testseries';
import answerGenerationRoutes from './routes/answer-generation';
import reportsRoutes from './routes/reports';
import paymentRoutes from './routes/payment';

// Initialize Express app
const app: Express = express();
const PORT = process.env.PORT || 3000;

// Ensure required directories exist
const dirs = [
  process.env.UPLOAD_DIR || './uploads',
  process.env.OUTPUT_DIR || './output',
  process.env.CACHE_DIR || './cache',
  process.env.TEMP_DIR || './temp',
  './data',
  './logs',
];

dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Middleware
app.use(helmet());
const corsOrigin = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()) 
  : '*';

app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(process.env.LOG_LEVEL || 'dev'));

// API Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/processing', processingRoutes);
app.use('/api/papers', paperRoutes);
app.use('/api/testseries', testseriesRoutes);
app.use('/api/answers', answerGenerationRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/payment', paymentRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Exam AI - PDF Processing Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      upload: '/api/upload',
      questions: '/api/questions',
      tests: '/api/tests',
      stats: '/api/stats',
      processing: '/api/processing',
    },
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500,
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 VLM Provider: ${process.env.VLM_PROVIDER || 'qwen'}`);
  console.log(`📁 Upload directory: ${process.env.UPLOAD_DIR || './uploads'}`);
  console.log(`💾 Database: ${process.env.DB_PATH || './data/questions.db'}`);
  console.log(`\n✅ Server ready to process PDFs!\n`);
});

export default app;
