import AsyncStorage from '@react-native-async-storage/async-storage';
import pako from 'pako'; // For gzip decompression in app

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://exambc.alaotach.com/api';

export interface TestSeries {
  id: string;
  folderName: string;
  title: string;
  sections: Section[];
  totalSections: number;
  totalTests: number;
}

export interface Section {
  id: string;
  folderName: string; // Actual folder name on server
  title: string;
  availableTests: number;
}

export interface Test {
  id: string;
  title: string;
  description?: string;
  questionCount?: number;
  duration?: number;
  totalMark?: number;
  filename: string;
  compressed: boolean;
}

export interface TestPaper {
  _id: string;
  data: {
    title?: string;
    description?: string;
    totalMarks?: number;
    totalTime?: number;
    sections: Array<{
      title: string;
      questions: Array<any>;
    }>;
  };
}

export interface AnswerGenerationStatus {
  testId: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'not-found';
  progress?: number;
  answersAvailable?: boolean;
  error?: string;
}

const TestSeriesService = {
  /**
   * Fetch test series with pagination
   */
  async fetchTestSeries(page: number = 1, limit: number = 20): Promise<{
    testSeries: TestSeries[];
    total: number;
    hasMore: boolean;
    page: number;
    totalPages: number;
  }> {
    try {
      const response = await fetch(`${API_URL}/testseries?page=${page}&limit=${limit}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch test series: ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching test series:', error);
      throw error;
    }
  },

  /**
   * Fetch all test series (for backward compatibility)
   */
  async fetchAllTestSeries(): Promise<TestSeries[]> {
    try {
      const response = await fetch(`${API_URL}/testseries?limit=9999`);
      if (!response.ok) {
        throw new Error(`Failed to fetch test series: ${response.statusText}`);
      }
      const data = await response.json();
      return data.testSeries || [];
    } catch (error) {
      console.error('Error fetching test series:', error);
      throw error;
    }
  },

  /**
   * Fetch tests in a specific section
   */
  async fetchSectionTests(seriesFolder: string, sectionFolder: string): Promise<{ section: any; tests: Test[] }> {
    try {
      const response = await fetch(
        `${API_URL}/testseries/${encodeURIComponent(seriesFolder)}/${encodeURIComponent(sectionFolder)}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch section tests: ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching section tests:', error);
      throw error;
    }
  },

  /**
   * Fetch and decompress a test paper
   */
  async fetchTestPaper(seriesFolder: string, sectionFolder: string, testId: string): Promise<TestPaper> {
    try {
      // Check cache first
      const cacheKey = `test_${seriesFolder}_${sectionFolder}_${testId}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        console.log('Loading test from cache');
        return JSON.parse(cached);
      }

      const url = `${API_URL}/testseries/${encodeURIComponent(seriesFolder)}/${encodeURIComponent(sectionFolder)}/${encodeURIComponent(testId)}`;
      console.log('Fetching test from server:', url);
      
      const response = await fetch(url);
      
      console.log('Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(`Failed to fetch test paper: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const testData = await response.json();

      // Cache the test data
      await AsyncStorage.setItem(cacheKey, JSON.stringify(testData));

      return testData;
    } catch (error) {
      console.error('Error fetching test paper:', error);
      throw error;
    }
  },

  /**
   * Look up a test paper from cache by testId only
   */
  async getTestPaperFromCache(testId: string): Promise<TestPaper | null> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const testKey = keys.find(k => k.startsWith('test_') && k.endsWith(`_${testId}`));
      if (testKey) {
        const cached = await AsyncStorage.getItem(testKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting test paper from cache:', error);
      return null;
    }
  },

  /**
   * Look up a test paper globally from the server by testId only
   */
  async fetchTestPaperGlobally(testId: string): Promise<TestPaper | null> {
    try {
      const response = await fetch(`${API_URL}/testseries/test/${encodeURIComponent(testId)}`);
      if (!response.ok) {
        return null;
      }
      const testData = await response.json();
      return testData;
    } catch (error) {
      console.error('Error fetching test paper globally:', error);
      return null;
    }
  },

  /**
   * Trigger answer generation for a test
   */
  async requestAnswerGeneration(testId: string, testFilePath: string): Promise<AnswerGenerationStatus> {
    try {
      const response = await fetch(`${API_URL}/answers/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testId, testFilePath }),
      });

      if (!response.ok) {
        throw new Error(`Failed to request answer generation: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error requesting answer generation:', error);
      throw error;
    }
  },

  /**
   * Check answer generation status
   */
  async checkAnswerGenerationStatus(testId: string): Promise<AnswerGenerationStatus> {
    try {
      const response = await fetch(`${API_URL}/answers/status/${encodeURIComponent(testId)}`);
      
      if (response.status === 404) {
        return {
          testId,
          status: 'not-found',
          answersAvailable: false
        };
      }

      if (!response.ok) {
        throw new Error(`Failed to check answer status: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error checking answer generation status:', error);
      throw error;
    }
  },

  /**
   * Fetch generated answers for a test
   */
  async fetchAnswers(testFileName: string): Promise<any> {
    try {
      const response = await fetch(`${API_URL}/answers/${encodeURIComponent(testFileName)}`);
      
      if (response.status === 404) {
        return null; // Answers not available
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch answers: ${response.statusText}`);
      }

      const answers = await response.json();
      return answers;
    } catch (error) {
      console.error('Error fetching answers:', error);
      return null;
    }
  },

  /**
   * Poll answer generation status until complete or failed
   */
  async waitForAnswerGeneration(
    testId: string, 
    onProgress?: (status: AnswerGenerationStatus) => void,
    timeoutMs: number = 300000 // 5 minutes default
  ): Promise<AnswerGenerationStatus> {
    const startTime = Date.now();
    const pollInterval = 3000; // Poll every 3 seconds

    while (Date.now() - startTime < timeoutMs) {
      const status = await this.checkAnswerGenerationStatus(testId);
      
      if (onProgress) {
        onProgress(status);
      }

      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Answer generation timeout');
  }
};

export default TestSeriesService;
