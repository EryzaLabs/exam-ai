"use strict";
/**
 * Question Database Service (Server-side)
 * JSON-based storage for questions (no native dependencies)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionDatabase = void 0;
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const fs_1 = __importDefault(require("fs"));
class QuestionDatabase {
    dbPath;
    questions = [];
    loaded = false;
    constructor() {
        this.dbPath = process.env.DB_PATH || './data/questions.json';
        // Ensure directory exists
        const dir = path_1.default.dirname(this.dbPath);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        this.loadData();
    }
    loadData() {
        try {
            if (fs_1.default.existsSync(this.dbPath)) {
                const data = fs_1.default.readFileSync(this.dbPath, 'utf-8');
                this.questions = JSON.parse(data);
            }
            else {
                this.questions = [];
                this.saveDataSync();
            }
            this.loaded = true;
        }
        catch (error) {
            console.error('Error loading database:', error);
            this.questions = [];
            this.loaded = true;
        }
    }
    async saveData() {
        try {
            await promises_1.default.writeFile(this.dbPath, JSON.stringify(this.questions, null, 2), 'utf-8');
        }
        catch (error) {
            console.error('Error saving database:', error);
        }
    }
    saveDataSync() {
        try {
            fs_1.default.writeFileSync(this.dbPath, JSON.stringify(this.questions, null, 2), 'utf-8');
        }
        catch (error) {
            console.error('Error saving database:', error);
        }
    }
    async importQuestions(results) {
        const newQuestions = results.extractedQuestions.map((q) => ({
            id: q.questionId,
            question: q.questionText?.translated || q.questionText?.original || q.questionText,
            options: q.options?.map((o) => o.text?.translated || o.text?.original || o.text || o) || [],
            correct_answer: q.correctAnswer,
            explanation: q.explanation?.translated || q.explanation?.original || q.explanation || '',
            subject: q.subject,
            difficulty: q.difficulty,
            time_to_solve: q.timeToSolve,
            exam_type: q.metadata?.examType,
            year: q.metadata?.year,
            paper_name: q.metadata?.paperName,
            topics: q.topics || [],
            metadata: q.metadata,
            created_at: new Date().toISOString(),
        }));
        // Remove duplicates by ID
        const existingIds = new Set(this.questions.map(q => q.id));
        const toAdd = newQuestions.filter((q) => !existingIds.has(q.id));
        // Update existing
        for (const newQ of newQuestions) {
            const existingIndex = this.questions.findIndex(q => q.id === newQ.id);
            if (existingIndex >= 0) {
                this.questions[existingIndex] = newQ;
            }
        }
        this.questions.push(...toAdd);
        await this.saveData();
    }
    async getQuestions(filters) {
        let filtered = [...this.questions];
        if (filters.examTypes && filters.examTypes.length > 0) {
            filtered = filtered.filter(q => filters.examTypes.includes(q.exam_type));
        }
        if (filters.subjects && filters.subjects.length > 0) {
            filtered = filtered.filter(q => filters.subjects.includes(q.subject));
        }
        if (filters.years && filters.years.length > 0) {
            filtered = filtered.filter(q => filters.years.includes(q.year));
        }
        if (filters.difficulties && filters.difficulties.length > 0) {
            filtered = filtered.filter(q => filters.difficulties.includes(q.difficulty));
        }
        const limit = filters.limit || 50;
        const offset = filters.offset || 0;
        return filtered.slice(offset, offset + limit).map(q => this.formatQuestion(q));
    }
    async getQuestionById(id) {
        const question = this.questions.find(q => q.id === id);
        return question ? this.formatQuestion(question) : null;
    }
    async searchQuestions(query, filters = {}) {
        const searchTerm = query.toLowerCase();
        let filtered = this.questions.filter(q => q.question.toLowerCase().includes(searchTerm) ||
            (q.explanation && q.explanation.toLowerCase().includes(searchTerm)));
        if (filters.examTypes && filters.examTypes.length > 0) {
            filtered = filtered.filter(q => filters.examTypes.includes(q.exam_type));
        }
        if (filters.subjects && filters.subjects.length > 0) {
            filtered = filtered.filter(q => filters.subjects.includes(q.subject));
        }
        return filtered.slice(0, 100).map(q => this.formatQuestion(q));
    }
    async countQuestions(filters) {
        let filtered = [...this.questions];
        if (filters.examTypes && filters.examTypes.length > 0) {
            filtered = filtered.filter(q => filters.examTypes.includes(q.exam_type));
        }
        if (filters.subjects && filters.subjects.length > 0) {
            filtered = filtered.filter(q => filters.subjects.includes(q.subject));
        }
        return filtered.length;
    }
    async getExamTypes() {
        const types = [...new Set(this.questions.map(q => q.exam_type).filter(Boolean))];
        return types.sort();
    }
    async getSubjects(examType) {
        const filtered = examType
            ? this.questions.filter(q => q.exam_type === examType)
            : this.questions;
        const subjects = [...new Set(filtered.map(q => q.subject))];
        return subjects.sort();
    }
    async getYears(examType) {
        const filtered = examType
            ? this.questions.filter(q => q.exam_type === examType && q.year)
            : this.questions.filter(q => q.year);
        const years = [...new Set(filtered.map(q => q.year))];
        return years.sort((a, b) => b - a);
    }
    async generateTest(request) {
        const questions = await this.getQuestions({
            ...request.filters,
            limit: request.count * 2, // Get more for randomization
            offset: 0,
        });
        // Randomize if requested
        let selectedQuestions = questions;
        if (request.randomize) {
            selectedQuestions = questions.sort(() => Math.random() - 0.5);
        }
        selectedQuestions = selectedQuestions.slice(0, request.count);
        return {
            id: `test_${Date.now()}`,
            name: this.generateTestName(request),
            testType: request.testType,
            questions: selectedQuestions,
            duration: request.duration || this.estimateDuration(selectedQuestions),
            totalMarks: selectedQuestions.length,
            metadata: {
                filters: request.filters,
                generatedAt: new Date().toISOString(),
            },
        };
    }
    async getStatistics() {
        const total_questions = this.questions.length;
        const total_exams = new Set(this.questions.map(q => q.exam_type).filter(Boolean)).size;
        const total_subjects = new Set(this.questions.map(q => q.subject)).size;
        const total_years = new Set(this.questions.map(q => q.year).filter(Boolean)).size;
        const examTypeCounts = new Map();
        const subjectCounts = new Map();
        const difficultyCounts = new Map();
        this.questions.forEach(q => {
            if (q.exam_type) {
                examTypeCounts.set(q.exam_type, (examTypeCounts.get(q.exam_type) || 0) + 1);
            }
            if (q.subject) {
                subjectCounts.set(q.subject, (subjectCounts.get(q.subject) || 0) + 1);
            }
            if (q.difficulty) {
                difficultyCounts.set(q.difficulty, (difficultyCounts.get(q.difficulty) || 0) + 1);
            }
        });
        return {
            total_questions,
            total_exams,
            total_subjects,
            total_years,
            byExamType: Array.from(examTypeCounts.entries()).map(([exam_type, count]) => ({ exam_type, count })),
            bySubject: Array.from(subjectCounts.entries()).map(([subject, count]) => ({ subject, count })),
            byDifficulty: Array.from(difficultyCounts.entries()).map(([difficulty, count]) => ({ difficulty, count })),
        };
    }
    async getExamStatistics(examType) {
        const filtered = this.questions.filter(q => q.exam_type === examType);
        return {
            total_questions: filtered.length,
            total_subjects: new Set(filtered.map(q => q.subject)).size,
            total_years: new Set(filtered.map(q => q.year).filter(Boolean)).size,
        };
    }
    async getSubjectStatistics(subject) {
        const filtered = this.questions.filter(q => q.subject === subject);
        return {
            total_questions: filtered.length,
            total_exams: new Set(filtered.map(q => q.exam_type).filter(Boolean)).size,
            total_years: new Set(filtered.map(q => q.year).filter(Boolean)).size,
        };
    }
    formatQuestion(row) {
        return {
            id: row.id,
            question: row.question,
            options: row.options,
            correctAnswer: row.correct_answer,
            explanation: row.explanation,
            subject: row.subject,
            difficulty: row.difficulty,
            timeToSolve: row.time_to_solve,
            examType: row.exam_type,
            year: row.year,
            paperName: row.paper_name,
            topics: row.topics,
            metadata: row.metadata,
            createdAt: row.created_at,
        };
    }
    generateTestName(request) {
        const parts = [];
        if (request.filters.examTypes?.length === 1) {
            parts.push(request.filters.examTypes[0]);
        }
        if (request.filters.years?.length === 1) {
            parts.push(request.filters.years[0].toString());
        }
        if (request.filters.subjects?.length === 1) {
            parts.push(request.filters.subjects[0]);
        }
        if (parts.length === 0) {
            parts.push(request.testType.replace('_', ' '));
        }
        return parts.join(' - ');
    }
    estimateDuration(questions) {
        const totalTime = questions.reduce((sum, q) => sum + (q.timeToSolve || 60), 0);
        return Math.ceil(totalTime / 60);
    }
    close() {
        // No-op for JSON storage, but kept for compatibility
    }
}
exports.QuestionDatabase = QuestionDatabase;
//# sourceMappingURL=database.js.map