import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, auth } from './firebaseConfig';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  phoneNumber?: string | null;
  targetCadre: string; // e.g., 'KVS', 'NVS', 'UPSC', 'State Dept'
  currentDesignation: string; // e.g., 'Teacher', 'Vice Principal', 'Other'
  weakestSubject: string; // e.g., 'Education Policy', 'Service Matters', etc.
  languagePreference: 'English' | 'Hindi';
  notificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  stats: UserStats;
  profileCompleted?: boolean;
  isSubscribed?: boolean;
}

export interface TopicStats {
  accuracy: number;
  attempted: number;
  correct: number;
}

export interface UserStats {
  questionsAttempted: number;
  accuracy: number;
  streak: number;
  totalTests: number;
  lastActiveDate?: string;
  topicStats?: Record<string, TopicStats>; // Map of topic IDs to performance
}

class UserService {
  /**
   * Get user profile from Firestore
   */
  async getUserProfile(uid?: string): Promise<UserProfile | null> {
    try {
      const userId = uid || auth.currentUser?.uid;

      // Unauthenticated users can never be granted subscription (prevents client-side manipulation)
      if (!userId) {
        return { isSubscribed: false } as UserProfile;
      }

      const authUser = auth.currentUser;
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const data = userDoc.data() as UserProfile;

        // Cloud Firestore is the ONLY authoritative source of truth for paid status
        const isCloudSubscribed = data.isSubscribed === true;

        // Auto-sync Google Auth profile details to Firestore if missing
        const syncUpdates: Partial<UserProfile> = {};
        if (!data.email && authUser?.email) syncUpdates.email = authUser.email;
        if (!data.displayName && authUser?.displayName) syncUpdates.displayName = authUser.displayName;
        if (!data.photoURL && authUser?.photoURL) syncUpdates.photoURL = authUser.photoURL;

        if (Object.keys(syncUpdates).length > 0) {
          await setDoc(doc(db, 'users', userId), syncUpdates, { merge: true }).catch(() => {});
        }

        // Cloud is single source of truth: sync to local storage
        await AsyncStorage.setItem(
          '@course_subscription_status',
          isCloudSubscribed ? 'true' : 'false'
        ).catch(() => {});

        return {
          ...data,
          email: data.email || authUser?.email || '',
          displayName: data.displayName || authUser?.displayName || (authUser?.email ? authUser.email.split('@')[0] : 'User'),
          photoURL: data.photoURL || authUser?.photoURL || null,
          isSubscribed: isCloudSubscribed,
        };
      }

      // If document doesn't exist yet, seed initial profile from Google Auth details
      const initialProfile: Partial<UserProfile> = {
        uid: userId,
        email: authUser?.email || '',
        displayName: authUser?.displayName || (authUser?.email ? authUser.email.split('@')[0] : 'User'),
        photoURL: authUser?.photoURL || null,
        isSubscribed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', userId), initialProfile, { merge: true }).catch(() => {});
      await AsyncStorage.setItem('@course_subscription_status', 'false').catch(() => {});
      return initialProfile as UserProfile;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Check if user has completed profile setup
   */
  async hasCompletedProfile(uid?: string): Promise<boolean> {
    try {
      const localStatus = await AsyncStorage.getItem('@profile_completed');
      if (localStatus === 'true') return true;
    } catch(e) {}

    const profile = await this.getUserProfile(uid);
    const isCompleted = profile?.profileCompleted === true || (
      !!profile?.displayName && 
      !!profile?.targetCadre && 
      !!profile?.currentDesignation
    );

    if (isCompleted) {
       try {
         await AsyncStorage.setItem('@profile_completed', 'true');
       } catch(e) {}
    }

    return isCompleted;
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
        const currentStats = userDoc.data().stats || { questionsAttempted: 0, accuracy: 0, streak: 0, totalTests: 0 };
        
        // Calculate incremental values
        const newTotalTests = (currentStats.totalTests || 0) + (stats.totalTests || 0);
        const newQuestionsAttempted = (currentStats.questionsAttempted || 0) + (stats.questionsAttempted || 0);
        
        // Calculate running average for accuracy
        let newAccuracy = currentStats.accuracy || 0;
        if (stats.accuracy !== undefined) {
           if (currentStats.totalTests > 0) {
              const totalPastAccuracy = currentStats.accuracy * currentStats.totalTests;
              newAccuracy = (totalPastAccuracy + stats.accuracy) / newTotalTests;
           } else {
              newAccuracy = stats.accuracy;
           }
        }

        await updateDoc(userRef, {
          stats: {
            ...currentStats,
            ...stats,
            totalTests: newTotalTests,
            questionsAttempted: newQuestionsAttempted,
            accuracy: newAccuracy,
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
   * Deprecated client write: Only backend writes subscription status via Firebase Admin SDK
   * upon verified payment. Direct client writes are rejected by Firestore security rules.
   */
  async setSubscriptionStatus(_status: boolean): Promise<void> {
    console.warn(
      '[UserService] Direct client-side subscription writes are disabled for security. Subscription status is strictly verified and written by backend server.'
    );
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
