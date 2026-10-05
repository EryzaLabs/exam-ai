"use strict";
/**
 * Statistics Routes
 * API endpoints for database statistics
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../services/database");
const router = (0, express_1.Router)();
const db = new database_1.QuestionDatabase();
/**
 * GET /api/stats
 * Get overall database statistics
 */
router.get('/', async (req, res) => {
    try {
        const stats = await db.getStatistics();
        res.json(stats);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/stats/exam/:examType
 * Get statistics for specific exam type
 */
router.get('/exam/:examType', async (req, res) => {
    try {
        const { examType } = req.params;
        const stats = await db.getExamStatistics(examType);
        res.json(stats);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/stats/subject/:subject
 * Get statistics for specific subject
 */
router.get('/subject/:subject', async (req, res) => {
    try {
        const { subject } = req.params;
        const stats = await db.getSubjectStatistics(subject);
        res.json(stats);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=stats.js.map