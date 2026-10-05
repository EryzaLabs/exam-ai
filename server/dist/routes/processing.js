"use strict";
/**
 * Processing Status Routes
 * Monitor PDF processing jobs
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
// In-memory job tracking (in production, use Redis or database)
const jobs = new Map();
/**
 * GET /api/processing/jobs
 * Get all processing jobs
 */
router.get('/jobs', (req, res) => {
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
router.get('/jobs/:jobId', (req, res) => {
    const job = jobs.get(req.params.jobId);
    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
});
exports.default = router;
//# sourceMappingURL=processing.js.map