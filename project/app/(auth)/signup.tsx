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
import { Eye, EyeOff, ArrowLeft } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/context/theme-context';
import { useAuth } from '@/context/auth-context';
import UserService from '@/services/user-service';
import { Button, Card, ThemeToggle } from '@/components/chalkboard';

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

export default function SignupScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();

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

  // If already logged in, redirect home
  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [user]);

  // Native Google Auth Session
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId:
      process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
      '576822389770-t834upk5nngfmtm4v6d64k7tcef6kgrl.apps.googleusercontent.com',
    iosClientId: process.env.EXPO_PUBLIC_IOS_CLIENT_ID,
    androidClientId:
      process.env.EXPO_PUBLIC_ANDROID_CLIENT_ID ||
      '576822389770-t834upk5nngfmtm4v6d64k7tcef6kgrl.apps.googleusercontent.com',
    redirectUri: makeRedirectUri({ scheme: 'myapp' }),
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      setLoading(true);
      signInWithCredential(auth, credential)
        .then(() => {
          router.replace('/');
        })
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
        router.replace('/');
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
    const trimmedPassword = password;
    const trimmedConfirmPassword = confirmPassword;

    if (!trimmedName || !trimmedEmail || !trimmedPassword) {
      showAlert('Error', 'Please fill in all required fields');
      return;
    }

    if (trimmedPassword.length < 6) {
      showAlert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (trimmedPassword !== trimmedConfirmPassword) {
      showAlert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      if (userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: trimmedName,
        });

        // Initialize user profile in Firestore
        await UserService.updateUserProfile({
          displayName: trimmedName,
          email: trimmedEmail,
          targetCadre: 'UPSC',
          currentDesignation: 'Teacher',
          weakestSubject: 'General Financial Rules',
          languagePreference: 'English',
          notificationsEnabled: true,
        }).catch(() => {});
      }
      router.replace('/');
    } catch (error: any) {
      let message = 'An unknown error occurred.';
      switch (error.code) {
        case 'auth/email-already-in-use':
          message = 'An account already exists with this email.';
          break;
        case 'auth/invalid-email':
          message = 'Invalid email address.';
          break;
        case 'auth/weak-password':
          message = 'Password is too weak. Please use at least 6 characters.';
          break;
        case 'auth/network-request-failed':
          message = 'Network error. Please check your internet connection.';
          break;
        default:
          message = error.message || message;
      }
      showAlert('Registration Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Top Nav */}
      <View style={styles.topNav}>
        <TouchableOpacity
          onPress={() => router.push('/')}
          style={[styles.backBtn, { borderColor: colors.line, backgroundColor: colors.surface }]}
          accessibilityLabel="Back to Home"
        >
          <ArrowLeft size={18} color={colors.text} />
          <Text style={[styles.backBtnText, { color: colors.text }]}>Home</Text>
        </TouchableOpacity>
        <ThemeToggle />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Card style={styles.authCard}>
            {/* Header */}
            <View style={styles.headerBox}>
              <View style={styles.brandRow}>
                <Image
                  source={require('@/assets/images/logo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
                <Text style={[styles.brandText, { color: colors.text }]}>ASTRA EXAM AI</Text>
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Create your account</Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>
                Track your rank, sync test attempts, and master weak topics.
              </Text>
            </View>

            {/* Google Signup */}
            <TouchableOpacity
              style={[styles.googleBtn, { backgroundColor: colors.surface2, borderColor: colors.line }]}
              onPress={handleGoogleSignIn}
              disabled={loading}
              activeOpacity={0.8}
            >
              <GoogleIcon />
              <Text style={[styles.googleBtnText, { color: colors.text }]}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.line }]} />
              <Text style={[styles.dividerText, { color: colors.muted }]}>OR WITH EMAIL</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.line }]} />
            </View>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Full Name</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surface2,
                      borderColor: colors.line,
                      color: colors.text,
                    },
                  ]}
                  placeholder="e.g. Rajesh Sharma"
                  placeholderTextColor={colors.muted}
                  value={fullName}
                  onChangeText={setFullName}
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Email Address</Text>
                <TextInput
                  ref={emailRef}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surface2,
                      borderColor: colors.line,
                      color: colors.text,
                    },
                  ]}
                  placeholder="name@example.com"
                  placeholderTextColor={colors.muted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Password</Text>
                <View
                  style={[
                    styles.passwordContainer,
                    {
                      backgroundColor: colors.surface2,
                      borderColor: colors.line,
                    },
                  ]}
                >
                  <TextInput
                    ref={passwordRef}
                    style={[styles.passwordInput, { color: colors.text }]}
                    placeholder="At least 6 characters"
                    placeholderTextColor={colors.muted}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    returnKeyType="next"
                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                    accessibilityLabel="Toggle password visibility"
                  >
                    {showPassword ? (
                      <EyeOff size={18} color={colors.muted} />
                    ) : (
                      <Eye size={18} color={colors.muted} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Confirm Password</Text>
                <View
                  style={[
                    styles.passwordContainer,
                    {
                      backgroundColor: colors.surface2,
                      borderColor: colors.line,
                    },
                  ]}
                >
                  <TextInput
                    ref={confirmPasswordRef}
                    style={[styles.passwordInput, { color: colors.text }]}
                    placeholder="Re-enter password"
                    placeholderTextColor={colors.muted}
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleSignup}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeBtn}
                    accessibilityLabel="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} color={colors.muted} />
                    ) : (
                      <Eye size={18} color={colors.muted} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <Button
                label={loading ? 'Creating account...' : 'Create Account'}
                variant="primary"
                onPress={handleSignup}
                disabled={loading}
                style={{ marginTop: 6 }}
              />
            </View>

            {/* Links */}
            <View style={styles.linksRow}>
              <Text style={[styles.footerText, { color: colors.muted }]}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={[styles.loginLink, { color: colors.text }]}>Log in</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.guestBtn}
              onPress={() => router.push('/')}
              accessibilityLabel="Continue as Guest"
            >
              <Text style={[styles.guestBtnText, { color: colors.muted }]}>
                Continue as guest (try sample tests)
              </Text>
            </TouchableOpacity>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authCard: {
    width: '100%',
    maxWidth: 440,
    padding: 24,
    gap: 18,
  },
  headerBox: {
    gap: 6,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoImage: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  brandText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  title: {
    fontFamily: Platform.select({
      web: "'Newsreader', Georgia, serif",
      default: 'serif',
    }),
    fontSize: 28,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '500',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  form: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13.5,
    fontWeight: '500',
  },
  input: {
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    outlineStyle: 'none',
  } as any,
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 10,
    outlineStyle: 'none',
  } as any,
  eyeBtn: {
    padding: 6,
  },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  footerText: {
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  guestBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  guestBtnText: {
    fontSize: 13.5,
    textDecorationLine: 'underline',
  },
});
