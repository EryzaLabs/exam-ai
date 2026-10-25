import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles, CheckCircle2, X, LogIn, UserPlus } from 'lucide-react-native';

export interface AuthPromptModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  feature?: string;
}

export default function AuthPromptModal({
  visible,
  onClose,
  title,
  subtitle,
  feature,
}: AuthPromptModalProps) {
  const router = useRouter();

  if (!visible) return null;

  const defaultTitle = feature 
    ? `Sign In to Access ${feature}` 
    : 'Create a Free Account';

  const defaultSubtitle = feature
    ? `Create a free account or sign in to continue with ${feature} and save your progress.`
    : 'Join thousands of aspirants preparing smarter with Astra Exam AI.';

  const handleSignIn = () => {
    onClose();
    router.push('/(auth)/login');
  };

  const handleSignUp = () => {
    onClose();
    router.push('/(auth)/signup');
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalCard}>
              {/* Close Button */}
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                accessibilityLabel="Close"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>

              {/* Icon Badge */}
              <View style={styles.iconContainer}>
                <View style={styles.iconInner}>
                  <Sparkles size={28} color="#4F46E5" />
                </View>
              </View>

              {/* Title & Subtitle */}
              <Text style={styles.title}>{title || defaultTitle}</Text>
              <Text style={styles.subtitle}>{subtitle || defaultSubtitle}</Text>

              {/* Perks List */}
              <View style={styles.perksList}>
                <View style={styles.perkItem}>
                  <CheckCircle2 size={18} color="#10B981" style={styles.perkIcon} />
                  <Text style={styles.perkText}>
                    <Text style={styles.perkBold}>190+ Mock Tests: </Text>
                    Practice full-length papers & topic tests
                  </Text>
                </View>

                <View style={styles.perkItem}>
                  <CheckCircle2 size={18} color="#10B981" style={styles.perkIcon} />
                  <Text style={styles.perkText}>
                    <Text style={styles.perkBold}>Save Progress: </Text>
                    Resume tests & sync scores across devices
                  </Text>
                </View>

                <View style={styles.perkItem}>
                  <CheckCircle2 size={18} color="#10B981" style={styles.perkIcon} />
                  <Text style={styles.perkText}>
                    <Text style={styles.perkBold}>AI Analytics: </Text>
                    Personalized insights, rank & weakness diagnosis
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleSignUp}
                  activeOpacity={0.88}
                >
                  <UserPlus size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryBtnText}>Create Free Account</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={handleSignIn}
                  activeOpacity={0.8}
                >
                  <LogIn size={18} color="#3B82F6" style={{ marginRight: 8 }} />
                  <Text style={styles.secondaryBtnText}>Already have an account? Sign In</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.guestDismissBtn}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.guestDismissText}>Continue browsing as guest</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(4px)' } : {}),
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 12,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  closeBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E0E7FF',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  perksList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  perkIcon: {
    marginRight: 10,
    marginTop: 2,
    flexShrink: 0,
  },
  perkText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    flex: 1,
  },
  perkBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  actions: {
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: '#EFF6FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  secondaryBtnText: {
    color: '#1D4ED8',
    fontSize: 14,
    fontWeight: '600',
  },
  guestDismissBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  guestDismissText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
