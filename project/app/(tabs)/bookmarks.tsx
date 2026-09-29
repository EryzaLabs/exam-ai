import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, StatusBar, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookMarked, Trash2 } from 'lucide-react-native';
import Card from '@/components/Card';
import { collection, query, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '@/services/firebaseConfig';
import { TouchableOpacity, useWindowDimensions } from 'react-native';
import DesktopDashboard from '@/components/DesktopDashboard';

interface Bookmark {
  id: string;
  questionId: string;
  questionText: string;
  testTitle?: string;
  createdAt: string;
  notes?: string;
}

export default function BookmarksScreen() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;

  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        setBookmarks([]);
        return;
      }

      const bookmarksRef = collection(db, `users/${user.uid}/bookmarks`);
      const querySnapshot = await getDocs(bookmarksRef);
      
      const bookmarksData: Bookmark[] = [];
      querySnapshot.forEach((doc) => {
        bookmarksData.push({ id: doc.id, ...doc.data() } as Bookmark);
      });
      
      // Sort by most recent first
      bookmarksData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setBookmarks(bookmarksData);
    } catch (error) {
      console.error('Error loading bookmarks:', error);
      setBookmarks([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBookmarks();
    setRefreshing(false);
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      await deleteDoc(doc(db, `users/${user.uid}/bookmarks`, bookmarkId));
      setBookmarks(bookmarks.filter(b => b.id !== bookmarkId));
    } catch (error) {
      console.error('Error deleting bookmark:', error);
    }
  };

  if (loading) {
    const loadingContent = (
      <SafeAreaView style={[styles.container, isLargeScreen && { flex: undefined, minHeight: 600 }]} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading bookmarks...</Text>
        </View>
      </SafeAreaView>
    );
    if (isLargeScreen) return <DesktopDashboard>{loadingContent}</DesktopDashboard>;
    return loadingContent;
  }

  const content = (
    <SafeAreaView style={[styles.container, isLargeScreen && { flex: undefined, minHeight: 600 }]} edges={['bottom']}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>Bookmarks</Text>
        
        {bookmarks.length === 0 ? (
          <Card>
            <View style={styles.emptyContainer}>
              <BookMarked size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No Bookmarks Yet</Text>
              <Text style={styles.emptyText}>
                Bookmark questions while taking tests to save them for later review.
              </Text>
            </View>
          </Card>
        ) : (
          bookmarks.map((bookmark) => (
            <Card key={bookmark.id}>
              <View style={styles.bookmarkItem}>
                <View style={styles.bookmarkHeader}>
                  <View style={styles.bookmarkInfo}>
                    {bookmark.testTitle && (
                      <Text style={styles.testTitle} numberOfLines={1}>
                        {bookmark.testTitle}
                      </Text>
                    )}
                    <Text style={styles.bookmarkDate}>
                      {new Date(bookmark.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteBookmark(bookmark.id)}
                    style={styles.deleteButton}
                  >
                    <Trash2 size={18} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.questionText} numberOfLines={3}>
                  {bookmark.questionText}
                </Text>
                {bookmark.notes && (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesLabel}>Notes:</Text>
                    <Text style={styles.notesText}>{bookmark.notes}</Text>
                  </View>
                )}
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );

  if (isLargeScreen) {
    return <DesktopDashboard>{content}</DesktopDashboard>;
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  bookmarkItem: {
    padding: 4,
  },
  bookmarkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bookmarkInfo: {
    flex: 1,
  },
  testTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
    marginBottom: 4,
  },
  bookmarkDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  deleteButton: {
    padding: 8,
  },
  questionText: {
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 22,
    marginBottom: 8,
  },
  notesContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
});
