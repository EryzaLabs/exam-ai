import { Platform } from 'react-native';
import { auth } from './firebaseConfig';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://astra-backend.eryzalabs.cloud/api';

export type ReportType = 'wrong_answer' | 'incorrect_question' | 'typo' | 'inappropriate' | 'other';
export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';

export interface QuestionReport {
  id?: string;
  userId: string;
  userEmail?: string;
  testId: string;
  testTitle?: string;
  questionId: string;
  questionText: string;
  reportType: ReportType;
  description: string;
  status?: ReportStatus;
  createdAt?: number;
  updatedAt?: number;
  adminNotes?: string;
}

const ReportService = {
  /**
   * Submit a report for a question or answer
   */
  async submitReport(report: QuestionReport): Promise<{ success: boolean; reportId: string; message: string }> {
    try {
      const user = auth.currentUser;
      const reportData = {
        ...report,
        userId: user?.uid || report.userId,
        userEmail: user?.email || report.userEmail,
      };

      const response = await fetch(`${API_URL}/reports/question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit report');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error submitting report:', error);
      throw error;
    }
  },

  /**
   * Get all reports (admin only)
   */
  async getAllReports(status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed'): Promise<any[]> {
    try {
      const url = status 
        ? `${API_URL}/reports?status=${status}`
        : `${API_URL}/reports`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }

      const data = await response.json();
      return data.reports || [];
    } catch (error) {
      console.error('Error fetching reports:', error);
      throw error;
    }
  },

  /**
   * Get report statistics (admin only)
   */
  async getReportStats(): Promise<any> {
    try {
      const response = await fetch(`${API_URL}/reports/stats`);

      if (!response.ok) {
        throw new Error('Failed to fetch report stats');
      }

      const stats = await response.json();
      return stats;
    } catch (error) {
      console.error('Error fetching report stats:', error);
      throw error;
    }
  },

  /**
   * Update report status (admin only)
   */
  async updateReportStatus(
    reportId: string, 
    status: 'pending' | 'reviewed' | 'resolved' | 'dismissed',
    adminNotes?: string
  ): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/reports/${reportId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, adminNotes }),
      });

      if (!response.ok) {
        throw new Error('Failed to update report');
      }
    } catch (error) {
      console.error('Error updating report:', error);
      throw error;
    }
  }
};

export default ReportService;
