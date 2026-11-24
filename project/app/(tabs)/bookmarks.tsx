import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Bookmark as BookmarkIcon, Trash2, ArrowLeft, ExternalLink, Sparkles } from 'lucide-react-native';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '@/services/firebaseConfig';
import { router } from 'expo-router';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';
import AppShell from '@/components/chalkboard/AppShell';
import Card from '@/components/chalkboard/Card';
import Button from '@/components/chalkboard/Button';
import Pill from '@/components/chalkboard/Pill';

interface Bookmark {
  id: string;
  questionId: string;
  questionText: string;
  testTitle?: string;
  createdAt: string;
  notes?: string;
}

const cleanHtml = (text?: string): string => {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
};

export default function BookmarksScreen() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { colors, typography, radii } = useChalkboardTheme();

  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        setBookmarks([]);
        return;
      }

      const bookmarksRef = collection(db, `users/${user.uid}/bookmarks`);
      const querySnapshot = await getDocs(bookmarksRef);

      const bookmarksData: Bookmark[] = [];
      querySnapshot.forEach((d) => {
        bookmarksData.push({ id: d.id, ...d.data() } as Bookmark);
      });

      // Sort by most recent first
      bookmarksData.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

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
      setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
    } catch (error) {
      console.error('Error deleting bookmark:', error);
    }
  };

  const handleAskAI = (b: Bookmark) => {
    const textPrompt = `I need help reviewing this bookmarked question:\n\nQuestion: ${cleanHtml(b.questionText)}\nFrom: ${b.testTitle || 'Exam Practice'}\n\nPlease explain the key concept and how to solve questions like this.`;
    router.push({
      pathname: '/assistant',
      params: { prefill: textPrompt },
    } as any);
  };

  return (
    <AppShell maxWidth={760}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {/* Header */}
        <View style={styles.headerBlock}>
          <Text
            style={[
              styles.screenTitle,
              {
                color: colors.text,
                fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
              },
            ]}
          >
            Saved Bookmarks
          </Text>
          <Text style={[styles.screenSubtitle, { color: colors.muted }]}>
            {bookmarks.length} saved {bookmarks.length === 1 ? 'question' : 'questions'} for targeted revision
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.muted }]}>
              Loading your bookmarks...
            </Text>
          </View>
        ) : bookmarks.length === 0 ? (
          <Card style={styles.emptyCard}>
            <BookmarkIcon size={44} color={colors.muted} />
            <Text
              style={[
                styles.emptyTitle,
                {
                  color: colors.text,
                  fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
                },
              ]}
            >
              No Bookmarks Yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              While taking full mocks or practice drills, tap the bookmark icon on tricky questions to save them here for focused review.
            </Text>
            <Button
              title="Browse Practice Tests"
              variant="primary"
              size="md"
              onPress={() => router.push('/practice')}
              style={{ marginTop: 16 }}
            />
          </Card>
        ) : (
          <View style={styles.bookmarksList}>
            {bookmarks.map((bookmark) => (
              <Card key={bookmark.id} style={styles.bookmarkCard}>
                <View style={[styles.cardHeader, { borderBottomColor: colors.line }]}>
                  <View style={styles.headerLeft}>
                    {bookmark.testTitle && (
                      <Pill label={bookmark.testTitle} variant="neutral" />
                    )}
                    <Text style={[styles.dateText, { color: colors.muted }]}>
                      {new Date(bookmark.createdAt).toLocaleDateString()}
                    </Text>
                  </View>

                  <View style={styles.headerRight}>
                    <TouchableOpacity
                      onPress={() => handleAskAI(bookmark)}
                      style={[
                        styles.askAiBtn,
                        { backgroundColor: colors.surface2, borderColor: colors.line },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Sparkles size={13} color={colors.text} />
                      <Text style={[styles.askAiText, { color: colors.text }]}>
                        Ask AI
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleDeleteBookmark(bookmark.id)}
                      style={[
                        styles.deleteBtn,
                        { backgroundColor: colors.surface2, borderColor: colors.line },
                      ]}
                      activeOpacity={0.7}
                      accessibilityLabel="Delete bookmark"
                    >
                      <Trash2 size={14} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Question Statement */}
                <Text style={[styles.questionText, { color: colors.text }]}>
                  {cleanHtml(bookmark.questionText)}
                </Text>

                {bookmark.notes ? (
                  <View
                    style={[
                      styles.notesBox,
                      { backgroundColor: colors.surface2, borderColor: colors.line },
                    ]}
                  >
                    <Text style={[styles.notesLabel, { color: colors.muted }]}>Personal Note:</Text>
                    <Text style={[styles.notesContent, { color: colors.text }]}>
                      {bookmark.notes}
                    </Text>
                  </View>
                ) : null}
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  headerBlock: {
    marginBottom: 20,
    gap: 4,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  screenSubtitle: {
    fontSize: 14,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 440,
  },
  bookmarksList: {
    gap: 12,
  },
  bookmarkCard: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    marginBottom: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dateText: {
    fontSize: 11.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  askAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  askAiText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  questionText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  notesBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  notesContent: {
    fontSize: 13,
    lineHeight: 18,
  },
});
