/**
 * Question Routes
 * API endpoints for querying questions
 */

import { Router, Request, Response } from 'express';
import { QuestionDatabase } from '../services/database';

const router = Router();
const db = new QuestionDatabase();

/**
 * GET /api/questions
 * Get questions with filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters = {
      examTypes: req.query.examTypes ? (req.query.examTypes as string).split(',') : undefined,
      subjects: req.query.subjects ? (req.query.subjects as string).split(',') : undefined,
      years: req.query.years ? (req.query.years as string).split(',').map(Number) : undefined,
      difficulties: req.query.difficulties ? (req.query.difficulties as string).split(',') : undefined,
      limit: parseInt(req.query.limit as string) || 50,
      offset: parseInt(req.query.offset as string) || 0,
    };

    const questions = await db.getQuestions(filters);
    const total = await db.countQuestions(filters);

    res.json({
      questions,
      total,
      limit: filters.limit,
      offset: filters.offset,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/questions/:id
 * Get a specific question by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const question = await db.getQuestionById(req.params.id);
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json(question);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/questions/search
 * Search questions by text
 */
router.get('/search/:query', async (req: Request, res: Response) => {
  try {
    const { query } = req.params;
    const filters = {
      examTypes: req.query.examTypes ? (req.query.examTypes as string).split(',') : undefined,
      subjects: req.query.subjects ? (req.query.subjects as string).split(',') : undefined,
    };

    const questions = await db.searchQuestions(query, filters);

    res.json({
      query,
      results: questions,
      count: questions.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/questions/exam-types
 * Get all available exam types
 */
router.get('/meta/exam-types', async (req: Request, res: Response) => {
  try {
    const examTypes = await db.getExamTypes();
    res.json(examTypes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/questions/subjects
 * Get all available subjects
 */
router.get('/meta/subjects', async (req: Request, res: Response) => {
  try {
    const examType = req.query.examType as string | undefined;
    const subjects = await db.getSubjects(examType);
    res.json(subjects);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/questions/years
 * Get all available years
 */
router.get('/meta/years', async (req: Request, res: Response) => {
  try {
    const examType = req.query.examType as string | undefined;
    const years = await db.getYears(examType);
    res.json(years);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
