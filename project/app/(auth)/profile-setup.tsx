import React, { useState, useEffect } from 'react';
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
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/auth-context';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/services/firebaseConfig';
import {
  User,
  GraduationCap,
  Target,
  ArrowRight,
  ArrowLeft,
  Briefcase,
  BookOpen,
  Bell,
  CheckCircle2,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

const CADRES = ['UPSC', 'KVS', 'NVS', 'DSSSB', 'State Education Dept', 'Other'];
const DESIGNATIONS = ['PGT / TGT Teacher', 'Vice Principal', 'Principal', 'Admin Officer', 'Other'];
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

  // Step 1: Identity & Language
  const [fullName, setFullName] = useState('');
  const [language, setLanguage] = useState<'English' | 'Hindi'>('English');

  // Step 2: Context
  const [targetCadre, setTargetCadre] = useState('');
  const [designation, setDesignation] = useState('');

  // Step 3: Goals & Notifications
  const [weakestSubject, setWeakestSubject] = useState('');
  const [notifications, setNotifications] = useState(true);

  // Auto-fill from Firebase Auth
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

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSkip = async () => {
    // Fill with defaults if skipping
    if (!targetCadre) setTargetCadre('UPSC');
    if (!designation) setDesignation('Teacher');
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
        currentDesignation: designation || 'Teacher',
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
          topicStats: {}, // Initialize empty map for the 208 topics
        },
      });

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
      <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
      <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
      <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
      <View style={[styles.stepLine, step >= 3 && styles.stepLineActive]} />
      <View style={[styles.stepDot, step >= 3 && styles.stepDotActive]} />
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar style="light" />
      <LinearGradient
        colors={['#4A90E2', '#357ABD', '#2B6CB0']}
        style={styles.headerGradient}
      >
        <View style={styles.headerTop}>
          {step > 1 ? (
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 24 }} />
          )}
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.logoContainer}>
          <Text style={styles.brandName}>
            {step === 1 ? 'Welcome!' : step === 2 ? 'Your Background' : 'Personalize'}
          </Text>
          <Text style={styles.brandTagline}>
            {step === 1 && 'Let\'s get your profile set up.'}
            {step === 2 && 'Help us understand your experience.'}
            {step === 3 && 'Tailor your learning journey.'}
          </Text>
          {renderStepIndicator()}
        </View>
      </LinearGradient>

      <View style={styles.formCard}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* STEP 1: Identity */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarText}>
                  {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
                </Text>
                <TouchableOpacity style={styles.avatarEditButton}>
                  <User size={14} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.section}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Full Name</Text>
                </View>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your full name"
                    placeholderTextColor="#A0AEC0"
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                    textContentType="name"
                  />
                </View>
              </View>

              <View style={styles.section}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Preferred Language</Text>
                </View>
                <View style={styles.rowChoices}>
                  {['English', 'Hindi'].map((lang) => (
                    <TouchableOpacity
                      key={lang}
                      style={[styles.choiceBox, language === lang && styles.choiceBoxActive]}
                      onPress={() => setLanguage(lang as any)}
                    >
                      {language === lang && <CheckCircle2 size={16} color="#4A90E2" style={{ marginRight: 6 }} />}
                      <Text style={[styles.choiceText, language === lang && styles.choiceTextActive]}>{lang}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.helperText}>You can always change this later in settings.</Text>
              </View>
            </View>
          )}

          {/* STEP 2: Context */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              <View style={styles.section}>
                <View style={styles.labelRow}>
                  <Target size={18} color="#4A90E2" />
                  <Text style={styles.label}>Target Cadre</Text>
                </View>
                <View style={styles.chipsContainer}>
                  {CADRES.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.chip, targetCadre === c && styles.chipSelected]}
                      onPress={() => setTargetCadre(c)}
                    >
                      <Text style={[styles.chipText, targetCadre === c && styles.chipTextSelected]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.section}>
                <View style={styles.labelRow}>
                  <Briefcase size={18} color="#4A90E2" />
                  <Text style={styles.label}>Current Designation</Text>
                </View>
                {DESIGNATIONS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.radioOption, designation === d && styles.radioOptionSelected]}
                    onPress={() => setDesignation(d)}
                  >
                    <View style={[styles.radioCircle, designation === d && styles.radioCircleActive]}>
                      {designation === d && <View style={styles.radioCircleSelected} />}
                    </View>
                    <Text style={[styles.radioLabel, designation === d && styles.radioLabelSelected]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* STEP 3: Goals */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <View style={styles.section}>
                <View style={styles.labelRow}>
                  <BookOpen size={18} color="#4A90E2" />
                  <Text style={styles.label}>Which area do you find most difficult?</Text>
                </View>
                <Text style={styles.helperText}>We'll prioritize these topics in your diagnostic test.</Text>
                {TOPICS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.radioOption, weakestSubject === t && styles.radioOptionSelected]}
                    onPress={() => setWeakestSubject(t)}
                  >
                    <View style={[styles.radioCircle, weakestSubject === t && styles.radioCircleActive]}>
                      {weakestSubject === t && <View style={styles.radioCircleSelected} />}
                    </View>
                    <Text style={[styles.radioLabel, weakestSubject === t && styles.radioLabelSelected]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.section}>
                <TouchableOpacity 
                  style={[styles.radioOption, { marginTop: 12, paddingVertical: 20 }]}
                  onPress={() => setNotifications(!notifications)}
                >
                  <Bell size={24} color={notifications ? "#4A90E2" : "#A0AEC0"} style={{ marginRight: 16 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.radioLabel, notifications && styles.radioLabelSelected]}>
                      Practice Reminders
                    </Text>
                    <Text style={styles.helperText}>Allow push notifications to keep your streak alive.</Text>
                  </View>
                  <View style={[styles.toggleBase, notifications && styles.toggleActive]}>
                     <View style={[styles.toggleKnob, notifications && styles.toggleKnobActive]} />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={step === 3 ? saveProfile : handleNext}
              disabled={loading}
            >
              <LinearGradient
                colors={loading ? ['#A0AEC0', '#A0AEC0'] : ['#4A90E2', '#357ABD']}
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
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4A90E2',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 40,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  backButton: {
    padding: 4,
  },
  skipText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '600',
    padding: 4,
  },
  logoContainer: {
    alignItems: 'center',
  },
  brandName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  brandTagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 24,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  stepDotActive: {
    backgroundColor: '#fff',
    transform: [{ scale: 1.2 }],
  },
  stepLine: {
    width: 30,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  stepLineActive: {
    backgroundColor: '#fff',
  },
  formCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    paddingTop: 32,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    flexGrow: 1,
  },
  stepContainer: {
    flex: 1,
  },
  avatarLarge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#EBF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 32,
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#4A90E2',
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#4A90E2',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  section: {
    marginBottom: 28,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A202C',
  },
  helperText: {
    fontSize: 13,
    color: '#A0AEC0',
    marginBottom: 12,
    lineHeight: 18,
  },
  inputWrapper: {
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    height: 54,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
    color: '#1A202C',
    paddingVertical: 0,
  },
  rowChoices: {
    flexDirection: 'row',
    gap: 12,
  },
  choiceBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 12,
    backgroundColor: '#F7FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  choiceBoxActive: {
    backgroundColor: '#EBF5FF',
    borderColor: '#4A90E2',
  },
  choiceText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#718096',
  },
  choiceTextActive: {
    color: '#4A90E2',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  chipSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  chipText: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F7FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  radioOptionSelected: {
    backgroundColor: '#EBF5FF',
    borderColor: '#4A90E2',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  radioCircleActive: {
    borderColor: '#4A90E2',
  },
  radioCircleSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4A90E2',
  },
  radioLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3748',
  },
  radioLabelSelected: {
    color: '#4A90E2',
  },
  toggleBase: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#4A90E2',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
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
    marginTop: 'auto',
    paddingTop: 16,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
