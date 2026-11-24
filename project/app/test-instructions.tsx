import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/auth-context';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';
import {
  ArrowLeft,
  Clock,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Shield,
  Award,
  BookOpen,
  Check,
} from 'lucide-react-native';
import SSCCGLService, { ParsedMockTest } from '@/services/ssc-cgl-service';
import AppShell from '@/components/chalkboard/AppShell';
import Card from '@/components/chalkboard/Card';
import Button from '@/components/chalkboard/Button';
import Pill from '@/components/chalkboard/Pill';

export default function TestInstructionsScreen() {
  const { requireAuth } = useAuth();
  const { colors, typography, radii } = useChalkboardTheme();
  const params = useLocalSearchParams();
  const testId = params.testId as string;
  const filename = params.filename as string;

  const [language, setLanguage] = useState<'english' | 'hindi'>('english');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paper, setPaper] = useState<ParsedMockTest | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const loadPaperMeta = async () => {
      try {
        let loaded: ParsedMockTest | null = null;
        if (filename) {
          try {
            loaded = await SSCCGLService.fetchPaper(filename);
          } catch {}
        }
        if (!loaded && testId) {
          loaded = SSCCGLService.getPaper(testId) || null;
          if (!loaded) {
            try {
              loaded = await SSCCGLService.fetchPaperById(testId);
            } catch {}
          }
        }
        if (!isCancelled && loaded) {
          setPaper(loaded);
        }
      } catch (err) {
        console.warn('Failed to load paper metadata for instructions:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };
    loadPaperMeta();
    return () => {
      isCancelled = true;
    };
  }, [testId, filename]);

  const fileStr = filename || '';
  const idStr = testId || '';
  const isTopic = fileStr.includes('topic_wise') || idStr.includes('topic_wise');
  const isDsssb = fileStr.includes('tgt_pgt') || idStr.includes('tgt_pgt');

  const defaultPos = isTopic ? 2.0 : isDsssb ? 1.0 : 2.5;
  const defaultNeg = isTopic ? 0.67 : isDsssb ? 0.25 : 0.833;

  const durationSecs = paper?.duration
    ? paper.duration <= 300
      ? paper.duration * 60
      : paper.duration
    : isTopic
    ? 1200
    : 7200;
  const durationMins = Math.round(durationSecs / 60);

  const totalQuestions =
    paper?.totalQuestions ||
    (paper?.sections
      ? paper.sections.reduce((acc, s) => acc + (s.questions?.length || 0), 0)
      : isTopic
      ? 10
      : 120);

  const totalMarks = Math.round(totalQuestions * defaultPos);

  const handleStartTest = () => {
    requireAuth(
      () => {
        if (!agreed) {
          alert('Please check the declaration box to proceed.');
          return;
        }

        router.replace({
          pathname: '/mock-test',
          params: { testId, filename, lang: language },
        });
      },
      {
        title: 'Sign In to Begin Test',
        feature: 'Mock Test Session',
        subtitle: 'Sign in to start the test timer and save your score to your profile.',
      }
    );
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (Platform.OS === 'web' && typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      router.replace('/(tabs)/practice');
    }
  };

  const isHindi = language === 'hindi';

  return (
    <AppShell maxWidth={760}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Back Link */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleBack}
          style={styles.backLink}
        >
          <ArrowLeft size={16} color={colors.muted} />
          <Text style={[styles.backText, { color: colors.muted }]}>
            {isHindi ? 'वापस जाएँ' : 'Back to Tests'}
          </Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.headerBlock}>
          <Pill
            label={isTopic ? (isHindi ? 'विषय-वार अभ्यास' : 'Topic Practice') : isDsssb ? 'DSSSB CBT' : 'UPSC CBT Mock'}
            variant="accent"
          />
          <Text
            style={[
              styles.screenTitle,
              {
                color: colors.text,
                fontFamily: Platform.OS === 'web' ? typography.headingFamily : undefined,
              },
            ]}
          >
            {paper?.title || (isHindi ? 'सामान्य परीक्षा निर्देश' : 'General Test Instructions')}
          </Text>
          <Text style={[styles.screenSubtitle, { color: colors.muted }]}>
            {isHindi
              ? 'कृपया परीक्षा प्रारंभ करने से पहले सभी नियमों व अंकन योजना को ध्यान से पढ़ें।'
              : 'Please review the official pattern, duration, and negative marking scheme before beginning.'}
          </Text>
        </View>

        {/* Quick Test Overview Stats */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Clock size={18} color={colors.accent} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {durationMins} {isHindi ? 'मिनट' : 'mins'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>
              {isHindi ? 'समय सीमा' : 'Duration'}
            </Text>
          </Card>

          <Card style={styles.statCard}>
            <BookOpen size={18} color={colors.accent} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {totalQuestions}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>
              {isHindi ? 'कुल प्रश्न' : 'Questions'}
            </Text>
          </Card>

          <Card style={styles.statCard}>
            <Award size={18} color={colors.accent} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {totalMarks}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>
              {isHindi ? 'कुल अंक' : 'Total Marks'}
            </Text>
          </Card>
        </View>

        {/* Language Selection */}
        <Card style={styles.languageCard}>
          <Text style={[styles.cardHeading, { color: colors.text }]}>
            {isHindi ? 'डिफ़ॉल्ट भाषा चुनें (Choose Default Language)' : 'Choose Default Language'}
          </Text>
          <Text style={[styles.cardSubText, { color: colors.muted }]}>
            {isHindi
              ? 'आप परीक्षा के दौरान भी किसी भी प्रश्न की भाषा बदल सकते हैं।'
              : 'You can also toggle between English and Hindi during the test.'}
          </Text>

          <View style={styles.languageToggleRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setLanguage('english')}
              style={[
                styles.langBtn,
                {
                  backgroundColor: !isHindi ? colors.surface : colors.surface2,
                  borderColor: !isHindi ? colors.accent : colors.line,
                },
                !isHindi && styles.langBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.langBtnText,
                  { color: !isHindi ? colors.accentText : colors.muted },
                ]}
              >
                English
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setLanguage('hindi')}
              style={[
                styles.langBtn,
                {
                  backgroundColor: isHindi ? colors.surface : colors.surface2,
                  borderColor: isHindi ? colors.accent : colors.line,
                },
                isHindi && styles.langBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.langBtnText,
                  { color: isHindi ? colors.accentText : colors.muted },
                ]}
              >
                हिंदी (Hindi)
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Detailed Guidelines Card */}
        <Card style={styles.guidelinesCard}>
          <Text style={[styles.cardHeading, { color: colors.text }]}>
            {isHindi ? 'महत्वपूर्ण नियम एवं अंकन योजना' : 'Important Guidelines & Marking Scheme'}
          </Text>

          <View style={styles.ruleItem}>
            <CheckCircle2 size={18} color={colors.success} style={styles.ruleIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.ruleTitle, { color: colors.text }]}>
                {isHindi ? 'सकारात्मक अंकन' : 'Correct Response'}
              </Text>
              <Text style={[styles.ruleDesc, { color: colors.muted }]}>
                {isHindi ? (
                  <>प्रत्येक सही उत्तर के लिए <Text style={{ fontWeight: '700', color: colors.success }}>+{defaultPos} अंक</Text> दिए जाएंगे।</>
                ) : (
                  <>Each correct answer awards <Text style={{ fontWeight: '700', color: colors.success }}>+{defaultPos} marks</Text>.</>
                )}
              </Text>
            </View>
          </View>

          <View style={styles.ruleItem}>
            <AlertCircle size={18} color={colors.danger} style={styles.ruleIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.ruleTitle, { color: colors.text }]}>
                {isHindi ? 'नकारात्मक अंकन (Negative Marking)' : 'Negative Marking'}
              </Text>
              <Text style={[styles.ruleDesc, { color: colors.muted }]}>
                {isHindi ? (
                  <>प्रत्येक गलत उत्तर पर <Text style={{ fontWeight: '700', color: colors.danger }}>-{defaultNeg} अंक</Text> काटे जाएंगे। अनुत्तरित प्रश्नों पर कोई अंक नहीं काटा जाएगा।</>
                ) : (
                  <>Each incorrect answer deducts <Text style={{ fontWeight: '700', color: colors.danger }}>-{defaultNeg} marks</Text>. Unattempted questions carry zero penalty.</>
                )}
              </Text>
            </View>
          </View>

          <View style={styles.ruleItem}>
            <Clock size={18} color={colors.accent} style={styles.ruleIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.ruleTitle, { color: colors.text }]}>
                {isHindi ? 'परीक्षा का समय' : 'CBT Timer & Auto-Submit'}
              </Text>
              <Text style={[styles.ruleDesc, { color: colors.muted }]}>
                {isHindi
                  ? `परीक्षा की समय सीमा ${durationMins} मिनट है। समय समाप्त होने पर परीक्षा अपने आप सबमिट हो जाएगी।`
                  : `The official timer runs for ${durationMins} minutes. The test will automatically submit when time expires.`}
              </Text>
            </View>
          </View>

          <View style={styles.ruleItem}>
            <Shield size={18} color={colors.text} style={styles.ruleIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.ruleTitle, { color: colors.text }]}>
                {isHindi ? 'सत्र निरंतरता' : 'Session Continuity'}
              </Text>
              <Text style={[styles.ruleDesc, { color: colors.muted }]}>
                {isHindi
                  ? 'ब्राउज़र रीफ़्रेश करने से बचें। यदि ऐप बैकग्राउंड में जाता है, तो आपका सत्र सुरक्षित रहता है।'
                  : 'Avoid refreshing the browser during active exam. Your answers and timer state are automatically saved locally.'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Declaration Box */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setAgreed(!agreed)}
          style={[
            styles.declarationBox,
            {
              backgroundColor: colors.surface2,
              borderColor: agreed ? colors.accent : colors.line,
            },
          ]}
        >
          <View
            style={[
              styles.checkbox,
              {
                backgroundColor: agreed ? colors.accent : colors.surface,
                borderColor: agreed ? colors.accent : colors.line,
              },
            ]}
          >
            {agreed && <Check size={14} color={colors.accentText} strokeWidth={3} />}
          </View>
          <Text style={[styles.declarationText, { color: colors.text }]}>
            {isHindi
              ? 'मैंने सभी निर्देशों को ध्यानपूर्वक पढ़ और समझ लिया है। मैं परीक्षा नियमों का पालन करने के लिए सहमत हूँ।'
              : 'I have read, understood, and agreed to all the official exam instructions and negative marking rules.'}
          </Text>
        </TouchableOpacity>

        {/* Start Button */}
        <View style={styles.actionContainer}>
          <Button
            title={isHindi ? 'परीक्षा शुरू करें' : 'I am Ready to Begin'}
            variant="primary"
            size="lg"
            onPress={handleStartTest}
            disabled={!agreed}
            style={{ width: '100%' }}
          />
        </View>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  backText: {
    fontSize: 13,
    fontWeight: '500',
  },
  headerBlock: {
    marginBottom: 20,
    gap: 8,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  screenSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  languageCard: {
    padding: 16,
    marginBottom: 20,
  },
  cardHeading: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSubText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  languageToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  langBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1.5,
  },
  langBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  langBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  guidelinesCard: {
    padding: 16,
    marginBottom: 20,
    gap: 16,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  ruleIcon: {
    marginTop: 2,
  },
  ruleTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  ruleDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  declarationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    marginBottom: 24,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declarationText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  actionContainer: {
    marginBottom: 40,
  },
});
