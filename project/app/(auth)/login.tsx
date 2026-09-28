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
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential, PhoneAuthProvider, sendPasswordResetEmail } from 'firebase/auth';
import { auth, firebaseConfig } from '@/services/firebaseConfig';
import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { Mail, Lock, Eye, EyeOff, ArrowRight, GraduationCap, Phone, Chrome } from 'lucide-react-native';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // Phone Auth State
  const [loginMode, setLoginMode] = useState<'email' | 'phone'>('email');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const recaptchaVerifier = React.useRef(null);

  // Input refs for keyboard chaining
  const passwordRef = React.useRef<TextInput>(null);

  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

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
      setResendTimer(30); // 30 second cooldown
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

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert('Forgot Password', 'Please enter your email address first.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      Alert.alert('Email Sent', 'Password reset instructions have been sent to your email.');
    } catch (error: any) {
      let message = 'Failed to send reset email.';
      if (error.code === 'auth/user-not-found') message = 'No account found with this email.';
      if (error.code === 'auth/invalid-email') message = 'Invalid email address.';
      Alert.alert('Error', message);
    }
  };

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password;

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
    } catch (error: any) {
      let message = 'An unknown error occurred.';
      switch (error.code) {
        case 'auth/invalid-email':
          message = 'Invalid email address.';
          break;
        case 'auth/user-not-found':
          message = 'No account found with this email.';
          break;
        case 'auth/wrong-password':
          message = 'Incorrect password.';
          break;
        case 'auth/invalid-credential':
          message = 'Invalid email or password.';
          break;
        case 'auth/user-disabled':
          message = 'This account has been disabled.';
          break;
        case 'auth/network-request-failed':
          message = 'Network error. Please check your internet connection and try again.';
          break;
        case 'auth/too-many-requests':
          message = 'Too many failed attempts. Please try again later.';
          break;
      }
      Alert.alert('Login Failed', message);
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
          <Text style={styles.brandTagline}>Ace your exam with confidence</Text>
        </View>
      </LinearGradient>

      <View style={styles.formCard}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.formTitle}>Welcome Back</Text>
          <Text style={styles.formSubtitle}>Sign in to continue your progress</Text>

          {/* Mode Switcher */}
          <View style={styles.modeSwitchContainer}>
            <TouchableOpacity
              style={[styles.modeButton, loginMode === 'email' && styles.modeButtonActive]}
              onPress={() => setLoginMode('email')}
              accessibilityRole="button"
              accessibilityLabel="Sign in with email"
            >
              <Mail size={18} color={loginMode === 'email' ? '#fff' : '#718096'} />
              <Text style={[styles.modeButtonText, loginMode === 'email' && styles.modeButtonTextActive]}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, loginMode === 'phone' && styles.modeButtonActive]}
              onPress={() => setLoginMode('phone')}
              accessibilityRole="button"
              accessibilityLabel="Sign in with phone"
            >
              <Phone size={18} color={loginMode === 'phone' ? '#fff' : '#718096'} />
              <Text style={[styles.modeButtonText, loginMode === 'phone' && styles.modeButtonTextActive]}>Phone</Text>
            </TouchableOpacity>
          </View>

          {loginMode === 'email' ? (
            <>
              <View style={styles.inputWrapper}>
                <View style={styles.inputIconContainer}>
                  <Mail size={20} color="#8E8E93" />
                </View>
                <TextInput
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

              <View style={styles.inputWrapper}>
                <View style={styles.inputIconContainer}>
                  <Lock size={20} color="#8E8E93" />
                </View>
                <TextInput
                  ref={passwordRef}
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#A0AEC0"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  textContentType="password"
                  autoComplete="password"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  accessibilityLabel="Password"
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

              <View style={styles.forgotPasswordContainer}>
                <TouchableOpacity onPress={handleForgotPassword}>
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                onPress={handleLogin}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Sign in"
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
                      <Text style={styles.primaryButtonText}>Sign In</Text>
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
                          <Text style={styles.primaryButtonText}>Verify & Sign In</Text>
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

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/signup" asChild>
              <TouchableOpacity>
                <Text style={styles.linkText}>Sign Up</Text>
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
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 16,
    marginTop: -4,
  },
  forgotPasswordText: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '600',
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
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
