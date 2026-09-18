import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from './firebaseConfig';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  exams: string[];
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  targetExamDate?: string;
  createdAt: string;
  updatedAt: string;
  stats: UserStats;
  profileCompleted?: boolean;
  isSubscribed?: boolean;
}

export interface UserStats {
  questionsAttempted: number;
  accuracy: number;
  streak: number;
  totalTests: number;
  lastActiveDate?: string;
}

class UserService {
  /**
   * Get user profile from Firestore
   */
  async getUserProfile(uid?: string): Promise<UserProfile | null> {
    try {
      const userId = uid || auth.currentUser?.uid;
      if (!userId) return null;

      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return userDoc.data() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Check if user has completed profile setup
   */
  async hasCompletedProfile(uid?: string): Promise<boolean> {
    const profile = await this.getUserProfile(uid);
    return profile?.profileCompleted === true || (
      !!profile?.displayName && 
      profile?.exams?.length > 0 && 
      !!profile?.experienceLevel
    );
  }

  /**
   * Update user stats (called after completing a test or answering questions)
   */
  async updateUserStats(stats: Partial<UserStats>): Promise<void> {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('User not authenticated');

      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const currentStats = userDoc.data().stats || {};
        await updateDoc(userRef, {
          stats: {
            ...currentStats,
            ...stats,
            lastActiveDate: new Date().toISOString(),
          },
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error updating user stats:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(updates: Partial<UserProfile>): Promise<void> {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('User not authenticated');

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Update subscription status
   */
  async setSubscriptionStatus(status: boolean): Promise<void> {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('User not authenticated');

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isSubscribed: status,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating subscription status:', error);
      throw error;
    }
  }

  /**
   * Calculate user's current streak
   */
  async calculateStreak(): Promise<number> {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return 0;

      // Get all test history sorted by date
      const historyQuery = query(
        collection(db, `users/${userId}/history`),
      );
      const historyDocs = await getDocs(historyQuery);
      
      if (historyDocs.empty) return 0;

      // Sort by date
      const dates = historyDocs.docs
        .map(doc => new Date(doc.data().date))
        .sort((a, b) => b.getTime() - a.getTime());

      // Calculate consecutive days
      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < dates.length; i++) {
        const date = new Date(dates[i]);
        date.setHours(0, 0, 0, 0);
        
        const expectedDate = new Date(today);
        expectedDate.setDate(today.getDate() - streak);
        
        if (date.getTime() === expectedDate.getTime()) {
          streak++;
        } else if (date.getTime() < expectedDate.getTime()) {
          break;
        }
      }

      return streak;
    } catch (error) {
      console.error('Error calculating streak:', error);
      return 0;
    }
  }

  /**
   * Get user statistics from test history
   */
  async getUserStatistics(): Promise<UserStats> {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        return {
          questionsAttempted: 0,
          accuracy: 0,
          streak: 0,
          totalTests: 0,
        };
      }

      const historyQuery = query(collection(db, `users/${userId}/history`));
      const historyDocs = await getDocs(historyQuery);

      let totalTests = 0;
      let totalQuestions = 0;
      let totalCorrect = 0;

      historyDocs.forEach(doc => {
        const data = doc.data();
        totalTests++;
        totalQuestions += data.totalQuestions || 0;
        totalCorrect += data.correctAnswers || 0;
      });

      const accuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
      const streak = await this.calculateStreak();

      return {
        questionsAttempted: totalQuestions,
        accuracy: Math.round(accuracy * 10) / 10,
        streak,
        totalTests,
        lastActiveDate: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error getting user statistics:', error);
      return {
        questionsAttempted: 0,
        accuracy: 0,
        streak: 0,
        totalTests: 0,
      };
    }
  }
}

export default new UserService();
