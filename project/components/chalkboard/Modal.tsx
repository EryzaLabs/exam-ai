import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: number;
}

export default function Modal({
  visible,
  onClose,
  title,
  children,
  maxWidth = 460,
}: ModalProps) {
  const { colors, radii, typography } = useChalkboardTheme();

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.line,
                  borderRadius: radii.card,
                  maxWidth,
                },
              ]}
              accessibilityRole="alert"
            >
              {title ? (
                <View style={[styles.header, { borderBottomColor: colors.line }]}>
                  <Text
                    style={[
                      styles.title,
                      {
                        color: colors.text,
                        fontFamily:
                          Platform.OS === 'web'
                            ? typography.headingFamily
                            : undefined,
                      },
                    ]}
                  >
                    {title}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.closeBtn,
                      { backgroundColor: colors.surface2 },
                    ]}
                    onPress={onClose}
                    accessibilityLabel="Close dialog"
                  >
                    <X size={16} color={colors.text} />
                  </TouchableOpacity>
                </View>
              ) : null}

              <View style={styles.body}>{children}</View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  body: {
    padding: 20,
  },
});
