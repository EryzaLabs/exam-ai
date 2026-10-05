"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const router = (0, express_1.Router)();
const DATA_ROOT = path_1.default.resolve(__dirname, '../../../');
const REPORTS_DIR = path_1.default.join(DATA_ROOT, 'user_reports');
// Ensure reports directory exists
if (!fs_1.default.existsSync(REPORTS_DIR)) {
    fs_1.default.mkdirSync(REPORTS_DIR, { recursive: true });
}
/**
 * POST /api/reports/question - Submit a question/answer report
 */
router.post('/question', async (req, res) => {
    try {
        const { userId, userEmail, testId, testTitle, questionId, questionText, reportType, description, } = req.body;
        if (!userId || !testId || !questionId || !reportType || !description) {
            return res.status(400).json({
                error: 'Missing required fields: userId, testId, questionId, reportType, description'
            });
        }
        const report = {
            id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId,
            userEmail,
            testId,
            testTitle,
            questionId,
            questionText: questionText || '',
            reportType,
            description,
            timestamp: new Date().toISOString(),
            status: 'pending',
        };
        // Save to file system (in production, use a database)
        const reportFilePath = path_1.default.join(REPORTS_DIR, `${report.id}.json`);
        fs_1.default.writeFileSync(reportFilePath, JSON.stringify(report, null, 2));
        // Also append to a master log file
        const logFilePath = path_1.default.join(REPORTS_DIR, 'reports_log.jsonl');
        fs_1.default.appendFileSync(logFilePath, JSON.stringify(report) + '\n');
        console.log(`📝 New report submitted: ${report.id} by ${userEmail || userId}`);
        res.json({
            success: true,
            reportId: report.id,
            message: 'Report submitted successfully. Thank you for helping us improve!'
        });
    }
    catch (error) {
        console.error('Error submitting report:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/reports - Get all reports (admin only)
 */
router.get('/', (req, res) => {
    try {
        const status = req.query.status;
        const reportFiles = fs_1.default.readdirSync(REPORTS_DIR)
            .filter(f => f.endsWith('.json') && f !== 'reports_log.jsonl');
        const reports = reportFiles.map(file => {
            const filePath = path_1.default.join(REPORTS_DIR, file);
            const content = fs_1.default.readFileSync(filePath, 'utf-8');
            return JSON.parse(content);
        });
        // Filter by status if provided
        let filteredReports = reports;
        if (status) {
            filteredReports = reports.filter(r => r.status === status);
        }
        // Sort by timestamp (newest first)
        filteredReports.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        res.json({
            total: filteredReports.length,
            reports: filteredReports
        });
    }
    catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * PATCH /api/reports/:reportId - Update report status (admin only)
 */
router.patch('/:reportId', (req, res) => {
    try {
        const { reportId } = req.params;
        const { status, adminNotes } = req.body;
        const reportFilePath = path_1.default.join(REPORTS_DIR, `${reportId}.json`);
        if (!fs_1.default.existsSync(reportFilePath)) {
            return res.status(404).json({ error: 'Report not found' });
        }
        const report = JSON.parse(fs_1.default.readFileSync(reportFilePath, 'utf-8'));
        if (status) {
            report.status = status;
        }
        if (adminNotes) {
            report.adminNotes = adminNotes;
        }
        fs_1.default.writeFileSync(reportFilePath, JSON.stringify(report, null, 2));
        res.json({
            success: true,
            report
        });
    }
    catch (error) {
        console.error('Error updating report:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/reports/stats - Get report statistics (admin only)
 */
router.get('/stats', (req, res) => {
    try {
        const reportFiles = fs_1.default.readdirSync(REPORTS_DIR)
            .filter(f => f.endsWith('.json') && f !== 'reports_log.jsonl');
        const reports = reportFiles.map(file => {
            const filePath = path_1.default.join(REPORTS_DIR, file);
            const content = fs_1.default.readFileSync(filePath, 'utf-8');
            return JSON.parse(content);
        });
        const stats = {
            total: reports.length,
            byStatus: {
                pending: reports.filter(r => r.status === 'pending').length,
                reviewed: reports.filter(r => r.status === 'reviewed').length,
                resolved: reports.filter(r => r.status === 'resolved').length,
                dismissed: reports.filter(r => r.status === 'dismissed').length,
            },
            byType: {
                wrong_answer: reports.filter(r => r.reportType === 'wrong_answer').length,
                incorrect_question: reports.filter(r => r.reportType === 'incorrect_question').length,
                typo: reports.filter(r => r.reportType === 'typo').length,
                inappropriate: reports.filter(r => r.reportType === 'inappropriate').length,
                other: reports.filter(r => r.reportType === 'other').length,
            },
            recentReports: reports
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 10)
        };
        res.json(stats);
    }
    catch (error) {
        console.error('Error fetching report stats:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=reports.js.map