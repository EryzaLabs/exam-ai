import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ImageBackground, Alert } from 'react-native';
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
  Star
} from 'lucide-react-native';
import { router, usePathname } from 'expo-router';
import { useAuth } from '@/context/auth-context';
import { useDashboardData } from '@/hooks/useDashboardData';

export default function DesktopDashboard({ performance: propPerformance, dashboardStats: propDashboardStats, children, disableScroll }: any) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = React.useState('');
  const pathname = usePathname();
  
  // Use hook data if props aren't explicitly provided
  const { performance: hookPerformance, dashboardStats: hookDashboardStats, loading } = useDashboardData();
  const performance = propPerformance || hookPerformance;
  const dashboardStats = propDashboardStats || hookDashboardStats;
  return (
    <View style={styles.container}>
      {/* LEFT SIDEBAR */}
      <View style={styles.sidebar}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <BookOpen size={24} color="#fff" />
          </View>
          <View>
            <Text style={styles.logoText}>UPSC</Text>
            <Text style={styles.logoSubtext}>Mock Tests</Text>
          </View>
        </View>

        <ScrollView style={styles.navMenu} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={[styles.navItem, pathname === '/' && styles.navItemActive]} onPress={() => router.push('/')}>
            <Home size={20} color={pathname === '/' ? '#fff' : '#64748B'} />
            <Text style={[styles.navText, pathname === '/' && styles.navTextActive]}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.navItem, pathname === '/test-list' && styles.navItemActive]} onPress={() => router.push('/test-list')}>
            <FileText size={20} color={pathname === '/test-list' ? '#fff' : '#64748B'} />
            <Text style={[styles.navText, pathname === '/test-list' && styles.navTextActive]}>Tests</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.navItem, pathname === '/testseries-browse' && styles.navItemActive]} onPress={() => router.push('/testseries-browse')}>
            <Clock size={20} color={pathname === '/testseries-browse' ? '#fff' : '#64748B'} />
            <Text style={[styles.navText, pathname === '/testseries-browse' && styles.navTextActive]}>Full Mocks</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.navItem, false && styles.navItemActive]} onPress={() => router.push({ pathname: '/test-list', params: { category: 'topic' } })}>
            <Grid size={20} color="#64748B" />
            <Text style={[styles.navText, false && styles.navTextActive]}>Topic Wise</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.navItem, pathname === '/practice' && styles.navItemActive]} onPress={() => router.push('/practice')}>
            <Zap size={20} color={pathname === '/practice' ? '#fff' : '#64748B'} />
            <Text style={[styles.navText, pathname === '/practice' && styles.navTextActive]}>Practice</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.navItem, (pathname === '/progress' || pathname === '/test-history') && styles.navItemActive]} onPress={() => router.push('/progress')}>
            <BarChart2 size={20} color={(pathname === '/progress' || pathname === '/test-history') ? '#fff' : '#64748B'} />
            <Text style={[styles.navText, (pathname === '/progress' || pathname === '/test-history') && styles.navTextActive]}>Analytics</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.navItem, pathname === '/assistant' && styles.navItemActive]} onPress={() => router.push('/assistant')}>
            <MessageSquare size={20} color={pathname === '/assistant' ? '#fff' : '#64748B'} />
            <Text style={[styles.navText, pathname === '/assistant' && styles.navTextActive]}>AI Assistant</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.navItem, pathname === '/bookmarks' && styles.navItemActive]} onPress={() => router.push('/bookmarks')}>
            <Bookmark size={20} color={pathname === '/bookmarks' ? '#fff' : '#64748B'} />
            <Text style={[styles.navText, pathname === '/bookmarks' && styles.navTextActive]}>Bookmarks</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.premiumCard}>
          <Crown size={24} color="#F59E0B" style={{ marginBottom: 12 }} />
          <Text style={styles.premiumTitle}>Go Premium</Text>
          <Text style={styles.premiumDesc}>Unlock full mocks, detailed analytics and more.</Text>
          <TouchableOpacity style={styles.premiumBtn}>
            <ArrowRight size={16} color="#475569" />
          </TouchableOpacity>
        </View>
      </View>

      {/* CENTER CONTENT */}
      <View style={styles.mainContent}>
        {/* TOP BAR */}
        <View style={styles.topBar}>
          <View style={styles.searchContainer}>
            <Search size={18} color="#94A3B8" />
            <TextInput 
              style={styles.searchInput}
              placeholder="Search tests, topics, or keywords..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => {
                if (searchQuery.trim()) {
                  router.push({ pathname: '/test-list', params: { q: searchQuery.trim() } });
                }
              }}
              returnKeyType="search"
            />
          </View>
          <View style={styles.topBarRight}>
            <TouchableOpacity style={styles.bellBtn} onPress={() => Alert.alert('Notifications', 'No new notifications at the moment.')}>
              <Bell size={20} color="#64748B" />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.userProfile} onPress={() => router.push('/profile')} activeOpacity={0.7}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(dashboardStats?.userName || user?.displayName)?.[0]?.toUpperCase() || 'U'}</Text>
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.userName}>{dashboardStats?.userName || user?.displayName || 'User'}</Text>
                <Text style={styles.userRole}>{dashboardStats?.rank || 'Beginner'}</Text>
              </View>
            </TouchableOpacity>
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
              <Text style={styles.heroSub}>GO FURTHER</Text>
              <Text style={styles.heroTitle}>Crack UPSC, One Test at a Time.</Text>
              <Text style={styles.heroDesc}>Practice. Analyze. Improve. Repeat.</Text>
              
              <View style={styles.heroStatsRow}>
                <View style={styles.heroStatBadge}>
                  <View style={[styles.statIconBox, { backgroundColor: '#DBEAFE' }]}>
                    <FileText size={16} color="#2563EB" />
                  </View>
                  <View>
                    <Text style={styles.statVal}>28</Text>
                    <Text style={styles.statLbl}>Tests Available</Text>
                  </View>
                </View>

                <View style={styles.heroStatBadge}>
                  <View style={[styles.statIconBox, { backgroundColor: '#D1FAE5' }]}>
                    <Target size={16} color="#059669" />
                  </View>
                  <View>
                    <Text style={styles.statVal}>{dashboardStats?.accuracy?.toFixed(1) || '0'}%</Text>
                    <Text style={styles.statLbl}>Avg. Accuracy</Text>
                  </View>
                </View>

                <View style={styles.heroStatBadge}>
                  <View style={[styles.statIconBox, { backgroundColor: '#EDE9FE' }]}>
                    <Clock size={16} color="#7C3AED" />
                  </View>
                  <View>
                    <Text style={styles.statVal}>{Math.floor((dashboardStats?.timeSpent || 0) / 60)}h {(dashboardStats?.timeSpent || 0) % 60}m</Text>
                    <Text style={styles.statLbl}>Practice Time</Text>
                  </View>
                </View>

                <View style={styles.heroStatBadge}>
                  <View style={[styles.statIconBox, { backgroundColor: '#FFEDD5' }]}>
                    <BarChart2 size={16} color="#EA580C" />
                  </View>
                  <View>
                    <Text style={styles.statVal}>{dashboardStats?.totalTopics || 0}</Text>
                    <Text style={styles.statLbl}>Topics Covered</Text>
                  </View>
                </View>
              </View>
            </View>
          </ImageBackground>

          {/* FEATURED BANNER */}
          <View style={styles.sectionHeader}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
               <BookOpen size={20} color="#F97316" />
               <Text style={styles.sectionTitle}>UPSC Principal Mock Tests</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/testseries-browse')}>
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
             <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/testseries-browse')}>
                <Text style={styles.browseBtnText}>Browse Tests →</Text>
             </TouchableOpacity>
          </ImageBackground>

          {/* PRACTICE MODES */}
          <View style={styles.sectionHeader}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
               <Zap size={20} color="#8B5CF6" />
               <Text style={styles.sectionTitle}>Choose Your Practice Mode</Text>
            </View>
          </View>

          <View style={styles.practiceModesRow}>
             <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push('/practice')}>
               <LinearGradient colors={['#FEACA1', '#FEACA1']} style={styles.modeCard}>
                  <View style={{ flex: 1 }}>
                     <View style={styles.modeIconRed}><Brain size={24} color="#DC2626" /></View>
                     <Text style={styles.modeTitle}>AI Test</Text>
                     <Text style={styles.modeDesc}>Adaptive questions based on your performance</Text>
                  </View>
                  <View style={styles.modeArrow}><ArrowRight size={16} color="#DC2626" /></View>
               </LinearGradient>
             </TouchableOpacity>
             
             <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push('/practice')}>
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
          </View>

          {/* RECENT TESTS */}
          <View style={styles.sectionHeader}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
               <Clock size={20} color="#3B82F6" />
               <Text style={styles.sectionTitle}>Recent Tests</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/test-list')}>
              <Text style={styles.viewAll}>View All →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.recentTestsRow}>
             {(!performance?.recentTests || performance.recentTests.length === 0) ? (
               <View style={{ padding: 24, backgroundColor: '#fff', borderRadius: 16, width: '100%', alignItems: 'center' }}>
                 <Text style={{ color: '#64748B' }}>No recent tests found. Start practicing!</Text>
               </View>
             ) : (
               performance.recentTests.slice(0, 3).map((test: any, i: number) => (
                 <View key={i} style={styles.recentTestCard}>
                    <View style={styles.rtcHeader}>
                       <View style={styles.rtcIcon}><FileText size={18} color="#3B82F6" /></View>
                       <View style={{ flex: 1 }}>
                          <Text style={styles.rtcTitle}>{test.title || `Test ${i+1}`}</Text>
                          <Text style={styles.rtcDate}>{test.date || 'Recently'} • {test.type || 'Practice'}</Text>
                       </View>
                       <View style={[styles.rtcStatus, test.status === 'in-progress' && styles.rtcStatusProgress]}>
                          <Text style={[styles.rtcStatusText, test.status === 'in-progress' && styles.rtcStatusTextProgress]}>
                             {test.status === 'in-progress' ? 'In Progress' : 'Completed'}
                          </Text>
                       </View>
                    </View>
                    <View style={styles.rtcMetrics}>
                       <View style={styles.rtcMetric}><FileText size={14} color="#64748B" /><Text style={styles.rtcMetricTxt}>{test.questions || 0} Questions</Text></View>
                       <View style={styles.rtcMetric}><Clock size={14} color="#64748B" /><Text style={styles.rtcMetricTxt}>{test.duration || '0m'} Duration</Text></View>
                       <View style={styles.rtcMetric}><Star size={14} color="#64748B" /><Text style={styles.rtcMetricTxt}>{test.score || 0}% Score</Text></View>
                       <ArrowRight size={16} color="#94A3B8" style={{ marginLeft: 'auto' }} />
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
      <View style={styles.rightSidebar}>
        {/* Your Progress */}
        <View style={styles.widgetCard}>
          <View style={styles.widgetHeader}>
             <Target size={20} color="#059669" />
             <Text style={styles.widgetTitle}>Your Progress</Text>
             <TouchableOpacity style={{marginLeft: 'auto'}} onPress={() => router.push('/progress')}>
               <Text style={styles.viewAll}>View Analytics →</Text>
             </TouchableOpacity>
          </View>
          <View style={styles.progressBody}>
             <View style={styles.donutPlaceholder}>
                <View style={styles.donutRing} />
                <View style={styles.donutInner}>
                   <Text style={styles.donutVal}>{dashboardStats?.accuracy?.toFixed(1) || '0'}%</Text>
                   <Text style={styles.donutLbl}>Accuracy</Text>
                </View>
             </View>
             <View style={styles.progressStats}>
                <View style={styles.pStatItem}>
                   <View style={styles.pStatIconB}><FileText size={16} color="#3B82F6" /></View>
                   <View><Text style={styles.pStatVal}>{dashboardStats?.questionsAttempted || 0}</Text><Text style={styles.pStatLbl}>Questions Attempted</Text></View>
                </View>
                <View style={styles.pStatItem}>
                   <View style={styles.pStatIconP}><Clock size={16} color="#7C3AED" /></View>
                   <View><Text style={styles.pStatVal}>{Math.floor((dashboardStats?.timeSpent || 0) / 60)}h {(dashboardStats?.timeSpent || 0) % 60}m</Text><Text style={styles.pStatLbl}>Total Study Time</Text></View>
                </View>
                <View style={styles.pStatItem}>
                   <View style={styles.pStatIconO}><BarChart2 size={16} color="#EA580C" /></View>
                   <View><Text style={styles.pStatVal}>{dashboardStats?.totalTopics || 0}</Text><Text style={styles.pStatLbl}>Topics Covered</Text></View>
                </View>
             </View>
          </View>
        </View>

        {/* Current Streak */}
        <TouchableOpacity style={styles.widgetCard} onPress={() => router.push('/progress')} activeOpacity={0.7}>
          <View style={styles.widgetHeader}>
             <View style={styles.streakIcon}><Zap size={20} color="#F59E0B" fill="#F59E0B" /></View>
             <View>
                <Text style={styles.widgetLbl}>Current Streak</Text>
                <Text style={styles.widgetTitleLarge}>{dashboardStats?.streak || 0} days</Text>
             </View>
             <ChevronRight size={20} color="#94A3B8" style={{marginLeft: 'auto'}} />
          </View>
          <View style={styles.calendarRow}>
             {['S','M','T','W','T','F','S'].map((d, i) => {
                 const currentDay = new Date().getDay();
                 const streak = dashboardStats?.streak || 0;
                 const isActive = streak > 0 && ((currentDay - i >= 0 && currentDay - i < streak) || (currentDay - i < 0 && (7 - (i - currentDay)) < streak));
                 return (
                    <View key={i} style={styles.calDay}>
                       <View style={[styles.calCheck, isActive ? styles.calCheckActive : null]}>
                          <Check size={12} color={isActive ? '#fff' : 'transparent'} />
                       </View>
                       <Text style={styles.calText}>{d}</Text>
                    </View>
                 );
             })}
          </View>
        </TouchableOpacity>

        {/* Topic Performance */}
        <View style={styles.widgetCard}>
          <View style={styles.widgetHeader}>
             <BarChart2 size={20} color="#3B82F6" />
             <Text style={styles.widgetTitle}>Topic Performance</Text>
             <TouchableOpacity style={{marginLeft: 'auto'}} onPress={() => router.push('/progress')}>
               <Text style={styles.viewAll}>View Details →</Text>
             </TouchableOpacity>
          </View>
          
          <View style={styles.topicsList}>
             {(!performance?.subjectWisePerformance || Object.keys(performance.subjectWisePerformance).length === 0) ? (
               <Text style={{ color: '#64748B', textAlign: 'center', marginVertical: 16 }}>Play some tests to see your topic performance!</Text>
             ) : (
               Object.values(performance.subjectWisePerformance)
                 .slice(0, 5)
                 .map((topic: any, i) => {
                   const colors = ['#10B981', '#3B82F6', '#F59E0B', '#7C3AED', '#EF4444'];
                   return (
                     <View key={i} style={styles.topicRow}>
                        <View style={[styles.topicIconB, { backgroundColor: `${colors[i % 5]}15` }]}><Library size={18} color={colors[i % 5]} /></View>
                        <Text style={styles.topicName} numberOfLines={2}>{topic.subject || 'Subject'}</Text>
                        <View style={styles.topicBarBg}>
                           <View style={[styles.topicBarFill, { width: `${topic.accuracy || 0}%`, backgroundColor: colors[i % 5] }]} />
                        </View>
                        <Text style={styles.topicPct}>{Math.round(topic.accuracy || 0)}%</Text>
                     </View>
                   );
                 })
             )}
          </View>
        </View>
      </View>
    </View>
  );
}

const ArrowRight = ({size, color, style}: any) => <View style={style}><Text style={{color, fontSize: size}}>→</Text></View>;
const Check = ({size, color, style}: any) => <View style={style}><Text style={{color, fontSize: size}}>✓</Text></View>;

const styles = StyleSheet.create({
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
  donutPlaceholder: {
    width: 100, height: 100, borderRadius: 50, borderWidth: 8, borderColor: '#34D399', borderTopColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center',
  },
  donutInner: {
    alignItems: 'center',
  },
  donutVal: {
    fontSize: 20, fontWeight: '800', color: '#0F172A',
  },
  donutLbl: {
    fontSize: 10, color: '#64748B',
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
