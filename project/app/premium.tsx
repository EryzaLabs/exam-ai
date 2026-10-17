import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  ImageBackground,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowLeft,
  Crown,
  Check,
  ShieldCheck,
  Sparkles,
  Zap,
  BookOpen,
  Award,
  Globe,
  BarChart2,
  HelpCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Lock,
  Target,
  FileText,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Scale,
  Brain,
  MessageCircle,
  Phone,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/auth-context';
import userService from '@/services/user-service';
import { initiatePayment } from '@/utils/cashfree';
import DesktopDashboard from '@/components/DesktopDashboard';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function PremiumScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const { user, isSubscribed: authSubscribed, isSubscriptionLoading, refreshSubscription } = useAuth();

  const [loading, setLoading] = useState(false);
  const [localSubscribed, setLocalSubscribed] = useState<boolean | null>(null);
  const isSubscribed = localSubscribed !== null ? localSubscribed : authSubscribed;
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Interactive Live Preview State
  const [sampleLang, setSampleLang] = useState<'en' | 'hi'>('en');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // Coupon State
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountType: string;
    discountAmount: number;
    finalAmount: number;
    isFree: boolean;
    description: string;
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  const handleApplyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) {
      setCouponError('Please enter a coupon code');
      return;
    }
    setCouponLoading(true);
    setCouponError('');
    setCouponSuccess('');

    try {
      const res = await fetch(`${API_BASE_URL}/payment/validate-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.valid) {
        setAppliedCoupon(data);
        setCouponSuccess(data.description || `Coupon ${data.code} applied!`);
        setCouponError('');
      } else {
        setAppliedCoupon(null);
        setCouponError(data.error || 'Invalid or expired coupon code');
      }
    } catch (e) {
      console.error('Coupon validation error:', e);
      setCouponError('Could not validate coupon. Please try again.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError('');
    setCouponSuccess('');
  };

  useEffect(() => {
    checkSubscriptionStatus();
  }, [user]);

  const checkSubscriptionStatus = async () => {
    setCheckingStatus(true);
    try {
      if (user?.uid) {
        const cached = await AsyncStorage.getItem(`@user_subscribed_${user.uid}`).catch(() => null);
        if (cached === 'true') {
          setLocalSubscribed(true);
        }

        const profile = await userService.getUserProfile(user.uid);
        if (profile?.isSubscribed === true) {
          setLocalSubscribed(true);
        }

        try {
          const res = await fetch(`${API_BASE_URL}/payment/subscription-status/${user.uid}`);
          if (res.ok) {
            const data = await res.json();
            if (data?.isSubscribed) {
              setLocalSubscribed(true);
              await AsyncStorage.setItem(`@user_subscribed_${user.uid}`, 'true').catch(() => {});
            }
          }
        } catch (err) {}

        const savedPhone = profile?.phoneNumber || user?.phoneNumber || (await AsyncStorage.getItem('@user_phone_number')) || '';
        if (savedPhone) {
          setPhoneNumber(savedPhone.replace(/\D/g, '').slice(-10));
        }
      } else {
        setLocalSubscribed(false);
      }
    } catch (e) {
      console.error('Error checking subscription:', e);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handlePurchase = async () => {
    if (!user) {
      router.push('/(auth)/login');
      return;
    }

    // If 100% Free VIP coupon (e.g. Atrocious2512), redeem directly on backend without payment gateway
    if (appliedCoupon && appliedCoupon.isFree) {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/payment/redeem-coupon`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: appliedCoupon.code,
            uid: user.uid,
            customer_email: user.email || '',
            customer_phone: phoneNumber || '',
          }),
        });
        const data = await res.json();
        if (data.success) {
          if (user?.uid) {
            await AsyncStorage.setItem(`@user_subscribed_${user.uid}`, 'true').catch(() => {});
          }
          await refreshSubscription();
          setLocalSubscribed(true);
          const msg = data.message || `🎉 Coupon '${appliedCoupon.code}' applied! 100% Lifetime Premium Access activated.`;
          if (Platform.OS === 'web') {
            window.alert(msg);
          } else {
            alert(msg);
          }
        } else {
          alert(data.error || 'Failed to redeem coupon code');
        }
      } catch (err: any) {
        console.error('Error redeeming coupon:', err);
        alert('Failed to redeem coupon. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }

    setPhoneError('');
    setShowPhoneModal(true);
  };

  const proceedWithPayment = async (phone: string) => {
    setShowPhoneModal(false);
    setLoading(true);

    await AsyncStorage.setItem('@user_phone_number', phone).catch(() => {});
    if (user?.uid) {
      userService.updateUserProfile({ phoneNumber: phone }).catch(() => {});
    }

    initiatePayment(
      async () => {
        try {
          await refreshSubscription();
          setLocalSubscribed(true);
          setLoading(false);
          const successMsg = '🎉 Congratulations! You now have full unrestricted access to all UPSC Principal Mock Tests and AI Analytics.';
          if (Platform.OS === 'web') {
            window.alert(successMsg);
          } else {
            alert(successMsg);
          }
        } catch (e) {
          console.error('Error in subscription callback:', e);
        }
      },
      (error) => {
        setLoading(false);
        if (error !== 'Payment cancelled by user') {
          const errMsg = `Payment could not be completed: ${error}`;
          if (Platform.OS === 'web') {
            window.alert(errMsg);
          } else {
            alert(errMsg);
          }
        }
      },
      {
        userName: user?.displayName || (user?.email ? user.email.split('@')[0] : 'Aspirant'),
        userEmail: user?.email || '',
        userPhone: phone,
        amountInRupees: appliedCoupon ? appliedCoupon.finalAmount : 499,
        couponCode: appliedCoupon?.code,
      }
    );
  };

  const sampleQuestion = {
    en: {
      question:
        'Under Rule 3(1) of the Central Civil Services (Conduct) Rules 1964, which of the following is specifically mandated for a Government servant holding supervisory or administrative charge in an educational institution?',
      options: [
        'To take all possible steps to ensure the integrity and devotion to duty of all government servants under his control and authority.',
        'To submit annual confidential reports directly to the Ministry of Education without review.',
        'To permit staff members to engage in private commercial coaching after school hours.',
        'To waive disciplinary proceedings for non-gazetted teaching staff upon written apology.',
      ],
      correctIndex: 0,
      explanation:
        'Correct Answer: (A). Rule 3(2)(i) of the CCS (Conduct) Rules 1964 explicitly mandates: "Every Government servant holding a supervisory post shall take all possible steps to ensure the integrity and devotion to duty of all government servants for the time being under his control and authority."',
      topic: 'Service Rules & CCS Conduct Rules 1964',
    },
    hi: {
      question:
        'केंद्रीय सिविल सेवा (आचरण) नियम 1964 के नियम 3(1) के अंतर्गत, एक शैक्षणिक संस्थान में पर्यवेक्षी या प्रशासनिक प्रभार संभालने वाले सरकारी कर्मचारी के लिए निम्नलिखित में से क्या अनिवार्य है?',
      options: [
        'अपने नियंत्रण और प्राधिकार में कार्यरत सभी सरकारी कर्मचारियों की सत्यनिष्ठा और कर्तव्यपरायणता सुनिश्चित करने के लिए सभी संभव कदम उठाना।',
        'बिना समीक्षा के सीधे शिक्षा मंत्रालय को वार्षिक गोपनीय रिपोर्ट प्रस्तुत करना।',
        'स्कूल समय के बाद कर्मचारियों को निजी व्यावसायिक कोचिंग में संलग्न होने की अनुमति देना।',
        'लिखित क्षमायाचना पर गैर-राजपत्रित शिक्षण कर्मचारियों के विरुद्ध अनुशासनात्मक कार्यवाही रद्द करना।',
      ],
      correctIndex: 0,
      explanation:
        'सही उत्तर: (A)। सीसीएस (आचरण) नियम 1964 के नियम 3(2)(i) में स्पष्ट रूप से प्रावधान है कि पर्यवेक्षी पद धारण करने वाले प्रत्येक सरकारी कर्मचारी का यह कर्तव्य है कि वह अपने नियंत्रण में कार्यरत सभी कर्मचारियों की सत्यनिष्ठा और कर्तव्यनिष्ठा सुनिश्चित करने हेतु सभी आवश्यक कदम उठाए।',
      topic: 'सेवा नियम और सीसीएस आचरण नियम 1964',
    },
  };

  const syllabusModules = [
    {
      title: 'Educational Administration & School Leadership',
      tests: '15 Full Mocks',
      highlights: 'NEP 2020, NCF-SE 2023, School Development Plans, Pedagogical Leadership, CBSE Affiliation Bye-laws',
      icon: BookOpen,
      iconBg: '#DBEAFE',
      iconColor: '#2563EB',
    },
    {
      title: 'Service & Conduct Rules (Swamy’s Handbook)',
      tests: '12 Topic Tests',
      highlights: 'CCS (Conduct) Rules 1964, CCS (CCA) Rules 1965, Leave Rules, LTC, Medical Attendance Rules',
      icon: Scale,
      iconBg: '#D1FAE5',
      iconColor: '#059669',
    },
    {
      title: 'Financial Administration & Accounts',
      tests: '10 Topic Tests',
      highlights: 'General Financial Rules (GFR 2017), GeM Procurement, VPF/GPF, Contingency Grants, Audit & Budget',
      icon: BarChart2,
      iconBg: '#FFEDD5',
      iconColor: '#EA580C',
    },
    {
      title: 'Child Rights, Protection & Acts',
      tests: '8 Topic Tests',
      highlights: 'POCSO Act 2012 (Mandatory Reporting), RTE Act 2009 (PTR, Section 12), RPwD Act 2016',
      icon: ShieldCheck,
      iconBg: '#EDE9FE',
      iconColor: '#7C3AED',
    },
    {
      title: 'General Studies & Government Initiatives',
      tests: '10 Full Mocks',
      highlights: 'PM SHRI Schools, Samagra Shiksha, DIKSHA, Vidyanjali, Current Educational Schemes & Policies',
      icon: Globe,
      iconBg: '#FCE7F3',
      iconColor: '#DB2777',
    },
  ];

  const faqs = [
    {
      q: 'Do you add new tests every day?',
      a: 'Yes! We actively research, create, and upload new mock tests and topic-wise practice papers every single day. As a Premium Pass holder, every newly released test is added to your account immediately with zero extra cost.',
    },
    {
      q: 'How does this compare to apps like Testbook or Adda247?',
      a: 'Generic test apps focus on mass exams (SSC, Railways, Clerk) with recycled question banks. Our platform is 100% purpose-built for the UPSC Principal & Vice-Principal exam. All questions are crafted at the gazetted officer level with verified Swamy’s Handbook service rule citations (CCS Rules, GFR 2017, POCSO, RTE, FR-SR) and fresh tests built every day.',
    },
    {
      q: 'How long is the Premium subscription valid?',
      a: 'Your subscription is valid for the complete 2026 UPSC Principal & Vice-Principal examination cycle until the exam is conducted. There are no recurring monthly charges or hidden renewal fees.',
    },
    {
      q: 'Are all test papers available in both Hindi & English?',
      a: 'Yes! Every single question, multiple-choice option, and detailed pedagogical rationale is 100% bilingual. You can switch between English and Hindi (A/अ) with a single tap during the live exam and while reviewing solutions.',
    },
    {
      q: 'Can I re-attempt mock tests?',
      a: 'Yes, unlimited re-attempts are included. The platform tracks your score progression, accuracy trends, and speed improvements across attempts without erasing your past test history.',
    },
    {
      q: 'Is this test series relevant for both GNCTD and KVS Principal exams?',
      a: 'Yes. The syllabus for UPSC Principal (Delhi GNCTD), Vice-Principal, and KVS/NVS Principal is over 90% overlapping in Educational Administration, Service Rules (CCS), Financial Management (GFR), and Child Protection Laws.',
    },
    {
      q: 'Can I access the tests on both Mobile and Laptop/Desktop?',
      a: 'Yes! Your account seamlessly syncs between your smartphone, tablet, and desktop browser. You can take tests on your laptop for real exam-day simulation and revise solutions on your mobile on the go.',
    },
    {
      q: 'What payment methods are supported?',
      a: 'We support all secure payment methods via Cashfree: UPI (Google Pay, PhonePe, Paytm, BHIM, CRED), Credit/Debit Cards (Visa, Mastercard, RuPay), NetBanking from 50+ banks, and Wallets.',
    },
  ];

  const activeQuestion = sampleQuestion[sampleLang];

  // The main page content that renders inside both DesktopDashboard (on web/desktop) and Native container (on mobile)
  const pageContent = (
    <View style={styles.pageWrapper}>
      {/* ================= HERO BANNER (MATCHES DASHBOARD HERO VIBE) ================= */}
      {/* ================= COMPACT HERO BANNER ================= */}
      <ImageBackground
        source={require('@/assets/images/upsc-bg.png')}
        style={[styles.heroBanner, { backgroundColor: '#1E40AF' }]}
        imageStyle={{ borderRadius: 24, opacity: 0.35, width: '100%', height: '100%' }}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(30,64,175,0.88)', 'rgba(59,130,246,0.72)']}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 24 }]}
        />
        <View style={styles.heroContent}>
          <View style={styles.heroTagsRow}>
            <View style={styles.heroTagBadge}>
              <Crown size={12} color="#F59E0B" />
              <Text style={styles.heroTagText}>ALL-ACCESS PASS • 2026 EDITION</Text>
            </View>
            <View style={styles.heroVerifiedBadge}>
              <CheckCircle2 size={12} color="#34D399" />
              <Text style={styles.heroVerifiedText}>UPSC PRINCIPAL & VICE-PRINCIPAL</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Prepare with a Complete Mock-Test System.</Text>
          <Text style={styles.heroDesc}>
            Full-length simulations, topic-wise practice, Swamy's Handbook legal explanations, and bilingual questions in one unified pass. Built strictly on the official GNCTD & KVS CBT pattern.
          </Text>

          {/* Compact Quick Metrics Bar */}
          <View style={styles.heroMetricsGrid}>
            <View style={styles.heroMetricItem}>
              <View style={[styles.statIconBox, { backgroundColor: '#DBEAFE' }]}>
                <FileText size={16} color="#2563EB" />
              </View>
              <View>
                <Text style={styles.metricVal}>26</Text>
                <Text style={styles.metricLbl}>Full Mocks</Text>
              </View>
            </View>

            <View style={styles.heroMetricItem}>
              <View style={[styles.statIconBox, { backgroundColor: '#EDE9FE' }]}>
                <BookOpen size={16} color="#7C3AED" />
              </View>
              <View>
                <Text style={styles.metricVal}>158</Text>
                <Text style={styles.metricLbl}>Topic Tests</Text>
              </View>
            </View>

            <View style={styles.heroMetricItem}>
              <View style={[styles.statIconBox, { backgroundColor: '#D1FAE5' }]}>
                <Target size={16} color="#059669" />
              </View>
              <View>
                <Text style={styles.metricVal}>3,145+</Text>
                <Text style={styles.metricLbl}>Questions</Text>
              </View>
            </View>

            <View style={styles.heroMetricItem}>
              <View style={[styles.statIconBox, { backgroundColor: '#FEF3C7' }]}>
                <Zap size={16} color="#D97706" />
              </View>
              <View>
                <Text style={styles.metricVal}>Daily</Text>
                <Text style={styles.metricLbl}>New Tests</Text>
              </View>
            </View>

            <View style={styles.heroMetricItem}>
              <View style={[styles.statIconBox, { backgroundColor: '#FFEDD5' }]}>
                <Globe size={16} color="#EA580C" />
              </View>
              <View>
                <Text style={styles.metricVal}>100%</Text>
                <Text style={styles.metricLbl}>English & हिन्दी</Text>
              </View>
            </View>
          </View>
        </View>
      </ImageBackground>

      {/* ================= ACTIVE SUBSCRIBER STATE (IF ALREADY UNLOCKED) ================= */}
      {isSubscribed ? (
        <View style={styles.activePlanCard}>
          <View style={styles.activePlanHeader}>
            <View style={styles.activeCheckCircle}>
              <Check size={24} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.activePlanTitle}>You are a Premium Member!</Text>
              <Text style={styles.activePlanSub}>
                All 26 Full Mocks and 158 Topic-wise Tests are completely unlocked on your account.
              </Text>
            </View>
          </View>

          <View style={styles.activePlanActions}>
            <TouchableOpacity
              style={styles.exploreTestsBtn}
              onPress={() => router.push('/test-list')}
            >
              <Text style={styles.exploreTestsBtnText}>Start Practicing Tests →</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* ================= HIGH-CONVERTING PURCHASING CARD ================= */
        <View style={styles.pricingSectionCard}>
          <View style={[styles.pricingLayout, isDesktop && styles.pricingLayoutDesktop]}>
            {/* Left Column: Outcome & Concrete Value Bundle */}
            <View style={styles.pricingLeftCol}>
              <View style={styles.launchOfferTag}>
                <Crown size={13} color="#B45309" />
                <Text style={styles.launchOfferTagText}>ALL-ACCESS PASS • 2026 EDITION</Text>
              </View>

              <Text style={styles.pricingPlanName}>Prepare with a Complete Mock-Test System.</Text>
              <Text style={styles.pricingPlanSub}>
                Full-length simulations, topic-wise practice, legal explanations, and bilingual questions in one pass.
              </Text>

              {/* Concrete Value Inclusions */}
              <View style={styles.checklist}>
                <View style={styles.checkItem}>
                  <CheckCircle2 size={18} color="#10B981" />
                  <Text style={styles.checkText}>
                    <Text style={styles.boldText}>26 full-length mocks</Text> — 120 questions per mock (300 marks, CBT mode)
                  </Text>
                </View>

                <View style={styles.checkItem}>
                  <CheckCircle2 size={18} color="#10B981" />
                  <Text style={styles.checkText}>
                    <Text style={styles.boldText}>158 topic-wise tests</Text> — Practice specific subjects and concepts
                  </Text>
                </View>

                <View style={styles.checkItem}>
                  <CheckCircle2 size={18} color="#10B981" />
                  <Text style={styles.checkText}>
                    <Text style={styles.boldText}>Fresh tests added daily</Text> — Continuous new mocks & topic tests published daily
                  </Text>
                </View>

                <View style={styles.checkItem}>
                  <CheckCircle2 size={18} color="#10B981" />
                  <Text style={styles.checkText}>
                    <Text style={styles.boldText}>3,145 bilingual questions</Text> — 1-tap switch between English and Hindi
                  </Text>
                </View>

                <View style={styles.checkItem}>
                  <CheckCircle2 size={18} color="#10B981" />
                  <Text style={styles.checkText}>
                    <Text style={styles.boldText}>Exact legal citations</Text> — Rule-by-rule backing from Swamy’s Handbook (CCS/GFR)
                  </Text>
                </View>

                <View style={styles.checkItem}>
                  <CheckCircle2 size={18} color="#10B981" />
                  <Text style={styles.checkText}>
                    <Text style={styles.boldText}>Performance analytics</Text> — Identify weak areas and track All-India rank
                  </Text>
                </View>

                <View style={styles.checkItem}>
                  <CheckCircle2 size={18} color="#10B981" />
                  <Text style={styles.checkText}>
                    <Text style={styles.boldText}>Unlimited re-attempts</Text> — Lifetime test history and progress tracking
                  </Text>
                </View>
              </View>
            </View>

            {/* Right Column: Visual Price Anchor & Action Box */}
            <View style={styles.pricingRightCol}>
              <View style={styles.checkoutActionBox}>
                <View style={styles.trustShieldPill}>
                  <ShieldCheck size={14} color="#059669" />
                  <Text style={styles.trustShieldText}>Official GNCTD & KVS Pattern</Text>
                </View>

                {/* Massive Price Anchor */}
                <View style={styles.anchorPriceBlock}>
                  <View style={styles.anchorPriceRow}>
                    <Text style={styles.anchorCurrency}>₹</Text>
                    <Text style={styles.anchorAmount}>
                      {appliedCoupon ? (appliedCoupon.isFree ? '0' : appliedCoupon.finalAmount) : '499'}
                    </Text>
                    {appliedCoupon?.isFree && (
                      <View style={{ marginLeft: 8, backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'center' }}>
                        <Text style={{ color: '#16A34A', fontWeight: '800', fontSize: 13 }}>FREE</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.anchorDiscountRow}>
                    <Text style={styles.anchorOriginalPrice}>₹1,499</Text>
                    <View style={[styles.anchorSavePill, appliedCoupon && { backgroundColor: '#DCFCE7' }]}>
                      <Text style={[styles.anchorSavePillText, appliedCoupon && { color: '#15803D' }]}>
                        {appliedCoupon
                          ? (appliedCoupon.isFree ? `🎉 100% OFF with '${appliedCoupon.code}'` : `Save ₹${1499 - appliedCoupon.finalAmount}`)
                          : 'Save ₹1,000 (67% OFF)'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.anchorTermsText}>
                    One-time payment · No recurring charges
                  </Text>
                </View>

                {/* Coupon Code Section */}
                <View style={styles.couponContainer}>
                  <View style={styles.couponHeader}>
                    <Sparkles size={16} color="#7C3AED" />
                    <Text style={styles.couponHeaderText}>Have a Promo / Coupon Code?</Text>
                  </View>
                  
                  {appliedCoupon ? (
                    <View style={styles.appliedCouponBadge}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <CheckCircle2 size={16} color="#16A34A" />
                          <Text style={styles.appliedCouponCode}>{appliedCoupon.code}</Text>
                          <View style={styles.appliedPill}>
                            <Text style={styles.appliedPillText}>APPLIED</Text>
                          </View>
                        </View>
                        <Text style={styles.appliedCouponDesc}>{appliedCoupon.description}</Text>
                      </View>
                      <TouchableOpacity onPress={handleRemoveCoupon} style={styles.removeCouponBtn}>
                        <Text style={styles.removeCouponText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View>
                      <View style={styles.couponInputRow}>
                        <TextInput
                          style={styles.couponInput}
                          placeholder="Enter coupon (e.g. Atrocious2512)"
                          placeholderTextColor="#94A3B8"
                          value={couponInput}
                          onChangeText={(t) => {
                            setCouponInput(t);
                            setCouponError('');
                          }}
                          autoCapitalize="characters"
                        />
                        <TouchableOpacity 
                          style={[styles.applyCouponBtn, (!couponInput.trim() || couponLoading) && styles.applyCouponBtnDisabled]}
                          onPress={handleApplyCoupon}
                          disabled={!couponInput.trim() || couponLoading}
                        >
                          {couponLoading ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.applyCouponBtnText}>Apply</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                      {couponError ? (
                        <Text style={styles.couponErrorText}>{couponError}</Text>
                      ) : null}
                    </View>
                  )}
                </View>

                {/* Primary Action Button */}
                <TouchableOpacity
                  style={[styles.payNowBtn, loading && styles.payNowBtnDisabled]}
                  onPress={handlePurchase}
                  disabled={loading}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={appliedCoupon?.isFree ? ['#059669', '#047857'] : ['#2563EB', '#1D4ED8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.payNowGradient}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Lock size={18} color="#FFFFFF" />
                        <Text style={styles.payNowBtnText}>
                          {appliedCoupon?.isFree
                            ? '✨ Unlock Lifetime Access · Free'
                            : appliedCoupon
                            ? `Get Full Test Access · ₹${appliedCoupon.finalAmount}`
                            : 'Get Full Test Access · ₹499'}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Clear Post-Click Clarity */}
                <View style={styles.clarityPointsList}>
                  <View style={styles.clarityPoint}>
                    <Zap size={14} color="#2563EB" />
                    <Text style={styles.clarityPointText}>Instant access activated immediately upon payment</Text>
                  </View>
                  <View style={styles.clarityPoint}>
                    <Clock size={14} color="#059669" />
                    <Text style={styles.clarityPointText}>Unlimited access until UPSC Principal 2026 exam day</Text>
                  </View>
                  <View style={styles.clarityPoint}>
                    <ShieldCheck size={14} color="#64748B" />
                    <Text style={styles.clarityPointText}>Zero recurring renewals · No auto-debit</Text>
                  </View>
                </View>

                {/* Readable Trust Row */}
                <View style={styles.cleanTrustRow}>
                  <Text style={styles.cleanTrustText}>Secure 256-Bit SSL Checkout via Cashfree</Text>
                  <View style={styles.cleanPayBadges}>
                    <Text style={styles.cleanPayBadge}>UPI (GPay / PhonePe / Paytm)</Text>
                    <Text style={styles.cleanPayBadge}>Cards</Text>
                    <Text style={styles.cleanPayBadge}>NetBanking</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ================= BEFORE PURCHASING: REMOVE REASONS TO HESITATE ================= */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <HelpCircle size={20} color="#2563EB" />
            <Text style={styles.sectionTitle}>Before Purchasing: Key Information</Text>
          </View>
        </View>

        <View style={[styles.beforePurchasingGrid, isDesktop && styles.beforePurchasingGridDesktop]}>
          <View style={styles.beforePurchasingCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#EFF6FF', marginBottom: 10 }]}>
              <BookOpen size={18} color="#2563EB" />
            </View>
            <Text style={styles.bpCardQuestion}>What is included in the pass?</Text>
            <Text style={styles.bpCardAnswer}>
              Immediate unrestricted access to all 26 Full-Length Mocks (120 Qs each), 158 Topic-wise Tests, all new tests added daily, verified Swamy's Handbook legal rationales, and AI diagnostic reports.
            </Text>
          </View>

          <View style={styles.beforePurchasingCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#ECFDF5', marginBottom: 10 }]}>
              <Target size={18} color="#059669" />
            </View>
            <Text style={styles.bpCardQuestion}>Are tests mapped to the official syllabus?</Text>
            <Text style={styles.bpCardAnswer}>
              100% strictly aligned with the official UPSC GNCTD & KVS Principal / Vice-Principal CBT pattern (NEP 2020, NCF-SE 2023, CCS Rules, GFR 2017, POCSO Act, RTE 2009).
            </Text>
          </View>

          <View style={styles.beforePurchasingCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#EDE9FE', marginBottom: 10 }]}>
              <Scale size={18} color="#7C3AED" />
            </View>
            <Text style={styles.bpCardQuestion}>How are legal answers verified?</Text>
            <Text style={styles.bpCardAnswer}>
              Every administrative and service rule question cites the exact rule number, order, and section from the authoritative Swamy’s Handbook and official government gazette notifications.
            </Text>
          </View>

          <View style={styles.beforePurchasingCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#FEF3C7', marginBottom: 10 }]}>
              <Clock size={18} color="#D97706" />
            </View>
            <Text style={styles.bpCardQuestion}>When does access expire?</Text>
            <Text style={styles.bpCardAnswer}>
              Valid for the complete 2026 examination cycle until the exam is conducted. There are zero monthly renewals and no recurring auto-debits.
            </Text>
          </View>
        </View>
      </View>

      {/* ================= INTERACTIVE LIVE QUESTION PREVIEW ================= */}
      <View style={styles.sectionBlock}>
        <View style={styles.interactiveHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <FileText size={20} color="#2563EB" />
            <Text style={styles.sectionTitle}>Test Question Quality Yourself</Text>
          </View>

          {/* Bilingual Switch */}
          <View style={styles.bilingualToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, sampleLang === 'en' && styles.toggleBtnActive]}
              onPress={() => setSampleLang('en')}
            >
              <Text style={[styles.toggleBtnText, sampleLang === 'en' && styles.toggleBtnTextActive]}>English</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, sampleLang === 'hi' && styles.toggleBtnActive]}
              onPress={() => setSampleLang('hi')}
            >
              <Text style={[styles.toggleBtnText, sampleLang === 'hi' && styles.toggleBtnTextActive]}>हिन्दी</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sampleQuestionCard}>
          <View style={styles.sampleCardTop}>
            <View style={styles.topicBadge}>
              <Text style={styles.topicBadgeText}>{activeQuestion.topic}</Text>
            </View>
            <Text style={styles.marksBadgeText}>+2.5 Marks • -0.83 Negative</Text>
          </View>

          <Text style={styles.sampleQuestionText}>{activeQuestion.question}</Text>

          <View style={styles.optionsList}>
            {activeQuestion.options.map((opt, idx) => {
              const letter = String.fromCharCode(65 + idx);
              const isSelected = selectedOption === idx;
              const isCorrect = idx === activeQuestion.correctIndex;
              const showResult = showExplanation;

              let itemStyle = styles.optionItem;
              let circleStyle = styles.optionLetterCircle;

              if (showResult && isCorrect) {
                itemStyle = { ...styles.optionItem, ...styles.optionItemCorrect };
                circleStyle = { ...styles.optionLetterCircle, ...styles.optionLetterCircleCorrect };
              } else if (showResult && isSelected && !isCorrect) {
                itemStyle = { ...styles.optionItem, ...styles.optionItemWrong };
                circleStyle = { ...styles.optionLetterCircle, ...styles.optionLetterCircleWrong };
              } else if (isSelected) {
                itemStyle = { ...styles.optionItem, ...styles.optionItemSelected };
                circleStyle = { ...styles.optionLetterCircle, ...styles.optionLetterCircleSelected };
              }

              return (
                <TouchableOpacity
                  key={idx}
                  style={itemStyle}
                  onPress={() => {
                    setSelectedOption(idx);
                    setShowExplanation(true);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={circleStyle}>
                    <Text style={styles.optionLetterText}>{letter}</Text>
                  </View>
                  <Text style={styles.optionContentText}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {showExplanation ? (
            <View style={styles.explanationBox}>
              <View style={styles.explanationTitleRow}>
                <CheckCircle2 size={16} color="#059669" />
                <Text style={styles.explanationTitle}>Official Rule & Section Citation</Text>
              </View>
              <Text style={styles.explanationText}>{activeQuestion.explanation}</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.revealHintBtn}
              onPress={() => setShowExplanation(true)}
            >
              <Text style={styles.revealHintText}>Tap any option above to test your answer and view official rule citation →</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ================= SAMPLE AI DIAGNOSTIC REPORT PREVIEW ================= */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <BarChart2 size={20} color="#2563EB" />
            <Text style={styles.sectionTitle}>Sample AI Diagnostic Report Preview</Text>
          </View>
          <View style={styles.reportTag}>
            <Sparkles size={13} color="#2563EB" />
            <Text style={styles.reportTagText}>Generated on Test Completion</Text>
          </View>
        </View>

        <View style={styles.sampleReportCard}>
          {/* Top header of mock result */}
          <View style={styles.reportCardHeader}>
            <View>
              <Text style={styles.reportExamName}>Full Mock Test 04 • CBT Result Simulation</Text>
              <Text style={styles.reportScoreText}>
                Score: <Text style={styles.reportScoreHighlight}>218.5</Text> / 300 Marks
              </Text>
            </View>
            <View style={styles.percentileBadge}>
              <Award size={14} color="#059669" />
              <Text style={styles.percentileBadgeText}>Top 4.2% Percentile</Text>
            </View>
          </View>

          {/* Quick Metrics */}
          <View style={styles.reportMetricsRow}>
            <View style={styles.reportMetricBox}>
              <Text style={styles.reportMetricLabel}>Accuracy</Text>
              <Text style={[styles.reportMetricVal, { color: '#059669' }]}>78.4%</Text>
              <Text style={styles.reportMetricSub}>94/120 Correct</Text>
            </View>
            <View style={styles.reportMetricBox}>
              <Text style={styles.reportMetricLabel}>Predicted Rank</Text>
              <Text style={[styles.reportMetricVal, { color: '#2563EB' }]}>#42</Text>
              <Text style={styles.reportMetricSub}>Among 1,280 Aspirants</Text>
            </View>
            <View style={styles.reportMetricBox}>
              <Text style={styles.reportMetricLabel}>Time Taken</Text>
              <Text style={[styles.reportMetricVal, { color: '#475569' }]}>104m</Text>
              <Text style={styles.reportMetricSub}>Out of 120 mins</Text>
            </View>
            <View style={styles.reportMetricBox}>
              <Text style={styles.reportMetricLabel}>Negative Loss</Text>
              <Text style={[styles.reportMetricVal, { color: '#DC2626' }]}>-14.9</Text>
              <Text style={styles.reportMetricSub}>18 Incorrect</Text>
            </View>
          </View>

          {/* Topic-Wise Diagnostic Breakdown */}
          <Text style={styles.reportSectionTitle}>Syllabus Topic Breakdown & Weak Area Diagnosis</Text>
          <View style={styles.reportBarsList}>
            {/* Topic 1 */}
            <View style={styles.reportBarItem}>
              <View style={styles.reportBarLabelRow}>
                <Text style={styles.reportBarTopic}>Educational Administration & NEP 2020</Text>
                <Text style={[styles.reportBarPct, { color: '#059669' }]}>88% (Strong)</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: '88%', backgroundColor: '#10B981' }]} />
              </View>
            </View>

            {/* Topic 2 */}
            <View style={styles.reportBarItem}>
              <View style={styles.reportBarLabelRow}>
                <Text style={styles.reportBarTopic}>Service Rules: CCS (Conduct & CCA) Rules</Text>
                <Text style={[styles.reportBarPct, { color: '#059669' }]}>82% (Strong)</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: '82%', backgroundColor: '#10B981' }]} />
              </View>
            </View>

            {/* Topic 3 */}
            <View style={styles.reportBarItem}>
              <View style={styles.reportBarLabelRow}>
                <Text style={styles.reportBarTopic}>Child Rights & Acts: POCSO 2012 & RTE 2009</Text>
                <Text style={[styles.reportBarPct, { color: '#059669' }]}>90% (Mastered)</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: '90%', backgroundColor: '#059669' }]} />
              </View>
            </View>

            {/* Topic 4 - WEAK AREA */}
            <View style={styles.reportBarItem}>
              <View style={styles.reportBarLabelRow}>
                <Text style={styles.reportBarTopic}>Financial Administration: GFR 2017 & GeM</Text>
                <Text style={[styles.reportBarPct, { color: '#D97706' }]}>54% (Action Needed)</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: '54%', backgroundColor: '#F59E0B' }]} />
              </View>
            </View>
          </View>

          {/* AI Targeted Action Recommendation */}
          <View style={styles.aiAlertBox}>
            <View style={styles.aiAlertHeader}>
              <AlertCircle size={16} color="#D97706" />
              <Text style={styles.aiAlertTitle}>AI Diagnostic Action Item for this Test</Text>
            </View>
            <Text style={styles.aiAlertText}>
              You lost 7.5 marks on GFR Rule 149 (Direct Purchase limits on GeM) and Rule 155. We recommend attempting the 15-question topic test <Text style={{ fontWeight: '700', color: '#B45309' }}>"Financial Administration: GFR & GeM Procurement"</Text> to recover these marks before your next full mock.
            </Text>
          </View>
        </View>
      </View>

      {/* ================= SYLLABUS MODULES BREAKDOWN ================= */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <BookOpen size={20} color="#059669" />
            <Text style={styles.sectionTitle}>Curriculum Mapped 100% to UPSC 2026</Text>
          </View>
        </View>

        <View style={[styles.modulesGrid, isDesktop && styles.modulesGridDesktop]}>
          {syllabusModules.map((module, i) => {
            const IconComponent = module.icon;
            return (
              <View key={i} style={[styles.moduleCard, isDesktop && styles.moduleCardDesktop]}>
                <View style={styles.moduleCardHeader}>
                  <View style={[styles.statIconBox, { backgroundColor: module.iconBg }]}>
                    <IconComponent size={20} color={module.iconColor} />
                  </View>
                  <View style={styles.moduleCountBadge}>
                    <Text style={[styles.moduleCountText, { color: module.iconColor }]}>{module.tests}</Text>
                  </View>
                </View>
                <Text style={styles.moduleTitle}>{module.title}</Text>
                <Text style={styles.moduleHighlights}>{module.highlights}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* ================= FREE VS PREMIUM COMPARISON ================= */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Crown size={20} color="#F59E0B" />
            <Text style={styles.sectionTitle}>Free Tier vs Premium Pass</Text>
          </View>
        </View>

        <View style={styles.comparisonTable}>
          {/* Header */}
          <View style={styles.compTableHeader}>
            <Text style={[styles.compColFeature, styles.compHeaderTitle]}>Features</Text>
            <Text style={[styles.compColFree, styles.compHeaderTitle]}>Free Tier</Text>
            <View style={[styles.compColPremium, styles.compHeaderHighlight]}>
              <Crown size={14} color="#F59E0B" />
              <Text style={[styles.compHeaderTitle, { color: '#1E40AF' }]}>Premium Pass</Text>
            </View>
          </View>

          {/* Rows */}
          <View style={styles.compTableRow}>
            <Text style={styles.compColFeature}>Daily New Tests Added</Text>
            <Text style={styles.compColFree}>❌ None</Text>
            <Text style={[styles.compColPremium, styles.compBold]}>⚡ New Tests Everyday</Text>
          </View>

          <View style={styles.compTableRow}>
            <Text style={styles.compColFeature}>Full Mock Tests (120 Qs)</Text>
            <Text style={styles.compColFree}>1 Sample Test</Text>
            <Text style={[styles.compColPremium, styles.compBold]}>All 26 Full Mocks</Text>
          </View>

          <View style={styles.compTableRow}>
            <Text style={styles.compColFeature}>Topic-Wise Practice Tests</Text>
            <Text style={styles.compColFree}>1 Topic</Text>
            <Text style={[styles.compColPremium, styles.compBold]}>All 158 Topic Packs</Text>
          </View>

          <View style={styles.compTableRow}>
            <Text style={styles.compColFeature}>Bilingual English / Hindi</Text>
            <Text style={styles.compColFree}>Basic</Text>
            <Text style={[styles.compColPremium, styles.compBold]}>100% Full Bilingual</Text>
          </View>

          <View style={styles.compTableRow}>
            <Text style={styles.compColFeature}>Swamy's Handbook Rule Citations</Text>
            <Text style={styles.compColFree}>Key only</Text>
            <Text style={[styles.compColPremium, styles.compBold]}>Full Legal Rationale</Text>
          </View>

          <View style={styles.compTableRow}>
            <Text style={styles.compColFeature}>AI Weak Area Diagnostics</Text>
            <Text style={styles.compColFree}>❌ Not included</Text>
            <Text style={[styles.compColPremium, styles.compBold]}>Full Diagnostic Engine</Text>
          </View>

          <View style={styles.compTableRow}>
            <Text style={styles.compColFeature}>Test Re-attempts</Text>
            <Text style={styles.compColFree}>1 Attempt</Text>
            <Text style={[styles.compColPremium, styles.compBold]}>Unlimited Re-attempts</Text>
          </View>
        </View>
      </View>

      {/* ================= HOW WE COMPARE WITH OTHER APPS ================= */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Scale size={20} color="#2563EB" />
            <Text style={styles.sectionTitle}>Why Aspirants Choose Us Over Generic Test Apps</Text>
          </View>
        </View>

        <View style={styles.comparisonTable}>
          {/* Header */}
          <View style={styles.compTableHeader}>
            <Text style={[styles.compColFeature, styles.compHeaderTitle]}>What Matters for UPSC</Text>
            <Text style={[styles.compColFree, styles.compHeaderTitle]}>Generic Apps (Testbook / Adda247)</Text>
            <View style={[styles.compColPremium, styles.compHeaderHighlight]}>
              <Crown size={14} color="#F59E0B" />
              <Text style={[styles.compHeaderTitle, { color: '#1E40AF' }]}>Our Exam AI Pass</Text>
            </View>
          </View>

          {/* Rows */}
          <View style={styles.compTableRow}>
            <Text style={styles.compColFeature}>Exam Focus & Pedagogy</Text>
            <Text style={styles.compColFree}>Generic recycled banks from SSC/Railways/Clerk</Text>
            <Text style={[styles.compColPremium, styles.compBold]}>100% Dedicated to UPSC Principal & Vice-Principal</Text>
          </View>

          <View style={styles.compTableRow}>
            <Text style={styles.compColFeature}>Test Updates & Freshness</Text>
            <Text style={styles.compColFree}>Static question banks created years ago</Text>
            <Text style={[styles.compColPremium, styles.compBold]}>🚀 New Tests Built & Added Everyday</Text>
          </View>

          <View style={styles.compTableRow}>
            <Text style={styles.compColFeature}>Service Rules Legal Accuracy</Text>
            <Text style={styles.compColFree}>Basic answer keys with no rule or order references</Text>
            <Text style={[styles.compColPremium, styles.compBold]}>Authentic Swamy's Handbook legal rationales (CCS/GFR)</Text>
          </View>

          <View style={styles.compTableRow}>
            <Text style={styles.compColFeature}>Real Administrative Scenarios</Text>
            <Text style={styles.compColFree}>Superficial rote theory; misses real school situations</Text>
            <Text style={[styles.compColPremium, styles.compBold]}>Real-world leadership dilemmas (POCSO, RTE, GeM limits)</Text>
          </View>

          <View style={styles.compTableRow}>
            <Text style={styles.compColFeature}>Bilingual Quality</Text>
            <Text style={styles.compColFree}>Clunky machine translations with awkward phrasing</Text>
            <Text style={[styles.compColPremium, styles.compBold]}>100% Native English & Devanagari Hindi translation</Text>
          </View>

          <View style={styles.compTableRow}>
            <Text style={styles.compColFeature}>Pricing & Commitments</Text>
            <Text style={styles.compColFree}>₹1,500 – ₹3,000/yr recurring auto-renew subscriptions</Text>
            <Text style={[styles.compColPremium, styles.compBold]}>₹499 one-time • Zero renewals • Valid till exam day</Text>
          </View>
        </View>
      </View>

      {/* ================= FREQUENTLY ASKED QUESTIONS ================= */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <HelpCircle size={20} color="#64748B" />
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          </View>
        </View>

        <View style={styles.faqList}>
          {faqs.map((faq, index) => {
            const isExpanded = expandedFaq === index;
            return (
              <TouchableOpacity
                key={index}
                style={styles.faqCard}
                onPress={() => setExpandedFaq(isExpanded ? null : index)}
                activeOpacity={0.7}
              >
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQuestion}>{faq.q}</Text>
                  {isExpanded ? (
                    <ChevronUp size={20} color="#64748B" />
                  ) : (
                    <ChevronDown size={20} color="#64748B" />
                  )}
                </View>
                {isExpanded && <Text style={styles.faqAnswer}>{faq.a}</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ================= BOTTOM CONVERSION CTA BANNER ================= */}
      {!isSubscribed && (
        <ImageBackground
          source={require('@/assets/images/upsc-bg.png')}
          style={[styles.bottomCtaBanner, { backgroundColor: '#1E40AF' }]}
          imageStyle={{ borderRadius: 24, opacity: 0.35, width: '100%', height: '100%' }}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(30,64,175,0.9)', 'rgba(59,130,246,0.75)']}
            style={[StyleSheet.absoluteFillObject, { borderRadius: 24 }]}
          />
          <View style={styles.bottomCtaContent}>
            <View style={styles.bottomTag}>
              <Crown size={14} color="#F59E0B" />
              <Text style={styles.bottomTagText}>ALL-ACCESS PASS • 2026 EDITION</Text>
            </View>

            <Text style={styles.bottomTitle}>Prepare with a Complete Mock-Test System.</Text>
            <Text style={styles.bottomSub}>
              Unlock all 26 full-length mocks, 158 topic tests, daily fresh papers, and Swamy's Handbook legal rationales. Instant activation for ₹499.
            </Text>

            <TouchableOpacity
              style={styles.bottomBtn}
              onPress={handlePurchase}
              disabled={loading}
              activeOpacity={0.9}
            >
              <Text style={styles.bottomBtnText}>
                {loading ? 'Processing...' : appliedCoupon?.isFree ? '✨ Unlock Lifetime Access · Free' : appliedCoupon ? `Get Full Test Access · ₹${appliedCoupon.finalAmount}` : 'Get Full Test Access · ₹499'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.bottomFootnote}>
              One-time payment · No recurring charges · Valid until UPSC 2026 exam day
            </Text>
          </View>
        </ImageBackground>
      )}

      {/* Help Support Card */}
      <View style={styles.supportBox}>
        <View style={[styles.statIconBox, { backgroundColor: '#E0F2FE' }]}>
          <MessageCircle size={20} color="#0284C7" />
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.supportTitle}>Need Help or Have a Question?</Text>
          <Text style={styles.supportDesc}>
            Our educator support desk is active Mon–Sat (9 AM to 8 PM). Reach us at <Text style={{ fontWeight: '700', color: '#0369A1' }}>support@exam-ai.com</Text>.
          </Text>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </View>
  );

  const renderPhoneModal = () => {
    const isCleanPhoneValid = phoneNumber.replace(/\D/g, '').length === 10;
    return (
      <Modal
        visible={showPhoneModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!loading) setShowPhoneModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header Icon */}
            <View style={styles.modalHeaderIcon}>
              <Phone size={24} color="#2563EB" />
            </View>
            <Text style={styles.modalTitle}>Enter Mobile Number</Text>
            <Text style={styles.modalSubtitle}>
              Cashfree requires your 10-digit mobile number for transaction receipts and payment verification.
            </Text>

            {/* Input Box */}
            <View style={[styles.phoneInputContainer, phoneError ? styles.phoneInputContainerError : null]}>
              <View style={styles.phoneCountryPrefix}>
                <Text style={styles.phoneCountryFlag}>🇮🇳</Text>
                <Text style={styles.phoneCountryCode}>+91</Text>
              </View>
              <TextInput
                style={styles.phoneTextInput}
                placeholder="Enter 10-digit number"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                maxLength={10}
                value={phoneNumber}
                onChangeText={(text) => {
                  const cleaned = text.replace(/\D/g, '');
                  setPhoneNumber(cleaned);
                  if (cleaned.length === 10) {
                    setPhoneError('');
                  }
                }}
                autoFocus
              />
            </View>

            {phoneError ? (
              <Text style={styles.phoneErrorText}>{phoneError}</Text>
            ) : null}

            {/* Modal Actions */}
            <TouchableOpacity
              style={[
                styles.modalSubmitBtn,
                !isCleanPhoneValid && styles.modalSubmitBtnDisabled,
              ]}
              onPress={() => {
                const clean = phoneNumber.replace(/\D/g, '').slice(-10);
                if (clean.length !== 10) {
                  setPhoneError('Please enter a valid 10-digit mobile number');
                  return;
                }
                proceedWithPayment(clean);
              }}
              disabled={loading || !isCleanPhoneValid}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Proceed to Payment · ₹{appliedCoupon ? appliedCoupon.finalAmount : 499}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setShowPhoneModal(false)}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const isPageLoading = isSubscriptionLoading || (user && localSubscribed === null && checkingStatus);

  if (isPageLoading) {
    const loadingView = (
      <View style={{ flex: 1, minHeight: 450, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ marginTop: 16, fontSize: 16, fontWeight: '600', color: '#1E293B' }}>
          Verifying All-Access Pass...
        </Text>
        <Text style={{ marginTop: 6, fontSize: 14, color: '#64748B', textAlign: 'center' }}>
          Checking your subscription status with first priority
        </Text>
      </View>
    );

    if (isDesktop) {
      return (
        <DesktopDashboard disableScroll={true}>
          {loadingView}
        </DesktopDashboard>
      );
    }

    return (
      <SafeAreaView style={styles.mobileSafeArea} edges={['top', 'bottom']}>
        <StatusBar style="light" />
        <View style={styles.mobileTopBar}>
          <TouchableOpacity
            style={styles.mobileBackBtn}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/');
              }
            }}
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.mobileHeaderCenter}>
            <Text style={styles.mobileHeaderTitle}>Premium Pass</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
        {loadingView}
      </SafeAreaView>
    );
  }

  // If on large screen / desktop, wrap inside the app's standard DesktopDashboard layout!
  if (isDesktop) {
    return (
      <>
        <DesktopDashboard disableScroll={false}>
          {pageContent}
        </DesktopDashboard>
        {renderPhoneModal()}
      </>
    );
  }

  // On Mobile: Render clean native mobile layout with top header & sticky bottom purchase bar
  return (
    <SafeAreaView style={styles.mobileSafeArea} edges={['top', 'bottom']}>
      <StatusBar style="light" />

      {/* MOBILE TOP BAR (MATCHES MOBILE DASHBOARD HEADER TONE) */}
      <View style={styles.mobileTopBar}>
        <TouchableOpacity
          style={styles.mobileBackBtn}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          }}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.mobileHeaderCenter}>
          <Crown size={18} color="#F59E0B" />
          <Text style={styles.mobileHeaderTitle}>All-Access Pass (2026)</Text>
        </View>
        <TouchableOpacity
          style={styles.mobileHelpBtn}
          onPress={() => {
            const msg = 'Contact Support: support@exam-ai.com';
            if (Platform.OS === 'web') window.alert(msg);
            else alert(msg);
          }}
        >
          <Text style={styles.mobileHelpText}>Help</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.mobileScrollView}
        contentContainerStyle={{ paddingBottom: isSubscribed ? 30 : 90 }}
        showsVerticalScrollIndicator={false}
      >
        {pageContent}
      </ScrollView>

      {/* STICKY BOTTOM BUY BAR ON MOBILE */}
      {!isSubscribed && (
        <View style={styles.stickyMobileBar}>
          <View>
            <View style={styles.stickyPriceRow}>
              <Text style={styles.stickyPrice}>{appliedCoupon ? (appliedCoupon.isFree ? '₹0' : `₹${appliedCoupon.finalAmount}`) : '₹499'}</Text>
              <Text style={styles.stickyPriceCut}>₹1,499</Text>
            </View>
            <Text style={styles.stickyPeriod}>Full 2026 Exam Cycle</Text>
          </View>
          <TouchableOpacity
            style={styles.stickyBuyBtn}
            onPress={handlePurchase}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.stickyBuyBtnText}>{appliedCoupon?.isFree ? '✨ Unlock Free' : appliedCoupon ? `Pay ₹${appliedCoupon.finalAmount}` : 'Get Full Test Access · ₹499'}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {renderPhoneModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Coupon Box Styles
  couponContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 16,
  },
  couponHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  couponHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  couponInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  couponInput: {
    flex: 1,
    height: 42,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  applyCouponBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyCouponBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  applyCouponBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  couponErrorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 6,
    fontWeight: '500',
  },
  appliedCouponBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 10,
    padding: 10,
  },
  appliedCouponCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  appliedPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  appliedPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
  },
  appliedCouponDesc: {
    fontSize: 12,
    color: '#166534',
    marginTop: 2,
    fontWeight: '500',
  },
  removeCouponBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  removeCouponText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },

  pageWrapper: {
    padding: 16,
    maxWidth: 1140,
    alignSelf: 'center',
    width: '100%',
  },
  mobileSafeArea: {
    flex: 1,
    backgroundColor: '#3B82F6',
  },
  mobileTopBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#3B82F6',
  },
  mobileBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileHeaderCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mobileHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  mobileHelpBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  mobileHelpText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    fontWeight: '600',
  },
  mobileScrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  heroBanner: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    overflow: 'hidden',
  },
  heroContent: {
    zIndex: 2,
  },
  heroTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  heroTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  heroTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(52, 211, 153, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  heroVerifiedText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '800',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 34,
    marginBottom: 8,
  },
  heroDesc: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
    marginBottom: 20,
    maxWidth: 720,
  },
  heroMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  heroMetricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    minWidth: 130,
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  metricLbl: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  activePlanCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#34D399',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  activePlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeCheckCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePlanTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  activePlanSub: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  activePlanActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 18,
  },
  exploreTestsBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  exploreTestsBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  pricingSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  pricingLayout: {
    gap: 24,
  },
  pricingLayoutDesktop: {
    flexDirection: 'row',
    gap: 36,
  },
  pricingLeftCol: {
    flex: 1.2,
  },
  pricingRightCol: {
    flex: 0.9,
    justifyContent: 'center',
  },
  launchOfferTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  launchOfferTagText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '800',
  },
  pricingPlanName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  pricingPlanSub: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  anchorPriceBlock: {
    alignItems: 'center',
    marginBottom: 16,
  },
  anchorPriceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  anchorCurrency: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
  },
  anchorAmount: {
    fontSize: 54,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 58,
    letterSpacing: -1,
  },
  anchorDiscountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 6,
  },
  anchorOriginalPrice: {
    fontSize: 18,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    fontWeight: '700',
  },
  anchorSavePill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  anchorSavePillText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '800',
  },
  anchorTermsText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  checklist: {
    gap: 10,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  boldText: {
    fontWeight: '800',
    color: '#0F172A',
  },
  checkoutActionBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  trustShieldPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  trustShieldText: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '700',
  },
  payNowBtn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 8,
  },
  payNowBtnDisabled: {
    opacity: 0.6,
  },
  payNowGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 8,
  },
  payNowBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  clarityPointsList: {
    width: '100%',
    gap: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  clarityPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clarityPointText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
    flex: 1,
  },
  cleanTrustRow: {
    width: '100%',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
  },
  cleanTrustText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
  },
  cleanPayBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  cleanPayBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  beforePurchasingGrid: {
    gap: 12,
  },
  beforePurchasingGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  beforePurchasingCard: {
    flex: 1,
    minWidth: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  bpCardQuestion: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  bpCardAnswer: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  reportTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  reportTagText: {
    color: '#1E40AF',
    fontSize: 11,
    fontWeight: '700',
  },
  sampleReportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  reportCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 16,
  },
  reportExamName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  reportScoreText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  reportScoreHighlight: {
    fontSize: 16,
    fontWeight: '900',
    color: '#2563EB',
  },
  percentileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  percentileBadgeText: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '800',
  },
  reportMetricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  reportMetricBox: {
    flex: 1,
    minWidth: 110,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reportMetricLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  reportMetricVal: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 2,
  },
  reportMetricSub: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  reportSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  reportBarsList: {
    gap: 12,
    marginBottom: 18,
  },
  reportBarItem: {
    gap: 4,
  },
  reportBarLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportBarTopic: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  reportBarPct: {
    fontSize: 11,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  aiAlertBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  aiAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  aiAlertTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  aiAlertText: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 18,
  },
  sectionBlock: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  interactiveHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  bilingualToggle: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 3,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  toggleBtnTextActive: {
    color: '#1E40AF',
    fontWeight: '800',
  },
  sampleQuestionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  sampleCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  topicBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  topicBadgeText: {
    color: '#1E40AF',
    fontSize: 11,
    fontWeight: '700',
  },
  marksBadgeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  sampleQuestionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 22,
    marginBottom: 16,
  },
  optionsList: {
    gap: 8,
    marginBottom: 14,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  optionItemSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  optionItemCorrect: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  optionItemWrong: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  optionLetterCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterCircleSelected: {
    backgroundColor: '#3B82F6',
  },
  optionLetterCircleCorrect: {
    backgroundColor: '#10B981',
  },
  optionLetterCircleWrong: {
    backgroundColor: '#EF4444',
  },
  optionLetterText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  optionContentText: {
    flex: 1,
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
  },
  explanationBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  explanationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  explanationTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065F46',
  },
  explanationText: {
    fontSize: 12,
    color: '#047857',
    lineHeight: 18,
  },
  revealHintBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  revealHintText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  modulesGrid: {
    gap: 12,
  },
  modulesGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  moduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  moduleCardDesktop: {
    width: '48.8%',
  },
  moduleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  moduleCountBadge: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  moduleCountText: {
    fontSize: 11,
    fontWeight: '800',
  },
  moduleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  moduleHighlights: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  comparisonTable: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  compTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  compHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  compHeaderHighlight: {
    backgroundColor: '#EFF6FF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'center',
  },
  compTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 12,
  },
  compColFeature: {
    flex: 1.4,
    paddingHorizontal: 16,
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  compColFree: {
    flex: 1,
    paddingHorizontal: 8,
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  compColPremium: {
    flex: 1.2,
    paddingHorizontal: 8,
    fontSize: 12,
    color: '#1E40AF',
    textAlign: 'center',
  },
  compBold: {
    fontWeight: '800',
  },
  faqList: {
    gap: 10,
  },
  faqCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    paddingRight: 8,
  },
  faqAnswer: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  bottomCtaBanner: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 20,
  },
  bottomCtaContent: {
    alignItems: 'center',
    zIndex: 2,
  },
  bottomTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  bottomTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  bottomTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  bottomSub: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    maxWidth: 560,
    lineHeight: 19,
    marginBottom: 18,
  },
  bottomBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 8,
  },
  bottomBtnText: {
    color: '#1E40AF',
    fontSize: 15,
    fontWeight: '900',
  },
  bottomFootnote: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  supportBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  supportTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  supportDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  stickyMobileBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
  stickyPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  stickyPrice: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  stickyPriceCut: {
    fontSize: 13,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  stickyPeriod: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  stickyBuyBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  stickyBuyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
    elevation: 10,
  },
  modalHeaderIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    width: '100%',
    height: 52,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  phoneInputContainerError: {
    borderColor: '#EF4444',
  },
  phoneCountryPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    height: '100%',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    gap: 6,
  },
  phoneCountryFlag: {
    fontSize: 16,
  },
  phoneCountryCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  phoneTextInput: {
    flex: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    height: '100%',
  },
  phoneErrorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
    alignSelf: 'flex-start',
    fontWeight: '500',
  },
  modalSubmitBtn: {
    backgroundColor: '#2563EB',
    width: '100%',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  modalSubmitBtnDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  modalCancelBtn: {
    marginTop: 12,
    paddingVertical: 8,
  },
  modalCancelBtnText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
});
