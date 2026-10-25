import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

const DATA_ROOT = path.resolve(__dirname, '../../../');
const REPORTS_DIR = path.join(DATA_ROOT, 'user_reports');

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

interface QuestionReport {
  id: string;
  userId: string;
  userEmail?: string;
  testId: string;
  testTitle?: string;
  questionId: string;
  questionText: string;
  reportType: 'wrong_answer' | 'incorrect_question' | 'typo' | 'inappropriate' | 'other';
  description: string;
  timestamp: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  adminNotes?: string;
}

/**
 * POST /api/reports/question - Submit a question/answer report
 */
router.post('/question', async (req: Request, res: Response) => {
  try {
    const {
      userId,
      userEmail,
      testId,
      testTitle,
      questionId,
      questionText,
      reportType,
      description,
    } = req.body;

    if (!userId || !testId || !questionId || !reportType || !description) {
      return res.status(400).json({
        error: 'Missing required fields: userId, testId, questionId, reportType, description'
      });
    }

    const report: QuestionReport = {
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
    const reportFilePath = path.join(REPORTS_DIR, `${report.id}.json`);
    fs.writeFileSync(reportFilePath, JSON.stringify(report, null, 2));

    // Also append to a master log file
    const logFilePath = path.join(REPORTS_DIR, 'reports_log.jsonl');
    fs.appendFileSync(logFilePath, JSON.stringify(report) + '\n');

    console.log(`📝 New report submitted: ${report.id} by ${userEmail || userId}`);

    res.json({
      success: true,
      reportId: report.id,
      message: 'Report submitted successfully. Thank you for helping us improve!'
    });

  } catch (error: any) {
    console.error('Error submitting report:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/reports - Get all reports (admin only)
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    
    const reportFiles = fs.readdirSync(REPORTS_DIR)
      .filter(f => f.endsWith('.json') && f !== 'reports_log.jsonl');

    const reports: QuestionReport[] = reportFiles.map(file => {
      const filePath = path.join(REPORTS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    });

    // Filter by status if provided
    let filteredReports = reports;
    if (status) {
      filteredReports = reports.filter(r => r.status === status);
    }

    // Sort by timestamp (newest first)
    filteredReports.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    res.json({
      total: filteredReports.length,
      reports: filteredReports
    });

  } catch (error: any) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/reports/:reportId - Update report status (admin only)
 */
router.patch('/:reportId', (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const { status, adminNotes } = req.body;

    const reportFilePath = path.join(REPORTS_DIR, `${reportId}.json`);

    if (!fs.existsSync(reportFilePath)) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report: QuestionReport = JSON.parse(
      fs.readFileSync(reportFilePath, 'utf-8')
    );

    if (status) {
      report.status = status;
    }
    if (adminNotes) {
      report.adminNotes = adminNotes;
    }

    fs.writeFileSync(reportFilePath, JSON.stringify(report, null, 2));

    res.json({
      success: true,
      report
    });

  } catch (error: any) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/reports/stats - Get report statistics (admin only)
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const reportFiles = fs.readdirSync(REPORTS_DIR)
      .filter(f => f.endsWith('.json') && f !== 'reports_log.jsonl');

    const reports: QuestionReport[] = reportFiles.map(file => {
      const filePath = path.join(REPORTS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
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

  } catch (error: any) {
    console.error('Error fetching report stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
