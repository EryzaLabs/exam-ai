import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView, Image } from 'react-native';
import { router, usePathname } from 'expo-router';
import {
  Home,
  FileText,
  Brain,
  BarChart2,
  MessageSquare,
  User,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react-native';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';
import { useAuth } from '@/context/auth-context';
import { useSub } from '@/context/subscription-context';

export const NAV_ITEMS = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'Tests', path: '/test-list', icon: FileText },
  { label: 'Practice', path: '/practice', icon: Brain },
  { label: 'Analytics', path: '/progress', icon: BarChart2 },
  { label: 'Vidya AI', path: '/assistant', icon: MessageSquare, isVidya: true },
  { label: 'Profile', path: '/profile', icon: User },
];

export default function SideNav() {
  const pathname = usePathname();
  const { colors, typography, radii } = useChalkboardTheme();
  const { user } = useAuth();
  const { isSubscribed } = useSub();

  const isItemActive = (path: string) => {
    if (path === '/') {
      return pathname === '/' || pathname === '/index';
    }
    return pathname.startsWith(path);
  };

  return (
    <View
      style={[
        styles.sidebar,
        {
          backgroundColor: colors.surface,
          borderRightColor: colors.line,
        },
      ]}
    >
      {/* Brand Header with Astra AI Original Logo */}
      <TouchableOpacity
        style={styles.brandHeader}
        onPress={() => router.push('/')}
        activeOpacity={0.8}
      >
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.brandLogoImg}
          resizeMode="contain"
        />
        <View>
          <Text
            style={[
              styles.brandTitle,
              {
                color: colors.text,
                fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
              },
            ]}
          >
            Astra Exam AI
          </Text>
          <Text style={[styles.brandTagline, { color: colors.muted }]}>
            Teacher Exam CBT Prep
          </Text>
        </View>
      </TouchableOpacity>

      {/* Nav Menu */}
      <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.menuList}>
          {NAV_ITEMS.map((item) => {
            const active = isItemActive(item.path);
            const Icon = item.icon;

            return (
              <TouchableOpacity
                key={item.path}
                style={[
                  styles.navItem,
                  {
                    backgroundColor: active ? colors.surface2 : 'transparent',
                    borderColor: active ? colors.line : 'transparent',
                    borderRadius: radii.button,
                  },
                ]}
                onPress={() => router.push(item.path as any)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                {item.isVidya ? (
                  <Image
                    source={require('@/assets/images/vidya.png')}
                    style={styles.vidyaNavImg}
                    resizeMode="contain"
                  />
                ) : (
                  <Icon
                    size={19}
                    color={active ? colors.text : colors.muted}
                    strokeWidth={active ? 2.2 : 1.8}
                  />
                )}
                <Text
                  style={[
                    styles.navItemText,
                    {
                      color: active ? colors.text : colors.muted,
                      fontWeight: active ? '700' : '500',
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Pass Status Card at bottom */}
      <View style={[styles.footerCard, { borderTopColor: colors.line }]}>
        <TouchableOpacity
          style={[
            styles.statusBox,
            {
              backgroundColor: isSubscribed ? colors.successBg : colors.surface2,
              borderColor: isSubscribed ? colors.success : colors.line,
              borderRadius: radii.button,
            },
          ]}
          onPress={() => router.push(isSubscribed ? '/profile' : ('/test-list' as any))}
          activeOpacity={0.8}
        >
          <ShieldCheck size={16} color={isSubscribed ? colors.success : colors.accent} />
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.statusTitle,
                { color: isSubscribed ? colors.success : colors.text },
              ]}
              numberOfLines={1}
            >
              {isSubscribed ? 'Series Pass Active' : 'Free Account'}
            </Text>
            <Text style={[styles.statusSubtitle, { color: colors.muted }]}>
              {isSubscribed ? 'All tests unlocked' : 'Unlock full series'}
            </Text>
          </View>
          <ChevronRight size={14} color={colors.muted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    height: '100%',
    borderRightWidth: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  brandLogoImg: {
    width: 34,
    height: 34,
    borderRadius: 8,
  },
  vidyaNavImg: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  brandTagline: {
    fontSize: 11,
    fontWeight: '500',
  },
  menuScroll: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  menuList: {
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    minHeight: 44,
  },
  navItemText: {
    fontSize: 14.5,
  },
  footerCard: {
    padding: 16,
    borderTopWidth: 1,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderWidth: 1,
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
});
