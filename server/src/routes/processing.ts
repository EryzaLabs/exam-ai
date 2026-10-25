/**
 * Processing Status Routes
 * Monitor PDF processing jobs
 */

import { Router, Request, Response } from 'express';

const router = Router();

// In-memory job tracking (in production, use Redis or database)
const jobs = new Map<string, any>();

/**
 * GET /api/processing/jobs
 * Get all processing jobs
 */
router.get('/jobs', (req: Request, res: Response) => {
  const allJobs = Array.from(jobs.values());
  res.json({
    jobs: allJobs,
    total: allJobs.length,
  });
});

/**
 * GET /api/processing/jobs/:jobId
 * Get specific job status
 */
router.get('/jobs/:jobId', (req: Request, res: Response) => {
  const job = jobs.get(req.params.jobId);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json(job);
});

export default router;
