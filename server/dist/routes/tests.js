"use strict";
/**
 * Test Generation Routes
 * API endpoints for generating custom tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../services/database");
const router = (0, express_1.Router)();
const db = new database_1.QuestionDatabase();
/**
 * POST /api/tests/generate
 * Generate a custom test based on filters
 */
router.post('/generate', async (req, res) => {
    try {
        const { testType = 'mixed', filters = {}, count = 50, duration, randomize = true, } = req.body;
        const test = await db.generateTest({
            testType,
            filters,
            count,
            duration,
            randomize,
        });
        res.json(test);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/tests/previous-year
 * Get previous year paper test
 */
router.get('/previous-year', async (req, res) => {
    try {
        const examType = req.query.examType;
        const year = parseInt(req.query.year);
        const paperName = req.query.paperName;
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/tests/subject-wise
 * Get subject-wise test
 */
router.get('/subject-wise', async (req, res) => {
    try {
        const subjects = req.query.subjects.split(',');
        const count = parseInt(req.query.count) || 50;
        const difficulty = req.query.difficulty;
        if (!subjects || subjects.length === 0) {
            return res.status(400).json({ error: 'At least one subject is required' });
        }
        const test = await db.generateTest({
            testType: 'subject_wise',
            filters: {
                subjects,
                difficulties: difficulty ? [difficulty] : undefined,
            },
            count,
            randomize: true,
        });
        res.json(test);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/tests/daily-practice
 * Get daily practice test
 */
router.get('/daily-practice', async (req, res) => {
    try {
        const count = parseInt(req.query.count) || 20;
        const examType = req.query.examType;
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=tests.js.map