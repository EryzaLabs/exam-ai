import { useEffect } from 'react';
import { Stack, usePathname } from 'expo-router';
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
import { ThemeProvider } from '@/context/theme-context';
import { ExamProvider, useExam } from '@/context/exam-context';

SplashScreen.preventAutoHideAsync();

import ResponsiveContainer from '@/components/ResponsiveContainer';

function DynamicWebTitle() {
  const pathname = usePathname();
  const { examInfo, examMode } = useExam();

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    let pageTitle = 'Astra Exam AI';

    if (!pathname || pathname === '/' || pathname === '/index') {
      pageTitle = `Astra Exam AI • ${examInfo.shortName} Mocks & CBT Practice`;
    } else if (pathname.includes('/test-list')) {
      pageTitle = `Test Center • ${examInfo.shortName} Mocks | Astra Exam AI`;
    } else if (pathname.includes('/mock-test')) {
      pageTitle = `Live Mock Exam • Astra Exam AI`;
    } else if (pathname.includes('/test-instructions')) {
      pageTitle = `Exam Instructions • ${examInfo.shortName} | Astra Exam AI`;
    } else if (pathname.includes('/test-results')) {
      pageTitle = `Performance Analytics • Astra Exam AI`;
    } else if (pathname.includes('/progress')) {
      pageTitle = `Analytics & Weaknesses • Astra Exam AI`;
    } else if (pathname.includes('/practice')) {
      pageTitle = `Practice Center • ${examInfo.shortName} | Astra Exam AI`;
    } else if (pathname.includes('/custom-test') || pathname.includes('/custom-ai-test')) {
      pageTitle = `AI Custom Test Generator • Astra Exam AI`;
    } else if (pathname.includes('/premium')) {
      pageTitle = `Pass 2026 • Unlimited CBT Mocks | Astra Exam AI`;
    } else if (pathname.includes('/profile')) {
      pageTitle = `User Profile & Settings • Astra Exam AI`;
    } else if (pathname.includes('/login')) {
      pageTitle = `Sign In • Astra Exam AI`;
    } else if (pathname.includes('/signup')) {
      pageTitle = `Create Account • Astra Exam AI`;
    } else {
      const cleanPath = pathname.replace(/^\//, '').split('/')[0];
      const formatted = cleanPath.charAt(0).toUpperCase() + cleanPath.slice(1);
      pageTitle = `${formatted} • Astra Exam AI`;
    }

    document.title = pageTitle;

    const setMetaTag = (attr: 'name' | 'property', key: string, content: string) => {
      try {
        const selector = `meta[${attr}="${key.replace(/"/g, '\\"')}"]`;
        let el = document.querySelector(selector);
        if (!el) {
          el = document.createElement('meta');
          el.setAttribute(attr, key);
          document.head.appendChild(el);
        }
        el.setAttribute('content', content);
      } catch {
        // Safe query fallback
      }
    };

    setMetaTag('name', 'description', 'Astra Exam AI is your all-in-one AI-driven preparation platform for competitive exams. Practice full mocks, analyze your weaknesses, and master your syllabus.');
    setMetaTag('name', 'keywords', 'Astra Exam AI, UPSC Principal, UP Principal, UPPSC, competitive exams, mock tests, AI study assistant, question bank');
    setMetaTag('name', 'author', 'Eryza Labs');
    setMetaTag('property', 'og:title', pageTitle);
    setMetaTag('property', 'og:description', 'Master competitive exams with AI-powered mock tests, performance analytics, and personalized learning.');
    setMetaTag('property', 'og:type', 'website');
    setMetaTag('property', 'og:site_name', 'Astra Exam AI');
    setMetaTag('name', 'twitter:title', pageTitle);
    setMetaTag('name', 'twitter:description', 'Master competitive exams with AI-powered mock tests, performance analytics, and personalized learning.');

    // Ensure favicon is present and linked
    try {
      let iconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
      if (!iconLink) {
        iconLink = document.createElement('link');
        iconLink.rel = 'icon';
        iconLink.type = 'image/png';
        document.head.appendChild(iconLink);
      }
      iconLink.href = '/favicon.png';

      let appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null;
      if (!appleIcon) {
        appleIcon = document.createElement('link');
        appleIcon.rel = 'apple-touch-icon';
        document.head.appendChild(appleIcon);
      }
      appleIcon.href = '/favicon.png';
    } catch {
      // Safe favicon fallback
    }
  }, [pathname, examInfo, examMode]);

  return null;
}

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

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <ExamProvider>
              <DynamicWebTitle />
              <ResponsiveContainer>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                  <Stack.Screen name="+not-found" />
                </Stack>
                <StatusBar style="auto" backgroundColor="transparent" translucent={true} />
              </ResponsiveContainer>
            </ExamProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
