import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Home, FileText, Brain, BarChart2, User } from 'lucide-react-native';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';
import { useLanguage } from '@/context/language-context';
import SpotlightTarget from '@/components/SpotlightTarget';

export const MOBILE_TABS = [
  { label: 'Home', labelHi: 'होम', path: '/', icon: Home },
  { label: 'Tests', labelHi: 'टेस्ट', path: '/test-list', icon: FileText },
  { label: 'Practice', labelHi: 'अभ्यास', path: '/practice', icon: Brain },
  { label: 'Analytics', labelHi: 'एनालिटिक्स', path: '/progress', icon: BarChart2 },
  { label: 'Profile', labelHi: 'प्रोफ़ाइल', path: '/profile', icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { colors } = useChalkboardTheme();
  const { isHindi } = useLanguage();

  const isItemActive = (path: string) => {
    if (path === '/') {
      return pathname === '/' || pathname === '/index';
    }
    return pathname.startsWith(path);
  };

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
        },
      ]}
    >
      {MOBILE_TABS.map((item) => {
        const active = isItemActive(item.path);
        const Icon = item.icon;
        const targetId =
          item.path === '/practice'
            ? 'nav-practice-bottom'
            : item.path === '/progress'
            ? 'nav-analytics-bottom'
            : null;

        const tabEl = (
          <TouchableOpacity
            key={item.path}
            style={styles.tabItem}
            onPress={() => router.push(item.path as any)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Icon
              size={20}
              color={active ? colors.text : colors.muted}
              strokeWidth={active ? 2.4 : 1.8}
            />
            <Text
              style={[
                styles.tabLabel,
                {
                  color: active ? colors.text : colors.muted,
                  fontWeight: active ? '700' : '500',
                },
              ]}
            >
              {isHindi ? item.labelHi : item.label}
            </Text>
          </TouchableOpacity>
        );

        return targetId ? (
          <SpotlightTarget key={item.path} id={targetId} style={{ flex: 1 }}>
            {tabEl}
          </SpotlightTarget>
        ) : (
          tabEl
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: '100%',
    height: 64,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    minHeight: 48,
    gap: 3,
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: 0.1,
  },
});
