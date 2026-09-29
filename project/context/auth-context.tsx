import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/services/firebaseConfig';
import { useRouter, useSegments } from 'expo-router';
import UserService from '@/services/user-service';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to the login page if the user is not signed in
      router.replace('/login');
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
  }, [user, segments, isLoading]);

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
