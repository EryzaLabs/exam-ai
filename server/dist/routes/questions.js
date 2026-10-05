"use strict";
/**
 * Question Routes
 * API endpoints for querying questions
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../services/database");
const router = (0, express_1.Router)();
const db = new database_1.QuestionDatabase();
/**
 * GET /api/questions
 * Get questions with filters
 */
router.get('/', async (req, res) => {
    try {
        const filters = {
            examTypes: req.query.examTypes ? req.query.examTypes.split(',') : undefined,
            subjects: req.query.subjects ? req.query.subjects.split(',') : undefined,
            years: req.query.years ? req.query.years.split(',').map(Number) : undefined,
            difficulties: req.query.difficulties ? req.query.difficulties.split(',') : undefined,
            limit: parseInt(req.query.limit) || 50,
            offset: parseInt(req.query.offset) || 0,
        };
        const questions = await db.getQuestions(filters);
        const total = await db.countQuestions(filters);
        res.json({
            questions,
            total,
            limit: filters.limit,
            offset: filters.offset,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/questions/:id
 * Get a specific question by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const question = await db.getQuestionById(req.params.id);
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }
        res.json(question);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/questions/search
 * Search questions by text
 */
router.get('/search/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const filters = {
            examTypes: req.query.examTypes ? req.query.examTypes.split(',') : undefined,
            subjects: req.query.subjects ? req.query.subjects.split(',') : undefined,
        };
        const questions = await db.searchQuestions(query, filters);
        res.json({
            query,
            results: questions,
            count: questions.length,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/questions/exam-types
 * Get all available exam types
 */
router.get('/meta/exam-types', async (req, res) => {
    try {
        const examTypes = await db.getExamTypes();
        res.json(examTypes);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/questions/subjects
 * Get all available subjects
 */
router.get('/meta/subjects', async (req, res) => {
    try {
        const examType = req.query.examType;
        const subjects = await db.getSubjects(examType);
        res.json(subjects);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/questions/years
 * Get all available years
 */
router.get('/meta/years', async (req, res) => {
    try {
        const examType = req.query.examType;
        const years = await db.getYears(examType);
        res.json(years);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=questions.js.map