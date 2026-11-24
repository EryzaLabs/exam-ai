import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Platform,
  useWindowDimensions,
  DimensionValue,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: number;
  maxHeight?: DimensionValue;
  noPadding?: boolean;
}

export default function Modal({
  visible,
  onClose,
  title,
  children,
  maxWidth = 460,
  maxHeight,
  noPadding = false,
}: ModalProps) {
  const { colors, radii, typography } = useChalkboardTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isMobile = windowWidth < 640;

  const resolvedMaxHeight: DimensionValue =
    maxHeight !== undefined
      ? maxHeight
      : windowHeight
      ? Math.min(windowHeight * (isMobile ? 0.86 : 0.88), 720)
      : '88%';

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View
          style={[
            styles.backdrop,
            isMobile && { paddingHorizontal: 12, paddingVertical: 16 },
          ]}
        >
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.line,
                  borderRadius: radii.card,
                  maxWidth,
                  maxHeight: resolvedMaxHeight,
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
                    numberOfLines={1}
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

              <View
                style={[
                  styles.body,
                  { padding: noPadding ? 0 : isMobile ? 14 : 20 },
                ]}
              >
                {children}
              </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    borderWidth: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexShrink: 0,
  },
  title: {
    fontSize: 17,
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
    flex: 1,
    minHeight: 0,
  },
});
