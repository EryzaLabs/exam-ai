import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/auth-context';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/services/firebaseConfig';
import {
  User,
  Target,
  ArrowRight,
  ArrowLeft,
  Briefcase,
  BookOpen,
  Bell,
  CheckCircle2,
  Award,
  GraduationCap,
  School,
  FileCheck,
  MapPin,
  Sparkles,
  Globe,
  Check,
} from 'lucide-react-native';

const CADRES = [
  { id: 'UPSC', label: 'UPSC', icon: Award },
  { id: 'KVS', label: 'KVS', icon: School },
  { id: 'NVS', label: 'NVS', icon: GraduationCap },
  { id: 'DSSSB', label: 'DSSSB', icon: FileCheck },
  { id: 'State Education Dept', label: 'State Ed. Dept', icon: MapPin },
  { id: 'Other', label: 'Other', icon: Sparkles },
];

const DESIGNATIONS = [
  { id: 'PGT / TGT Teacher', label: 'PGT / TGT Teacher', icon: BookOpen, desc: 'Secondary & Sr. Secondary' },
  { id: 'Vice Principal', label: 'Vice Principal', icon: GraduationCap, desc: 'School administration' },
  { id: 'Principal', label: 'Principal', icon: Award, desc: 'Head of Institution' },
  { id: 'Admin Officer', label: 'Admin Officer', icon: Briefcase, desc: 'Educational admin & GFR' },
  { id: 'Other', label: 'Other', icon: User, desc: 'Aspirant or other post' },
];

const TOPICS = [
  'Education Policy & NEP',
  'Service Matters (CCS/Leave Rules)',
  'Financial Admin (GFR)',
  'Office Procedure & Law',
  'School Management & Pedagogy',
];

export default function ProfileSetupScreen() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const { width: windowWidth } = useWindowDimensions();
  const isLargeScreen = windowWidth > 768;

  // Step 1: Identity & Language
  const [fullName, setFullName] = useState('');
  const [language, setLanguage] = useState<'English' | 'Hindi'>('English');

  // Step 2: Context
  const [targetCadre, setTargetCadre] = useState('');
  const [designation, setDesignation] = useState('');

  // Step 3: Goals & Notifications
  const [weakestSubject, setWeakestSubject] = useState('');
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    if (user?.displayName) {
      setFullName(user.displayName);
    }
  }, [user]);

  const handleNext = () => {
    if (step === 1 && !fullName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    if (step === 2 && (!targetCadre || !designation)) {
      Alert.alert('Error', 'Please select your cadre and designation');
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => setStep(step - 1);

  const handleSkip = async () => {
    if (!targetCadre) setTargetCadre('UPSC');
    if (!designation) setDesignation('PGT / TGT Teacher');
    if (!weakestSubject) setWeakestSubject('Education Policy & NEP');
    await saveProfile();
  };

  const saveProfile = async () => {
    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }
    setLoading(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email || '',
        displayName: fullName.trim() || 'User',
        photoURL: user.photoURL || null,
        phoneNumber: user.phoneNumber || null,
        targetCadre: targetCadre || 'UPSC',
        currentDesignation: designation || 'PGT / TGT Teacher',
        weakestSubject: weakestSubject || 'Education Policy & NEP',
        languagePreference: language,
        notificationsEnabled: notifications,
        profileCompleted: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stats: {
          questionsAttempted: 0,
          accuracy: 0,
          streak: 0,
          totalTests: 0,
          topicStats: {},
        },
      });
      
      await AsyncStorage.setItem('@profile_completed', 'true');
      
      router.replace('/');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicatorContainer}>
      {[1, 2, 3].map((i) => (
        <React.Fragment key={i}>
          <View style={[styles.stepDot, step >= i && styles.stepDotActive]}>
             {step > i && <Check size={14} color="#fff" />}
             {step === i && <View style={styles.stepDotInner} />}
          </View>
          {i < 3 && <View style={[styles.stepLine, step > i && styles.stepLineActive]} />}
        </React.Fragment>
      ))}
    </View>
  );

  const renderContent = () => (
    <View style={[styles.responsiveWrapper, !isLargeScreen && { flex: 1 }, isLargeScreen && styles.responsiveWrapperLarge]}>
      <View style={[styles.headerArea, !isLargeScreen && { backgroundColor: 'transparent' }]}>
        {isLargeScreen && (
          <LinearGradient
            colors={['#1E3A8A', '#2563EB']}
            style={[StyleSheet.absoluteFillObject, { borderRadius: 32 }]}
          />
        )}
        <View style={styles.headerTop}>
          {step > 1 ? (
            <TouchableOpacity onPress={handleBack} style={styles.iconBtn}>
              <ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 64 }} />
          )}
          {renderStepIndicator()}
          <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.brandName}>
            {step === 1 ? 'Welcome Aboard!' : step === 2 ? 'Your Background' : 'Personalize Prep'}
          </Text>
          <Text style={styles.brandTagline}>
            {step === 1 && 'Let\'s get to know you better.'}
            {step === 2 && 'Help us tailor the experience to your role.'}
            {step === 3 && 'We\'ll focus on what matters most.'}
          </Text>
        </View>
      </View>

      <View style={[styles.formCard, !isLargeScreen && { flex: 1 }]}>
        {step === 1 && (
          <View style={[styles.stepContent, !isLargeScreen && { flex: 1 }]}>
            <View style={styles.avatarLarge}>
              <LinearGradient colors={['#3B82F6', '#8B5CF6']} style={styles.avatarGradient}>
                <Text style={styles.avatarText}>
                  {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
                </Text>
              </LinearGradient>
              <TouchableOpacity style={styles.avatarEditButton}>
                <User size={14} color="#3B82F6" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <User size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor="#94A3B8"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  textContentType="name"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Preferred Language</Text>
              <View style={styles.languageRow}>
                <TouchableOpacity
                  style={[styles.langCard, language === 'English' && styles.langCardActive]}
                  onPress={() => setLanguage('English')}
                >
                  <View style={styles.langHeader}>
                    <Globe size={20} color={language === 'English' ? '#2563EB' : '#64748B'} />
                    <View style={[styles.radioDot, language === 'English' && styles.radioDotActive]}>
                      {language === 'English' && <View style={styles.radioInner} />}
                    </View>
                  </View>
                  <Text style={[styles.langTitle, language === 'English' && styles.langTitleActive]}>English</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.langCard, language === 'Hindi' && styles.langCardActive]}
                  onPress={() => setLanguage('Hindi')}
                >
                  <View style={styles.langHeader}>
                    <Globe size={20} color={language === 'Hindi' ? '#2563EB' : '#64748B'} />
                    <View style={[styles.radioDot, language === 'Hindi' && styles.radioDotActive]}>
                      {language === 'Hindi' && <View style={styles.radioInner} />}
                    </View>
                  </View>
                  <Text style={[styles.langTitle, language === 'Hindi' && styles.langTitleActive]}>हिंदी (Hindi)</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.helperText}>You can change this later in settings.</Text>
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={[styles.stepContent, !isLargeScreen && { flex: 1 }]}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Target Cadre</Text>
              <View style={styles.gridContainer}>
                {CADRES.map((cadre) => {
                  const Icon = cadre.icon;
                  const isActive = targetCadre === cadre.id;
                  return (
                    <TouchableOpacity
                      key={cadre.id}
                      style={[styles.gridCard, isActive && styles.gridCardActive]}
                      onPress={() => setTargetCadre(cadre.id)}
                    >
                      <Icon size={24} color={isActive ? '#2563EB' : '#64748B'} />
                      <Text style={[styles.gridCardText, isActive && styles.gridCardTextActive]}>
                        {cadre.label}
                      </Text>
                      {isActive && (
                        <View style={styles.checkBadge}>
                          <Check size={12} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current Designation</Text>
              {DESIGNATIONS.map((d) => {
                const Icon = d.icon;
                const isActive = designation === d.id;
                return (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.listCard, isActive && styles.listCardActive]}
                    onPress={() => setDesignation(d.id)}
                  >
                    <View style={[styles.iconBox, isActive && styles.iconBoxActive]}>
                      <Icon size={20} color={isActive ? '#2563EB' : '#64748B'} />
                    </View>
                    <View style={styles.listCardBody}>
                      <Text style={[styles.listCardTitle, isActive && styles.listCardTitleActive]}>
                        {d.label}
                      </Text>
                      <Text style={styles.listCardDesc}>{d.desc}</Text>
                    </View>
                    <View style={[styles.radioDot, isActive && styles.radioDotActive]}>
                      {isActive && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={[styles.stepContent, !isLargeScreen && { flex: 1 }]}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Which area do you find most difficult?</Text>
              <Text style={styles.helperText}>We'll prioritize these topics in your diagnostic test.</Text>
              {TOPICS.map((t) => {
                const isActive = weakestSubject === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.topicCard, isActive && styles.topicCardActive]}
                    onPress={() => setWeakestSubject(t)}
                  >
                    <Text style={[styles.topicText, isActive && styles.topicTextActive]}>{t}</Text>
                    {isActive && <CheckCircle2 size={20} color="#2563EB" />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.inputGroup}>
              <TouchableOpacity
                style={[styles.notificationCard, notifications && styles.notificationCardActive]}
                onPress={() => setNotifications(!notifications)}
                activeOpacity={0.8}
              >
                <View style={styles.bellContainer}>
                  <Bell size={24} color={notifications ? "#2563EB" : "#64748B"} />
                </View>
                <View style={styles.notificationBody}>
                  <Text style={[styles.notificationTitle, notifications && styles.notificationTitleActive]}>
                    Practice Reminders
                  </Text>
                  <Text style={styles.notificationDesc}>
                    Allow push notifications to keep your streak alive.
                  </Text>
                </View>
                <View style={[styles.toggleBase, notifications && styles.toggleActive]}>
                  <View style={[styles.toggleKnob, notifications && styles.toggleKnobActive]} />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={step === 3 ? saveProfile : handleNext}
            disabled={loading}
          >
            <LinearGradient
              colors={loading ? ['#94A3B8', '#94A3B8'] : ['#2563EB', '#4F46E5']}
              style={styles.submitGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>
                    {step === 3 ? 'Start Diagnostic Test' : 'Continue'}
                  </Text>
                  <ArrowRight size={20} color="#fff" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <LinearGradient
      colors={['#1E3A8A', '#2563EB', '#3B82F6']}
      style={styles.mainContainer}
    >
      <StatusBar style="light" />
      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <ScrollView 
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={[styles.scrollRoot, isLargeScreen && { paddingVertical: 40 }]} 
            keyboardShouldPersistTaps="handled"
          >
            {renderContent()}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView 
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={[styles.scrollRoot, isLargeScreen && { paddingVertical: 40 }]} 
            keyboardShouldPersistTaps="handled"
          >
            {renderContent()}
          </ScrollView>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#1E3A8A',
  },
  scrollRoot: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  responsiveWrapper: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  responsiveWrapperLarge: {
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 20,
  },
  headerArea: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 32,
    paddingHorizontal: 24,
    position: 'relative',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconBtn: {
    width: 64,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    minWidth: 64,
    alignItems: 'center',
  },
  skipText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 2,
    borderColor: '#fff',
  },
  stepDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  stepLine: {
    width: 24,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  stepLineActive: {
    backgroundColor: '#fff',
  },
  titleContainer: {
    alignItems: 'center',
  },
  brandName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  brandTagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  stepContent: {
  },
  avatarLarge: {
    alignSelf: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  avatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '800',
    color: '#fff',
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#F8FAFC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  helperText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 18,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    height: 60,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '500',
  },
  languageRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  langCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  langCardActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  langHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  langTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
  },
  langTitleActive: {
    color: '#1E3A8A',
  },
  radioDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDotActive: {
    borderColor: '#3B82F6',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  gridCardActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  gridCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
  gridCardTextActive: {
    color: '#1E3A8A',
  },
  checkBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
  },
  listCardActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  iconBoxActive: {
    backgroundColor: '#DBEAFE',
  },
  listCardBody: {
    flex: 1,
  },
  listCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  listCardTitleActive: {
    color: '#1E3A8A',
  },
  listCardDesc: {
    fontSize: 13,
    color: '#64748B',
  },
  topicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
  },
  topicCardActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  topicText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
    flex: 1,
  },
  topicTextActive: {
    color: '#1E3A8A',
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  notificationCardActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  bellContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  notificationBody: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  notificationTitleActive: {
    color: '#1E3A8A',
  },
  notificationDesc: {
    fontSize: 13,
    color: '#64748B',
  },
  toggleBase: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#CBD5E1',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#2563EB',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
  },
  footer: {
    paddingTop: 16,
    marginTop: 'auto',
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  submitButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
