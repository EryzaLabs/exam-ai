/**
 * API Client for Exam AI Server
 * Use this in the React Native app to connect to backend
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://astra-backend.eryzalabs.cloud/api';
const API_KEY = process.env.API_KEY; // Optional

interface FetchOptions extends RequestInit {
  params?: Record<string, any>;
}

class APIClient {
  private baseURL: string;
  private apiKey?: string;

  constructor(baseURL: string = API_BASE_URL, apiKey?: string) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
  }

  private async request(endpoint: string, options: FetchOptions = {}) {
    const { params, ...fetchOptions } = options;

    // Build URL with query params
    let url = `${this.baseURL}${endpoint}`;
    if (params) {
      const queryString = new URLSearchParams(
        Object.entries(params).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null) {
            acc[key] = Array.isArray(value) ? value.join(',') : String(value);
          }
          return acc;
        }, {} as Record<string, string>)
      ).toString();
      
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    // Add headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers || {}),
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Question APIs
  async getQuestions(filters: {
    examTypes?: string[];
    subjects?: string[];
    years?: number[];
    difficulties?: string[];
    limit?: number;
    offset?: number;
  } = {}) {
    return this.request('/questions', { params: filters });
  }

  async getQuestionById(id: string) {
    return this.request(`/questions/${id}`);
  }

  async searchQuestions(query: string, filters?: {
    examTypes?: string[];
    subjects?: string[];
  }) {
    return this.request(`/questions/search/${encodeURIComponent(query)}`, {
      params: filters,
    });
  }

  async getExamTypes() {
    return this.request('/questions/meta/exam-types');
  }

  async getSubjects(examType?: string) {
    return this.request('/questions/meta/subjects', {
      params: { examType },
    });
  }

  async getYears(examType?: string) {
    return this.request('/questions/meta/years', {
      params: { examType },
    });
  }

  // Test Generation APIs
  async generateTest(request: {
    testType?: string;
    filters?: {
      examTypes?: string[];
      subjects?: string[];
      years?: number[];
      difficulties?: string[];
      paperTypes?: string[];
    };
    count?: number;
    duration?: number;
    randomize?: boolean;
  }) {
    return this.request('/tests/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getPreviousYearTest(examType: string, year: number, paperName?: string) {
    return this.request('/tests/previous-year', {
      params: { examType, year, paperName },
    });
  }

  async getSubjectWiseTest(subjects: string[], count: number = 50, difficulty?: string) {
    return this.request('/tests/subject-wise', {
      params: { subjects: subjects.join(','), count, difficulty },
    });
  }

  async getDailyPractice(count: number = 20, examType?: string) {
    return this.request('/tests/daily-practice', {
      params: { count, examType },
    });
  }

  // Statistics APIs
  async getStatistics() {
    return this.request('/stats');
  }

  async getExamStatistics(examType: string) {
    return this.request(`/stats/exam/${examType}`);
  }

  async getSubjectStatistics(subject: string) {
    return this.request(`/stats/subject/${subject}`);
  }

  // Processing APIs
  async getProcessingJobs() {
    return this.request('/processing/jobs');
  }

  async getJobStatus(jobId: string) {
    return this.request(`/processing/jobs/${jobId}`);
  }

  // Health check
  async healthCheck() {
    const response = await fetch(`${this.baseURL.replace('/api', '')}/health`);
    return response.json();
  }
}

// Export singleton instance
export const api = new APIClient();

// Export class for custom instances
export default APIClient;
