import React, { useEffect, useRef } from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
  Animated,
  Image,
} from 'react-native';
import {
  X,
  ArrowRight,
  ArrowLeft,
  Target,
  Globe,
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  Square,
} from 'lucide-react-native';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';
import { useWalkthrough } from '@/context/walkthrough-context';
import Button from '@/components/chalkboard/Button';

const SPOTLIGHT_PADDING = 6;
const CARD_GAP = 14;

export default function FirstTimeWalkthrough() {
  const {
    isActive,
    stepIndex,
    steps,
    currentStep,
    targetRect,
    language,
    setLanguage,
    voiceEnabled,
    isSpeaking,
    toggleVoice,
    speakCurrentStep,
    stopSpeaking,
    stopWalkthrough,
    nextStep,
    prevStep,
    goToStep,
  } = useWalkthrough();

  const { colors, typography, radii } = useChalkboardTheme();
  const { width: winW, height: winH } = useWindowDimensions();

  // Subtle pulse animation for the spotlight border box
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isActive) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 850,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isActive, pulseAnim]);

  // Web keyboard navigation (ArrowRight, ArrowLeft, Escape)
  useEffect(() => {
    if (Platform.OS !== 'web' || !isActive || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopWalkthrough(true);
      } else if (e.key === 'ArrowRight') {
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        prevStep();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isActive, nextStep, prevStep, stopWalkthrough]);

  if (!isActive || !currentStep) return null;

  const isHi = language === 'hi';
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  // Compute padded spotlight box coordinates clamped to viewport
  const hasRect = Boolean(targetRect && targetRect.width > 0 && targetRect.height > 0);
  const spotX = hasRect ? Math.max(0, targetRect!.x - SPOTLIGHT_PADDING) : 0;
  const spotY = hasRect ? Math.max(0, targetRect!.y - SPOTLIGHT_PADDING) : 0;
  const spotW = hasRect
    ? Math.min(winW - spotX, targetRect!.width + SPOTLIGHT_PADDING * 2)
    : 0;
  const spotH = hasRect
    ? Math.min(winH - spotY, targetRect!.height + SPOTLIGHT_PADDING * 2)
    : 0;

  // Tooltip card sizing & smart positioning (above or below spotlight)
  const cardWidth = Math.min(395, winW - 24);
  const estimatedCardHeight = 295;

  let cardTop = Math.max(24, (winH - estimatedCardHeight) / 2);
  let cardLeft = Math.max(12, (winW - cardWidth) / 2);
  let placement: 'below' | 'above' | 'center' = 'center';

  if (hasRect) {
    const spaceBelow = winH - (spotY + spotH);
    const spaceAbove = spotY;

    if (spaceBelow >= estimatedCardHeight + CARD_GAP || spaceBelow >= spaceAbove) {
      placement = 'below';
      cardTop = Math.min(
        winH - estimatedCardHeight - 16,
        spotY + spotH + CARD_GAP
      );
    } else {
      placement = 'above';
      cardTop = Math.max(16, spotY - estimatedCardHeight - CARD_GAP);
    }

    // Center horizontally relative to spotlight target, clamped to screen margins
    const targetCenterX = spotX + spotW / 2;
    cardLeft = Math.min(
      Math.max(12, targetCenterX - cardWidth / 2),
      winW - cardWidth - 12
    );
  }

  // Pointer triangle horizontal offset relative to cardLeft
  const pointerLeft = hasRect
    ? Math.min(
        Math.max(20, spotX + spotW / 2 - cardLeft - 8),
        cardWidth - 36
      )
    : cardWidth / 2 - 8;

  const stepLabel = isHi
    ? `चरण ${stepIndex + 1} / ${steps.length}`
    : `Step ${stepIndex + 1} of ${steps.length}`;

  return (
    <RNModal
      visible={isActive}
      transparent
      animationType="fade"
      onRequestClose={() => stopWalkthrough(true)}
    >
      <View style={styles.overlayRoot}>
        {/* Dimmed Backdrop (4 rectangles forming a clear cutout around the element) */}
        {hasRect ? (
          <>
            {/* Top dim */}
            <View
              style={[
                styles.dimPanel,
                { top: 0, left: 0, right: 0, height: spotY },
              ]}
            />
            {/* Bottom dim */}
            <View
              style={[
                styles.dimPanel,
                {
                  top: spotY + spotH,
                  left: 0,
                  right: 0,
                  bottom: 0,
                },
              ]}
            />
            {/* Left dim */}
            <View
              style={[
                styles.dimPanel,
                {
                  top: spotY,
                  left: 0,
                  width: spotX,
                  height: spotH,
                },
              ]}
            />
            {/* Right dim */}
            <View
              style={[
                styles.dimPanel,
                {
                  top: spotY,
                  left: spotX + spotW,
                  right: 0,
                  height: spotH,
                },
              ]}
            />

            {/* Glowing Highlight Box Around Screen Element */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.highlightBox,
                {
                  top: spotY,
                  left: spotX,
                  width: spotW,
                  height: spotH,
                  borderColor: colors.accent,
                  borderRadius: radii.card,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            />
          </>
        ) : (
          <View style={[styles.dimPanel, StyleSheet.absoluteFillObject]} />
        )}

        {/* Interactive Bilingual Explanation Card */}
        <View
          style={[
            styles.tooltipCard,
            {
              top: cardTop,
              left: cardLeft,
              width: cardWidth,
              backgroundColor: colors.surface,
              borderColor: colors.accent,
              borderRadius: radii.card,
            },
          ]}
        >
          {/* Directional Pointer Arrow */}
          {placement === 'below' && (
            <View
              style={[
                styles.arrowUp,
                {
                  left: pointerLeft,
                  borderBottomColor: colors.accent,
                },
              ]}
            />
          )}
          {placement === 'above' && (
            <View
              style={[
                styles.arrowDown,
                {
                  left: pointerLeft,
                  borderTopColor: colors.accent,
                },
              ]}
            />
          )}

          {/* Header: Step Badge + Bilingual Toggle + Close */}
          <View style={[styles.cardHeader, { borderBottomColor: colors.line }]}>
            <View style={[styles.stepBadge, { backgroundColor: colors.accent + '22' }]}>
              <Sparkles size={12} color={colors.accent} />
              <Text style={[styles.stepBadgeText, { color: colors.accent }]}>
                {stepLabel}
              </Text>
            </View>

            <View style={styles.headerRight}>
              {/* Language Switcher Pill: EN / हिन्दी */}
              <View
                style={[
                  styles.langSwitch,
                  {
                    backgroundColor: colors.surface2,
                    borderColor: colors.line,
                    borderRadius: radii.pill,
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={() => setLanguage('en')}
                  style={[
                    styles.langBtn,
                    language === 'en' && {
                      backgroundColor: colors.accent,
                      borderRadius: radii.pill,
                    },
                  ]}
                  accessibilityLabel="Switch walkthrough to English"
                >
                  <Text
                    style={[
                      styles.langBtnText,
                      {
                        color: language === 'en' ? colors.accentText : colors.muted,
                      },
                    ]}
                  >
                    EN
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setLanguage('hi')}
                  style={[
                    styles.langBtn,
                    language === 'hi' && {
                      backgroundColor: colors.accent,
                      borderRadius: radii.pill,
                    },
                  ]}
                  accessibilityLabel="वॉकथ्रू को हिंदी में बदलें"
                >
                  <Text
                    style={[
                      styles.langBtnText,
                      {
                        color: language === 'hi' ? colors.accentText : colors.muted,
                      },
                    ]}
                  >
                    हिन्दी
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => stopWalkthrough(true)}
                style={[styles.closeBtn, { backgroundColor: colors.surface2 }]}
                accessibilityLabel={isHi ? 'टूर बंद करें' : 'Close tour'}
              >
                <X size={15} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Body: Vidya AI Guide + Title & Explanation */}
          <View style={styles.cardBody}>
            {/* Vidya AI Voice Strip */}
            <View
              style={[
                styles.vidyaStrip,
                {
                  backgroundColor: isSpeaking ? colors.accent + '18' : colors.surface2,
                  borderColor: isSpeaking ? colors.accent : colors.line,
                  borderRadius: radii.button,
                },
              ]}
            >
              <View
                style={[
                  styles.vidyaAvatarRing,
                  {
                    borderColor: isSpeaking ? colors.accent : colors.line,
                  },
                ]}
              >
                <Image
                  source={require('@/assets/images/vidya.png')}
                  style={styles.vidyaAvatar}
                  resizeMode="contain"
                />
              </View>

              <TouchableOpacity
                style={styles.vidyaTextCol}
                onPress={() => {
                  if (isSpeaking) {
                    stopSpeaking();
                  } else {
                    speakCurrentStep();
                  }
                }}
                activeOpacity={0.75}
              >
                <Text style={[styles.vidyaName, { color: colors.text }]}>
                  {isHi ? 'विद्या AI गाइड' : 'Vidya AI Guide'}
                </Text>
                <Text
                  style={[
                    styles.vidyaStatus,
                    { color: isSpeaking ? colors.accent : colors.muted },
                  ]}
                  numberOfLines={1}
                >
                  {isSpeaking
                    ? isHi
                      ? 'बोल रही हैं... (रोकने के लिए टैप करें)'
                      : 'Speaking... (tap to stop)'
                    : !voiceEnabled
                    ? isHi
                      ? 'आवाज़ बंद है • सुनने के लिए टैप करें'
                      : 'Muted • Tap to listen'
                    : isHi
                    ? 'सुनने के लिए टैप करें'
                    : 'Tap to hear explanation'}
                </Text>
              </TouchableOpacity>

              <View style={styles.vidyaControls}>
                <TouchableOpacity
                  onPress={() => {
                    if (isSpeaking) {
                      stopSpeaking();
                    } else {
                      speakCurrentStep();
                    }
                  }}
                  style={[
                    styles.voiceBtn,
                    {
                      backgroundColor: isSpeaking ? colors.accent : colors.surface,
                      borderColor: isSpeaking ? colors.accent : colors.line,
                    },
                  ]}
                  accessibilityLabel={isSpeaking ? 'Stop Vidya voice' : 'Play Vidya voice'}
                >
                  {isSpeaking ? (
                    <Square size={12} color={colors.accentText} fill={colors.accentText} />
                  ) : (
                    <Play size={12} color={colors.text} fill={colors.text} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={toggleVoice}
                  style={[
                    styles.voiceBtn,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.line,
                    },
                  ]}
                  accessibilityLabel={voiceEnabled ? 'Mute voice' : 'Unmute voice'}
                >
                  {voiceEnabled ? (
                    <Volume2 size={14} color={colors.text} />
                  ) : (
                    <VolumeX size={14} color={colors.muted} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <Text
              style={[
                styles.title,
                {
                  color: colors.text,
                  fontFamily:
                    Platform.OS === 'web' ? typography.headingFamily : undefined,
                },
              ]}
            >
              {isHi ? currentStep.title.hi : currentStep.title.en}
            </Text>

            <Text style={[styles.description, { color: colors.muted }]}>
              {isHi ? currentStep.description.hi : currentStep.description.en}
            </Text>

            {/* Secondary language quick peek */}
            <View
              style={[
                styles.altLangPreview,
                { backgroundColor: colors.surface2, borderColor: colors.line, borderRadius: 8 },
              ]}
            >
              <Globe size={12} color={colors.muted} style={{ marginTop: 2 }} />
              <Text style={[styles.altLangText, { color: colors.muted }]} numberOfLines={2}>
                {isHi ? currentStep.title.en : currentStep.title.hi}
              </Text>
            </View>
          </View>

          {/* Footer: Progress Dots + Controls */}
          <View style={[styles.cardFooter, { borderTopColor: colors.line }]}>
            <View style={styles.dotsRow}>
              {steps.map((s, idx) => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => goToStep(idx)}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: idx === stepIndex ? colors.accent : colors.line,
                      width: idx === stepIndex ? 18 : 7,
                    },
                  ]}
                  accessibilityLabel={`Step ${idx + 1}`}
                />
              ))}
            </View>

            <View style={styles.btnRow}>
              {!isFirst ? (
                <Button
                  label={isHi ? 'पीछे' : 'Back'}
                  variant="secondary"
                  size="small"
                  icon={<ArrowLeft size={13} color={colors.text} />}
                  onPress={prevStep}
                />
              ) : (
                <TouchableOpacity
                  onPress={() => stopWalkthrough(true)}
                  style={styles.skipBtn}
                >
                  <Text style={[styles.skipText, { color: colors.muted }]}>
                    {isHi ? 'छोड़ें' : 'Skip'}
                  </Text>
                </TouchableOpacity>
              )}

              {!isLast ? (
                <Button
                  label={isHi ? 'आगे बढ़ें' : 'Next'}
                  variant="primary"
                  size="small"
                  iconRight={<ArrowRight size={13} color={colors.accentText} />}
                  onPress={nextStep}
                />
              ) : (
                <Button
                  label={isHi ? 'शुरू करें' : 'Finish'}
                  variant="primary"
                  size="small"
                  iconRight={<Target size={13} color={colors.accentText} />}
                  onPress={() => stopWalkthrough(true)}
                />
              )}
            </View>
          </View>
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    flex: 1,
    position: 'relative',
  },
  dimPanel: {
    position: 'absolute',
    backgroundColor: 'rgba(8, 15, 12, 0.72)',
  },
  highlightBox: {
    position: 'absolute',
    borderWidth: 2.5,
    ...Platform.select({
      web: {
        boxShadow: '0 0 0 4px rgba(242, 201, 76, 0.28)',
      },
      default: {
        elevation: 8,
      },
    }),
  },
  tooltipCard: {
    position: 'absolute',
    borderWidth: 1.5,
    ...Platform.select({
      web: {
        boxShadow: '0 18px 44px rgba(0, 0, 0, 0.42)',
      },
      default: {
        elevation: 14,
      },
    }),
  },
  arrowUp: {
    position: 'absolute',
    top: -10,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  arrowDown: {
    position: 'absolute',
    bottom: -10,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  stepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  stepBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 2,
    borderWidth: 1,
  },
  langBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  langBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  altLangPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    marginTop: 2,
  },
  altLangText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  cardFooter: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderTopWidth: 1,
    gap: 10,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  vidyaStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    marginBottom: 4,
  },
  vidyaAvatarRing: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  vidyaAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  vidyaTextCol: {
    flex: 1,
  },
  vidyaName: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  vidyaStatus: {
    fontSize: 11.5,
    marginTop: 1,
  },
  vidyaControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  voiceBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
