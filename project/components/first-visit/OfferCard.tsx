import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Check, ShieldCheck, Zap, ArrowRight, Lock } from 'lucide-react-native';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';
import { initiatePayment } from '@/utils/cashfree';
import { useAuth } from '@/context/auth-context';
import { AstraLogo } from '@/components/chalkboard';

export interface OfferCardProps {
  cardHeading?: string; // "Get the full series" or "Keep going with the full series"
  seriesName: string;
  description: string;
  originalPrice: number;
  currentPrice: number;
  planId: string;
  features: string[];
  isUnlocked?: boolean;
  onSuccessPurchase?: () => void;
}

export default function OfferCard({
  cardHeading = 'Get the full series',
  seriesName,
  description,
  originalPrice,
  currentPrice,
  planId,
  features,
  isUnlocked = false,
  onSuccessPurchase,
}: OfferCardProps) {
  const { colors, typography, radii } = useChalkboardTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleUnlock = async () => {
    if (isUnlocked) return;
    setLoading(true);

    try {
      await initiatePayment(
        () => {
          setLoading(false);
          if (Platform.OS === 'web') {
            window.alert('Payment successful! Your series pass is now active.');
          } else {
            Alert.alert('Payment Successful', 'Your series pass is now active.');
          }
          if (onSuccessPurchase) onSuccessPurchase();
        },
        (errorMsg) => {
          setLoading(false);
          console.error('Payment failed:', errorMsg);
          if (Platform.OS === 'web') {
            window.alert(`Payment could not be completed: ${errorMsg}`);
          } else {
            Alert.alert('Payment Incomplete', errorMsg);
          }
        },
        {
          userId: user?.uid,
          userName: user?.displayName || (user?.email ? user.email.split('@')[0] : 'Aspirant'),
          userEmail: user?.email || '',
          amountInRupees: currentPrice,
          planId: planId,
        }
      );
    } catch (err: any) {
      setLoading(false);
      console.error('Checkout error:', err);
    }
  };

  const discountPercent =
    originalPrice > currentPrice
      ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
      : null;

  return (
    <View style={styles.container}>
      <View style={styles.headerArea}>
        <Text
          style={[
            styles.cardHeading,
            {
              color: colors.text,
              fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
            },
          ]}
        >
          {cardHeading}
        </Text>
      </View>

      <View
        style={[
          styles.offerBox,
          {
            backgroundColor: colors.surface,
            borderColor: colors.accent,
            borderRadius: radii.card,
          },
        ]}
      >
        <View style={{ marginBottom: 14, alignItems: 'flex-start' }}>
          <AstraLogo variant="full" height={26} />
        </View>

        <View style={styles.topBadgeRow}>
          <View style={[styles.badgePill, { backgroundColor: colors.surface2, borderColor: colors.line }]}>
            <Zap size={12} color={colors.accent} />
            <Text style={[styles.badgePillText, { color: colors.text }]}>
              ONE-TIME PAYMENT
            </Text>
          </View>
          {discountPercent ? (
            <View style={[styles.discountBadge, { backgroundColor: colors.dangerBg, borderColor: colors.danger }]}>
              <Text style={[styles.discountText, { color: colors.danger }]}>
                {discountPercent}% OFF
              </Text>
            </View>
          ) : null}
        </View>

        <Text
          style={[
            styles.seriesTitle,
            {
              color: colors.text,
              fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
            },
          ]}
        >
          {seriesName}
        </Text>

        <Text style={[styles.description, { color: colors.muted }]}>
          {description}
        </Text>

        {/* Pricing block */}
        <View style={styles.priceContainer}>
          <View style={styles.priceRow}>
            {originalPrice > currentPrice && (
              <Text style={[styles.strikePrice, { color: colors.muted }]}>
                ₹{originalPrice}
              </Text>
            )}
            <Text style={[styles.mainPrice, { color: colors.text }]}>
              ₹{currentPrice}
            </Text>
            <Text style={[styles.priceNote, { color: colors.muted }]}>
              · One-time payment
            </Text>
          </View>
        </View>

        {/* What's included checklist */}
        <View style={[styles.checklistSection, { borderTopColor: colors.line }]}>
          <Text style={[styles.checklistHeading, { color: colors.text }]}>
            What's included in this pass:
          </Text>

          <View style={styles.checklist}>
            {features.map((item, index) => (
              <View key={index} style={styles.checkItem}>
                <View style={[styles.checkCircle, { backgroundColor: colors.successBg }]}>
                  <Check size={13} color={colors.success} />
                </View>
                <Text style={[styles.checkText, { color: colors.text }]}>
                  {item}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* CTA Button */}
        {isUnlocked ? (
          <View
            style={[
              styles.unlockedBox,
              { backgroundColor: colors.successBg, borderColor: colors.success, borderRadius: radii.button },
            ]}
          >
            <Check size={16} color={colors.success} />
            <Text style={[styles.unlockedText, { color: colors.success }]}>
              You already own this series pass
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.unlockButton,
              {
                backgroundColor: colors.accent,
                borderRadius: radii.button,
              },
            ]}
            onPress={handleUnlock}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Text style={[styles.unlockButtonText, { color: colors.white }]}>
                  Unlock full series • ₹{currentPrice}
                </Text>
                <ArrowRight size={16} color={colors.white} />
              </>
            )}
          </TouchableOpacity>
        )}

        <View style={styles.guaranteeRow}>
          <ShieldCheck size={14} color={colors.muted} />
          <Text style={[styles.guaranteeText, { color: colors.muted }]}>
            Instant unlock · Official syllabus · Full CBT test engine
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 40,
  },
  headerArea: {
    marginBottom: 16,
  },
  cardHeading: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  offerBox: {
    borderWidth: 2,
    padding: 24,
  },
  topBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 1,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  discountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 1,
  },
  discountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  seriesTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  priceContainer: {
    marginBottom: 20,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  strikePrice: {
    fontSize: 18,
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  mainPrice: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  priceNote: {
    fontSize: 14,
    fontWeight: '500',
  },
  checklistSection: {
    paddingTop: 18,
    borderTopWidth: 1,
    marginBottom: 24,
  },
  checklistHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  checklist: {
    gap: 10,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 24,
    minHeight: 50,
  },
  unlockButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  unlockedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    paddingVertical: 14,
  },
  unlockedText: {
    fontSize: 14,
    fontWeight: '700',
  },
  guaranteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
  },
  guaranteeText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
