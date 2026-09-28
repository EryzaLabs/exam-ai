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
} from 'react-native';
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithCredential, PhoneAuthProvider } from 'firebase/auth';
import { auth, firebaseConfig } from '@/services/firebaseConfig';
import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { Mail, Lock, Eye, EyeOff, ArrowRight, GraduationCap, User, Phone, Chrome } from 'lucide-react-native';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';

WebBrowser.maybeCompleteAuthSession();

export default function SignupScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const router = useRouter();

  // Mode state
  const [signupMode, setSignupMode] = useState<'email' | 'phone'>('email');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const recaptchaVerifier = React.useRef(null);

  // Refs for input chaining
  const emailRef = React.useRef<TextInput>(null);
  const passwordRef = React.useRef<TextInput>(null);
  const confirmPasswordRef = React.useRef<TextInput>(null);

  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    setPasswordMismatch(text.length > 0 && password.length > 0 && text !== password);
  };

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '70133368788-u3k4o6hglldr2n7dgt9ofbe21ro9scbj.apps.googleusercontent.com',
    iosClientId: process.env.EXPO_PUBLIC_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_ANDROID_CLIENT_ID || '70133368788-g0633ns48s31sl503vbdi67vjavt697g.apps.googleusercontent.com',
    redirectUri: makeRedirectUri({ scheme: 'myapp' }),
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      setLoading(true);
      signInWithCredential(auth, credential)
        .catch((error) => {
          Alert.alert('Google Sign-In Error', error.message);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [response]);

  const handleSignup = async () => {
    const trimmedEmail = email.trim();
    const trimmedName = fullName.trim();

    if (!trimmedName) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    if (!trimmedEmail || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      
      // Set display name immediately so profile-setup can pre-fill
      await updateProfile(userCredential.user, {
        displayName: trimmedName,
      });

      // Context will auto-route to profile-setup
    } catch (error: any) {
      let message = 'An unknown error occurred.';
      switch (error.code) {
        case 'auth/email-already-in-use':
          message = 'That email address is already in use!';
          break;
        case 'auth/invalid-email':
          message = 'Invalid email address.';
          break;
        case 'auth/weak-password':
          message = 'Password should be at least 6 characters.';
          break;
        case 'auth/network-request-failed':
          message = 'Network error. Please check your internet connection.';
          break;
        case 'auth/too-many-requests':
          message = 'Too many attempts. Please try again later.';
          break;
      }
      Alert.alert('Signup Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const sendVerification = async () => {
    const trimmedPhone = phoneNumber.trim();
    if (!trimmedPhone) {
      Alert.alert('Error', 'Please enter a valid phone number with country code (e.g. +91...)');
      return;
    }
    setLoading(true);
    try {
      const phoneProvider = new PhoneAuthProvider(auth);
      const vid = await phoneProvider.verifyPhoneNumber(
        trimmedPhone,
        recaptchaVerifier.current!
      );
      setVerificationId(vid);
      setResendTimer(30);
      Alert.alert('Code Sent', 'Please check your phone for the verification code.');
    } catch (err: any) {
      let message = err.message || 'Phone authentication failed.';
      if (err.code === 'auth/too-many-requests') message = 'Too many attempts. Please try again later.';
      if (err.code === 'auth/invalid-phone-number') message = 'Invalid phone number format. Include country code (e.g. +91).';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const confirmCode = async () => {
    const trimmedCode = verificationCode.trim();
    if (!trimmedCode || !verificationId) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }
    setLoading(true);
    try {
      const credential = PhoneAuthProvider.credential(verificationId, trimmedCode);
      await signInWithCredential(auth, credential);
    } catch (err: any) {
      let message = 'Invalid code. Please try again.';
      if (err.code === 'auth/invalid-verification-code') message = 'The verification code is incorrect.';
      if (err.code === 'auth/code-expired') message = 'Code expired. Please request a new one.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

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
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <GraduationCap size={32} color="#4A90E2" />
          </View>
          <Text style={styles.brandName}>UPSC Principal</Text>
          <Text style={styles.brandTagline}>Your journey to success starts here</Text>
        </View>
      </LinearGradient>

      <View style={styles.formCard}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.formTitle}>Create Account</Text>
          <Text style={styles.formSubtitle}>Sign up to begin your preparation</Text>

          {/* Mode Switcher */}
          <View style={styles.modeSwitchContainer}>
            <TouchableOpacity
              style={[styles.modeButton, signupMode === 'email' && styles.modeButtonActive]}
              onPress={() => setSignupMode('email')}
              accessibilityRole="button"
            >
              <Mail size={18} color={signupMode === 'email' ? '#fff' : '#718096'} />
              <Text style={[styles.modeButtonText, signupMode === 'email' && styles.modeButtonTextActive]}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, signupMode === 'phone' && styles.modeButtonActive]}
              onPress={() => setSignupMode('phone')}
              accessibilityRole="button"
            >
              <Phone size={18} color={signupMode === 'phone' ? '#fff' : '#718096'} />
              <Text style={[styles.modeButtonText, signupMode === 'phone' && styles.modeButtonTextActive]}>Phone</Text>
            </TouchableOpacity>
          </View>

          {signupMode === 'email' ? (
            <>
              {/* Full Name */}
              <View style={styles.inputWrapper}>
                <View style={styles.inputIconContainer}>
                  <User size={20} color="#8E8E93" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Full name"
                  placeholderTextColor="#A0AEC0"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  textContentType="name"
                  autoComplete="name"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => emailRef.current?.focus()}
                  accessibilityLabel="Full name"
                />
              </View>

              {/* Email */}
              <View style={styles.inputWrapper}>
                <View style={styles.inputIconContainer}>
                  <Mail size={20} color="#8E8E93" />
                </View>
                <TextInput
                  ref={emailRef}
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor="#A0AEC0"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  accessibilityLabel="Email address"
                />
              </View>

              {/* Password */}
              <View style={styles.inputWrapper}>
                <View style={styles.inputIconContainer}>
                  <Lock size={20} color="#8E8E93" />
                </View>
                <TextInput
                  ref={passwordRef}
                  style={styles.input}
                  placeholder="Create password"
                  placeholderTextColor="#A0AEC0"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  textContentType="newPassword"
                  autoComplete="password-new"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                  accessibilityLabel="Create password"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  accessibilityRole="button"
                >
                  {showPassword ? <EyeOff size={20} color="#8E8E93" /> : <Eye size={20} color="#8E8E93" />}
                </TouchableOpacity>
              </View>

              {/* Confirm Password */}
              <View style={[styles.inputWrapper, passwordMismatch && styles.inputWrapperError]}>
                <View style={styles.inputIconContainer}>
                  <Lock size={20} color={passwordMismatch ? '#F56565' : '#8E8E93'} />
                </View>
                <TextInput
                  ref={confirmPasswordRef}
                  style={styles.input}
                  placeholder="Confirm password"
                  placeholderTextColor="#A0AEC0"
                  value={confirmPassword}
                  onChangeText={handleConfirmPasswordChange}
                  secureTextEntry={!showConfirmPassword}
                  textContentType="newPassword"
                  autoComplete="password-new"
                  returnKeyType="done"
                  onSubmitEditing={handleSignup}
                  accessibilityLabel="Confirm password"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
                  accessibilityRole="button"
                >
                  {showConfirmPassword ? <EyeOff size={20} color="#8E8E93" /> : <Eye size={20} color="#8E8E93" />}
                </TouchableOpacity>
              </View>
              {passwordMismatch && (
                <Text style={styles.errorText}>Passwords do not match</Text>
              )}

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                onPress={handleSignup}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Create account"
              >
                <LinearGradient
                  colors={loading ? ['#A0AEC0', '#A0AEC0'] : ['#4A90E2', '#357ABD']}
                  style={styles.primaryGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.primaryButtonText}>Create Account</Text>
                      <ArrowRight size={20} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {!verificationId ? (
                <>
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputIconContainer}>
                      <Phone size={20} color="#8E8E93" />
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="+91 99999 99999"
                      placeholderTextColor="#A0AEC0"
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      keyboardType="phone-pad"
                      textContentType="telephoneNumber"
                      autoComplete="tel"
                      returnKeyType="done"
                      onSubmitEditing={sendVerification}
                      accessibilityLabel="Phone number with country code"
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                    onPress={sendVerification}
                    disabled={loading}
                    accessibilityRole="button"
                  >
                    <LinearGradient
                      colors={loading ? ['#A0AEC0', '#A0AEC0'] : ['#4A90E2', '#357ABD']}
                      style={styles.primaryGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Text style={styles.primaryButtonText}>Send Code</Text>
                          <ArrowRight size={20} color="#fff" />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputIconContainer}>
                      <Lock size={20} color="#8E8E93" />
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter 6-digit code"
                      placeholderTextColor="#A0AEC0"
                      value={verificationCode}
                      onChangeText={setVerificationCode}
                      keyboardType="number-pad"
                      returnKeyType="done"
                      onSubmitEditing={confirmCode}
                      accessibilityLabel="Verification code"
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                    onPress={confirmCode}
                    disabled={loading}
                    accessibilityRole="button"
                  >
                    <LinearGradient
                      colors={loading ? ['#A0AEC0', '#A0AEC0'] : ['#4A90E2', '#357ABD']}
                      style={styles.primaryGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Text style={styles.primaryButtonText}>Verify & Continue</Text>
                          <ArrowRight size={20} color="#fff" />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <View style={styles.phoneActionRow}>
                    <TouchableOpacity
                      onPress={() => { setVerificationId(''); setVerificationCode(''); setResendTimer(0); }}
                      style={styles.textButton}
                      accessibilityRole="button"
                    >
                      <Text style={styles.textButtonLabel}>Change Number</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={sendVerification}
                      disabled={resendTimer > 0 || loading}
                      style={styles.textButton}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.textButtonLabel, resendTimer > 0 && { color: '#A0AEC0' }]}>
                        {resendTimer > 0 ? `Resend Code (${resendTimer}s)` : 'Resend Code'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </>
          )}

          <FirebaseRecaptchaVerifierModal
            ref={recaptchaVerifier}
            firebaseConfig={firebaseConfig}
            attemptInvisibleVerification={true}
          />

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.googleButton}
            onPress={() => promptAsync()}
            disabled={!request || loading}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
          >
            <Chrome size={20} color="#4285F4" style={{ marginRight: 10 }} />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <Text style={styles.termsText}>
            By creating an account, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/login" asChild>
              <TouchableOpacity>
                <Text style={styles.linkText}>Sign In</Text>
              </TouchableOpacity>
            </Link>
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
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 40,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  brandName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  brandTagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  formCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  formTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 15,
    color: '#718096',
    marginBottom: 24,
  },
  modeSwitchContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  modeButtonActive: {
    backgroundColor: '#4A90E2',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    height: 54,
  },
  inputWrapperError: {
    borderColor: '#F56565',
    backgroundColor: '#FFF5F5',
  },
  inputIconContainer: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1A202C',
    paddingVertical: 0,
  },
  eyeButton: {
    padding: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#F56565',
    marginTop: -10,
    marginBottom: 12,
    marginLeft: 4,
  },
  primaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 4,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  phoneActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingHorizontal: 8,
  },
  textButton: {
    padding: 4,
  },
  textButtonLabel: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#A0AEC0',
    fontSize: 13,
    fontWeight: '600',
  },
  googleButton: {
    height: 54,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    color: '#1A202C',
    fontSize: 16,
    fontWeight: '600',
  },
  termsText: {
    fontSize: 12,
    color: '#A0AEC0',
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
  },
  termsLink: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#718096',
    fontSize: 15,
  },
  linkText: {
    color: '#4A90E2',
    fontSize: 15,
    fontWeight: '700',
  },
});
