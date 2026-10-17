import React, { useState, useRef, useEffect } from 'react';
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
  Image,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
} from 'firebase/auth';
import { auth } from '@/services/firebaseConfig';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Eye, EyeOff } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import Svg, { Path } from 'react-native-svg';

WebBrowser.maybeCompleteAuthSession();

function GoogleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <Path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <Path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <Path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </Svg>
  );
}

const proof = [
  {
    initials: 'JD',
    src: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80',
  },
  {
    initials: 'MK',
    src: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80',
  },
  {
    initials: 'AR',
    src: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&h=120&q=80',
  },
];

export default function SignupScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  // Native Google Auth Session
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
          showAlert('Google Sign-In Error', error.message);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [response]);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      if (Platform.OS === 'web') {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await signInWithPopup(auth, provider);
      } else {
        if (request) {
          await promptAsync();
        } else {
          showAlert('Google Sign-In', 'Google Sign-In is initializing, please try again.');
        }
      }
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        showAlert('Google Sign-In Error', error.message || 'Failed to sign in with Google');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      showAlert('Error', 'Please enter your full name');
      return;
    }

    if (!trimmedEmail || !password || !confirmPassword) {
      showAlert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      showAlert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      showAlert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      await updateProfile(userCredential.user, {
        displayName: trimmedName,
      });
    } catch (error: any) {
      let message = 'An unknown error occurred.';
      switch (error.code) {
        case 'auth/email-already-in-use':
          message = 'That email address is already registered!';
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
        default:
          message = error.message || message;
      }
      showAlert('Signup Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDesktop ? '#F1F5F9' : '#FFFFFF' }]} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollWrapper,
            isDesktop ? styles.scrollWrapperDesktop : styles.scrollWrapperMobile,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.card, isDesktop ? styles.cardDesktop : styles.cardMobile]}>
            {/* Desktop Left Hero Banner */}
            {isDesktop && (
              <LinearGradient
                colors={['#1E3A8A', '#1E40AF', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.heroBanner}
              >
                <View style={styles.blurOrb} />

                {/* Brand Header */}
                <View style={styles.brandBadge}>
                  <View style={styles.brandIconBox}>
                    <View style={styles.brandDiamond} />
                  </View>
                  <Text style={styles.brandText}>Exam AI</Text>
                </View>

                {/* Hero Headline */}
                <View style={styles.headlineContainer}>
                  <Text style={styles.heroHeadline}>
                    Start your journey to top rank today.
                  </Text>
                </View>

                {/* Social Proof */}
                <View style={styles.proofContainer}>
                  <View style={styles.proofAvatars}>
                    {proof.map((p, index) => (
                      <Image
                        key={p.initials}
                        source={{ uri: p.src }}
                        style={[
                          styles.proofAvatar,
                          { zIndex: proof.length - index, marginLeft: index === 0 ? 0 : -8 },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={styles.proofText}>Join 40,000+ aspirants on Exam AI</Text>
                </View>
              </LinearGradient>
            )}

            {/* Form Section */}
            <View style={[styles.formPanel, isDesktop ? styles.formPanelDesktop : styles.formPanelMobile]}>
              {/* Mobile Brand Header */}
              {!isDesktop && (
                <View style={styles.mobileBrandHeader}>
                  <View style={styles.brandIconBoxMobile}>
                    <View style={styles.brandDiamondMobile} />
                  </View>
                  <Text style={styles.brandTextMobile}>Exam AI</Text>
                </View>
              )}

              <View style={styles.formHeader}>
                <Text style={styles.title}>Create an account</Text>
                <Text style={styles.subtitle}>
                  Get access to full mock tests and detailed analytics.
                </Text>
              </View>

              {/* Google Sign In Button */}
              <TouchableOpacity
                style={styles.googleButton}
                onPress={handleGoogleSignIn}
                disabled={loading}
                activeOpacity={0.8}
              >
                <GoogleIcon />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.formFields}>
                {/* Full Name */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Full Name</Text>
                  <View style={styles.inputBox}>
                    <TextInput
                      style={styles.input}
                      placeholder="Jane Doe"
                      placeholderTextColor="#94A3B8"
                      value={fullName}
                      onChangeText={setFullName}
                      autoCapitalize="words"
                      autoComplete="name"
                      returnKeyType="next"
                      onSubmitEditing={() => emailRef.current?.focus()}
                    />
                  </View>
                </View>

                {/* Email Field */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Email</Text>
                  <View style={styles.inputBox}>
                    <TextInput
                      ref={emailRef}
                      style={styles.input}
                      placeholder="you@example.com"
                      placeholderTextColor="#94A3B8"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoComplete="email"
                      returnKeyType="next"
                      onSubmitEditing={() => passwordRef.current?.focus()}
                    />
                  </View>
                </View>

                {/* Password Field */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputBox}>
                    <TextInput
                      ref={passwordRef}
                      style={styles.input}
                      placeholder="At least 6 characters"
                      placeholderTextColor="#94A3B8"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoComplete="new-password"
                      returnKeyType="next"
                      onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                    />
                    <TouchableOpacity
                      style={styles.eyeBtn}
                      onPress={() => setShowPassword(!showPassword)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {showPassword ? (
                        <EyeOff size={18} color="#94A3B8" />
                      ) : (
                        <Eye size={18} color="#94A3B8" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm Password Field */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <View style={styles.inputBox}>
                    <TextInput
                      ref={confirmPasswordRef}
                      style={styles.input}
                      placeholder="Re-enter password"
                      placeholderTextColor="#94A3B8"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoComplete="new-password"
                      returnKeyType="done"
                      onSubmitEditing={handleSignup}
                    />
                    <TouchableOpacity
                      style={styles.eyeBtn}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} color="#94A3B8" />
                      ) : (
                        <Eye size={18} color="#94A3B8" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.buttonDisabled]}
                  onPress={handleSignup}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Create account</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Switcher to Sign In */}
              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/login')}>
                  <Text style={styles.footerLink}>Sign in</Text>
                </TouchableOpacity>
              </View>

              {/* Explore as Guest */}
              <TouchableOpacity
                style={{ marginTop: 16, alignItems: 'center', paddingVertical: 6 }}
                onPress={() => router.replace('/')}
              >
                <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '600' }}>← Explore Astra Exam AI as Guest</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollWrapper: {
    flexGrow: 1,
  },
  scrollWrapperDesktop: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scrollWrapperMobile: {
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  card: {
    width: '100%',
  },
  cardDesktop: {
    maxWidth: 880,
    flexDirection: 'row',
    minHeight: 560,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardMobile: {
    maxWidth: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  // Hero Banner (Desktop Only)
  heroBanner: {
    flex: 0.9,
    padding: 36,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  blurOrb: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandDiamond: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
  },
  brandText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headlineContainer: {
    marginVertical: 32,
  },
  heroHeadline: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  proofContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  proofAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  proofAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#1E3A8A',
  },
  proofText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
  },
  // Mobile Brand Header
  mobileBrandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  brandIconBoxMobile: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  brandDiamondMobile: {
    width: 13,
    height: 13,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
  },
  brandTextMobile: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  // Form Panel
  formPanel: {
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  formPanelDesktop: {
    flex: 1.1,
    padding: 40,
  },
  formPanelMobile: {
    width: '100%',
    padding: 0,
  },
  formHeader: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  // Google Button
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  googleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  formFields: {
    gap: 14,
  },
  fieldGroup: {
    gap: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: 6,
  },
  primaryButton: {
    height: 46,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 13,
    color: '#64748B',
  },
  footerLink: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
  },
});
