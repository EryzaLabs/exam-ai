import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/services/firebaseConfig';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';

export interface SubscriptionState {
  loading: boolean;
  user: User | null;
  isSubscribed: boolean;
  subscriptionData?: any;
}

const SubscriptionContext = createContext<SubscriptionState>({
  loading: true,
  user: null,
  isSubscribed: false,
});

/**
 * SubscriptionProvider
 * Fetches subscription ONCE at app root and maintains a realtime Firestore listener.
 * Route changes NEVER trigger a database read.
 * Automatically updates when backend writes subscription status.
 */
export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SubscriptionState>({
    loading: true,
    user: null,
    isSubscribed: false,
  });

  useEffect(() => {
    let unsubSub = () => {};
    let unsubUser = () => {};

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubSub();
      unsubUser();

      if (!user) {
        return setState({ loading: false, user: null, isSubscribed: false });
      }

      // Realtime listener on subscriptions/{uid}:
      // Updates instantly when backend webhook or verify writes status.
      // Route changes NEVER trigger a read!
      unsubSub = onSnapshot(
        doc(db, 'subscriptions', user.uid),
        (snap) => {
          const d = snap.data();
          const periodEnd = d?.currentPeriodEnd?.toMillis
            ? d.currentPeriodEnd.toMillis()
            : d?.currentPeriodEnd;
          const isPeriodValid = !periodEnd || periodEnd > Date.now();
          const active =
            (d?.status === 'active' || d?.isSubscribed === true) && isPeriodValid;

          if (snap.exists() && active) {
            setState({
              loading: false,
              user,
              isSubscribed: true,
              subscriptionData: d,
            });
          } else {
            // Also listen to users/{uid} for backward compatibility
            unsubUser = onSnapshot(
              doc(db, 'users', user.uid),
              (userSnap) => {
                const uData = userSnap.data();
                const isUserSubscribed = uData?.isSubscribed === true;
                setState((prev) => ({
                  loading: false,
                  user,
                  isSubscribed: prev.isSubscribed || isUserSubscribed,
                  subscriptionData: prev.subscriptionData || uData,
                }));
              },
              (err) => {
                console.error('[SubscriptionProvider] users listener error:', err);
                setState((prev) => ({ ...prev, loading: false }));
              }
            );
          }
        },
        (err) => {
          console.error('[SubscriptionProvider] subscriptions listener error:', err);
          setState((prev) => ({ ...prev, loading: false }));
        }
      );
    });

    return () => {
      unsubAuth();
      unsubSub();
      unsubUser();
    };
  }, []);

  return (
    <SubscriptionContext.Provider value={state}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSub = () => useContext(SubscriptionContext);

/**
 * SubscribedRoute
 * Protected route wrapper that gates premium content based on subscription state.
 */
export function SubscribedRoute({ children }: { children: React.ReactNode }) {
  const { loading, user, isSubscribed } = useSub();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.text}>Verifying access pass...</Text>
      </View>
    );
  }

  if (!user) {
    router.replace('/login');
    return null;
  }

  if (!isSubscribed) {
    router.replace('/premium');
    return null;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 24,
  },
  text: {
    marginTop: 12,
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
});
