import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Platform,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import {
  Bell,
  Search,
  FileText,
  Target,
  Clock,
  BarChart2,
  Play,
  ArrowRight,
  Grid,
  BookOpen,
  Star,
  ChevronRight,
  Zap,
  Brain,
} from 'lucide-react-native';

export default function MobileDashboard({
  performance,
  dashboardStats,
  refreshing,
  onRefresh,
}: any) {
  const [searchQuery, setSearchQuery] = React.useState('');
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* HEADER SECTION (BLUE) */}
        <ImageBackground
          source={require('@/assets/images/upsc-bg.png')}
          style={[styles.headerGradient, { backgroundColor: '#3B82F6' }]}
          imageStyle={{ borderBottomLeftRadius: 32, borderBottomRightRadius: 32, opacity: 0.9, width: '100%', height: '100%' }}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(79,70,229,0.8)', 'transparent']}
            style={[StyleSheet.absoluteFillObject, { borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }]}
          />
          <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.headerTitle}>UPSC</Text>
                <Text style={styles.headerTitle}>Mock Tests</Text>
                <Text style={styles.headerSubtitle}>Practice. Analyze. Improve.</Text>
              </View>
              <TouchableOpacity style={styles.bellBtn} onPress={() => {
                const { Alert } = require('react-native');
                Alert.alert('Notifications', 'No new notifications at the moment.');
              }}>
                <Bell size={24} color="#3B82F6" />
                <View style={styles.notificationDot} />
              </TouchableOpacity>
            </View>

            <View style={styles.headerSpacer} />
          </SafeAreaView>
        </ImageBackground>

        {/* MAIN CONTENT AREA */}
        <View style={styles.contentArea}>

          {/* FLOATING SEARCH BAR */}
          <View style={styles.searchWrapper}>
            <View style={styles.searchContainer}>
              <Search size={20} color="#94A3B8" />
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
          </View>

          {/* STATS GRID */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIconBox, { backgroundColor: '#EFF6FF' }]}>
                <FileText size={18} color="#3B82F6" />
              </View>
              <View>
                <Text style={styles.statVal}>28</Text>
                <Text style={styles.statLbl}>Tests Available</Text>
              </View>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconBox, { backgroundColor: '#ECFDF5' }]}>
                <Target size={18} color="#10B981" />
              </View>
              <View>
                <Text style={styles.statVal}>{dashboardStats?.accuracy?.toFixed(1) || '0'}%</Text>
                <Text style={styles.statLbl}>Avg. Accuracy</Text>
              </View>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconBox, { backgroundColor: '#F5F3FF' }]}>
                <Clock size={18} color="#8B5CF6" />
              </View>
              <View>
                <Text style={styles.statVal}>{Math.floor((dashboardStats?.timeSpent || 0) / 60)}h {(dashboardStats?.timeSpent || 0) % 60}m</Text>
                <Text style={styles.statLbl}>Practice Time</Text>
              </View>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconBox, { backgroundColor: '#FFF7ED' }]}>
                <BarChart2 size={18} color="#F97316" />
              </View>
              <View>
                <Text style={styles.statVal}>{dashboardStats?.questionsAttempted || 0}</Text>
                <Text style={styles.statLbl}>Questions Solved</Text>
              </View>
            </View>
          </View>

          {/* CONTINUE TEST CARD */}
          <View style={styles.resumeCard}>
            <View style={styles.resumeTop}>
              <View style={styles.playBtnContainer}>
                <View style={styles.playBtnOuter}>
                  <View style={styles.playBtnInner}>
                    <Play size={20} color="#fff" fill="#fff" />
                  </View>
                </View>
              </View>
              <View style={styles.resumeInfo}>
                <Text style={styles.resumeTag}>CONTINUE TEST</Text>
                <Text style={styles.resumeTitle}>Unfinished Test</Text>
                <Text style={styles.resumeDesc}>10 questions attempted • 119m left</Text>
              </View>
              <TouchableOpacity style={styles.resumeBtn}>
                <Text style={styles.resumeBtnTxt}>Resume</Text>
                <ArrowRight size={16} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '10%' }]} />
            </View>
            <Text style={styles.progressText}>10%</Text>
          </View>

          {/* PILLS */}
          <View style={styles.pillsRow}>
            <TouchableOpacity style={[styles.pill, styles.pillActive]} onPress={() => router.push('/test-list')}>
              <Grid size={16} color="#fff" />
              <Text style={[styles.pillTxt, styles.pillTxtActive]}>All Tests</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pill} onPress={() => router.push('/testseries-browse')}>
              <FileText size={16} color="#475569" />
              <Text style={styles.pillTxt}>Full Mocks</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pill} onPress={() => router.push('/test-list')}>
              <BookOpen size={16} color="#475569" />
              <Text style={styles.pillTxt}>Topic Wise</Text>
            </TouchableOpacity>
          </View>

          {/* FEATURED BANNER */}
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Star size={20} color="#F59E0B" fill="#F59E0B" />
              <Text style={styles.sectionTitle}>Featured</Text>
            </View>
            <TouchableOpacity><Text style={styles.viewAll}>View All →</Text></TouchableOpacity>
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
            <View style={styles.featuredTagsRow}>
              <View style={styles.featuredTagBg}>
                <Text style={styles.featuredTagTxt}>UPSC Principal</Text>
              </View>
              <View style={[styles.featuredTagBg, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                <Star size={12} color="#F59E0B" fill="#F59E0B" />
                <Text style={styles.featuredTagTxt}>Featured</Text>
              </View>
            </View>

            <View style={styles.featuredTitleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.featuredTitle}>UPSC Principal Test Series</Text>
                <Text style={styles.featuredDesc}>Complete mock test series for comprehensive preparation.</Text>
              </View>
              <View style={styles.featuredArrowBtn}>
                <ChevronRight size={24} color="#fff" />
              </View>
            </View>

            <View style={styles.featuredPerks}>
              <View style={styles.perk}><FileText size={14} color="#fff" /><Text style={styles.perkText}>28 Tests</Text></View>
              <View style={styles.perk}><Clock size={14} color="#fff" /><Text style={styles.perkText}>Timed Tests</Text></View>
              <View style={styles.perk}><BarChart2 size={14} color="#fff" /><Text style={styles.perkText}>Detailed Analytics</Text></View>
            </View>
          </ImageBackground>

          {/* PRACTICE MODE */}
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Zap size={20} color="#8B5CF6" fill="#8B5CF6" />
              <Text style={styles.sectionTitle}>Practice Mode</Text>
            </View>
          </View>

          <View style={styles.practiceModesRow}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push('/practice')}>
              <LinearGradient colors={['#FFC5C5', '#FFDADA']} style={styles.modeCard}>
                <View style={styles.modeIconRed}><Brain size={24} color="#DC2626" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modeTitle}>AI Test</Text>
                  <Text style={styles.modeDesc}>Adaptive questions based on your performance.</Text>
                </View>
                <View style={styles.modeArrow}><ArrowRight size={16} color="#DC2626" /></View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push('/practice')}>
              <LinearGradient colors={['#A7F3D0', '#D1FAE5']} style={styles.modeCard}>
                <View style={styles.modeIconGreen}><Zap size={24} color="#059669" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modeTitle}>Quick Practice</Text>
                  <Text style={styles.modeDesc}>Random questions from all topics.</Text>
                </View>
                <View style={styles.modeArrow}><ArrowRight size={16} color="#059669" /></View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* RECENT TESTS */}
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Clock size={20} color="#475569" />
              <Text style={styles.sectionTitle}>Recent Tests</Text>
            </View>
            <TouchableOpacity><Text style={styles.viewAll}>View All →</Text></TouchableOpacity>
          </View>

          <View style={styles.recentTestsList}>
            {(!performance?.recentTests || performance.recentTests.length === 0) ? (
              <View style={{ padding: 24, backgroundColor: '#fff', borderRadius: 16, width: '100%', alignItems: 'center' }}>
                <Text style={{ color: '#64748B' }}>No recent tests found. Start practicing!</Text>
              </View>
            ) : (
              performance.recentTests.slice(0, 3).map((test: any, i: number) => (
                <View key={i} style={styles.recentTestCard}>
                  <View style={styles.rtcHeader}>
                    <View style={styles.rtcIcon}><FileText size={20} color="#3B82F6" /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rtcTitle}>{test.title || `Test ${i + 1}`}</Text>
                      <Text style={styles.rtcDate}>{test.date || 'Recently'} • {test.type || 'Practice'}</Text>
                    </View>
                    <View style={styles.rtcStatus}>
                      <Text style={styles.rtcStatusText}>{test.status === 'in-progress' ? 'In Progress' : 'Completed'}</Text>
                    </View>
                  </View>
                  <View style={styles.rtcMetrics}>
                    <View style={styles.rtcMetric}><FileText size={16} color="#94A3B8" /><View><Text style={styles.rtcMetricVal}>{test.questions || 0}</Text><Text style={styles.rtcMetricTxt}>Questions</Text></View></View>
                    <View style={styles.rtcMetric}><Clock size={16} color="#94A3B8" /><View><Text style={styles.rtcMetricVal}>{test.duration || '0m'}</Text><Text style={styles.rtcMetricTxt}>Duration</Text></View></View>
                    <View style={styles.rtcMetric}><Star size={16} color="#94A3B8" /><View><Text style={styles.rtcMetricVal}>{test.score || 0}%</Text><Text style={styles.rtcMetricTxt}>Score</Text></View></View>
                    <ChevronRight size={20} color="#CBD5E1" style={{ marginLeft: 'auto' }} />
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  headerGradient: {
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerSafeArea: {
    paddingHorizontal: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 36,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
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
  headerSpacer: {
    height: 40,
  },
  contentArea: {
    flex: 1,
    paddingHorizontal: 20,
  },
  searchWrapper: {
    marginTop: -28,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#0F172A',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  statVal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  statLbl: {
    fontSize: 10,
    color: '#64748B',
  },
  resumeCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  resumeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  playBtnContainer: {
    marginRight: 16,
  },
  playBtnOuter: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(249,115,22,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
  },
  resumeInfo: {
    flex: 1,
  },
  resumeTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
    letterSpacing: 1,
    marginBottom: 4,
  },
  resumeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  resumeDesc: {
    fontSize: 11,
    color: '#475569',
  },
  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F97316',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  resumeBtnTxt: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(249,115,22,0.2)',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#F97316',
    borderRadius: 3,
  },
  progressText: {
    textAlign: 'right',
    fontSize: 11,
    fontWeight: '600',
    color: '#B45309',
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  pillActive: {
    backgroundColor: '#3B82F6',
  },
  pillTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  pillTxtActive: {
    color: '#fff',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  featuredBanner: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 32,
  },
  featuredTagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  featuredTagBg: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  featuredTagTxt: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  featuredTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  featuredTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
  },
  featuredDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
  },
  featuredArrowBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredPerks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  perk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  perkText: {
    color: '#fff',
    fontSize: 11,
  },
  practiceModesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  modeCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
  },
  modeIconRed: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  modeIconGreen: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  modeTitle: {
    fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 4,
  },
  modeDesc: {
    fontSize: 11, color: '#475569', lineHeight: 16, marginBottom: 12,
  },
  modeArrow: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end',
  },
  recentTestsList: {
    gap: 12,
  },
  recentTestCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  rtcHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  rtcIcon: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  rtcTitle: {
    fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 4,
  },
  rtcDate: {
    fontSize: 12, color: '#64748B',
  },
  rtcStatus: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#D1FAE5', alignSelf: 'flex-start',
  },
  rtcStatusText: {
    fontSize: 11, fontWeight: '700', color: '#059669',
  },
  rtcMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
  },
  rtcMetric: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  rtcMetricVal: {
    fontSize: 13, fontWeight: '700', color: '#0F172A',
  },
  rtcMetricTxt: {
    fontSize: 10, color: '#64748B',
  }
});
