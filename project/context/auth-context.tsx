import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/services/firebaseConfig';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { useRouter, useSegments, useRootNavigationState } from 'expo-router';
import UserService from '@/services/user-service';
import AuthPromptModal from '@/components/AuthPromptModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface AuthPromptOptions {
  title?: string;
  subtitle?: string;
  feature?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isSubscribed: boolean;
  isSubscriptionLoading: boolean;
  refreshSubscription: () => Promise<boolean>;
  requireAuth: (callback: () => void, options?: AuthPromptOptions) => void;
  showAuthPrompt: (options?: AuthPromptOptions) => void;
  hideAuthPrompt: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isSubscribed: false,
  isSubscriptionLoading: true,
  refreshSubscription: async () => false,
  requireAuth: (cb) => cb(),
  showAuthPrompt: () => {},
  hideAuthPrompt: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const [authPrompt, setAuthPrompt] = useState<{
    visible: boolean;
    title?: string;
    subtitle?: string;
    feature?: string;
  }>({ visible: false });

  const showAuthPrompt = React.useCallback((options?: AuthPromptOptions) => {
    setAuthPrompt({
      visible: true,
      title: options?.title,
      subtitle: options?.subtitle,
      feature: options?.feature,
    });
  }, []);

  const hideAuthPrompt = React.useCallback(() => {
    setAuthPrompt(prev => ({ ...prev, visible: false }));
  }, []);

  const requireAuth = React.useCallback((callback: () => void, options?: AuthPromptOptions) => {
    if (user) {
      callback();
    } else {
      showAuthPrompt(options);
    }
  }, [user, showAuthPrompt]);


  const refreshSubscription = async (targetUid?: string): Promise<boolean> => {
    const uid = targetUid || auth.currentUser?.uid;
    if (!uid) {
      setIsSubscribed(false);
      setIsSubscriptionLoading(false);
      return false;
    }
    try {
      setIsSubscriptionLoading(true);
      const profile = await UserService.getUserProfile(uid);
      const subscribed = profile?.isSubscribed === true;
      setIsSubscribed(subscribed);
      return subscribed;
    } catch (e) {
      console.error('Error refreshing subscription in AuthContext:', e);
      return false;
    } finally {
      setIsSubscriptionLoading(false);
    }
  };

  useEffect(() => {
    let unsubSub = () => {};

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      unsubSub();
      setUser(authUser);

      if (authUser) {
        setIsSubscriptionLoading(true);

        // Parallel verification with backend
        fetch(`${API_BASE_URL}/payment/subscription-status/${authUser.uid}`)
          .then(r => r.json())
          .then(bData => {
            if (bData?.isSubscribed) {
              setIsSubscribed(true);
              AsyncStorage.setItem(`@user_subscribed_${authUser.uid}`, 'true').catch(() => {});
            }
          })
          .catch(() => {});

        // Realtime listener: updates instantly when backend writes status.
        // Route changes NEVER trigger a database read!
        unsubSub = onSnapshot(
          doc(db, 'subscriptions', authUser.uid),
          (snap) => {
            const d = snap.data();
            const periodEnd = d?.currentPeriodEnd?.toMillis
              ? d.currentPeriodEnd.toMillis()
              : d?.currentPeriodEnd;
            const isPeriodValid = !periodEnd || periodEnd > Date.now();
            const active =
              (d?.status === 'active' || d?.isSubscribed === true) && isPeriodValid;

            if (snap.exists() && active) {
              setIsSubscribed(true);
              setIsSubscriptionLoading(false);
              setIsLoading(false);
            } else {
              // Backward compatibility check with users/{uid}
              getDoc(doc(db, 'users', authUser.uid))
                .then((uSnap) => {
                  const uData = uSnap.data();
                  setIsSubscribed(uData?.isSubscribed === true);
                })
                .catch(() => {
                  setIsSubscribed(false);
                })
                .finally(() => {
                  setIsSubscriptionLoading(false);
                  setIsLoading(false);
                });
            }
          },
          (err) => {
            console.error('Error in subscriptions realtime listener:', err);
            setIsSubscribed(false);
            setIsSubscriptionLoading(false);
            setIsLoading(false);
          }
        );
      } else {
        setIsSubscribed(false);
        setIsSubscriptionLoading(false);
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribe();
      unsubSub();
    };
  }, []);

  useEffect(() => {
    if (isLoading || !rootNavigationState?.key) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && inAuthGroup) {
      // User is already on an auth page (login/signup)
      return;
    } else if (!user && !inAuthGroup) {
      // Allow guest user to explore home, tests, and preview features!
      // Only redirect if specifically navigating to profile setup
      if (segments.includes('profile-setup')) {
        router.replace('/login');
      }
      return;
    } else if (user && inAuthGroup) {
      // Check if user has completed profile
      const checkProfile = async () => {
        const hasProfile = await UserService.hasCompletedProfile(user.uid);
        if (!hasProfile && !segments.includes('profile-setup')) {
          router.replace('/profile-setup');
        } else if (hasProfile) {
          router.replace('/');
        }
      };
      checkProfile();
    } else if (user && !inAuthGroup) {
      // Also check profile for users who just signed in via Google (they land on main app)
      const checkProfile = async () => {
        const hasProfile = await UserService.hasCompletedProfile(user.uid);
        if (!hasProfile) {
          router.replace('/profile-setup');
        }
      };
      checkProfile();
    }
  }, [user, segments, isLoading, rootNavigationState?.key]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isSubscribed,
        isSubscriptionLoading,
        refreshSubscription,
        requireAuth,
        showAuthPrompt,
        hideAuthPrompt,
      }}
    >
      {children}
      <AuthPromptModal
        visible={authPrompt.visible}
        onClose={hideAuthPrompt}
        title={authPrompt.title}
        subtitle={authPrompt.subtitle}
        feature={authPrompt.feature}
      />
    </AuthContext.Provider>
  );
}
