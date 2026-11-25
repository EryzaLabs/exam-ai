import React, { useState, useEffect } from 'react';
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
  useWindowDimensions,
  Image,
} from 'react-native';
import { router, usePathname } from 'expo-router';
import {
  Search,
  User as UserIcon,
  LogOut,
  Sparkles,
  BookOpen,
  Folder,
  X,
  LogIn,
  HelpCircle,
} from 'lucide-react-native';
import { signOut } from 'firebase/auth';
import { auth } from '@/services/firebaseConfig';
import { useAuth } from '@/context/auth-context';
import { useExam } from '@/context/exam-context';
import { useWalkthrough } from '@/context/walkthrough-context';
import { useLanguage } from '@/context/language-context';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';
import ExamSwitcher from './ExamSwitcher';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import AstraLogo from './AstraLogo';
import SpotlightTarget from '@/components/SpotlightTarget';
import { INITIAL_TGT_PGT_PAPERS } from '@/services/paper-service';

export interface TopBarProps {
  onMenuToggle?: () => void;
  showLogo?: boolean;
}

export default function TopBar({ onMenuToggle, showLogo = false }: TopBarProps) {
  const { user } = useAuth();
  const { examMode } = useExam();
  const { startWalkthrough } = useWalkthrough();
  const { t } = useLanguage();
  const pathname = usePathname();
  const { colors, typography, radii } = useChalkboardTheme();
  const { width } = useWindowDimensions();

  const isDesktop = width >= 768;
  const isCompact = width < 540;

  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  // Keyboard shortcut (Cmd+K / Ctrl+K) on web
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setSearchOpen(false);
        setAccountMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
        {/* Left: Brand logo if showLogo is true, plus search trigger */}
        <View style={styles.leftGroup}>
          {showLogo && (
            <TouchableOpacity
              style={styles.logoRow}
              onPress={() => router.push('/')}
              activeOpacity={0.8}
            >
              <AstraLogo variant="auto" height={32} />
            </TouchableOpacity>
          )}

          {/* Search Trigger: full bar on desktop, compact icon button on mobile/tablet */}
          <SpotlightTarget id="top-search" style={isDesktop ? { flex: 1, maxWidth: 320 } : undefined}>
            {isDesktop ? (
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
                <Text
                  style={[styles.searchPlaceholder, { color: colors.muted }]}
                  numberOfLines={1}
                >
                  {t('Search tests, topics...', 'टेस्ट या टॉपिक खोजें...')}
                </Text>
                <View style={[styles.kbdShortcut, { backgroundColor: colors.surface2 }]}>
                  <Text style={[styles.kbdText, { color: colors.muted }]}>⌘K</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.searchIconBtn,
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
                <Search size={16} color={colors.muted} />
              </TouchableOpacity>
            )}
          </SpotlightTarget>
        </View>

        {/* Right: Exam Switcher, Theme Toggle, Account Menu */}
        <View style={styles.rightGroup}>
          <SpotlightTarget id="exam-switcher">
            <ExamSwitcher />
          </SpotlightTarget>
          <TouchableOpacity
            style={[
              styles.searchIconBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.line,
                borderRadius: radii.button,
              },
            ]}
            onPress={() => {
              const onHome = pathname === '/' || pathname === '/index';
              if (onHome) {
                startWalkthrough(user ? 'home' : 'guest');
              } else {
                router.push('/');
                setTimeout(() => {
                  startWalkthrough(user ? 'home' : 'guest');
                }, 350);
              }
            }}
            activeOpacity={0.7}
            accessibilityLabel="Replay interactive walkthrough"
          >
            <HelpCircle size={16} color={colors.accent} />
          </TouchableOpacity>
          <LanguageToggle />
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
                {width >= 640 && (
                  <Text
                    style={[styles.accountName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'Account'}
                  </Text>
                )}
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
                            router.push('/(tabs)/profile');
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.menuItemText, { color: colors.text }]}>
                            Profile & Settings
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.accountMenuItem, { borderBottomColor: colors.line }]}
                          onPress={() => {
                            setAccountMenuOpen(false);
                            router.push('/(tabs)/profile');
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.menuItemText, { color: colors.text }]}>
                            Saved Bookmarks
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.accountMenuItem}
                          onPress={handleLogout}
                          activeOpacity={0.7}
                        >
                          <LogOut size={16} color={colors.danger} />
                          <Text style={[styles.menuItemText, { color: colors.danger }]}>
                            Log out
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
          <View style={styles.searchBackdrop}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.searchModalBox,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.line,
                    borderRadius: radii.card,
                  },
                ]}
              >
                {/* Search Input Bar */}
                <View style={[styles.modalInputRow, { borderBottomColor: colors.line }]}>
                  <Search size={18} color={colors.muted} />
                  <TextInput
                    style={[styles.modalSearchInput, { color: colors.text }]}
                    placeholder="Search mock tests, topics, papers..."
                    placeholderTextColor={colors.muted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                    returnKeyType="search"
                  />
                  {searchQuery ? (
                    <TouchableOpacity
                      onPress={() => setSearchQuery('')}
                      style={styles.clearBtn}
                    >
                      <X size={16} color={colors.muted} />
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.kbdShortcut, { backgroundColor: colors.surface2 }]}>
                      <Text style={[styles.kbdText, { color: colors.muted }]}>ESC</Text>
                    </View>
                  )}
                </View>

                {/* Grouped Results */}
                <ScrollView
                  style={styles.resultsScroll}
                  keyboardShouldPersistTaps="handled"
                >
                  {query ? (
                    <>
                      {/* Topic Matches */}
                      {matchedTopics.length > 0 && (
                        <View style={styles.groupSection}>
                          <Text style={[styles.groupTitle, { color: colors.muted }]}>
                            TOPICS & SUBJECTS
                          </Text>
                          {matchedTopics.map((top) => (
                            <TouchableOpacity
                              key={top}
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
    gap: 8,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoImg: {
    width: 32,
    height: 32,
    borderRadius: 8,
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
    width: 220,
  },
  searchIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    flexShrink: 0,
  },
  accountTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 54,
    paddingRight: 16,
  },
  accountDropdown: {
    width: 240,
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    overflow: 'hidden',
  },
  accountDropdownHeader: {
    padding: 14,
    borderBottomWidth: 1,
  },
  accountUserTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  accountUserEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  accountMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  menuItemText: {
    fontSize: 13.5,
  },
  searchBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 16,
  },
  searchModalBox: {
    width: '100%',
    maxWidth: 580,
    maxHeight: '80%',
    borderWidth: 1,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    overflow: 'hidden',
  },
  modalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
    outlineStyle: 'none',
  } as any,
  clearBtn: {
    padding: 4,
  },
  resultsScroll: {
    padding: 8,
  },
  groupSection: {
    marginBottom: 12,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '500',
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
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
