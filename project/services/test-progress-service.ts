// services/test-progress-service.ts
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
}

export interface TestResult extends TestAnalytics {
  date: string; // ISO string
  testTitle?: string;
  id?: string; // Firestore ID
  answerGenerationStatus?: 'not-needed' | 'pending' | 'in-progress' | 'completed' | 'failed';
  evaluationStatus?: 'pending' | 'completed';
  answerGenerationError?: string;
}

export const TestProgressService = {
  // --- Active Test Management ---

  async saveCurrentTest(state: SavedTestState): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) return; 

      const docRef = doc(db, 'users', user.uid, 'active_tests', state.testId);
      
      // Ensure clean serialization - convert to JSON and back to remove any non-serializable data
      const cleanState = JSON.parse(JSON.stringify(state));
      
      await setDoc(docRef, cleanState);
    } catch (e) {
      console.error('Failed to save test progress', e);
      throw e;
    }
  },

  async getTestProgress(testId: string): Promise<SavedTestState | null> {
    try {
      const user = auth.currentUser;
      if (!user) return null;

      const docRef = doc(db, 'users', user.uid, 'active_tests', testId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data() as SavedTestState;
      } else {
        return null;
      }
    } catch (e) {
      console.error('Failed to load current test', e);
      return null;
    }
  },

  async clearTestProgress(testId: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const docRef = doc(db, 'users', user.uid, 'active_tests', testId);
      await deleteDoc(docRef);
    } catch (e) {
      console.error('Failed to clear current test', e);
    }
  },

  async getSavedTests(): Promise<SavedTestState[]> {
    try {
      const user = auth.currentUser;
      if (!user) return [];
      const colRef = collection(db, 'users', user.uid, 'active_tests');
      const snap = await getDocs(colRef);
      return snap.docs.map(d => d.data() as SavedTestState);
    } catch (e) {
      console.error('Failed to get saved tests', e);
      return [];
    }
  },

  // --- History Management ---

  async saveTestResult(result: TestResult): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('No user logged in, skipping test result save');
        return;
      }

      console.log('Saving test result to Firestore...');
      // Use attemptId as the document ID to ensure uniqueness
      const docRef = doc(db, 'users', user.uid, 'history', result.attemptId);
      await setDoc(docRef, result);
      console.log('Test result saved to Firestore');

      // Calculate total attempted from section analytics
      const totalAttempted = result.sectionAnalytics ? result.sectionAnalytics.reduce((sum, section) => sum + section.attempted, 0) : 0;

      // Update user statistics in background (non-blocking)
      console.log('Triggering user statistics update...');
      UserService.updateUserStats({
        questionsAttempted: totalAttempted,
        accuracy: result.accuracy,
        totalTests: 1, // increment handled in service
      }).catch(err => console.error('Failed to update user stats:', err));
      
    } catch (e) {
      console.error('Failed to save test result', e);
      throw e;
    }
  },

  async getTestHistory(): Promise<TestResult[]> {
    try {
      const user = auth.currentUser;
      if (!user) return [];

      const historyRef = collection(db, 'users', user.uid, 'history');
      const q = query(historyRef, orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);

      const history: TestResult[] = [];
      querySnapshot.forEach((doc) => {
        history.push(doc.data() as TestResult);
      });

      return history;
    } catch (e) {
      console.error('Failed to get history', e);
      return [];
    }
  },
  
  async getTestResult(attemptId: string): Promise<TestResult | undefined> {
    try {
      const user = auth.currentUser;
      if (!user) return undefined;

      const docRef = doc(db, 'users', user.uid, 'history', attemptId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data() as TestResult;
      } else {
        return undefined;
      }
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
  async reevaluateTest(attemptId: string, aiAnswers: any): Promise<TestResult | null> {
    try {
      const user = auth.currentUser;
      if (!user) return null;

      // Get original test result
      const testResult = await this.getTestResult(attemptId);
      if (!testResult) return null;

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
      return null;
    }
  }
};
