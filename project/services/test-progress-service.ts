import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from './firebaseConfig';
import { 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  collection, 
  query, 
  orderBy, 
  getDocs 
} from 'firebase/firestore';
import { TestAttempt, TestAnalytics } from './ssc-cgl-service';
import UserService from './user-service';

export interface SavedTestState {
  testId: string;
  attemptId: string;
  currentQuestionIndex: number;
  timeRemaining: number;
  questionStates: Record<string, any>; // Changed from array to object
  answers: Record<string, number>;
  lastUpdated: number;
  questionOrder?: string[]; // Array of question IDs in shuffled order
  testTitle?: string;
  totalQuestions?: number;
  filename?: string;
}

export interface TestResult extends TestAnalytics {
  date: string; // ISO string
  testTitle?: string;
  filename?: string;
  answers?: any[];
  id?: string; // Firestore ID
  answerGenerationStatus?: 'not-needed' | 'pending' | 'in-progress' | 'completed' | 'failed';
  evaluationStatus?: 'pending' | 'completed';
  answerGenerationError?: string;
  questionOrder?: string[]; // Array of question IDs in the order they were presented to the user
}

export const TestProgressService = {
  // --- Active Test Management ---

  async saveCurrentTest(state: SavedTestState): Promise<void> {
    try {
      // Ensure clean serialization
      const cleanState = JSON.parse(JSON.stringify(state));

      // 1. Always save to local AsyncStorage for instant retrieval
      try {
        await AsyncStorage.setItem(`@active_test_${state.testId}`, JSON.stringify(cleanState));
        const rawIds = await AsyncStorage.getItem('@active_test_ids');
        const ids: string[] = rawIds ? JSON.parse(rawIds) : [];
        if (!ids.includes(state.testId)) {
          await AsyncStorage.setItem('@active_test_ids', JSON.stringify([...ids, state.testId]));
        }
      } catch (storageErr) {
        console.warn('AsyncStorage save failed for test progress:', storageErr);
      }

      // 2. Sync to Firestore if authenticated
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, 'users', user.uid, 'active_tests', state.testId);
        await setDoc(docRef, cleanState);
      }
    } catch (e) {
      console.error('Failed to save test progress', e);
      throw e;
    }
  },

  async getTestProgress(testId: string): Promise<SavedTestState | null> {
    try {
      const user = auth.currentUser;
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid, 'active_tests', testId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            return docSnap.data() as SavedTestState;
          }
        } catch (fsErr) {
          console.warn('Firestore getTestProgress failed, trying local storage:', fsErr);
        }
      }

      // Fallback to local AsyncStorage
      const local = await AsyncStorage.getItem(`@active_test_${testId}`);
      if (local) {
        return JSON.parse(local) as SavedTestState;
      }
      return null;
    } catch (e) {
      console.error('Failed to load current test', e);
      return null;
    }
  },

  async clearTestProgress(testId: string): Promise<void> {
    try {
      // 1. Remove from local AsyncStorage
      try {
        await AsyncStorage.removeItem(`@active_test_${testId}`);
        const rawIds = await AsyncStorage.getItem('@active_test_ids');
        if (rawIds) {
          const ids: string[] = JSON.parse(rawIds);
          const filtered = ids.filter((id) => id !== testId);
          await AsyncStorage.setItem('@active_test_ids', JSON.stringify(filtered));
        }
      } catch (storageErr) {
        console.warn('AsyncStorage clear failed:', storageErr);
      }

      // 2. Remove from Firestore
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, 'users', user.uid, 'active_tests', testId);
        await deleteDoc(docRef);
      }
    } catch (e) {
      console.error('Failed to clear current test', e);
    }
  },

  async getSavedTests(): Promise<SavedTestState[]> {
    const testsMap = new Map<string, SavedTestState>();

    // 1. Load from local AsyncStorage
    try {
      const rawIds = await AsyncStorage.getItem('@active_test_ids');
      if (rawIds) {
        const ids: string[] = JSON.parse(rawIds);
        for (const id of ids) {
          const item = await AsyncStorage.getItem(`@active_test_${id}`);
          if (item) {
            const parsed = JSON.parse(item) as SavedTestState;
            testsMap.set(parsed.testId, parsed);
          }
        }
      }
    } catch (storageErr) {
      console.warn('AsyncStorage getSavedTests error:', storageErr);
    }

    // 2. Merge with Firestore active_tests
    try {
      const user = auth.currentUser;
      if (user) {
        const colRef = collection(db, 'users', user.uid, 'active_tests');
        const snap = await getDocs(colRef);
        snap.docs.forEach((d) => {
          const data = d.data() as SavedTestState;
          const existing = testsMap.get(data.testId);
          if (!existing || (data.lastUpdated || 0) > (existing.lastUpdated || 0)) {
            testsMap.set(data.testId, data);
          }
        });
      }
    } catch (e) {
      console.error('Failed to get saved tests from Firestore', e);
    }

    // Sort by lastUpdated descending (most recently played first)
    return Array.from(testsMap.values()).sort(
      (a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0)
    );
  },

  // --- History Management ---

  async saveTestResult(result: TestResult): Promise<void> {
    try {
      const cleanResult = JSON.parse(JSON.stringify(result));

      // 1. Always cache in local AsyncStorage for instant loading
      try {
        await AsyncStorage.setItem(`@test_result_${result.attemptId}`, JSON.stringify(cleanResult));
        const rawIds = await AsyncStorage.getItem('@test_history_ids');
        const ids: string[] = rawIds ? JSON.parse(rawIds) : [];
        if (!ids.includes(result.attemptId)) {
          await AsyncStorage.setItem('@test_history_ids', JSON.stringify([result.attemptId, ...ids]));
        }
      } catch (storageErr) {
        console.warn('AsyncStorage save error for test result:', storageErr);
      }

      // 2. Save to Firestore if authenticated
      const user = auth.currentUser;
      if (user) {
        console.log('Saving test result to Firestore...');
        const docRef = doc(db, 'users', user.uid, 'history', result.attemptId);
        await setDoc(docRef, cleanResult);
        console.log('Test result saved to Firestore');

        // Calculate total attempted from section analytics
        const totalAttempted = result.sectionAnalytics ? result.sectionAnalytics.reduce((sum, section) => sum + section.attempted, 0) : 0;

        // Update user statistics in background
        UserService.updateUserStats({
          questionsAttempted: totalAttempted,
          accuracy: result.accuracy,
          totalTests: 1,
        }).catch(err => console.error('Failed to update user stats:', err));
      }
    } catch (e) {
      console.error('Failed to save test result', e);
      throw e;
    }
  },

  async getTestHistory(): Promise<TestResult[]> {
    const historyMap = new Map<string, TestResult>();

    // 1. Load from AsyncStorage first
    try {
      const rawIds = await AsyncStorage.getItem('@test_history_ids');
      if (rawIds) {
        const ids: string[] = JSON.parse(rawIds);
        for (const id of ids) {
          const item = await AsyncStorage.getItem(`@test_result_${id}`);
          if (item) {
            const parsed = JSON.parse(item) as TestResult;
            historyMap.set(parsed.attemptId, parsed);
          }
        }
      }
    } catch (storageErr) {
      console.warn('AsyncStorage getTestHistory error:', storageErr);
    }

    // 2. Fetch from Firestore
    try {
      const user = auth.currentUser;
      if (user) {
        const historyRef = collection(db, 'users', user.uid, 'history');
        const q = query(historyRef, orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((d) => {
          const data = d.data() as TestResult;
          historyMap.set(data.attemptId, data);
        });
      }
    } catch (e) {
      console.error('Failed to get history from Firestore', e);
    }

    return Array.from(historyMap.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  },
  
  async getTestResult(attemptId: string): Promise<TestResult | undefined> {
    try {
      // 1. Check local AsyncStorage
      const cached = await AsyncStorage.getItem(`@test_result_${attemptId}`);
      if (cached) {
        return JSON.parse(cached) as TestResult;
      }

      // 2. Check Firestore
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, 'users', user.uid, 'history', attemptId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return docSnap.data() as TestResult;
        }
      }

      return undefined;
    } catch (e) {
      console.error('Failed to get test result', e);
      return undefined;
    }
  },

  // Update answer generation status for a test result
  async updateAnswerGenerationStatus(
    attemptId: string, 
    status: 'pending' | 'in-progress' | 'completed' | 'failed',
    error?: string
  ): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error('No user logged in, cannot update status');
        return;
      }

      console.log(`Updating answer status for attemptId: ${attemptId} to ${status}`);
      
      const docRef = doc(db, 'users', user.uid, 'history', attemptId);
      const updateData: any = { 
        answerGenerationStatus: status,
        lastUpdated: Date.now()
      };
      
      if (error) {
        updateData.answerGenerationError = error;
      }

      // If completed, also update evaluation status
      if (status === 'completed') {
        updateData.evaluationStatus = 'completed';
        console.log('Also updating evaluationStatus to completed');
      }

      await setDoc(docRef, updateData, { merge: true });
      console.log('✅ Status update successful in Firebase');
    } catch (e) {
      console.error('❌ Failed to update answer generation status:', e);
    }
  },

  /**
   * Re-evaluate a test with AI-generated answers
   */
  async reevaluateTest(attemptId: string, aiAnswers: any): Promise<TestResult | undefined> {
    try {
      const user = auth.currentUser;
      if (!user) return undefined;

      // Get original test result
      const testResult = await this.getTestResult(attemptId);
      if (!testResult) return undefined;

      console.log('Re-evaluating test:', attemptId);
      
      // TODO: Implement actual re-evaluation logic
      // This would need to fetch the user's answers and compare with AI answers
      // For now, just update the status
      
      const docRef = doc(db, 'users', user.uid, 'history', attemptId);
      const updateData = {
        evaluationStatus: 'completed',
        answerGenerationStatus: 'completed',
        lastUpdated: Date.now()
      };

      await setDoc(docRef, updateData, { merge: true });
      
      // Return updated result
      return await this.getTestResult(attemptId);
    } catch (e) {
      console.error('Failed to re-evaluate test:', e);
      return undefined;
    }
  }
};
