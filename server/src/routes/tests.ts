/**
 * Test Generation Routes
 * API endpoints for generating custom tests
 */

import { Router, Request, Response } from 'express';
import { QuestionDatabase } from '../services/database';

const router = Router();
const db = new QuestionDatabase();

/**
 * POST /api/tests/generate
 * Generate a custom test based on filters
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const {
      testType = 'mixed',
      filters = {},
      count = 50,
      duration,
      randomize = true,
    } = req.body;

    const test = await db.generateTest({
      testType,
      filters,
      count,
      duration,
      randomize,
    });

    res.json(test);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tests/previous-year
 * Get previous year paper test
 */
router.get('/previous-year', async (req: Request, res: Response) => {
  try {
    const examType = req.query.examType as string;
    const year = parseInt(req.query.year as string);
    const paperName = req.query.paperName as string | undefined;

    if (!examType || !year) {
      return res.status(400).json({ error: 'examType and year are required' });
    }

    const test = await db.generateTest({
      testType: 'previous_year',
      filters: {
        examTypes: [examType],
        years: [year],
        paperTypes: paperName ? [paperName] : undefined,
      },
      count: 100,
      randomize: false,
    });

    res.json(test);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tests/subject-wise
 * Get subject-wise test
 */
router.get('/subject-wise', async (req: Request, res: Response) => {
  try {
    const subjects = (req.query.subjects as string).split(',');
    const count = parseInt(req.query.count as string) || 50;
    const difficulty = req.query.difficulty as string | undefined;

    if (!subjects || subjects.length === 0) {
      return res.status(400).json({ error: 'At least one subject is required' });
    }

    const test = await db.generateTest({
      testType: 'subject_wise',
      filters: {
        subjects,
        difficulties: difficulty ? [difficulty as any] : undefined,
      },
      count,
      randomize: true,
    });

    res.json(test);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tests/daily-practice
 * Get daily practice test
 */
router.get('/daily-practice', async (req: Request, res: Response) => {
  try {
    const count = parseInt(req.query.count as string) || 20;
    const examType = req.query.examType as string | undefined;

    const test = await db.generateTest({
      testType: 'daily_practice',
      filters: {
        examTypes: examType ? [examType] : undefined,
      },
      count,
      duration: Math.ceil(count * 1.2), // ~1.2 min per question
      randomize: true,
    });

    res.json(test);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
