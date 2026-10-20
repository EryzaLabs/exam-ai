/**
 * Paper Service
 * Manages test papers, full mocks, topic-wise tests, and custom tests for Astra Exam AI.
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://astra-backend.eryzalabs.cloud/api';

export interface ServerPaper {
  id: string;
  testId?: string;
  title: string;
  filename: string;
  hasAnswers: boolean;
}

class PaperService {
  /**
   * Fetch list of all available papers / tests from server
   */
  async fetchPapersList(): Promise<ServerPaper[]> {
    try {
      const response = await fetch(`${API_URL}/papers`);
      if (!response.ok) throw new Error(`Failed to fetch papers list: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching papers list:', error);
      return [];
    }
  }

  /**
   * Get total count of available tests
   */
  async getAvailableTestsCount(): Promise<number> {
    try {
      const papers = await this.fetchPapersList();
      return papers && papers.length > 0 ? papers.length : 0;
    } catch {
      return 0;
    }
  }
}

export const paperService = new PaperService();
export default paperService;
