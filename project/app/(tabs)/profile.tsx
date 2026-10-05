import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, LogOut, Target, ChevronRight, Award, BookOpen, TrendingUp, Shield, HelpCircle, FileText, History, Trash2, CalendarDays, Globe } from 'lucide-react-native';
import { useAuth } from '@/context/auth-context';
import { signOut, deleteUser } from 'firebase/auth';
import { auth } from '@/services/firebaseConfig';
import UserService, { UserProfile, UserStats } from '@/services/user-service';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import DesktopDashboard from '@/components/DesktopDashboard';
import { useWindowDimensions } from 'react-native';

// 7-day streak calendar days
const WEEK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function ProfileScreen() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  
  const { user } = useAuth();
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const profile = await UserService.getUserProfile();
      const stats = await UserService.getUserStatistics();

      if (profile) {
        setUserProfile(profile);
        setUserName(profile.displayName);
        setUserEmail(profile.email || user.phoneNumber || 'No email provided');
        setNotificationsEnabled(profile.notificationsEnabled ?? true);
      }

      setUserStats(stats);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    if (userProfile) {
      try {
        await UserService.updateUserProfile({ notificationsEnabled: value });
      } catch (error) {
        Alert.alert('Error', 'Could not save notification preferences.');
        setNotificationsEnabled(!value); // revert on fail
      }
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (e) {
              Alert.alert("Error", "Failed to logout");
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is permanent and will delete all your test history, stats, and saved bookmarks. Are you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              if (auth.currentUser) {
                await deleteUser(auth.currentUser);
                // Auth observer will auto-route to login
              }
            } catch (error: any) {
              if (error.code === 'auth/requires-recent-login') {
                Alert.alert('Authentication Required', 'Please log out and log back in before deleting your account for security reasons.');
              } else {
                Alert.alert("Error", "Failed to delete account: " + error.message);
              }
            }
          }
        }
      ]
    );
  };

  const openLink = async (url: string) => {
    await WebBrowser.openBrowserAsync(url);
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const content = (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.contentWrapper}>
        {/* Profile Header */}
        <LinearGradient
          colors={['#4A90E2', '#357ABD', '#2B6CB0']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarText}>{getInitials(userName)}</Text>
            </View>
            <Text style={styles.profileName}>{userName}</Text>
            <Text style={styles.profileEmail}>{userEmail}</Text>
          </View>
        </LinearGradient>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: '#EBF5FF' }]}>
              <TrendingUp size={20} color="#4A90E2" />
            </View>
            <Text style={styles.statValue}>{userStats?.streak || 0}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: '#F0FFF4' }]}>
              <Target size={20} color="#48BB78" />
            </View>
            <Text style={styles.statValue}>{userStats?.accuracy?.toFixed(0) || 0}%</Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: '#FFF5F5' }]}>
              <Award size={20} color="#F56565" />
            </View>
            <Text style={styles.statValue}>{userStats?.totalTests || 0}</Text>
            <Text style={styles.statLabel}>Tests</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: '#FFFFF0' }]}>
              <BookOpen size={20} color="#ECC94B" />
            </View>
            <Text style={styles.statValue}>{userStats?.questionsAttempted || 0}</Text>
            <Text style={styles.statLabel}>Questions</Text>
          </View>
        </View>

        {/* Weekly Streak / Activity Goal */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>This Week's Goal</Text>
            <Text style={styles.streakStatus}>
              {userStats?.streak && userStats.streak > 0
                ? `${userStats.streak} Day Streak! 🔥`
                : 'Start your streak today'}
            </Text>
          </View>
          <View style={styles.calendarStrip}>
            {WEEK_DAYS.map((day, i) => {
              const currentDayIndex = new Date().getDay();
              const streak = userStats?.streak || 0;
              const isFilled = i <= currentDayIndex && i > currentDayIndex - streak;

              return (
                <View key={i} style={styles.calendarDay}>
                  <Text style={[styles.dayLabel, i === currentDayIndex && styles.dayLabelToday]}>{day}</Text>
                  <View style={[
                    styles.dayCircle,
                    isFilled && styles.dayCircleFilled,
                    i === currentDayIndex && !isFilled && styles.dayCircleToday
                  ]}>
                    {isFilled && <Text style={styles.checkText}>✓</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Exam Preferences & Context */}
        {userProfile && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Preparation Profile</Text>
              <TouchableOpacity onPress={() => router.push('/profile-setup')}>
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Target Cadre</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{userProfile.targetCadre || 'UPSC'}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Current Designation</Text>
              <Text style={styles.infoValue}>{userProfile.currentDesignation || 'Teacher'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Language</Text>
              <Text style={styles.infoValue}>{userProfile.languagePreference || 'English'}</Text>
            </View>

            {/* Weakest Subject Breakdown */}
            <View style={styles.weakAreaContainer}>
              <Text style={styles.weakAreaTitle}>Focus Area (Weakest Subject)</Text>
              <View style={styles.weakAreaCard}>
                <Target size={16} color="#F56565" style={{ marginRight: 8 }} />
                <Text style={styles.weakAreaText}>{userProfile.weakestSubject || 'General Knowledge'}</Text>
              </View>
              <Text style={styles.helperText}>We prioritize this subject in diagnostic tests and generated quizzes.</Text>
            </View>
          </View>
        )}

        {/* Quick Links */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Quick Links</Text>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/test-history')}>
            <View style={[styles.menuIconCircle, { backgroundColor: '#EBF5FF' }]}>
              <History size={20} color="#4A90E2" />
            </View>
            <Text style={styles.menuLabel}>Test History</Text>
            <ChevronRight size={20} color="#CBD5E0" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/bookmarks')}>
            <View style={[styles.menuIconCircle, { backgroundColor: '#FFFFF0' }]}>
              <BookOpen size={20} color="#ECC94B" />
            </View>
            <Text style={styles.menuLabel}>Bookmarks</Text>
            <ChevronRight size={20} color="#CBD5E0" />
          </TouchableOpacity>
        </View>

        {/* Settings */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <View style={styles.menuItem}>
            <View style={[styles.menuIconCircle, { backgroundColor: '#FFF5EB' }]}>
              <Bell size={20} color="#ED8936" />
            </View>
            <Text style={styles.menuLabel}>Practice Reminders</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: '#E2E8F0', true: '#4A90E2' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <TouchableOpacity style={styles.menuItem} onPress={() => openLink('https://hackclub.com/privacy/')}>
            <View style={[styles.menuIconCircle, { backgroundColor: '#F7FAFC' }]}>
              <Shield size={20} color="#718096" />
            </View>
            <Text style={styles.menuLabel}>Privacy Policy</Text>
            <ChevronRight size={20} color="#CBD5E0" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => openLink('https://hackclub.com/terms/')}>
            <View style={[styles.menuIconCircle, { backgroundColor: '#F7FAFC' }]}>
              <FileText size={20} color="#718096" />
            </View>
            <Text style={styles.menuLabel}>Terms of Service</Text>
            <ChevronRight size={20} color="#CBD5E0" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => openLink('mailto:support@example.com')}>
            <View style={[styles.menuIconCircle, { backgroundColor: '#EBF8FF' }]}>
              <HelpCircle size={20} color="#4299E1" />
            </View>
            <Text style={styles.menuLabel}>Help & Support</Text>
            <ChevronRight size={20} color="#CBD5E0" />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.dangerZone}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={20} color="#F56565" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
            <Trash2 size={20} color="#E53E3E" />
            <Text style={styles.deleteText}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>Version 1.0.1</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  if (isLargeScreen) {
    return <DesktopDashboard disableScroll>{content}</DesktopDashboard>;
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentWrapper: {
    width: '100%',
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#718096',
  },
  headerGradient: {
    paddingTop: 32,
    paddingBottom: 48,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    marginBottom: 8,
  },
  headerContent: {
    alignItems: 'center',
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginTop: -20,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A202C',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#A0AEC0',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A202C',
  },
  editText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
  },
  streakStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ED8936',
  },
  calendarStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  calendarDay: {
    alignItems: 'center',
    gap: 8,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A0AEC0',
  },
  dayLabelToday: {
    color: '#4A90E2',
    fontWeight: '700',
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dayCircleFilled: {
    backgroundColor: '#48BB78',
    borderColor: '#48BB78',
  },
  dayCircleToday: {
    borderColor: '#4A90E2',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  checkText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F7FAFC',
  },
  infoLabel: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A202C',
  },
  badge: {
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A90E2',
  },
  weakAreaContainer: {
    marginTop: 16,
    backgroundColor: '#FFF5F5',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  weakAreaTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C53030',
    marginBottom: 8,
  },
  weakAreaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  weakAreaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
  },
  helperText: {
    fontSize: 12,
    color: '#E53E3E',
    marginTop: 8,
    opacity: 0.8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F7FAFC',
  },
  menuIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#2D3748',
  },
  dangerZone: {
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F56565',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: 'transparent',
    borderRadius: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  deleteText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E53E3E',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#CBD5E0',
    marginVertical: 16,
    marginBottom: 32,
  },
});