import React from 'react';
import {
  View,
  StyleSheet,
  useWindowDimensions,
  SafeAreaView,
  Platform,
  TouchableOpacity,
  Text,
  Image,
} from 'react-native';
import { MessageSquare } from 'lucide-react-native';
import { router, usePathname } from 'expo-router';
import { useAuth } from '@/context/auth-context';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';
import SideNav from './SideNav';
import BottomNav from './BottomNav';
import TopBar from './TopBar';

export interface AppShellProps {
  children: React.ReactNode;
  maxWidth?: number;
  hideSidebar?: boolean;
}

export default function AppShell({
  children,
  maxWidth = 820,
  hideSidebar = false,
}: AppShellProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 700;
  const { user } = useAuth();
  const { colors, radii } = useChalkboardTheme();
  const pathname = usePathname();

  // Show floating AI action button on mobile if on Home or Practice
  const showFloatingAI =
    !isDesktop && (pathname === '/' || pathname === '/practice');

  // If user is guest and on guest flows, don't show desktop sidebar
  const showSidebar = isDesktop && !hideSidebar && user;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={styles.horizontalWrap}>
        {/* Desktop Sidebar */}
        {showSidebar && <SideNav />}

        {/* Main Content Area */}
        <View style={styles.mainColumn}>
          {/* Top Bar */}
          <TopBar showLogo={!showSidebar} />

          {/* Scrollable / Page Content */}
          <View style={styles.contentWrap}>
            <View
              style={[
                styles.innerContent,
                maxWidth ? { maxWidth } : { width: '100%' },
              ]}
            >
              {children}
            </View>
          </View>

          {/* Mobile Floating AI Action */}
          {showFloatingAI && (
            <TouchableOpacity
              style={[
                styles.floatingAI,
                {
                  backgroundColor: colors.accent,
                  borderRadius: radii.pill,
                },
              ]}
              onPress={() => router.push('/assistant')}
              activeOpacity={0.8}
              accessibilityLabel="Open Vidya AI study assistant"
            >
              <Image
                source={require('@/assets/images/vidya.png')}
                style={styles.floatingVidyaImg}
                resizeMode="contain"
              />
              <Text style={[styles.floatingAIText, { color: colors.accentText }]}>
                Ask Vidya
              </Text>
            </TouchableOpacity>
          )}

          {/* Mobile Bottom Navigation */}
          {!isDesktop && <BottomNav />}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    height: '100%',
  },
  horizontalWrap: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
  },
  mainColumn: {
    flex: 1,
    flexDirection: 'column',
    height: '100%',
    position: 'relative',
  },
  contentWrap: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
  innerContent: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
  floatingAI: {
    position: 'absolute',
    bottom: 76,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 99,
  },
  floatingVidyaImg: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  floatingAIText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
