import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebaseConfig';

export interface BookmarkData {
  questionId: string;
  questionText: string;
  testTitle?: string;
  notes?: string;
}

/**
 * Add a bookmark for the current user
 */
export const addBookmark = async (bookmarkData: BookmarkData): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated to add bookmarks');
  }

  try {
    const bookmarksRef = collection(db, `users/${user.uid}/bookmarks`);
    const docRef = await addDoc(bookmarksRef, {
      ...bookmarkData,
      createdAt: new Date().toISOString(),
      userId: user.uid,
    });

    return docRef.id;
  } catch (error) {
    console.error('Error adding bookmark:', error);
    throw error;
  }
};
