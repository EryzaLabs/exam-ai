import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, ImageBackground, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BookOpen,
  Home,
  FileText,
  Clock,
  Grid,
  Zap,
  BarChart2,
  MessageSquare,
  Bookmark,
  Crown,
  Search,
  Bell,
  User,
  Target,
  Award,
  ChevronRight,
  Brain,
  Library,
  ChevronDown,
  Star,
  LogOut,
  LogIn,
  ArrowRight,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Moon,
} from 'lucide-react-native';
import { router, usePathname, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';
import { useDashboardData } from '@/hooks/useDashboardData';
import { signOut } from 'firebase/auth';
import { auth } from '@/services/firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UserService from '@/services/user-service';
import Svg, { Circle } from 'react-native-svg';

export default function DesktopDashboard({ performance: propPerformance, dashboardStats: propDashboardStats, children, disableScroll }: any) {
  const { isDark, colors, toggleTheme } = useTheme();
  const { user, isSubscribed: authSubscribed, isSubscriptionLoading, requireAuth } = useAuth();
  const [searchQuery, setSearchQuery] = React.useState('');
  const pathname = usePathname();
  const searchParams = useLocalSearchParams<{ category?: string }>();
  const activeCategory = searchParams?.category;

  const navigateToCategory = (cat: 'all' | 'full' | 'topic') => {
    if (pathname === '/test-list' || pathname?.includes('test-list')) {
      router.setParams({ category: cat });
    } else {
      router.push({ pathname: '/test-list', params: { category: cat } });
    }
  };
  
  // Use hook data if props aren't explicitly provided
  const { performance: hookPerformance, dashboardStats: hookDashboardStats, loading } = useDashboardData();
  const performance = propPerformance || hookPerformance;
  const dashboardStats = propDashboardStats || hookDashboardStats;

  const isSubscribed = authSubscribed || dashboardStats?.isSubscribed === true;

  const handleLogout = () => {
    const doSignOut = async () => {
      try {
        await signOut(auth);
        router.replace('/');
      } catch (err: any) {
        const msg = 'Failed to log out: ' + (err?.message || 'Unknown error');
        if (Platform.OS === 'web') {
          window.alert(msg);
        } else {
          Alert.alert('Error', msg);
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to log out?')) {
        doSignOut();
      }
      return;
    }

    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: doSignOut }
      ]
    );
  };
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* LEFT SIDEBAR */}
      <View style={[styles.sidebar, { backgroundColor: colors.sidebarBg, borderColor: colors.sidebarBorder }]}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <BookOpen size={24} color="#fff" />
          </View>
          <View>
            <Text style={[styles.logoText, { color: colors.textPrimary }]}>Astra</Text>
            <Text style={[styles.logoSubtext, { color: colors.textSecondary }]}>Exam AI</Text>
          </View>
        </View>

        <ScrollView style={styles.navMenu} showsVerticalScrollIndicator={false}>
          <TouchableOpacity 
            style={[styles.navItem, (pathname === '/' || pathname === '/index') && styles.navItemActive]} 
            onPress={() => router.push('/')}
          >
            <Home size={20} color={(pathname === '/' || pathname === '/index') ? '#fff' : colors.textSecondary} />
            <Text style={[styles.navText, { color: colors.textSecondary }, (pathname === '/' || pathname === '/index') && styles.navTextActive]}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.navItem, (pathname === '/test-list' || pathname?.includes('test-list')) && (!activeCategory || activeCategory === 'all') && styles.navItemActive]} 
            onPress={() => navigateToCategory('all')}
          >
            <FileText size={20} color={(pathname === '/test-list' || pathname?.includes('test-list')) && (!activeCategory || activeCategory === 'all') ? '#fff' : colors.textSecondary} />
            <Text style={[styles.navText, { color: colors.textSecondary }, (pathname === '/test-list' || pathname?.includes('test-list')) && (!activeCategory || activeCategory === 'all') && styles.navTextActive]}>Tests</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.navItem, (pathname === '/test-list' || pathname?.includes('test-list')) && activeCategory === 'full' && styles.navItemActive]} 
            onPress={() => navigateToCategory('full')}
          >
            <Clock size={20} color={(pathname === '/test-list' || pathname?.includes('test-list')) && activeCategory === 'full' ? '#fff' : colors.textSecondary} />
            <Text style={[styles.navText, { color: colors.textSecondary }, (pathname === '/test-list' || pathname?.includes('test-list')) && activeCategory === 'full' && styles.navTextActive]}>Full Mocks</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.navItem, (pathname === '/test-list' || pathname?.includes('test-list')) && activeCategory === 'topic' && styles.navItemActive]} 
            onPress={() => navigateToCategory('topic')}
          >
            <Grid size={20} color={(pathname === '/test-list' || pathname?.includes('test-list')) && activeCategory === 'topic' ? '#fff' : colors.textSecondary} />
            <Text style={[styles.navText, { color: colors.textSecondary }, (pathname === '/test-list' || pathname?.includes('test-list')) && activeCategory === 'topic' && styles.navTextActive]}>Topic Wise</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.navItem, (pathname === '/custom-test' || pathname?.includes('custom-test')) && styles.navItemActive]} 
            onPress={() => router.push(isSubscribed ? '/custom-test' : '/premium')}
          >
            <SlidersHorizontal size={20} color={(pathname === '/custom-test' || pathname?.includes('custom-test')) ? '#fff' : colors.textSecondary} />
            <Text style={[styles.navText, { color: colors.textSecondary }, (pathname === '/custom-test' || pathname?.includes('custom-test')) && styles.navTextActive]}>Custom Test 👑</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.navItem, (pathname === '/practice' || pathname?.includes('practice')) && styles.navItemActive]} 
            onPress={() => router.push('/practice')}
          >
            <Zap size={20} color={(pathname === '/practice' || pathname?.includes('practice')) ? '#fff' : colors.textSecondary} />
            <Text style={[styles.navText, { color: colors.textSecondary }, (pathname === '/practice' || pathname?.includes('practice')) && styles.navTextActive]}>Practice</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.navItem, (pathname === '/progress' || pathname === '/test-history' || pathname?.includes('progress') || pathname?.includes('test-history')) && styles.navItemActive]} 
            onPress={() => requireAuth(() => router.push('/progress'), { title: 'Sign In to View Analytics', feature: 'Performance Analytics' })}
          >
            <BarChart2 size={20} color={(pathname === '/progress' || pathname === '/test-history' || pathname?.includes('progress') || pathname?.includes('test-history')) ? '#fff' : colors.textSecondary} />
            <Text style={[styles.navText, { color: colors.textSecondary }, (pathname === '/progress' || pathname === '/test-history') && styles.navTextActive]}>Analytics</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.navItem, (pathname === '/assistant' || pathname?.includes('assistant')) && styles.navItemActive]} 
            onPress={() => router.push('/assistant')}
          >
            <MessageSquare size={20} color={(pathname === '/assistant' || pathname?.includes('assistant')) ? '#fff' : colors.textSecondary} />
            <Text style={[styles.navText, { color: colors.textSecondary }, (pathname === '/assistant' || pathname?.includes('assistant')) && styles.navTextActive]}>AI Assistant</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.navItem, (pathname === '/bookmarks' || pathname?.includes('bookmarks')) && styles.navItemActive]} 
            onPress={() => router.push('/bookmarks')}
          >
            <Bookmark size={20} color={(pathname === '/bookmarks' || pathname?.includes('bookmarks')) ? '#fff' : colors.textSecondary} />
            <Text style={[styles.navText, { color: colors.textSecondary }, (pathname === '/bookmarks' || pathname?.includes('bookmarks')) && styles.navTextActive]}>Bookmarks</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.navItem, (pathname === '/profile' || pathname?.includes('profile')) && styles.navItemActive]} 
            onPress={() => router.push('/profile')}
          >
            <User size={20} color={(pathname === '/profile' || pathname?.includes('profile')) ? '#fff' : colors.textSecondary} />
            <Text style={[styles.navText, { color: colors.textSecondary }, (pathname === '/profile' || pathname?.includes('profile')) && styles.navTextActive]}>Profile</Text>
          </TouchableOpacity>

          {user ? (
            <TouchableOpacity style={styles.navItem} onPress={handleLogout}>
              <LogOut size={20} color="#EF4444" />
              <Text style={[styles.navText, { color: '#EF4444', fontWeight: '600' }]}>Log Out</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.navItem, { backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF', borderWidth: 1, borderColor: isDark ? '#3B82F6' : '#DBEAFE' }]} 
              onPress={() => router.push('/(auth)/login')}
            >
              <LogIn size={20} color={colors.accent} />
              <Text style={[styles.navText, { color: colors.accent, fontWeight: '700' }]}>Sign In / Register</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {pathname !== '/premium' && !isSubscriptionLoading && !isSubscribed && (
          <TouchableOpacity 
            style={[styles.premiumCard, { backgroundColor: colors.premiumBg }]}
            onPress={() => router.push('/premium')}
            activeOpacity={0.85}
          >
            <Crown size={24} color="#F59E0B" style={{ marginBottom: 12 }} />
            <Text style={[styles.premiumTitle, { color: colors.premiumTitle }]}>Go Premium</Text>
            <Text style={[styles.premiumDesc, { color: colors.premiumDesc }]}>Unlock 26 full mocks, 158 topic tests + new tests added daily.</Text>
            <View style={styles.premiumBtn}>
              <ArrowRight size={16} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* CENTER CONTENT */}
      <View style={[styles.mainContent, { backgroundColor: colors.background }]}>
        {/* TOP BAR */}
        <View style={[styles.topBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.searchContainer, { backgroundColor: colors.surfaceInput, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
            <Search size={18} color={colors.textTertiary} />
            <TextInput 
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search tests, topics, or keywords..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => {
                if (searchQuery.trim()) {
                  if (pathname === '/test-list' || pathname?.includes('test-list')) {
                    router.setParams({ q: searchQuery.trim() });
                  } else {
                    router.push({ pathname: '/test-list', params: { q: searchQuery.trim() } });
                  }
                }
              }}
              returnKeyType="search"
            />
          </View>
          <View style={styles.topBarRight}>
            <TouchableOpacity 
              style={[styles.bellBtn, { borderColor: colors.border, backgroundColor: colors.surface, marginRight: 12 }]} 
              onPress={toggleTheme}
              accessibilityLabel="Toggle Dark Mode"
            >
              {isDark ? <Sun size={20} color="#F59E0B" /> : <Moon size={20} color={colors.textSecondary} />}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.bellBtn, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={() => Alert.alert('Notifications', 'No new notifications at the moment.')}>
              <Bell size={20} color={colors.textSecondary} />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
            {user ? (
              <>
                <TouchableOpacity style={styles.userProfile} onPress={() => router.push('/profile')} activeOpacity={0.7}>
                  <View style={styles.avatar}>
                    {(user?.photoURL || dashboardStats?.photoURL) ? (
                      <Image
                        source={{ uri: (user?.photoURL || dashboardStats?.photoURL) as string }}
                        style={styles.avatarImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles.avatarText}>{(dashboardStats?.userName || user?.displayName || user?.email)?.[0]?.toUpperCase() || 'U'}</Text>
                    )}
                  </View>
                  <View style={{ marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.userName, { color: colors.textPrimary }]}>{dashboardStats?.userName || user?.displayName || (user?.email ? user.email.split('@')[0] : 'User')}</Text>
                      {isSubscribed && (
                        <Crown size={15} color="#F59E0B" fill="#F59E0B" />
                      )}
                    </View>
                    <Text style={[styles.userRole, { color: colors.textSecondary }, isSubscribed && { color: '#D97706', fontWeight: '700' }]}>
                      {isSubscribed ? '👑 Premium Member' : (dashboardStats?.rank || 'Beginner')}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.logoutIconBtn, isDark && { backgroundColor: '#450A0A', borderColor: '#7F1D1D' }]} 
                  onPress={handleLogout}
                  accessibilityLabel="Log Out"
                >
                  <LogOut size={18} color="#EF4444" />
                </TouchableOpacity>
              </>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TouchableOpacity
                  style={[styles.desktopSignInBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => router.push('/(auth)/login')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.desktopSignInBtnText, { color: colors.textPrimary }]}>Sign In</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.desktopSignUpBtn}
                  onPress={() => router.push('/(auth)/signup')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.desktopSignUpBtnText}>Get Started Free</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {disableScroll ? (
          <View style={[styles.scrollContent, { flex: 1, padding: 0 }]}>
            {children}
          </View>
        ) : (
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {children || (
              <>
              {/* HERO BANNER */}
              <ImageBackground
            source={require('@/assets/images/upsc-bg.png')}
            style={[styles.heroBanner, { backgroundColor: '#E0E7FF' }]}
            imageStyle={{ borderRadius: 24, opacity: 0.9, width: '100%', height: '100%' }}
            resizeMode="cover"
          >
            <View style={styles.heroContent}>
              <Text style={styles.heroSub}>ASTRA EXAM AI</Text>
              <Text style={styles.heroTitle}>Master Your Exams with Intelligent AI.</Text>
              <Text style={styles.heroDesc}>Practice. Analyze. Improve. Repeat.</Text>
              
              <View style={styles.heroStatsRow}>
                <View style={[styles.heroStatBadge, { backgroundColor: colors.surface }]}>
                  <View style={[styles.statIconBox, { backgroundColor: isDark ? '#1E3A5F' : '#DBEAFE' }]}>
                    <FileText size={16} color="#2563EB" />
                  </View>
                  <View>
                    <Text style={[styles.statVal, { color: colors.textPrimary }]}>{dashboardStats.totalAvailableTests}</Text>
                    <Text style={[styles.statLbl, { color: colors.textSecondary }]}>Tests Available</Text>
                  </View>
                </View>

                <View style={[styles.heroStatBadge, { backgroundColor: colors.surface }]}>
                  <View style={[styles.statIconBox, { backgroundColor: isDark ? '#064E3B' : '#D1FAE5' }]}>
                    <Target size={16} color="#059669" />
                  </View>
                  <View>
                    <Text style={[styles.statVal, { color: colors.textPrimary }]}>{dashboardStats?.accuracy?.toFixed(1) || '0'}%</Text>
                    <Text style={[styles.statLbl, { color: colors.textSecondary }]}>Avg. Accuracy</Text>
                  </View>
                </View>

                <View style={[styles.heroStatBadge, { backgroundColor: colors.surface }]}>
                  <View style={[styles.statIconBox, { backgroundColor: isDark ? '#2D1B69' : '#EDE9FE' }]}>
                    <Clock size={16} color="#7C3AED" />
                  </View>
                  <View>
                    <Text style={[styles.statVal, { color: colors.textPrimary }]}>{Math.floor((dashboardStats?.timeSpent || 0) / 60)}h {(dashboardStats?.timeSpent || 0) % 60}m</Text>
                    <Text style={[styles.statLbl, { color: colors.textSecondary }]}>Practice Time</Text>
                  </View>
                </View>

                <View style={[styles.heroStatBadge, { backgroundColor: colors.surface }]}>
                  <View style={[styles.statIconBox, { backgroundColor: isDark ? '#431407' : '#FFEDD5' }]}>
                    <BarChart2 size={16} color="#EA580C" />
                  </View>
                  <View>
                    <Text style={[styles.statVal, { color: colors.textPrimary }]}>{dashboardStats?.totalTopics || 0}</Text>
                    <Text style={[styles.statLbl, { color: colors.textSecondary }]}>Topics Covered</Text>
                  </View>
                </View>
              </View>
            </View>
          </ImageBackground>

          {/* FEATURED BANNER */}
          <View style={styles.sectionHeader}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
               <BookOpen size={20} color="#F97316" />
               <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>UPSC Principal Mock Tests</Text>
            </View>
            <TouchableOpacity onPress={() => router.push({ pathname: '/test-list', params: { category: 'full' } })}>
              <Text style={styles.viewAll}>View All →</Text>
            </TouchableOpacity>
          </View>
          
          <ImageBackground
            source={require('@/assets/images/upsc-bg.png')}
            style={[styles.featuredBanner, { backgroundColor: '#1E40AF' }]}
            imageStyle={{ borderRadius: 24, opacity: 0.35, width: '100%', height: '100%' }}
            resizeMode="cover"
          >
             <LinearGradient
                colors={['rgba(30,64,175,0.8)', 'rgba(59,130,246,0.6)']}
                style={[StyleSheet.absoluteFillObject, { borderRadius: 24 }]}
             />
             <View style={styles.featuredContent}>
                <View style={styles.featuredBadge}>
                   <Star size={12} color="#F59E0B" fill="#F59E0B" />
                   <Text style={styles.featuredBadgeText}>Featured</Text>
                </View>
                <Text style={styles.featuredTitle}>UPSC Principal Test Series</Text>
                <Text style={styles.featuredDesc}>Complete mock test series for comprehensive preparation</Text>
                
                <View style={styles.featuredPerks}>
                   <View style={styles.perk}><Clock size={14} color="#fff" /><Text style={styles.perkText}>Timed Tests</Text></View>
                   <View style={styles.perk}><BarChart2 size={14} color="#fff" /><Text style={styles.perkText}>Detailed Analytics</Text></View>
                   <View style={styles.perk}><Brain size={14} color="#fff" /><Text style={styles.perkText}>Detailed Solutions</Text></View>
                </View>
             </View>
             <TouchableOpacity style={styles.browseBtn} onPress={() => router.push({ pathname: '/test-list', params: { category: 'full' } })}>
                <Text style={styles.browseBtnText}>Browse Tests →</Text>
             </TouchableOpacity>
          </ImageBackground>

          {/* PRACTICE MODES */}
          <View style={styles.sectionHeader}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
               <Zap size={20} color="#8B5CF6" />
               <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Choose Your Practice Mode</Text>
            </View>
          </View>

          <View style={styles.practiceModesRow}>
             <TouchableOpacity style={{ flex: 1 }} onPress={() => requireAuth(() => router.push(isSubscribed ? '/custom-ai-test' : '/premium'), { title: 'Sign In to Generate AI Tests', feature: 'Custom AI Tests' })}>
               <LinearGradient colors={['#FEACA1', '#FEACA1']} style={styles.modeCard}>
                  <View style={{ flex: 1 }}>
                     <View style={styles.modeIconRed}><Brain size={24} color="#DC2626" /></View>
                     <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                       <Text style={styles.modeTitle}>AI Test</Text>
                       <Crown size={14} color="#F59E0B" />
                     </View>
                     <Text style={styles.modeDesc}>Any topic in the world generated with AI (1/day)</Text>
                  </View>
                  <View style={styles.modeArrow}><ArrowRight size={16} color="#DC2626" /></View>
               </LinearGradient>
             </TouchableOpacity>
             
             <TouchableOpacity style={{ flex: 1 }} onPress={() => requireAuth(() => router.push('/practice'), { title: 'Sign In for Practice Mode', feature: 'Practice Mode' })}>
               <LinearGradient colors={['#A7F3D0', '#A7F3D0']} style={styles.modeCard}>
                  <View style={{ flex: 1 }}>
                     <View style={styles.modeIconGreen}><Zap size={24} color="#059669" /></View>
                     <Text style={styles.modeTitle}>Quick Practice</Text>
                     <Text style={styles.modeDesc}>Random questions from all topics</Text>
                  </View>
                  <View style={styles.modeArrow}><ArrowRight size={16} color="#059669" /></View>
               </LinearGradient>
             </TouchableOpacity>

             <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push({ pathname: '/test-list', params: { category: 'topic' } })}>
               <LinearGradient colors={['#E9D5FF', '#E9D5FF']} style={styles.modeCard}>
                  <View style={{ flex: 1 }}>
                     <View style={styles.modeIconPurple}><Library size={24} color="#7C3AED" /></View>
                     <Text style={styles.modeTitle}>Topic Wise</Text>
                     <Text style={styles.modeDesc}>Focus on specific topics and weak areas</Text>
                  </View>
                  <View style={styles.modeArrow}><ArrowRight size={16} color="#7C3AED" /></View>
               </LinearGradient>
             </TouchableOpacity>

             <TouchableOpacity style={{ flex: 1 }} onPress={() => requireAuth(() => router.push(isSubscribed ? '/custom-test' : '/premium'), { title: 'Sign In for Custom Test Builder', feature: 'Custom Test Builder' })}>
               <LinearGradient colors={['#C7D2FE', '#E0E7FF']} style={styles.modeCard}>
                  <View style={{ flex: 1 }}>
                     <View style={styles.modeIconIndigo}><SlidersHorizontal size={24} color="#4F46E5" /></View>
                     <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                       <Text style={styles.modeTitle}>Custom Test</Text>
                       <Crown size={14} color="#F59E0B" />
                     </View>
                     <Text style={styles.modeDesc}>Custom topics, question counts & duration</Text>
                  </View>
                  <View style={styles.modeArrow}><ArrowRight size={16} color="#4F46E5" /></View>
               </LinearGradient>
             </TouchableOpacity>
          </View>

          {/* RECENT TESTS */}
          <View style={styles.sectionHeader}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
               <Clock size={20} color="#3B82F6" />
               <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Tests</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/test-list')}>
              <Text style={styles.viewAll}>View All →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.recentTestsRow}>
             {(!performance?.recentTests || performance.recentTests.length === 0) ? (
               <View style={{ padding: 24, backgroundColor: colors.surface, borderRadius: 16, width: '100%', alignItems: 'center', borderWidth: isDark ? 1 : 0, borderColor: colors.border }}>
                 <Text style={{ color: colors.textSecondary }}>No recent tests found. Start practicing!</Text>
               </View>
             ) : (
               performance.recentTests.slice(0, 3).map((test: any, i: number) => (
                 <View key={i} style={[styles.recentTestCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.rtcHeader}>
                       <View style={[styles.rtcIcon, { backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF' }]}><FileText size={18} color="#3B82F6" /></View>
                       <View style={{ flex: 1 }}>
                          <Text style={[styles.rtcTitle, { color: colors.textPrimary }]}>{test.title || `Test ${i+1}`}</Text>
                          <Text style={[styles.rtcDate, { color: colors.textSecondary }]}>{test.date || 'Recently'} • {test.type || 'Practice'}</Text>
                       </View>
                       <View style={[styles.rtcStatus, test.status === 'in-progress' && styles.rtcStatusProgress]}>
                          <Text style={[styles.rtcStatusText, test.status === 'in-progress' && styles.rtcStatusTextProgress]}>
                             {test.status === 'in-progress' ? 'In Progress' : 'Completed'}
                          </Text>
                       </View>
                    </View>
                    <View style={[styles.rtcMetrics, { borderColor: colors.borderLight }]}>
                       <View style={styles.rtcMetric}><FileText size={14} color={colors.textSecondary} /><Text style={[styles.rtcMetricTxt, { color: colors.textSecondary }]}>{test.questions || 0} Questions</Text></View>
                       <View style={styles.rtcMetric}><Clock size={14} color={colors.textSecondary} /><Text style={[styles.rtcMetricTxt, { color: colors.textSecondary }]}>{test.duration || '0m'} Duration</Text></View>
                       <View style={styles.rtcMetric}><Star size={14} color={colors.textSecondary} /><Text style={[styles.rtcMetricTxt, { color: colors.textSecondary }]}>{test.score || 0}% Score</Text></View>
                       <ArrowRight size={16} color={colors.textTertiary} style={{ marginLeft: 'auto' }} />
                    </View>
                 </View>
               ))
             )}
          </View>
            </>
            )}
          </ScrollView>
        )}
      </View>

      {/* RIGHT SIDEBAR */}
      <View style={[styles.rightSidebar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {pathname === '/premium' ? (
          <>
            {/* Exam Blueprint Widget */}
            <View style={[styles.widgetCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
              <View style={styles.widgetHeader}>
                <Award size={20} color="#2563EB" />
                <Text style={[styles.widgetTitle, { color: colors.textPrimary }]}>Exam Blueprint</Text>
              </View>
              <View style={{ gap: 10, marginTop: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>Target Exam</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }}>UPSC Principal / VP</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>Questions / Marks</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }}>120 Qs • 300 Marks</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>Duration</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }}>2 Hours (120 Mins)</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>Marking Scheme</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>+2.5  •  -0.83 Negative</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>Language</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#059669' }}>Bilingual (Eng & हिन्दी)</Text>
                </View>
              </View>
            </View>

            {/* Inclusions Summary Widget */}
            <View style={[styles.widgetCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
              <View style={styles.widgetHeader}>
                <Target size={20} color="#10B981" />
                <Text style={[styles.widgetTitle, { color: colors.textPrimary }]}>2026 Pass Inclusions</Text>
              </View>
              <View style={{ gap: 8, marginTop: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#2563EB' }} />
                  <Text style={{ fontSize: 12, color: colors.textPrimary }}><Text style={{ fontWeight: '700' }}>26 Full-Length Mocks</Text> (CBT mode)</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#7C3AED' }} />
                  <Text style={{ fontSize: 12, color: colors.textPrimary }}><Text style={{ fontWeight: '700' }}>158 Topic-wise Tests</Text> (All subjects)</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#D97706' }} />
                  <Text style={{ fontSize: 12, color: colors.textPrimary }}><Text style={{ fontWeight: '700' }}>Daily Fresh Tests</Text> added daily</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#059669' }} />
                  <Text style={{ fontSize: 12, color: colors.textPrimary }}><Text style={{ fontWeight: '700' }}>Swamy’s Citations</Text> on all rules</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#EA580C' }} />
                  <Text style={{ fontSize: 12, color: colors.textPrimary }}><Text style={{ fontWeight: '700' }}>Valid till 2026</Text> Exam Day</Text>
                </View>
              </View>
            </View>

            {/* Verified Security Widget */}
            <View style={[styles.widgetCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
              <View style={styles.widgetHeader}>
                <ShieldCheck size={20} color="#059669" />
                <Text style={[styles.widgetTitle, { color: colors.textPrimary }]}>Guaranteed Security</Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18, marginTop: 8 }}>
                256-Bit SSL Encrypted checkout powered by Cashfree. All cards, UPI (GPay, PhonePe, Paytm), and NetBanking supported.
              </Text>
            </View>
          </>
        ) : (
          <>
        {/* Your Progress */}
        <View style={[styles.widgetCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
          <View style={styles.widgetHeader}>
             <Target size={20} color="#059669" />
             <Text style={[styles.widgetTitle, { color: colors.textPrimary }]}>Your Progress</Text>
             <TouchableOpacity style={{marginLeft: 'auto'}} onPress={() => router.push('/progress')}>
               <Text style={styles.viewAll}>View Analytics →</Text>
             </TouchableOpacity>
          </View>
          {(() => {
            const rawAccuracy = Number(dashboardStats?.accuracy) || 0;
            const accuracyVal = Math.min(Math.max(rawAccuracy, 0), 100);
            const ringRadius = 40;
            const ringCircumference = 2 * Math.PI * ringRadius;
            const ringOffset = ringCircumference - (ringCircumference * accuracyVal) / 100;
            const ringColor = accuracyVal >= 70 ? '#10B981' : accuracyVal >= 40 ? '#3B82F6' : '#EF4444';

            return (
              <View style={styles.progressBody}>
                 <View style={styles.donutContainer}>
                    <Svg width={100} height={100} viewBox="0 0 100 100">
                      {/* Background Track */}
                      <Circle
                        cx={50}
                        cy={50}
                        r={ringRadius}
                        stroke={colors.border}
                        strokeWidth={8}
                        fill="transparent"
                      />
                      {/* Accurate Progress Ring */}
                      {accuracyVal > 0 && (
                        <Circle
                          cx={50}
                          cy={50}
                          r={ringRadius}
                          stroke={ringColor}
                          strokeWidth={8}
                          strokeDasharray={`${ringCircumference} ${ringCircumference}`}
                          strokeDashoffset={ringOffset}
                          strokeLinecap="round"
                          fill="transparent"
                          rotation="-90"
                          origin="50, 50"
                        />
                      )}
                    </Svg>
                    <View style={styles.donutInner}>
                       <Text style={[styles.donutVal, { color: colors.textPrimary }]}>{accuracyVal.toFixed(1)}%</Text>
                       <Text style={[styles.donutLbl, { color: colors.textSecondary }]}>Accuracy</Text>
                    </View>
                 </View>
                 <View style={styles.progressStats}>
                    <View style={styles.pStatItem}>
                       <View style={[styles.pStatIconB, { backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF' }]}><FileText size={16} color="#3B82F6" /></View>
                       <View><Text style={[styles.pStatVal, { color: colors.textPrimary }]}>{dashboardStats?.questionsAttempted || 0}</Text><Text style={[styles.pStatLbl, { color: colors.textSecondary }]}>Questions Attempted</Text></View>
                    </View>
                    <View style={styles.pStatItem}>
                       <View style={[styles.pStatIconP, { backgroundColor: isDark ? '#2D1B69' : '#F3E8FF' }]}><Clock size={16} color="#7C3AED" /></View>
                       <View><Text style={[styles.pStatVal, { color: colors.textPrimary }]}>{Math.floor((dashboardStats?.timeSpent || 0) / 60)}h {(dashboardStats?.timeSpent || 0) % 60}m</Text><Text style={[styles.pStatLbl, { color: colors.textSecondary }]}>Total Study Time</Text></View>
                    </View>
                    <View style={styles.pStatItem}>
                       <View style={[styles.pStatIconO, { backgroundColor: isDark ? '#431407' : '#FFF7ED' }]}><BarChart2 size={16} color="#EA580C" /></View>
                       <View><Text style={[styles.pStatVal, { color: colors.textPrimary }]}>{dashboardStats?.totalTopics || 0}</Text><Text style={[styles.pStatLbl, { color: colors.textSecondary }]}>Topics Covered</Text></View>
                    </View>
                 </View>
              </View>
            );
          })()}
        </View>

        {/* Current Streak */}
        <TouchableOpacity style={[styles.widgetCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]} onPress={() => router.push('/progress')} activeOpacity={0.7}>
          <View style={styles.widgetHeader}>
             <View style={styles.streakIcon}><Zap size={20} color="#F59E0B" fill="#F59E0B" /></View>
             <View>
                <Text style={[styles.widgetLbl, { color: colors.textSecondary }]}>Current Streak</Text>
                <Text style={[styles.widgetTitleLarge, { color: colors.textPrimary }]}>{dashboardStats?.streak || 0} days</Text>
             </View>
             <ChevronRight size={20} color={colors.textTertiary} style={{marginLeft: 'auto'}} />
          </View>
          <View style={styles.calendarRow}>
             {['S','M','T','W','T','F','S'].map((d, i) => {
                 const currentDay = new Date().getDay();
                 const streak = dashboardStats?.streak || 0;
                 const isActive = streak > 0 && ((currentDay - i >= 0 && currentDay - i < streak) || (currentDay - i < 0 && (7 - (i - currentDay)) < streak));
                 return (
                    <View key={i} style={styles.calDay}>
                       <View style={[styles.calCheck, { backgroundColor: colors.calDayBg }, isActive ? styles.calCheckActive : null]}>
                          <Check size={12} color={isActive ? '#fff' : 'transparent'} />
                       </View>
                       <Text style={[styles.calText, { color: colors.calDayText }]}>{d}</Text>
                    </View>
                 );
             })}
          </View>
        </TouchableOpacity>

        {/* Topic Performance */}
        <View style={[styles.widgetCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
          <View style={styles.widgetHeader}>
             <BarChart2 size={20} color="#3B82F6" />
             <Text style={[styles.widgetTitle, { color: colors.textPrimary }]}>Topic Performance</Text>
             <TouchableOpacity style={{marginLeft: 'auto'}} onPress={() => router.push('/progress')}>
               <Text style={styles.viewAll}>View Details →</Text>
             </TouchableOpacity>
          </View>
          
          <View style={styles.topicsList}>
             {(!performance?.subjectWisePerformance || Object.keys(performance.subjectWisePerformance).length === 0) ? (
               <Text style={{ color: colors.textSecondary, textAlign: 'center', marginVertical: 16 }}>Play some tests to see your topic performance!</Text>
             ) : (
               Object.values(performance.subjectWisePerformance)
                 .slice(0, 5)
                 .map((topic: any, i) => {
                   const colorsArr = ['#10B981', '#3B82F6', '#F59E0B', '#7C3AED', '#EF4444'];
                   return (
                     <View key={i} style={styles.topicRow}>
                        <View style={[styles.topicIconB, { backgroundColor: `${colorsArr[i % 5]}15` }]}><Library size={18} color={colorsArr[i % 5]} /></View>
                        <Text style={[styles.topicName, { color: colors.textSecondary }]} numberOfLines={2}>{topic.subject || 'Subject'}</Text>
                        <View style={[styles.topicBarBg, { backgroundColor: colors.progressBarBg }]}>
                           <View style={[styles.topicBarFill, { width: `${topic.accuracy || 0}%`, backgroundColor: colorsArr[i % 5] }]} />
                        </View>
                        <Text style={[styles.topicPct, { color: colors.textPrimary }]}>{Math.round(topic.accuracy || 0)}%</Text>
                     </View>
                   );
                 })
             )}
          </View>
        </View>
        </>
        )}
      </View>
    </View>
  );
};
const Check = ({size, color, style}: any) => <View style={style}><Text style={{color, fontSize: size}}>✓</Text></View>;

const styles = StyleSheet.create({
  desktopSignInBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  desktopSignInBtnText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 14,
  },
  desktopSignUpBtn: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  desktopSignUpBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
  },
  sidebar: {
    width: 260,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    display: 'flex',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  logoSubtext: {
    fontSize: 13,
    color: '#64748B',
  },
  navMenu: {
    flex: 1,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  navItemActive: {
    backgroundColor: '#3B82F6',
  },
  navText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 12,
  },
  navTextActive: {
    color: '#fff',
  },
  premiumCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 20,
    marginTop: 'auto',
  },
  premiumTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 6,
  },
  premiumDesc: {
    fontSize: 13,
    color: '#B45309',
    marginBottom: 16,
    lineHeight: 18,
  },
  premiumBtn: {
    alignSelf: 'flex-start',
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
    flex: 0.6,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#0F172A',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 24,
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userProfile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  userRole: {
    fontSize: 13,
    color: '#64748B',
  },
  logoutIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
    cursor: 'pointer',
  },
  scrollContent: {
    padding: 32,
  },
  heroBanner: {
    borderRadius: 24,
    padding: 32,
    marginBottom: 32,
    overflow: 'hidden',
  },
  heroContent: {
    maxWidth: '70%',
  },
  heroSub: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4338CA',
    letterSpacing: 1,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1E1B4B',
    marginBottom: 8,
  },
  heroDesc: {
    fontSize: 16,
    color: '#4F46E5',
    marginBottom: 24,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  heroStatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statVal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  statLbl: {
    fontSize: 12,
    color: '#64748B',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  featuredBanner: {
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    overflow: 'hidden',
  },
  featuredContent: {
    flex: 1,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  featuredBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 4,
  },
  featuredTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  featuredDesc: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 20,
  },
  featuredPerks: {
    flexDirection: 'row',
    gap: 16,
  },
  perk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  perkText: {
    color: '#fff',
    fontSize: 13,
  },
  browseBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  browseBtnText: {
    color: '#1E40AF',
    fontWeight: '700',
    fontSize: 15,
  },
  practiceModesRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  modeCard: {
    flex: 1,
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
  },
  modeIconRed: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  modeIconGreen: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  modeIconPurple: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  modeIconIndigo: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  modeTitle: {
    fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 6,
  },
  modeDesc: {
    fontSize: 13, color: '#475569', lineHeight: 18,
  },
  modeArrow: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  recentTestsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  recentTestCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rtcHeader: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  rtcIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  rtcTitle: {
    fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 4,
  },
  rtcDate: {
    fontSize: 12, color: '#64748B',
  },
  rtcStatus: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#D1FAE5', height: 24, justifyContent: 'center',
  },
  rtcStatusText: {
    fontSize: 11, fontWeight: '600', color: '#059669',
  },
  rtcStatusProgress: {
    backgroundColor: '#FEF3C7',
  },
  rtcStatusTextProgress: {
    color: '#D97706',
  },
  rtcMetrics: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
  },
  rtcMetric: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  rtcMetricTxt: {
    fontSize: 12, color: '#475569', fontWeight: '500'
  },
  rightSidebar: {
    width: 340,
    backgroundColor: '#fff',
    borderLeftWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
  },
  widgetCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  widgetTitle: {
    fontSize: 16, fontWeight: '700', color: '#0F172A',
  },
  progressBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  donutContainer: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  donutInner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutVal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  donutLbl: {
    fontSize: 10,
    color: '#64748B',
  },
  progressStats: {
    flex: 1, gap: 16,
  },
  pStatItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  pStatIconB: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  pStatIconP: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center' },
  pStatIconO: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center' },
  pStatVal: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  pStatLbl: { fontSize: 12, color: '#64748B' },
  streakIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
  widgetLbl: { fontSize: 13, color: '#64748B' },
  widgetTitleLarge: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  calendarRow: { flexDirection: 'row', justifyContent: 'space-between' },
  calDay: { alignItems: 'center', gap: 8 },
  calCheck: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  calCheckActive: { backgroundColor: '#3B82F6' },
  calText: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  topicsList: { gap: 16 },
  topicRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  topicIconB: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  topicName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#334155' },
  topicBarBg: { width: 60, height: 6, borderRadius: 3, backgroundColor: '#F1F5F9' },
  topicBarFill: { height: '100%', borderRadius: 3 },
  topicPct: { width: 32, textAlign: 'right', fontSize: 13, fontWeight: '600', color: '#0F172A' },
});
