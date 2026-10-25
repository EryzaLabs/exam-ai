/**
 * Statistics Routes
 * API endpoints for database statistics
 */

import { Router, Request, Response } from 'express';
import { QuestionDatabase } from '../services/database';

const router = Router();
const db = new QuestionDatabase();

/**
 * GET /api/stats
 * Get overall database statistics
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const stats = await db.getStatistics();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/stats/exam/:examType
 * Get statistics for specific exam type
 */
router.get('/exam/:examType', async (req: Request, res: Response) => {
  try {
    const { examType } = req.params;
    const stats = await db.getExamStatistics(examType);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/stats/subject/:subject
 * Get statistics for specific subject
 */
router.get('/subject/:subject', async (req: Request, res: Response) => {
  try {
    const { subject } = req.params;
    const stats = await db.getSubjectStatistics(subject);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
