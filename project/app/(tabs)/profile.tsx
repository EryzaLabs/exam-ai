import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { signOut, deleteUser } from 'firebase/auth';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import {
  User as UserIcon,
  LogOut,
  Trash2,
  Bookmark,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Lock,
  Globe,
  HelpCircle,
  ExternalLink,
} from 'lucide-react-native';

import { auth, db } from '@/services/firebaseConfig';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';
import UserService, { UserProfile } from '@/services/user-service';
import { SSCCGLService } from '@/services/ssc-cgl-service';
import {
  AppShell,
  Card,
  Button,
  Pill,
  Chip,
  ThemeToggle,
  ExamSwitcher,
  EmptyState,
} from '@/components/chalkboard';

interface BookmarkItem {
  id: string;
  questionId: string;
  questionText: string;
  testTitle?: string;
  createdAt: string;
  notes?: string;
  topic?: string;
}

const DEFAULT_SERIES = [
  {
    id: 'upsc-principal',
    name: 'UPSC Principal & Vice-Principal',
    testsCount: 150,
    unit: 'Full Mock Tests',
    price: '₹199',
    examKey: 'upsc',
  },
  {
    id: 'up-principal',
    name: 'UP Principal & Headmaster',
    testsCount: 150,
    unit: 'Full Mock Tests',
    price: '₹199',
    examKey: 'uppsc',
  },
  {
    id: 'dsssb-tgt',
    name: 'DSSSB TGT (Trained Graduate Teacher)',
    testsCount: 190,
    unit: 'Official Solved Papers',
    price: '₹199',
    examKey: 'tgt',
  },
  {
    id: 'dsssb-pgt',
    name: 'DSSSB PGT (Post Graduate Teacher)',
    testsCount: 158,
    unit: 'Official Solved Papers',
    price: '₹199',
    examKey: 'pgt',
  },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isSubscribed } = useAuth();
  const { colors, isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [seriesList, setSeriesList] = useState(DEFAULT_SERIES);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [language, setLanguage] = useState<'English' | 'Hindi'>('English');

  // Bookmarks
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);
  const [expandedBookmarkId, setExpandedBookmarkId] = useState<string | null>(null);
  const [bookmarkFilter, setBookmarkFilter] = useState<string>('all');

  useEffect(() => {
    if (user) {
      loadProfile();
      loadBookmarks();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    SSCCGLService.fetchPapersList()
      .then((papers) => {
        if (!isMounted || !Array.isArray(papers) || papers.length === 0) return;
        const upscCount =
          papers.filter(
            (p) =>
              !p.series &&
              (p.filename?.includes('full_mock') || p.id?.includes('mock'))
          ).length || 150;
        const tgtCount =
          papers.filter(
            (p) => p.series === 'tgt' || p.filename?.includes('tgt')
          ).length || 190;
        const pgtCount =
          papers.filter(
            (p) => p.series === 'pgt' || p.filename?.includes('pgt')
          ).length || 158;

        setSeriesList([
          {
            id: 'upsc-principal',
            name: 'UPSC Principal & Vice-Principal',
            testsCount: upscCount,
            unit: 'Full Mock Tests',
            price: '₹199',
            examKey: 'upsc',
          },
          {
            id: 'up-principal',
            name: 'UP Principal & Headmaster',
            testsCount: upscCount,
            unit: 'Full Mock Tests',
            price: '₹199',
            examKey: 'uppsc',
          },
          {
            id: 'dsssb-tgt',
            name: 'DSSSB TGT (Trained Graduate Teacher)',
            testsCount: tgtCount,
            unit: 'Official Solved Papers',
            price: '₹199',
            examKey: 'tgt',
          },
          {
            id: 'dsssb-pgt',
            name: 'DSSSB PGT (Post Graduate Teacher)',
            testsCount: pgtCount,
            unit: 'Official Solved Papers',
            price: '₹199',
            examKey: 'pgt',
          },
        ]);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await UserService.getUserProfile();
      if (data) {
        setProfile(data);
        if (data.languagePreference) setLanguage(data.languagePreference);
      }
    } catch (e) {
      console.warn('Error loading profile:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadBookmarks = async () => {
    if (!user) return;
    try {
      setLoadingBookmarks(true);
      const bookmarksRef = collection(db, `users/${user.uid}/bookmarks`);
      const snapshot = await getDocs(bookmarksRef);
      const list: BookmarkItem[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as any) });
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setBookmarks(list);
    } catch (e) {
      console.warn('Error loading bookmarks:', e);
    } finally {
      setLoadingBookmarks(false);
    }
  };

  const handleDeleteBookmark = async (bId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/bookmarks`, bId));
      setBookmarks((prev) => prev.filter((b) => b.id !== bId));
    } catch (e) {
      console.error('Failed to delete bookmark:', e);
    }
  };

  const handleToggleLanguage = async (nextLang: 'English' | 'Hindi') => {
    setLanguage(nextLang);
    if (user) {
      try {
        await UserService.updateUserProfile({ languagePreference: nextLang });
      } catch (e) {
        console.warn('Failed to save language pref', e);
      }
    }
  };

  const handleLogout = async () => {
    const doLogout = async () => {
      try {
        await signOut(auth);
        router.replace('/');
      } catch (e: any) {
        Alert.alert('Logout Error', e?.message || 'Could not log out');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to log out?')) {
        await doLogout();
      }
    } else {
      Alert.alert('Log out', 'Are you sure you want to log out of Astra Exam AI?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log out', style: 'destructive', onPress: doLogout },
      ]);
    }
  };

  const handleDeleteAccount = () => {
    const doDelete = async () => {
      try {
        if (auth.currentUser) {
          await deleteUser(auth.currentUser);
          router.replace('/');
        }
      } catch (e: any) {
        if (e.code === 'auth/requires-recent-login') {
          Alert.alert(
            'Re-authentication required',
            'Please log out and log back in before deleting your account.'
          );
        } else {
          Alert.alert('Error', e.message || 'Failed to delete account');
        }
      }
    };

    const confirmMsg =
      'This will permanently delete your test history, analytics, and bookmarks. This cannot be undone.';
    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) {
        doDelete();
      }
    } else {
      Alert.alert('Delete Account', confirmMsg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const displayName =
    profile?.displayName || user?.displayName || (user?.email ? user.email.split('@')[0] : 'User');
  const displayEmail = profile?.email || user?.email || 'Guest Visitor';
  const purchasedSeriesList = profile?.purchasedSeries || [];

  return (
    <AppShell title="Profile & Account">
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1: Account Header / Guest Prompt */}
        {!user ? (
          <Card style={styles.guestCard}>
            <View style={styles.guestHeader}>
              <View style={[styles.avatarBox, { backgroundColor: colors.surface2, borderColor: colors.line }]}>
                <UserIcon size={24} color={colors.muted} />
              </View>
              <View style={styles.guestTextCol}>
                <Text style={[styles.cardHeading, { color: colors.text }]}>Browsing as Guest</Text>
                <Text style={[styles.cardSubtext, { color: colors.muted }]}>
                  Log in or create an account to save test scores, track weak topics, and sync bookmarks.
                </Text>
              </View>
            </View>

            <View style={styles.guestActionRow}>
              <Button
                label="Log in"
                variant="primary"
                onPress={() => router.push('/login')}
                style={{ flex: 1 }}
              />
              <Button
                label="Create account"
                variant="secondary"
                onPress={() => router.push('/signup')}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        ) : (
          <Card>
            <View style={styles.profileRow}>
              <View style={[styles.avatarBox, { backgroundColor: colors.surface2, borderColor: colors.line }]}>
                <Text style={[styles.avatarInitials, { color: colors.text }]}>
                  {displayName.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={styles.profileDetails}>
                <View style={styles.nameRow}>
                  <Text style={[styles.profileName, { color: colors.text }]}>{displayName}</Text>
                  {isSubscribed && <Pill label="Active Pass" variant="success" />}
                </View>
                <Text style={[styles.profileEmail, { color: colors.muted }]}>{displayEmail}</Text>
              </View>
            </View>

            {/* Target Exam & Language Preferences */}
            <View style={[styles.divider, { backgroundColor: colors.line }]} />

            <View style={styles.prefGrid}>
              <View style={styles.prefItem}>
                <Text style={[styles.prefLabel, { color: colors.muted }]}>Target Exam</Text>
                <View style={{ marginTop: 6 }}>
                  <ExamSwitcher />
                </View>
              </View>

              <View style={styles.prefItem}>
                <Text style={[styles.prefLabel, { color: colors.muted }]}>Question Language</Text>
                <View style={styles.langToggleRow}>
                  <Chip
                    label="English"
                    selected={language === 'English'}
                    onPress={() => handleToggleLanguage('English')}
                  />
                  <Chip
                    label="हिन्दी"
                    selected={language === 'Hindi'}
                    onPress={() => handleToggleLanguage('Hindi')}
                  />
                </View>
              </View>
            </View>
          </Card>
        )}

        {/* Section 2: My Test Series & Passes */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>My Test Series</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
            Series access & mock test entitlements
          </Text>
        </View>

        <Card>
          <View style={styles.seriesList}>
            {seriesList.map((s, index) => {
              const isOwned = isSubscribed || purchasedSeriesList.includes(s.id);
              return (
                <View
                  key={s.id}
                  style={[
                    styles.seriesRow,
                    index < seriesList.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.line,
                    },
                  ]}
                >
                  <View style={styles.seriesLeft}>
                    <View style={styles.seriesTitleRow}>
                      <Text style={[styles.seriesName, { color: colors.text }]}>{s.name}</Text>
                      {isOwned ? (
                        <Pill label="Unlocked" variant="success" />
                      ) : (
                        <Pill label="Locked" variant="neutral" />
                      )}
                    </View>
                    <Text style={[styles.seriesMeta, { color: colors.muted }]}>
                      {s.testsCount} {s.unit || 'Full Mock Tests'} • Bilingual Hindi & English
                    </Text>
                  </View>

                  <View style={styles.seriesRight}>
                    {isOwned ? (
                      <Button
                        label="Open Series"
                        variant="secondary"
                        size="small"
                        onPress={() => router.push(`/test-list?examId=${s.examKey}` as any)}
                      />
                    ) : (
                      <Button
                        label={`Unlock ${s.price}`}
                        variant="primary"
                        size="small"
                        onPress={() => router.push(`/test-list?examId=${s.examKey}` as any)}
                      />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Section 3: Bookmarks Viewer */}
        <View style={styles.sectionHeader}>
          <View style={styles.bookmarkTitleRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Saved Bookmarks</Text>
            {bookmarks.length > 0 && <Pill label={`${bookmarks.length}`} variant="neutral" />}
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
            Questions you flagged during mock tests and practice
          </Text>
        </View>

        {!user ? (
          <EmptyState
            title="Sign in to view bookmarks"
            description="Bookmarks are synchronized across your devices once you log in."
            actionLabel="Log in"
            onAction={() => router.push('/login')}
          />
        ) : loadingBookmarks ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.text} />
          </View>
        ) : bookmarks.length === 0 ? (
          <EmptyState
            title="No bookmarks yet"
            description="Tap the bookmark flag on any question during a test to save it here for revision."
          />
        ) : (
          <Card>
            <View style={styles.bookmarkList}>
              {bookmarks.map((b, idx) => {
                const isExpanded = expandedBookmarkId === b.id;
                return (
                  <View
                    key={b.id}
                    style={[
                      styles.bookmarkItem,
                      idx < bookmarks.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: colors.line,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.bookmarkItemHeader}
                      onPress={() => setExpandedBookmarkId(isExpanded ? null : b.id)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1, gap: 4 }}>
                        <View style={styles.bookmarkMetaRow}>
                          {b.testTitle && (
                            <Text style={[styles.bookmarkTestTag, { color: colors.muted }]}>
                              {b.testTitle}
                            </Text>
                          )}
                          <Text style={[styles.bookmarkDate, { color: colors.muted }]}>
                            {new Date(b.createdAt).toLocaleDateString()}
                          </Text>
                        </View>
                        <Text
                          style={[styles.bookmarkQuestionText, { color: colors.text }]}
                          numberOfLines={isExpanded ? undefined : 2}
                        >
                          {b.questionText}
                        </Text>
                      </View>
                      <View style={styles.bookmarkActions}>
                        {isExpanded ? (
                          <ChevronUp size={20} color={colors.muted} />
                        ) : (
                          <ChevronDown size={20} color={colors.muted} />
                        )}
                      </View>
                    </TouchableOpacity>

                    {/* Expanded details */}
                    {isExpanded && (
                      <View style={[styles.bookmarkDetails, { backgroundColor: colors.surface2 }]}>
                        {b.notes ? (
                          <View style={styles.explanationBox}>
                            <Text style={[styles.explanationLabel, { color: colors.text }]}>
                              Explanation & Notes:
                            </Text>
                            <Text style={[styles.explanationText, { color: colors.muted }]}>
                              {b.notes}
                            </Text>
                          </View>
                        ) : (
                          <Text style={[styles.explanationText, { color: colors.muted }]}>
                            No detailed explanation attached to this bookmark.
                          </Text>
                        )}
                        <View style={styles.bookmarkFooterRow}>
                          <Button
                            label="Remove Bookmark"
                            variant="danger"
                            size="small"
                            onPress={() => handleDeleteBookmark(b.id)}
                          />
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </Card>
        )}

        {/* Section 4: Appearance & Settings */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance & Theme</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
            Chalkboard high-contrast study palette
          </Text>
        </View>

        <Card>
          <View style={styles.appearanceRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.appearanceTitle, { color: colors.text }]}>Color Theme</Text>
              <Text style={[styles.appearanceSub, { color: colors.muted }]}>
                {isDark ? 'Dark chalkboard (easy on eyes for night study)' : 'Clean paper light theme'}
              </Text>
            </View>
            <ThemeToggle />
          </View>
        </Card>

        {/* Section 5: Account Actions */}
        {user && (
          <View style={styles.accountActionsSection}>
            <Button
              label="Log out"
              variant="secondary"
              onPress={handleLogout}
              style={{ width: '100%' }}
            />
            <TouchableOpacity
              onPress={handleDeleteAccount}
              style={styles.deleteBtn}
              accessibilityLabel="Delete Account"
            >
              <Text style={[styles.deleteBtnText, { color: colors.danger }]}>
                Delete account and all test history
              </Text>
            </TouchableOpacity>
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
  content: {
    padding: 16,
    gap: 20,
    maxWidth: 860,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 48,
  },
  guestCard: {
    gap: 16,
  },
  guestHeader: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  guestTextCol: {
    flex: 1,
    gap: 4,
  },
  cardHeading: {
    fontFamily: Platform.select({
      web: "'Newsreader', Georgia, serif",
      default: 'serif',
    }),
    fontSize: 20,
    fontWeight: '600',
  },
  cardSubtext: {
    fontSize: 14,
    lineHeight: 20,
  },
  guestActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: Platform.select({
      web: "'Newsreader', Georgia, serif",
      default: 'serif',
    }),
    fontSize: 20,
    fontWeight: '600',
  },
  profileDetails: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  profileName: {
    fontFamily: Platform.select({
      web: "'Newsreader', Georgia, serif",
      default: 'serif',
    }),
    fontSize: 20,
    fontWeight: '600',
  },
  profileEmail: {
    fontSize: 14,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  prefGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  prefItem: {
    flex: 1,
    minWidth: 200,
  },
  prefLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  langToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  sectionHeader: {
    marginTop: 6,
    gap: 4,
  },
  sectionTitle: {
    fontFamily: Platform.select({
      web: "'Newsreader', Georgia, serif",
      default: 'serif',
    }),
    fontSize: 20,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 14,
  },
  seriesList: {
    gap: 12,
  },
  seriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 12,
    flexWrap: 'wrap',
  },
  seriesLeft: {
    flex: 1,
    minWidth: 220,
    gap: 4,
  },
  seriesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  seriesName: {
    fontSize: 15,
    fontWeight: '600',
  },
  seriesMeta: {
    fontSize: 13,
  },
  seriesRight: {
    alignItems: 'flex-end',
  },
  bookmarkTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingBox: {
    padding: 24,
    alignItems: 'center',
  },
  bookmarkList: {
    gap: 8,
  },
  bookmarkItem: {
    paddingVertical: 8,
  },
  bookmarkItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    gap: 12,
  },
  bookmarkMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bookmarkTestTag: {
    fontSize: 12,
    fontWeight: '500',
  },
  bookmarkDate: {
    fontSize: 12,
  },
  bookmarkQuestionText: {
    fontSize: 14.5,
    lineHeight: 20,
  },
  bookmarkActions: {
    padding: 4,
  },
  bookmarkDetails: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 10,
  },
  explanationBox: {
    gap: 4,
  },
  explanationLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  explanationText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bookmarkFooterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  appearanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  appearanceTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  appearanceSub: {
    fontSize: 13.5,
    marginTop: 2,
  },
  accountActionsSection: {
    marginTop: 8,
    alignItems: 'center',
    gap: 14,
  },
  deleteBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  deleteBtnText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
