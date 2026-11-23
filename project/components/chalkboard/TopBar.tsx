import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import {
  Search,
  User as UserIcon,
  LogOut,
  Sparkles,
  BookOpen,
  Folder,
  X,
  LogIn,
} from 'lucide-react-native';
import { signOut } from 'firebase/auth';
import { auth } from '@/services/firebaseConfig';
import { useAuth } from '@/context/auth-context';
import { useExam } from '@/context/exam-context';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';
import ExamSwitcher from './ExamSwitcher';
import ThemeToggle from './ThemeToggle';
import { INITIAL_TGT_PGT_PAPERS } from '@/services/paper-service';

export interface TopBarProps {
  onMenuToggle?: () => void;
  showLogo?: boolean;
}

export default function TopBar({ onMenuToggle, showLogo = false }: TopBarProps) {
  const { user } = useAuth();
  const { examMode } = useExam();
  const { colors, typography, radii } = useChalkboardTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  // Grouped search results (Tests, Topics)
  const query = searchQuery.trim().toLowerCase();
  const filteredTests = query
    ? INITIAL_TGT_PGT_PAPERS.filter((p) =>
        p.title.toLowerCase().includes(query) ||
        (p.subject && p.subject.toLowerCase().includes(query))
      ).slice(0, 5)
    : [];

  const matchedTopics = query
    ? Array.from(
        new Set(
          INITIAL_TGT_PGT_PAPERS.map((p) => p.subject)
            .filter(Boolean)
            .filter((sub) => sub!.toLowerCase().includes(query))
        )
      ).slice(0, 4)
    : [];

  const handleLogout = async () => {
    setAccountMenuOpen(false);
    try {
      await signOut(auth);
      router.replace('/');
    } catch (e) {
      console.warn('Logout error:', e);
    }
  };

  const handleSelectTest = (testId: string) => {
    setSearchOpen(false);
    setSearchQuery('');
    router.push({ pathname: '/test-list', params: { q: testId } } as any);
  };

  const handleSelectTopic = (topic: string) => {
    setSearchOpen(false);
    setSearchQuery('');
    router.push({ pathname: '/practice', params: { topic } } as any);
  };

  return (
    <View style={[styles.container, { borderBottomColor: colors.line, backgroundColor: colors.bg }]}>
      <View style={styles.inner}>
        {/* Left: Brand logo if showLogo is true */}
        <View style={styles.leftGroup}>
          {showLogo ? (
            <TouchableOpacity
              style={styles.logoRow}
              onPress={() => router.push('/')}
              activeOpacity={0.8}
            >
              <View style={[styles.logoIcon, { backgroundColor: colors.surface2, borderColor: colors.line }]}>
                <Text style={[styles.logoStar, { color: colors.accent }]}>✦</Text>
              </View>
              <Text
                style={[
                  styles.logoText,
                  {
                    color: colors.text,
                    fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
                  },
                ]}
              >
                Astra Exam AI
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* Search Trigger Button */}
          <TouchableOpacity
            style={[
              styles.searchTrigger,
              {
                backgroundColor: colors.surface,
                borderColor: colors.line,
                borderRadius: radii.button,
              },
            ]}
            onPress={() => setSearchOpen(true)}
            activeOpacity={0.7}
            accessibilityLabel="Search tests, topics, bookmarks"
          >
            <Search size={15} color={colors.muted} />
            <Text style={[styles.searchPlaceholder, { color: colors.muted }]}>
              Search tests, topics...
            </Text>
            <View style={[styles.kbdShortcut, { backgroundColor: colors.surface2 }]}>
              <Text style={[styles.kbdText, { color: colors.muted }]}>⌘K</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Right: Exam Switcher, Theme Toggle, Account Menu */}
        <View style={styles.rightGroup}>
          <ExamSwitcher />
          <ThemeToggle />

          {user ? (
            <>
              <TouchableOpacity
                style={[
                  styles.accountTrigger,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.line,
                    borderRadius: radii.button,
                  },
                ]}
                onPress={() => setAccountMenuOpen(true)}
                activeOpacity={0.7}
                accessibilityLabel="Account menu"
              >
                <UserIcon size={15} color={colors.text} />
                <Text
                  style={[styles.accountName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'Account'}
                </Text>
              </TouchableOpacity>

              {/* Account Dropdown Modal */}
              <Modal
                visible={accountMenuOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setAccountMenuOpen(false)}
              >
                <TouchableWithoutFeedback onPress={() => setAccountMenuOpen(false)}>
                  <View style={styles.modalBackdrop}>
                    <TouchableWithoutFeedback>
                      <View
                        style={[
                          styles.accountDropdown,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.line,
                            borderRadius: radii.card,
                          },
                        ]}
                      >
                        <View style={[styles.accountDropdownHeader, { borderBottomColor: colors.line }]}>
                          <Text style={[styles.accountUserTitle, { color: colors.text }]}>
                            {user.displayName || 'Candidate'}
                          </Text>
                          <Text style={[styles.accountUserEmail, { color: colors.muted }]}>
                            {user.email}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={[styles.accountMenuItem, { borderBottomColor: colors.line }]}
                          onPress={() => {
                            setAccountMenuOpen(false);
                            router.push('/profile');
                          }}
                        >
                          <UserIcon size={16} color={colors.text} />
                          <Text style={[styles.accountMenuItemText, { color: colors.text }]}>
                            Profile & My Series
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.accountMenuItem}
                          onPress={handleLogout}
                        >
                          <LogOut size={16} color={colors.danger} />
                          <Text style={[styles.accountMenuItemText, { color: colors.danger, fontWeight: '600' }]}>
                            Log Out
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableWithoutFeedback>
                  </View>
                </TouchableWithoutFeedback>
              </Modal>
            </>
          ) : (
            <TouchableOpacity
              style={[
                styles.loginBtn,
                {
                  backgroundColor: colors.accent,
                  borderRadius: radii.button,
                },
              ]}
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.8}
            >
              <LogIn size={14} color={colors.accentText} />
              <Text style={[styles.loginBtnText, { color: colors.accentText }]}>
                Log in
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Global Search Overlay Modal */}
      <Modal
        visible={searchOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSearchOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setSearchOpen(false)}>
          <View style={styles.searchModalBackdrop}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.searchModalCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.line,
                    borderRadius: radii.card,
                  },
                ]}
              >
                {/* Search Input */}
                <View style={[styles.searchInputRow, { borderBottomColor: colors.line }]}>
                  <Search size={18} color={colors.muted} />
                  <TextInput
                    style={[styles.modalTextInput, { color: colors.text }]}
                    placeholder="Search tests, topics, previous year papers..."
                    placeholderTextColor={colors.muted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                  />
                  <TouchableOpacity
                    style={[styles.closeSearchBtn, { backgroundColor: colors.surface2 }]}
                    onPress={() => setSearchOpen(false)}
                  >
                    <X size={15} color={colors.text} />
                  </TouchableOpacity>
                </View>

                {/* Grouped Results */}
                <ScrollView style={styles.resultsScroll}>
                  {query ? (
                    <>
                      {/* Topic Matches */}
                      {matchedTopics.length > 0 && (
                        <View style={styles.groupSection}>
                          <Text style={[styles.groupTitle, { color: colors.muted }]}>
                            TOPICS
                          </Text>
                          {matchedTopics.map((top, idx) => (
                            <TouchableOpacity
                              key={idx}
                              style={[styles.resultRow, { borderBottomColor: colors.line }]}
                              onPress={() => handleSelectTopic(top!)}
                            >
                              <Folder size={15} color={colors.accent} />
                              <Text style={[styles.resultTitle, { color: colors.text }]}>
                                {top}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      {/* Test Matches */}
                      {filteredTests.length > 0 && (
                        <View style={styles.groupSection}>
                          <Text style={[styles.groupTitle, { color: colors.muted }]}>
                            TESTS & PAPERS
                          </Text>
                          {filteredTests.map((test) => (
                            <TouchableOpacity
                              key={test.id}
                              style={[styles.resultRow, { borderBottomColor: colors.line }]}
                              onPress={() => handleSelectTest(test.title)}
                            >
                              <BookOpen size={15} color={colors.muted} />
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>
                                  {test.title}
                                </Text>
                                <Text style={[styles.resultSub, { color: colors.muted }]}>
                                  {test.subject || 'All Subjects'} · {test.totalQuestions || 200} Qs
                                </Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      {matchedTopics.length === 0 && filteredTests.length === 0 && (
                        <View style={styles.emptySearch}>
                          <Text style={[styles.emptySearchText, { color: colors.muted }]}>
                            No matching tests or topics found for "{query}".
                          </Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={styles.emptySearch}>
                      <Text style={[styles.emptySearchText, { color: colors.muted }]}>
                        Type keywords like "Physics", "Hindi", "Mock Test 01", or "Syllabus".
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 100,
  },
  inner: {
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoStar: {
    fontSize: 16,
    fontWeight: '700',
  },
  logoText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  searchTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 38,
    maxWidth: 260,
    flex: 1,
  },
  searchPlaceholder: {
    fontSize: 13.5,
    flex: 1,
  },
  kbdShortcut: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  kbdText: {
    fontSize: 11,
    fontWeight: '600',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accountTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 38,
  },
  accountName: {
    fontSize: 13.5,
    fontWeight: '600',
    maxWidth: 90,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 38,
  },
  loginBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 56,
    paddingRight: 16,
  },
  accountDropdown: {
    width: 240,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  accountDropdownHeader: {
    padding: 14,
    borderBottomWidth: 1,
  },
  accountUserTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  accountUserEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  accountMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  accountMenuItemText: {
    fontSize: 13.5,
    fontWeight: '500',
  },
  searchModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 16,
  },
  searchModalCard: {
    width: '100%',
    maxWidth: 600,
    borderWidth: 1,
    maxHeight: 460,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalTextInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
    borderWidth: 0,
  },
  closeSearchBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsScroll: {
    padding: 12,
  },
  groupSection: {
    marginBottom: 16,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
    paddingHorizontal: 8,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultSub: {
    fontSize: 12,
    marginTop: 2,
  },
  emptySearch: {
    padding: 24,
    alignItems: 'center',
  },
  emptySearchText: {
    fontSize: 13.5,
    textAlign: 'center',
  },
});
