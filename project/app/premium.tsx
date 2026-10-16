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
  Image,
  ImageBackground,
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
  Star,
  Users,
  CheckCircle2,
  FileText,
  TrendingUp,
  AlertCircle,
  PhoneCall,
  MessageCircle,
  ExternalLink,
} from 'lucide-react-native';
import { useAuth } from '@/context/auth-context';
import userService from '@/services/user-service';
import { initiatePayment } from '@/utils/razorpay';

export default function PremiumScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const isTablet = width >= 600 && width < 900;
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Interactive Live Preview State
  const [sampleLang, setSampleLang] = useState<'en' | 'hi'>('en');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    checkSubscriptionStatus();
  }, [user]);

  const checkSubscriptionStatus = async () => {
    setCheckingStatus(true);
    try {
      const profile = await userService.getUserProfile(user?.uid);
      setIsSubscribed(!!profile?.isSubscribed);
    } catch (e) {
      console.error('Error checking subscription:', e);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handlePurchase = () => {
    setLoading(true);
    initiatePayment(
      async () => {
        try {
          await userService.setSubscriptionStatus(true);
          setIsSubscribed(true);
          setLoading(false);
          const successMsg = '🎉 Congratulations! You now have full unrestricted access to all UPSC Principal Mock Tests and AI Analytics.';
          if (Platform.OS === 'web') {
            window.alert(successMsg);
          } else {
            alert(successMsg);
          }
        } catch (e) {
          console.error('Error saving subscription:', e);
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
        userName: user?.displayName || 'Aspirant',
        userEmail: user?.email || '',
        amountInPaise: 49900,
      }
    );
  };

  const handleDevReset = async () => {
    await userService.setSubscriptionStatus(false);
    setIsSubscribed(false);
    if (Platform.OS === 'web') {
      window.alert('Subscription reset to Free Tier for testing.');
    } else {
      alert('Subscription reset to Free Tier for testing.');
    }
  };

  const sampleQuestion = {
    en: {
      question:
        'Under Rule 3(1) of the Central Civil Services (Conduct) Rules 1964, which of the following duties is specifically mandated for a Government servant holding supervisory or administrative charge in an educational institution?',
      options: [
        'To ensure the integrity and devotion to duty of all government servants under his control and authority.',
        'To submit annual confidential reports directly to the Ministry of Education without review.',
        'To permit staff members to engage in private commercial coaching after school hours.',
        'To waive disciplinary proceedings for non-gazetted teaching staff upon written apology.',
      ],
      correctIndex: 0,
      explanation:
        'Correct Answer: (A). Rule 3(2)(i) and Rule 3(1) of CCS (Conduct) Rules explicitly mandate that every Government servant holding a supervisory post shall take all possible steps to ensure the integrity and devotion to duty of all government servants for the time being under his control and authority.',
      topic: 'Service Rules & CCS Conduct Rules 1964',
    },
    hi: {
      question:
        'केंद्रीय सिविल सेवा (आचरण) नियम 1964 के नियम 3(1) के अंतर्गत, एक शैक्षणिक संस्थान में पर्यवेक्षी या प्रशासनिक प्रभार संभालने वाले सरकारी कर्मचारी के लिए निम्नलिखित में से कौन सा कर्तव्य अनिवार्य है?',
      options: [
        'अपने नियंत्रण और प्राधिकार में कार्यरत सभी कर्मचारियों की सत्यनिष्ठा और कर्तव्यपरायणता सुनिश्चित करना।',
        'बिना समीक्षा के सीधे शिक्षा मंत्रालय को वार्षिक गोपनीय रिपोर्ट प्रस्तुत करना।',
        'स्कूल समय के बाद कर्मचारियों को निजी व्यावसायिक कोचिंग में संलग्न होने की अनुमति देना।',
        'लिखित क्षमायाचना पर गैर-राजपत्रित शिक्षण कर्मचारियों के विरुद्ध अनुशासनात्मक कार्यवाही रद्द करना।',
      ],
      correctIndex: 0,
      explanation:
        'सही उत्तर: (A)। सीसीएस (आचरण) नियम के नियम 3(2)(i) और नियम 3(1) में स्पष्ट रूप से कहा गया है कि पर्यवेक्षी पद धारण करने वाले प्रत्येक सरकारी कर्मचारी का दायित्व है कि वह अपने नियंत्रण में कार्यरत सभी कर्मचारियों की सत्यनिष्ठा और कर्तव्य के प्रति निष्ठा सुनिश्चित करने के लिए सभी संभव कदम उठाए।',
      topic: 'सेवा नियम और सीसीएस आचरण नियम 1964',
    },
  };

  const syllabusModules = [
    {
      title: 'Educational Administration & School Leadership',
      tests: '15 Full Mocks',
      highlights: 'NEP 2020, NCF-SE 2023, School Development Plans, Pedagogical Leadership, CBSE Bye-laws',
      icon: BookOpen,
      color: '#3B82F6',
    },
    {
      title: 'Service & Conduct Rules (Swamy’s Handbook)',
      tests: '12 Topic Tests',
      highlights: 'CCS (Conduct) Rules 1964, CCS (CCA) Rules 1965, Leave Rules, LTC, Medical Attendance Rules',
      icon: Award,
      color: '#10B981',
    },
    {
      title: 'Financial Administration & Accounts',
      tests: '10 Topic Tests',
      highlights: 'General Financial Rules (GFR 2017), GeM Procurement, VPF/GPF, Contingency Grants, Audit & Budget',
      icon: BarChart2,
      color: '#F59E0B',
    },
    {
      title: 'Child Rights, Protection & Acts',
      tests: '8 Topic Tests',
      highlights: 'POCSO Act 2012 (Mandatory Reporting), RTE Act 2009 (PTR, Section 12), RPwD Act 2016',
      icon: ShieldCheck,
      color: '#8B5CF6',
    },
    {
      title: 'General Studies & Government Initiatives',
      tests: '10 Full Mocks',
      highlights: 'PM SHRI Schools, Samagra Shiksha, DIKSHA, Vidyanjali, Current Educational Schemes & Policies',
      icon: Globe,
      color: '#EC4899',
    },
  ];

  const faqs = [
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
      a: 'We support all secure payment methods via Razorpay: UPI (Google Pay, PhonePe, Paytm, BHIM, CRED), Credit/Debit Cards (Visa, Mastercard, RuPay), NetBanking from 50+ banks, and Wallets.',
    },
  ];

  const activeQuestion = sampleQuestion[sampleLang];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="light" />

      {/* TOP NAVIGATION BAR */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerBrand}>
          <Crown size={20} color="#F59E0B" />
          <Text style={styles.headerTitle}>UPSC Principal 2026</Text>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>PREMIUM</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.helpHeaderBtn}
          onPress={() => {
            const msg = 'Contact Support:\nEmail: support@exam-ai.com\nHelpline: +91 98765 43210';
            if (Platform.OS === 'web') window.alert(msg);
            else alert(msg);
          }}
        >
          <MessageCircle size={18} color="#94A3B8" />
          <Text style={styles.helpHeaderText}>Help</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= HERO SECTION ================= */}
        <ImageBackground
          source={require('@/assets/images/upsc-bg.png')}
          style={styles.heroBackground}
          imageStyle={styles.heroBackgroundImage}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(15, 23, 42, 0.95)', 'rgba(30, 58, 138, 0.92)', 'rgba(15, 23, 42, 0.98)']}
            style={styles.heroOverlay}
          >
            <View style={[styles.heroContent, isDesktop && styles.heroContentDesktop]}>
              {/* Trust Tag */}
              <View style={styles.trustBadgeRow}>
                <View style={styles.heroTag}>
                  <ShieldCheck size={13} color="#10B981" />
                  <Text style={styles.heroTagText}>UPSC GNCTD & KVS 2026 PATTERN</Text>
                </View>
                <View style={styles.verifiedTag}>
                  <CheckCircle2 size={13} color="#38BDF8" />
                  <Text style={styles.verifiedTagText}>3,145 QUESTIONS • 100% BILINGUAL</Text>
                </View>
              </View>

              <Text style={styles.heroMainTitle}>
                Comprehensive UPSC Principal & Vice-Principal Test Series
              </Text>

              <Text style={styles.heroDescription}>
                Built for educators, Vice-Principals, and PGTs. Includes 26 full-length mocks (120 questions each), 158 topic-wise tests, authentic Swamy’s Handbook rule references, 100% bilingual papers, and AI-powered performance diagnostics.
              </Text>

              {/* Key Highlights Pill Row */}
              <View style={styles.pillStatsGrid}>
                <View style={styles.statPill}>
                  <FileText size={16} color="#60A5FA" />
                  <Text style={styles.statPillNum}>26</Text>
                  <Text style={styles.statPillLabel}>Full Mocks</Text>
                </View>
                <View style={styles.statPill}>
                  <BookOpen size={16} color="#A78BFA" />
                  <Text style={styles.statPillNum}>158</Text>
                  <Text style={styles.statPillLabel}>Topic Tests</Text>
                </View>
                <View style={styles.statPill}>
                  <Award size={16} color="#FBBF24" />
                  <Text style={styles.statPillNum}>3,145</Text>
                  <Text style={styles.statPillLabel}>Questions with Rationale</Text>
                </View>
                <View style={styles.statPill}>
                  <Globe size={16} color="#34D399" />
                  <Text style={styles.statPillNum}>100%</Text>
                  <Text style={styles.statPillLabel}>Bilingual (Eng/हिन्दी)</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>

        {/* ================= MAIN BODY CONTAINER ================= */}
        <View style={[styles.mainContainer, isDesktop && styles.mainContainerDesktop]}>
          {/* Active Subscriber State */}
          {isSubscribed ? (
            <View style={styles.activeSubscriberCard}>
              <View style={styles.activeSubscriberHeader}>
                <View style={styles.activeIconCircle}>
                  <Crown size={28} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={styles.activeSubscriberTitle}>You are a Premium Member!</Text>
                  <Text style={styles.activeSubscriberSubtitle}>
                    All 50+ Full Mock Tests, Topic Wise Packs & AI Analytics are fully unlocked.
                  </Text>
                </View>
              </View>

              <View style={styles.activeActionsRow}>
                <TouchableOpacity
                  style={styles.activePrimaryBtn}
                  onPress={() => router.push('/test-list')}
                >
                  <Text style={styles.activePrimaryBtnText}>Go to All Tests →</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.activeResetBtn}
                  onPress={handleDevReset}
                >
                  <Text style={styles.activeResetBtnText}>Reset to Free (Dev Test)</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* ================= PRICING HERO CARD ================= */
            <View style={[styles.pricingSection, isDesktop && styles.pricingSectionDesktop]}>
              <View style={styles.pricingLeftCol}>
                <View style={styles.urgencyBar}>
                  <Sparkles size={14} color="#D97706" />
                  <Text style={styles.urgencyText}>SPECIAL LAUNCH OFFER • SAVE ₹1,000</Text>
                </View>

                <Text style={styles.pricingCardTitle}>All-Inclusive UPSC Principal Pass</Text>
                <Text style={styles.pricingCardSubtitle}>
                  One-time payment. Instant full access to every existing and newly released test until your exam day in 2026.
                </Text>

                {/* Price Display */}
                <View style={styles.priceContainer}>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceCurrency}>₹</Text>
                    <Text style={styles.priceMain}>499</Text>
                    <View style={styles.priceCutCol}>
                      <Text style={styles.priceOriginal}>₹1,499</Text>
                      <View style={styles.priceSaveBadge}>
                        <Text style={styles.priceSaveText}>67% OFF</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.priceNote}>
                    Only <Text style={{ fontWeight: '700', color: '#0F172A' }}>₹9.90</Text> per full test paper. No monthly subscriptions.
                  </Text>
                </View>

                {/* Checklist */}
                <View style={styles.checklist}>
                  <View style={styles.checkItem}>
                    <CheckCircle2 size={18} color="#10B981" />
                    <Text style={styles.checkText}>
                      <Text style={styles.boldText}>26 Full-Length Mocks & 158 Topic Tests</Text> (3,145 total questions)
                    </Text>
                  </View>
                  <View style={styles.checkItem}>
                    <CheckCircle2 size={18} color="#10B981" />
                    <Text style={styles.checkText}>
                      <Text style={styles.boldText}>100% Bilingual Interface</Text> with instant English & Hindi toggling
                    </Text>
                  </View>
                  <View style={styles.checkItem}>
                    <CheckCircle2 size={18} color="#10B981" />
                    <Text style={styles.checkText}>
                      <Text style={styles.boldText}>In-Depth Explanations</Text> citing exact Swamy’s Rule numbers, Sections & Acts
                    </Text>
                  </View>
                  <View style={styles.checkItem}>
                    <CheckCircle2 size={18} color="#10B981" />
                    <Text style={styles.checkText}>
                      <Text style={styles.boldText}>All-India Rank & AI Diagnostics</Text> to identify weak syllabus chapters
                    </Text>
                  </View>
                  <View style={styles.checkItem}>
                    <CheckCircle2 size={18} color="#10B981" />
                    <Text style={styles.checkText}>
                      <Text style={styles.boldText}>Unlimited Test Re-attempts</Text> with full score progression tracking
                    </Text>
                  </View>
                  <View style={styles.checkItem}>
                    <CheckCircle2 size={18} color="#10B981" />
                    <Text style={styles.checkText}>
                      <Text style={styles.boldText}>Web + Mobile Access</Text> synced on all your devices
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.pricingRightCol}>
                {/* Buy Button Card */}
                <View style={styles.checkoutActionBox}>
                  <View style={styles.guaranteePill}>
                    <ShieldCheck size={14} color="#059669" />
                    <Text style={styles.guaranteePillText}>100% Satisfaction Guarantee</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.checkoutBtn, loading && styles.checkoutBtnDisabled]}
                    onPress={handlePurchase}
                    disabled={loading}
                    activeOpacity={0.9}
                  >
                    <LinearGradient
                      colors={['#2563EB', '#1D4ED8', '#1E40AF']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.checkoutBtnGradient}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Lock size={18} color="#FFFFFF" />
                          <Text style={styles.checkoutBtnText}>Unlock Full Access • ₹499</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <Text style={styles.checkoutSubtext}>
                    Instant access activated automatically upon payment.
                  </Text>

                  {/* Payment Methods Badges */}
                  <View style={styles.paymentMethodsContainer}>
                    <Text style={styles.paymentMethodsHeader}>ACCEPTED PAYMENT METHODS</Text>
                    <View style={styles.paymentBadgesRow}>
                      <View style={styles.payBadge}>
                        <Text style={styles.payBadgeText}>UPI</Text>
                      </View>
                      <View style={styles.payBadge}>
                        <Text style={styles.payBadgeText}>GPay</Text>
                      </View>
                      <View style={styles.payBadge}>
                        <Text style={styles.payBadgeText}>PhonePe</Text>
                      </View>
                      <View style={styles.payBadge}>
                        <Text style={styles.payBadgeText}>Paytm</Text>
                      </View>
                      <View style={styles.payBadge}>
                        <Text style={styles.payBadgeText}>RuPay</Text>
                      </View>
                      <View style={styles.payBadge}>
                        <Text style={styles.payBadgeText}>Cards / NetBanking</Text>
                      </View>
                    </View>
                    <View style={styles.secureBadgeRow}>
                      <ShieldCheck size={13} color="#64748B" />
                      <Text style={styles.secureText}>Powered by Razorpay • 256-Bit SSL Encrypted</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* ================= INTERACTIVE QUESTION PREVIEW (PROOF OF QUALITY) ================= */}
          <View style={styles.interactivePreviewSection}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <View style={styles.sectionTag}>
                  <Text style={styles.sectionTagText}>LIVE EXAM PREVIEW</Text>
                </View>
                <Text style={styles.sectionTitle}>Experience Real Question Quality</Text>
                <Text style={styles.sectionSubtitle}>
                  Try this sample question from our CCS Conduct Rules module. Notice the authentic Swamy handbook rule citations.
                </Text>
              </View>

              {/* Language Switcher */}
              <View style={styles.langSwitchWrapper}>
                <TouchableOpacity
                  style={[styles.langBtn, sampleLang === 'en' && styles.langBtnActive]}
                  onPress={() => setSampleLang('en')}
                >
                  <Text style={[styles.langBtnText, sampleLang === 'en' && styles.langBtnTextActive]}>English</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.langBtn, sampleLang === 'hi' && styles.langBtnActive]}
                  onPress={() => setSampleLang('hi')}
                >
                  <Text style={[styles.langBtnText, sampleLang === 'hi' && styles.langBtnTextActive]}>हिन्दी</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.previewCard}>
              <View style={styles.previewCardHeader}>
                <View style={styles.questionTopicBadge}>
                  <BookOpen size={12} color="#1E40AF" />
                  <Text style={styles.questionTopicText}>{activeQuestion.topic}</Text>
                </View>
                <View style={styles.marksBadge}>
                  <Text style={styles.marksBadgeText}>+2.5 Marks • -0.83 Negative</Text>
                </View>
              </View>

              <Text style={styles.previewQuestionText}>{activeQuestion.question}</Text>

              {/* Options */}
              <View style={styles.optionsList}>
                {activeQuestion.options.map((opt, idx) => {
                  const letter = String.fromCharCode(65 + idx);
                  const isSelected = selectedOption === idx;
                  const isCorrect = idx === activeQuestion.correctIndex;
                  const showResult = showExplanation;

                  let optStyle = styles.optionItem;
                  let circleStyle = styles.optionLetterCircle;

                  if (showResult && isCorrect) {
                    optStyle = { ...styles.optionItem, ...styles.optionItemCorrect };
                    circleStyle = { ...styles.optionLetterCircle, ...styles.optionLetterCircleCorrect };
                  } else if (showResult && isSelected && !isCorrect) {
                    optStyle = { ...styles.optionItem, ...styles.optionItemWrong };
                    circleStyle = { ...styles.optionLetterCircle, ...styles.optionLetterCircleWrong };
                  } else if (isSelected) {
                    optStyle = { ...styles.optionItem, ...styles.optionItemSelected };
                    circleStyle = { ...styles.optionLetterCircle, ...styles.optionLetterCircleSelected };
                  }

                  return (
                    <TouchableOpacity
                      key={idx}
                      style={optStyle}
                      onPress={() => {
                        setSelectedOption(idx);
                        setShowExplanation(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={circleStyle}>
                        <Text style={styles.optionLetterText}>{letter}</Text>
                      </View>
                      <Text style={styles.optionText}>{opt}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Explanation Box */}
              {showExplanation ? (
                <View style={styles.explanationBox}>
                  <View style={styles.explanationHeader}>
                    <CheckCircle2 size={16} color="#059669" />
                    <Text style={styles.explanationTitle}>Detailed Legal & Pedagogical Rationale</Text>
                  </View>
                  <Text style={styles.explanationContent}>{activeQuestion.explanation}</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.revealExplanationBtn}
                  onPress={() => setShowExplanation(true)}
                >
                  <Text style={styles.revealExplanationText}>Tap any option above to reveal detailed rationale →</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ================= SYLLABUS MODULES BREAKDOWN ================= */}
          <View style={styles.modulesSection}>
            <View style={styles.sectionTag}>
              <Text style={styles.sectionTagText}>COMPREHENSIVE COVERAGE</Text>
            </View>
            <Text style={styles.sectionTitle}>Mapped 100% to UPSC Principal 2026 Syllabus</Text>
            <Text style={styles.sectionSubtitle}>
              Every module is designed around official recruitment guidelines with verified rule citations.
            </Text>

            <View style={[styles.modulesGrid, isDesktop && styles.modulesGridDesktop]}>
              {syllabusModules.map((module, i) => {
                const IconComponent = module.icon;
                return (
                  <View key={i} style={[styles.moduleCard, isDesktop && styles.moduleCardDesktop]}>
                    <View style={styles.moduleHeader}>
                      <View style={[styles.moduleIconBox, { backgroundColor: `${module.color}15` }]}>
                        <IconComponent size={22} color={module.color} />
                      </View>
                      <View style={styles.moduleBadge}>
                        <Text style={[styles.moduleBadgeText, { color: module.color }]}>{module.tests}</Text>
                      </View>
                    </View>
                    <Text style={styles.moduleTitle}>{module.title}</Text>
                    <Text style={styles.moduleHighlights}>{module.highlights}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* ================= AI DIAGNOSTICS PREVIEW ================= */}
          <View style={styles.diagnosticsPreviewCard}>
            <View style={[styles.diagInner, isDesktop && styles.diagInnerDesktop]}>
              <View style={styles.diagLeft}>
                <View style={styles.diagTag}>
                  <Zap size={13} color="#7C3AED" />
                  <Text style={styles.diagTagText}>AI DIAGNOSTICS & AIR PREDICTOR</Text>
                </View>
                <Text style={styles.diagTitle}>Know Exactly Where You Stand Before the Real Exam</Text>
                <Text style={styles.diagDesc}>
                  Our diagnostic engine evaluates your test attempts to identify your specific negative-mark traps and syllabus blind spots.
                </Text>
                <View style={styles.diagBulletList}>
                  <View style={styles.diagBulletItem}>
                    <Check size={16} color="#7C3AED" />
                    <Text style={styles.diagBulletText}>All-India Rank (AIR) and percentile calculation</Text>
                  </View>
                  <View style={styles.diagBulletItem}>
                    <Check size={16} color="#7C3AED" />
                    <Text style={styles.diagBulletText}>Negative marking impact analysis (Score vs Accuracy)</Text>
                  </View>
                  <View style={styles.diagBulletItem}>
                    <Check size={16} color="#7C3AED" />
                    <Text style={styles.diagBulletText}>Topic-by-topic readiness scores (Safe, Moderate, Danger)</Text>
                  </View>
                </View>
              </View>

              {/* Visual Diagnostic Mock Card */}
              <View style={styles.diagRight}>
                <View style={styles.mockReportCard}>
                  <View style={styles.mockReportHeader}>
                    <Text style={styles.mockReportTitle}>Aspirant Performance Diagnostic</Text>
                    <View style={styles.mockStatusLive}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveText}>SAMPLE</Text>
                    </View>
                  </View>

                  <View style={styles.mockScoreRow}>
                    <View style={styles.mockMetricBox}>
                      <Text style={styles.mockMetricVal}>192.5</Text>
                      <Text style={styles.mockMetricLabel}>Predicted Score (/300)</Text>
                    </View>
                    <View style={styles.mockMetricBox}>
                      <Text style={[styles.mockMetricVal, { color: '#059669' }]}>AIR #28</Text>
                      <Text style={styles.mockMetricLabel}>Top 1.2% Percentile</Text>
                    </View>
                    <View style={styles.mockMetricBox}>
                      <Text style={[styles.mockMetricVal, { color: '#2563EB' }]}>84.8%</Text>
                      <Text style={styles.mockMetricLabel}>Accuracy Rate</Text>
                    </View>
                  </View>

                  <View style={styles.mockTopicBars}>
                    <View style={styles.mockBarItem}>
                      <View style={styles.mockBarHeader}>
                        <Text style={styles.mockBarName}>School Leadership & NEP</Text>
                        <Text style={styles.mockBarScore}>88% (Mastered)</Text>
                      </View>
                      <View style={styles.mockBarTrack}>
                        <View style={[styles.mockBarFill, { width: '88%', backgroundColor: '#10B981' }]} />
                      </View>
                    </View>

                    <View style={styles.mockBarItem}>
                      <View style={styles.mockBarHeader}>
                        <Text style={styles.mockBarName}>CCS (Conduct & CCA) Rules</Text>
                        <Text style={styles.mockBarScore}>76% (Good)</Text>
                      </View>
                      <View style={styles.mockBarTrack}>
                        <View style={[styles.mockBarFill, { width: '76%', backgroundColor: '#3B82F6' }]} />
                      </View>
                    </View>

                    <View style={styles.mockBarItem}>
                      <View style={styles.mockBarHeader}>
                        <Text style={styles.mockBarName}>Financial Rules (GFR 2017 & GeM)</Text>
                        <Text style={[styles.mockBarScore, { color: '#EF4444' }]}>52% (Focus Area)</Text>
                      </View>
                      <View style={styles.mockBarTrack}>
                        <View style={[styles.mockBarFill, { width: '52%', backgroundColor: '#EF4444' }]} />
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* ================= FREE VS PREMIUM COMPARISON ================= */}
          <View style={styles.comparisonSection}>
            <View style={styles.sectionTag}>
              <Text style={styles.sectionTagText}>SIDE-BY-SIDE</Text>
            </View>
            <Text style={styles.sectionTitle}>Free Tier vs Premium Pass</Text>

            <View style={styles.comparisonTable}>
              {/* Header */}
              <View style={styles.compTableHeader}>
                <Text style={[styles.compColFeature, styles.compHeaderTitle]}>Feature</Text>
                <Text style={[styles.compColFree, styles.compHeaderTitle]}>Free Tier</Text>
                <View style={[styles.compColPremium, styles.compHeaderPremiumHighlight]}>
                  <Crown size={14} color="#F59E0B" />
                  <Text style={[styles.compHeaderTitle, { color: '#1E40AF' }]}>Premium Pass</Text>
                </View>
              </View>

              {/* Rows */}
              <View style={styles.compTableRow}>
                <Text style={styles.compColFeature}>Full Mock Tests (120 Qs)</Text>
                <Text style={styles.compColFree}>1 Sample Test</Text>
                <Text style={[styles.compColPremium, styles.compPremiumBold]}>All 26 Full Mocks</Text>
              </View>

              <View style={styles.compTableRow}>
                <Text style={styles.compColFeature}>Topic-Wise Test Packs</Text>
                <Text style={styles.compColFree}>1 Pack</Text>
                <Text style={[styles.compColPremium, styles.compPremiumBold]}>All 158 Topic Packs</Text>
              </View>

              <View style={styles.compTableRow}>
                <Text style={styles.compColFeature}>Bilingual English / Hindi</Text>
                <Text style={styles.compColFree}>Basic</Text>
                <Text style={[styles.compColPremium, styles.compPremiumBold]}>100% Full Bilingual</Text>
              </View>

              <View style={styles.compTableRow}>
                <Text style={styles.compColFeature}>Detailed Swamy's Rule Citations</Text>
                <Text style={styles.compColFree}>Answer key only</Text>
                <Text style={[styles.compColPremium, styles.compPremiumBold]}>Full Legal Rationale</Text>
              </View>

              <View style={styles.compTableRow}>
                <Text style={styles.compColFeature}>AI Weak Area Diagnostics & AIR</Text>
                <Text style={styles.compColFree}>❌ Not included</Text>
                <Text style={[styles.compColPremium, styles.compPremiumBold]}>Full Diagnostic Engine</Text>
              </View>

              <View style={styles.compTableRow}>
                <Text style={styles.compColFeature}>Test Re-attempts</Text>
                <Text style={styles.compColFree}>1 Attempt</Text>
                <Text style={[styles.compColPremium, styles.compPremiumBold]}>Unlimited Re-attempts</Text>
              </View>
            </View>
          </View>

          {/* ================= FREQUENTLY ASKED QUESTIONS ================= */}
          <View style={styles.faqSection}>
            <View style={styles.sectionTag}>
              <Text style={styles.sectionTagText}>GOT QUESTIONS?</Text>
            </View>
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

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

          {/* ================= BOTTOM CTA BOX ================= */}
          {!isSubscribed && (
            <LinearGradient
              colors={['#1E1B4B', '#312E81', '#1E40AF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bottomCtaBox}
            >
              <View style={styles.bottomCtaTag}>
                <Crown size={14} color="#F59E0B" />
                <Text style={styles.bottomCtaTagText}>LIMITED TIME INAUGURAL PRICING</Text>
              </View>

              <Text style={styles.bottomCtaTitle}>Ready to Prepare with Authentic UPSC Mock Papers?</Text>
              <Text style={styles.bottomCtaSubtitle}>
                Get full access to all 26 full mocks, 158 topic tests, and detailed bilingual solutions. Immediate access for just ₹499.
              </Text>

              <TouchableOpacity
                style={styles.bottomCtaBtn}
                onPress={handlePurchase}
                disabled={loading}
                activeOpacity={0.9}
              >
                <Text style={styles.bottomCtaBtnText}>
                  {loading ? 'Processing...' : 'Unlock Everything for ₹499 →'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.bottomCtaFooterNote}>
                One-time payment • No recurring deductions • 100% Secure via Razorpay
              </Text>
            </LinearGradient>
          )}

          {/* Support Helpline Card */}
          <View style={styles.supportCard}>
            <View style={styles.supportIconBox}>
              <HelpCircle size={22} color="#0284C7" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.supportTitle}>Need Help or Have a Question?</Text>
              <Text style={styles.supportText}>
                Our educator support team is available Mon-Sat (9 AM - 8 PM). Reach us at <Text style={{ fontWeight: '700' }}>support@exam-ai.com</Text>.
              </Text>
            </View>
          </View>

          <View style={{ height: 60 }} />
        </View>
      </ScrollView>

      {/* STICKY BOTTOM BAR ON MOBILE FOR INSTANT CONVERSION */}
      {!isDesktop && !isSubscribed && (
        <View style={styles.stickyMobileBar}>
          <View>
            <View style={styles.stickyPriceRow}>
              <Text style={styles.stickyPrice}>₹499</Text>
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
              <Text style={styles.stickyBuyBtnText}>Unlock All Tests</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  topHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  headerBadgeText: {
    color: '#FBBF24',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  helpHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  helpHeaderText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  scrollContentDesktop: {
    paddingBottom: 60,
  },
  heroBackground: {
    backgroundColor: '#0F172A',
  },
  heroBackgroundImage: {
    opacity: 0.22,
  },
  heroOverlay: {
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  heroContent: {
    maxWidth: 1100,
    alignSelf: 'center',
    width: '100%',
  },
  heroContentDesktop: {
    paddingVertical: 20,
  },
  trustBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  heroTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  heroTagText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  verifiedTagText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroMainTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 36,
    marginBottom: 14,
    letterSpacing: -0.5,
  },
  heroDescription: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 780,
  },
  pillStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  statPillNum: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  statPillLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  mainContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
    maxWidth: 1120,
    width: '100%',
    alignSelf: 'center',
  },
  mainContainerDesktop: {
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  activeSubscriberCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#4338CA',
  },
  activeSubscriberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#4338CA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeSubscriberTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  activeSubscriberSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    lineHeight: 18,
  },
  activeActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 20,
  },
  activePrimaryBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  activePrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  activeResetBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  activeResetBtnText: {
    color: '#F87171',
    fontSize: 13,
    fontWeight: '700',
  },
  pricingSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pricingSectionDesktop: {
    flexDirection: 'row',
    gap: 36,
    padding: 36,
  },
  pricingLeftCol: {
    flex: 1.2,
  },
  pricingRightCol: {
    flex: 0.9,
    justifyContent: 'center',
  },
  urgencyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  urgencyText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pricingCardTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
  },
  pricingCardSubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 20,
  },
  priceContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 4,
  },
  priceCurrency: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  priceMain: {
    fontSize: 44,
    fontWeight: '900',
    color: '#0F172A',
  },
  priceCutCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  priceOriginal: {
    fontSize: 18,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  priceSaveBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priceSaveText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '800',
  },
  priceNote: {
    fontSize: 12,
    color: '#64748B',
  },
  checklist: {
    gap: 12,
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
    lineHeight: 19,
  },
  boldText: {
    fontWeight: '800',
    color: '#0F172A',
  },
  checkoutActionBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  guaranteePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  guaranteePillText: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '700',
  },
  checkoutBtn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 10,
  },
  checkoutBtnDisabled: {
    opacity: 0.6,
  },
  checkoutBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 10,
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  checkoutSubtext: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 18,
  },
  paymentMethodsContainer: {
    width: '100%',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
  },
  paymentMethodsHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  paymentBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 10,
  },
  payBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  payBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  secureBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  secureText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  interactivePreviewSection: {
    marginBottom: 44,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  sectionTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  sectionTagText: {
    color: '#2563EB',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748B',
    maxWidth: 620,
    lineHeight: 20,
  },
  langSwitchWrapper: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 3,
  },
  langBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  langBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  langBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  langBtnTextActive: {
    color: '#1E40AF',
    fontWeight: '800',
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  previewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  questionTopicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  questionTopicText: {
    color: '#1E40AF',
    fontSize: 11,
    fontWeight: '700',
  },
  marksBadge: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  marksBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  previewQuestionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 24,
    marginBottom: 18,
  },
  optionsList: {
    gap: 10,
    marginBottom: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    width: 26,
    height: 26,
    borderRadius: 13,
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
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  optionText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  explanationBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  explanationTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  explanationContent: {
    fontSize: 13,
    color: '#047857',
    lineHeight: 19,
  },
  revealExplanationBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  revealExplanationText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  modulesSection: {
    marginBottom: 44,
  },
  modulesGrid: {
    gap: 16,
    marginTop: 16,
  },
  modulesGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  moduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  moduleCardDesktop: {
    width: '48.5%',
  },
  moduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  moduleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleBadge: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  moduleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  moduleHighlights: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  diagnosticsPreviewCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 24,
    padding: 24,
    marginBottom: 44,
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 5,
  },
  diagInner: {
    gap: 24,
  },
  diagInnerDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 36,
  },
  diagLeft: {
    flex: 1,
  },
  diagRight: {
    flex: 1,
  },
  diagTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.5)',
  },
  diagTagText: {
    color: '#C4B5FD',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  diagTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
    marginBottom: 10,
  },
  diagDesc: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 18,
  },
  diagBulletList: {
    gap: 10,
  },
  diagBulletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  diagBulletText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    fontWeight: '600',
  },
  mockReportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
  },
  mockReportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  mockReportTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  mockStatusLive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#047857',
  },
  mockScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
  },
  mockMetricBox: {
    alignItems: 'center',
  },
  mockMetricVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  mockMetricLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  mockTopicBars: {
    gap: 10,
  },
  mockBarItem: {},
  mockBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  mockBarName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  mockBarScore: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
  },
  mockBarTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  mockBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  comparisonSection: {
    marginBottom: 44,
  },
  comparisonTable: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 16,
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
  compHeaderPremiumHighlight: {
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
    fontSize: 13,
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
  compPremiumBold: {
    fontWeight: '800',
  },
  faqSection: {
    marginBottom: 44,
  },
  faqList: {
    gap: 12,
    marginTop: 16,
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
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  bottomCtaBox: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 24,
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  bottomCtaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
  },
  bottomCtaTagText: {
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  bottomCtaTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  bottomCtaSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 580,
    lineHeight: 20,
    marginBottom: 20,
  },
  bottomCtaBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 12,
  },
  bottomCtaBtnText: {
    color: '#1E1B4B',
    fontSize: 16,
    fontWeight: '900',
  },
  bottomCtaFooterNote: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
  },
  supportCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  supportIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0369A1',
    marginBottom: 2,
  },
  supportText: {
    fontSize: 12,
    color: '#0284C7',
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
});
