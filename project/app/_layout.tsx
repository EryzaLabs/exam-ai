import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/context/auth-context';
import { SubscriptionProvider } from '@/context/subscription-context';

SplashScreen.preventAutoHideAsync();

import ResponsiveContainer from '@/components/ResponsiveContainer';

export default function RootLayout() {
  useFrameworkReady();
  useFullscreen();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'Astra Exam AI';

      const setMetaTag = (attr: 'name' | 'property', key: string, content: string) => {
        let el = document.querySelector(`meta[${attr}="${key}"]`);
        if (!el) {
          el = document.createElement('meta');
          el.setAttribute(attr, key);
          document.head.appendChild(el);
        }
        el.setAttribute('content', content);
      };

      setMetaTag('name', 'description', 'Astra Exam AI is your all-in-one AI-driven preparation platform for competitive exams. Practice full mocks, analyze your weaknesses, and master your syllabus.');
      setMetaTag('name', 'keywords', 'Astra Exam AI, UPSC, SSC CGL, competitive exams, mock tests, AI study assistant, question bank');
      setMetaTag('name', 'author', 'Eryza Labs');
      setMetaTag('property', 'og:title', 'Astra Exam AI');
      setMetaTag('property', 'og:description', 'Master competitive exams with AI-powered mock tests, performance analytics, and personalized learning.');
      setMetaTag('property', 'og:type', 'website');
      setMetaTag('property', 'og:site_name', 'Astra Exam AI');
      setMetaTag('property', 'twitter:title', 'Astra Exam AI');
      setMetaTag('property', 'twitter:description', 'Master competitive exams with AI-powered mock tests, performance analytics, and personalized learning.');
    }
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
      <SubscriptionProvider>
        <ResponsiveContainer>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="light" backgroundColor="#667eea" translucent={true} />
        </ResponsiveContainer>
      </SubscriptionProvider>
    </AuthProvider>
    </SafeAreaProvider>
  );
}