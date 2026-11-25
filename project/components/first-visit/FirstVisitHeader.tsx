import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import { router } from 'expo-router';
import { Sun, Moon, ArrowLeft, User as UserIcon, HelpCircle } from 'lucide-react-native';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';
import { useAuth } from '@/context/auth-context';
import { useWalkthrough } from '@/context/walkthrough-context';
import { useLanguage } from '@/context/language-context';
import { AstraLogo, LanguageToggle } from '@/components/chalkboard';
import SpotlightTarget from '@/components/SpotlightTarget';

interface FirstVisitHeaderProps {
  showChangeExam?: boolean;
  onChangeExam?: () => void;
  examName?: string;
}

export default function FirstVisitHeader({
  showChangeExam = false,
  onChangeExam,
  examName,
}: FirstVisitHeaderProps) {
  const { colors, isDark, toggleTheme, typography, radii } = useChalkboardTheme();
  const { user } = useAuth();
  const { startWalkthrough } = useWalkthrough();
  const { t } = useLanguage();

  const handleChangeExam = () => {
    if (onChangeExam) {
      onChangeExam();
    } else {
      router.push('/');
    }
  };

  return (
    <View style={[styles.headerContainer, { borderBottomColor: colors.line, backgroundColor: colors.bg }]}>
      <View style={styles.headerContent}>
        {/* Brand / Logo */}
        <TouchableOpacity
          style={styles.brandRow}
          onPress={() => router.push('/')}
          activeOpacity={0.8}
        >
          <AstraLogo variant="auto" height={32} />
          {examName ? (
            <Text style={[styles.brandSubtitle, { color: colors.muted, marginLeft: 8 }]}>
              {examName}
            </Text>
          ) : null}
        </TouchableOpacity>

        {/* Right side controls */}
        <View style={styles.controlsRow}>
          {showChangeExam && (
            <SpotlightTarget id="guest-change-exam">
              <TouchableOpacity
                style={[styles.changeExamBtn, { borderColor: colors.line, backgroundColor: colors.surface }]}
                onPress={handleChangeExam}
                activeOpacity={0.7}
              >
                <ArrowLeft size={13} color={colors.muted} />
                <Text style={[styles.changeExamText, { color: colors.muted }]}>
                  {t('Change exam', 'परीक्षा बदलें')}
                </Text>
              </TouchableOpacity>
            </SpotlightTarget>
          )}

          {/* Tour Replay */}
          {showChangeExam && (
            <TouchableOpacity
              style={[styles.iconButton, { borderColor: colors.line, backgroundColor: colors.surface }]}
              onPress={() => startWalkthrough('guest')}
              accessibilityLabel="Replay interactive walkthrough"
              activeOpacity={0.7}
            >
              <HelpCircle size={16} color={colors.accent} />
            </TouchableOpacity>
          )}

          {/* Language Toggle */}
          <LanguageToggle />

          {/* Theme Toggle */}
          <TouchableOpacity
            style={[styles.iconButton, { borderColor: colors.line, backgroundColor: colors.surface }]}
            onPress={toggleTheme}
            accessibilityLabel="Toggle light and dark theme"
            activeOpacity={0.7}
          >
            {isDark ? (
              <Sun size={16} color={colors.accent} />
            ) : (
              <Moon size={16} color={colors.text} />
            )}
          </TouchableOpacity>

          {/* Auth Button */}
          {user ? (
            <TouchableOpacity
              style={[styles.authButton, { backgroundColor: colors.surface2, borderColor: colors.line }]}
              onPress={() => router.push('/profile')}
              activeOpacity={0.7}
            >
              <UserIcon size={14} color={colors.text} />
              <Text style={[styles.authButtonText, { color: colors.text }]}>
                {user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'Account'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.authButton, { backgroundColor: colors.surface, borderColor: colors.line }]}
              onPress={() => router.push('/login')}
              activeOpacity={0.7}
            >
              <Text style={[styles.authButtonText, { color: colors.text }]}>Log in</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerContent: {
    maxWidth: 820,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoImage: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  changeExamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  changeExamText: {
    fontSize: 12,
    fontWeight: '500',
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  authButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
