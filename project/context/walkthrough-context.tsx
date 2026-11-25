import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from 'react';
import { View, Platform, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import VidyaVoiceService from '@/services/vidya-voice-service';
import { useLanguage } from '@/context/language-context';

export const WALKTHROUGH_STORAGE_KEY = '@astra_walkthrough_completed_v2';

export type WalkthroughLang = 'en' | 'hi';
export type WalkthroughMode = 'home' | 'guest';

export interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WalkthroughStepConfig {
  id: string;
  targetIds: string[];
  navigateOnEnter?: string;
  title: { en: string; hi: string };
  description: { en: string; hi: string };
  voiceScript: { en: string; hi: string };
  tip?: { en: string; hi: string };
}

export const HOME_WALKTHROUGH_STEPS: WalkthroughStepConfig[] = [
  {
    id: 'exam-switcher',
    targetIds: ['exam-switcher'],
    title: {
      en: 'Switch Your Target Exam',
      hi: 'अपनी परीक्षा चुनें (Exam Switcher)',
    },
    description: {
      en: 'Tap here anytime to switch between UPSC Principal, UP Principal, DSSSB TGT, or PGT. All mocks, topic sets, and analytics adapt to your selection.',
      hi: 'UPSC Principal, UP Principal, DSSSB TGT या PGT के बीच बदलने के लिए यहाँ टैप करें। आपके सभी मॉक टेस्ट, टॉपिक सेट और एनालिटिक्स चुनी गई परीक्षा के अनुसार बदल जाएंगे।',
    },
    voiceScript: {
      en: "Namaste! I am Vidya, your AI study partner. Let's take a quick tour. First, look at the Exam Switcher at the top. You can tap here anytime to switch between UPSC Principal, UP Principal, TGT, or PGT.",
      hi: 'नमस्ते! मैं विद्या हूँ, आपकी एआई स्टडी पार्टनर। आइए ऐप का एक छोटा टूर देखते हैं। सबसे पहले ऊपर एग्जाम स्विचर देखें। यहाँ टैप करके आप कभी भी यूपीएससी प्रिंसिपल, यूपी प्रिंसिपल, टीजीटी या पीजीटी चुन सकते हैं।',
    },
    tip: {
      en: 'Highlighted at the top bar',
      hi: 'ऊपर दाईं ओर हाइलाइट किया गया है',
    },
  },
  {
    id: 'search-bar',
    targetIds: ['top-search'],
    title: {
      en: 'Instant Search Across 1,450+ Papers',
      hi: '1,450+ पेपर्स में तुरंत खोजें',
    },
    description: {
      en: 'Search for any full mock, previous year paper, or specific topic like NEP 2020, GFR 2017, or Anekarthi Shabd in seconds.',
      hi: 'कोई भी फुल मॉक टेस्ट, पुराना पेपर या विषय जैसे NEP 2020, GFR 2017 या अनेकार्थी शब्द सेकंडों में यहाँ खोजें।',
    },
    voiceScript: {
      en: 'Next is Instant Search. You can search across more than one thousand four hundred papers and topics like NEP 2020, GFR, or Anekarthi Shabd in seconds.',
      hi: 'अगला है इंस्टेंट सर्च। यहाँ से आप चौदह सौ से ज्यादा पेपर्स और एनईपी 2020, जीएफआर या अनेकार्थी शब्द जैसे किसी भी टॉपिक को तुरंत खोज सकते हैं।',
    },
  },
  {
    id: 'hero-cta',
    targetIds: ['home-hero-cta'],
    title: {
      en: 'Full CBT Mock Simulator',
      hi: 'असली CBT मॉक टेस्ट सिम्युलेटर',
    },
    description: {
      en: 'Start or resume your timed mock test right here. Includes live question palette, mark-for-review, negative marking, and auto-save on reload.',
      hi: 'यहाँ से अपना टाइम्ड मॉक टेस्ट शुरू या जारी रखें। इसमें लाइव प्रश्न पैलेट, मार्क-फॉर-रिव्यू, नेगेटिव मार्किंग और ऑटो-सेव की सुविधा है।',
    },
    voiceScript: {
      en: 'This card launches your next full CBT mock test. It gives you the exact computer-based exam experience with a live question palette, negative marking, and automatic progress saving.',
      hi: 'इस कार्ड से आप अपना अगला फुल सीबीटी मॉक टेस्ट शुरू कर सकते हैं। इसमें आपको लाइव प्रश्न पैलेट, नेगेटिव मार्किंग और ऑटो-सेव के साथ असली परीक्षा जैसा अनुभव मिलेगा।',
    },
  },
  {
    id: 'nav-practice',
    targetIds: ['nav-practice-side', 'nav-practice-bottom'],
    title: {
      en: '950+ Topic Practice Sets & Drills',
      hi: '950+ टॉपिक प्रैक्टिस सेट और ड्रिल्स',
    },
    description: {
      en: 'Open the Practice Hub to drill individual syllabus topics, take 10-question quick drills, or build custom AI tests.',
      hi: 'प्रैक्टिस हब खोलें और सिलेबस के हर टॉपिक के 20-प्रश्न सेट, 10-प्रश्न क्विक ड्रिल या AI कस्टम टेस्ट का अभ्यास करें।',
    },
    voiceScript: {
      en: 'In the Practice Hub, you have over 950 topic-wise practice sets, 10-question quick drills, and a custom AI test builder to strengthen specific syllabus topics.',
      hi: 'प्रैक्टिस हब में आपको 950 से अधिक टॉपिक-वार प्रैक्टिस सेट, 10 प्रश्नों की क्विक ड्रिल और कस्टम एआई टेस्ट बनाने की सुविधा मिलती है।',
    },
  },
  {
    id: 'nav-vidya',
    targetIds: ['nav-vidya-side', 'floating-vidya-btn'],
    title: {
      en: 'Ask Vidya AI Anytime',
      hi: 'विद्या AI स्टडी असिस्टेंट',
    },
    description: {
      en: 'Stuck on a rule, act, or tricky question? Chat with Vidya AI for instant bilingual explanations and concept clarity.',
      hi: 'किसी नियम, अधिनियम या कठिन प्रश्न में अटक गए हैं? हिंदी और अंग्रेजी में तुरंत सरल समाधान पाने के लिए विद्या AI से पूछें।',
    },
    voiceScript: {
      en: 'Whenever you get stuck on a rule or tricky question, just tap Ask Vidya! I am available 24/7 to explain concepts clearly in both English and Hindi.',
      hi: 'जब भी आप किसी नियम या कठिन प्रश्न में अटकें, बस विद्या से पूछें! मैं आपकी मदद के लिए हिंदी और अंग्रेजी दोनों में हमेशा उपलब्ध हूँ।',
    },
  },
  {
    id: 'nav-analytics',
    targetIds: ['nav-analytics-side', 'nav-analytics-bottom'],
    title: {
      en: 'Topic Performance & Weak Areas',
      hi: 'टॉपिक एनालिटिक्स और कमजोर विषय',
    },
    description: {
      en: 'Track your accuracy across every syllabus topic. Areas below 50% are highlighted in red with one-tap Practice Drill buttons.',
      hi: 'हर विषय में अपनी सटीकता (Accuracy) देखें। 50% से कम स्कोर वाले कमजोर टॉपिक्स लाल रंग में दिखेंगे ताकि आप उन्हें तुरंत सुधार सकें।',
    },
    voiceScript: {
      en: 'Finally, check your Analytics tab after any test to see your topic-wise accuracy breakdown. Weak areas below 50 percent are highlighted so you can drill them immediately. All the best!',
      hi: 'आखिर में, हर टेस्ट के बाद एनालिटिक्स टैब में आप टॉपिक-वार अपना प्रदर्शन देख सकते हैं। 50 प्रतिशत से कम वाले कमजोर विषय अलग दिखते हैं ताकि आप उन्हें तुरंत सुधार सकें। शुभकामनाएं!',
    },
  },
];

export const GUEST_WALKTHROUGH_STEPS: WalkthroughStepConfig[] = [
  {
    id: 'guest-change-exam',
    targetIds: ['guest-change-exam'],
    title: {
      en: 'Change Exam Track Anytime',
      hi: 'कभी भी परीक्षा बदलें',
    },
    description: {
      en: 'Want to explore another teaching or principal exam? Tap here to switch between UPSC, UPPSC, DSSSB TGT, and PGT.',
      hi: 'किसी दूसरी परीक्षा की तैयारी देखनी है? UPSC, UPPSC, DSSSB TGT और PGT के बीच बदलने के लिए यहाँ टैप करें।',
    },
    voiceScript: {
      en: 'Namaste! I am Vidya, your AI study partner. You can tap Change Exam here anytime to switch between UPSC Principal, UP Principal, TGT, and PGT.',
      hi: 'नमस्ते! मैं विद्या हूँ, आपकी एआई स्टडी पार्टनर। आप यहाँ चेंज एग्जाम पर टैप करके कभी भी अपनी परीक्षा बदल सकते हैं।',
    },
  },
  {
    id: 'guest-hero-cta',
    targetIds: ['guest-hero-cta'],
    title: {
      en: 'Try a Free Official CBT Test',
      hi: 'मुफ़्त आधिकारिक CBT टेस्ट आज़माएं',
    },
    description: {
      en: 'Experience the full Computer-Based Test interface with real questions, timer, and instant scoring—no sign-up required to try.',
      hi: 'बिना साइन-अप किए असली प्रश्नों, टाइमर और तुरंत स्कोर के साथ पूरा CBT टेस्ट अनुभव करें।',
    },
    voiceScript: {
      en: 'Tap here to start a free official CBT mock test right away. You can experience the real timer and question palette without even signing up.',
      hi: 'यहाँ टैप करके आप बिना साइन-अप किए तुरंत एक मुफ़्त आधिकारिक सीबीटी मॉक टेस्ट शुरू कर सकते हैं।',
    },
  },
  {
    id: 'guest-sample-preview',
    targetIds: ['guest-sample-preview'],
    title: {
      en: 'Detailed Bilingual Explanations',
      hi: 'विस्तृत हिंदी व अंग्रेजी समाधान',
    },
    description: {
      en: 'Every question includes clear step-by-step reasoning and topic tagging so you understand the concept, not just the answer.',
      hi: 'हर प्रश्न के साथ स्पष्ट व्याख्या और टॉपिक टैग मिलता है ताकि आप उत्तर के साथ पूरा कॉन्सेप्ट समझ सकें।',
    },
    voiceScript: {
      en: 'Every question comes with clear step-by-step explanations and topic tags, helping you master the underlying concept.',
      hi: 'हर प्रश्न के साथ विस्तृत व्याख्या और टॉपिक टैग मिलता है ताकि आप पूरे कॉन्सेप्ट को अच्छे से समझ सकें।',
    },
  },
  {
    id: 'guest-test-list',
    targetIds: ['guest-test-list'],
    title: {
      en: 'Free Samples & Full Test Series',
      hi: 'मुफ़्त सैंपल और पूरी टेस्ट सीरीज़',
    },
    description: {
      en: 'Start any free test right away, or unlock all 150+ full mocks and 950+ topic sets with the 2026 Pass.',
      hi: 'कोई भी मुफ़्त टेस्ट अभी शुरू करें, या 2026 पास के साथ सभी 150+ फुल मॉक और 950+ टॉपिक सेट अनलॉक करें।',
    },
    voiceScript: {
      en: 'Explore the free sample tests here, or unlock all 150 plus full mocks and 950 plus topic sets with the 2026 Pass. Happy learning!',
      hi: 'यहाँ से मुफ़्त सैंपल टेस्ट आज़माएं, या 2026 पास के साथ सभी 150 से ज्यादा फुल मॉक और 950 से ज्यादा टॉपिक सेट अनलॉक करें!',
    },
  },
];

interface WalkthroughContextValue {
  isActive: boolean;
  mode: WalkthroughMode;
  stepIndex: number;
  steps: WalkthroughStepConfig[];
  currentStep: WalkthroughStepConfig | null;
  targetRect: TargetRect | null;
  language: WalkthroughLang;
  setLanguage: (lang: WalkthroughLang) => void;
  toggleLanguage: () => void;
  voiceEnabled: boolean;
  isSpeaking: boolean;
  toggleVoice: () => void;
  speakCurrentStep: () => void;
  stopSpeaking: () => void;
  registerTarget: (id: string, ref: React.RefObject<View | null>) => void;
  unregisterTarget: (id: string) => void;
  startWalkthrough: (mode?: WalkthroughMode) => void;
  stopWalkthrough: (markDone?: boolean) => Promise<void>;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (idx: number) => void;
  remeasure: () => void;
}

const WalkthroughContext = createContext<WalkthroughContextValue>({
  isActive: false,
  mode: 'home',
  stepIndex: 0,
  steps: HOME_WALKTHROUGH_STEPS,
  currentStep: null,
  targetRect: null,
  language: 'en',
  setLanguage: () => {},
  toggleLanguage: () => {},
  voiceEnabled: true,
  isSpeaking: false,
  toggleVoice: () => {},
  speakCurrentStep: () => {},
  stopSpeaking: () => {},
  registerTarget: () => {},
  unregisterTarget: () => {},
  startWalkthrough: () => {},
  stopWalkthrough: async () => {},
  nextStep: () => {},
  prevStep: () => {},
  goToStep: () => {},
  remeasure: () => {},
});

export const useWalkthrough = () => useContext(WalkthroughContext);

export async function hasCompletedWalkthrough(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(WALKTHROUGH_STORAGE_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function markWalkthroughCompleted(): Promise<void> {
  try {
    await AsyncStorage.setItem(WALKTHROUGH_STORAGE_KEY, 'true');
  } catch {
    // Ignore storage errors
  }
}

export function WalkthroughProvider({ children }: { children: React.ReactNode }) {
  const { lang: appLang, setLang: setAppLang } = useLanguage();
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<WalkthroughMode>('home');
  const [stepIndex, setStepIndex] = useState(0);
  const [language, setLanguageState] = useState<WalkthroughLang>(appLang);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

  useEffect(() => {
    setLanguageState(appLang);
  }, [appLang]);

  const setLanguage = useCallback(
    (next: WalkthroughLang) => {
      setLanguageState(next);
      setAppLang(next);
    },
    [setAppLang]
  );

  const targetsRef = useRef<Map<string, React.RefObject<View | null>>>(new Map());
  const { width, height } = useWindowDimensions();

  const steps = mode === 'guest' ? GUEST_WALKTHROUGH_STEPS : HOME_WALKTHROUGH_STEPS;
  const currentStep = isActive ? steps[stepIndex] || null : null;

  const registerTarget = useCallback((id: string, ref: React.RefObject<View | null>) => {
    targetsRef.current.set(id, ref);
  }, []);

  const unregisterTarget = useCallback((id: string) => {
    targetsRef.current.delete(id);
  }, []);

  const measureNode = useCallback(
    (node: View | null): Promise<TargetRect | null> => {
      return new Promise((resolve) => {
        if (!node) {
          resolve(null);
          return;
        }
        try {
          if (typeof (node as any).measureInWindow === 'function') {
            (node as any).measureInWindow((x: number, y: number, w: number, h: number) => {
              if (w > 0 && h > 0) {
                resolve({ x, y, width: w, height: h });
              } else if (
                Platform.OS === 'web' &&
                typeof (node as any).getBoundingClientRect === 'function'
              ) {
                const r = (node as any).getBoundingClientRect();
                resolve(
                  r.width > 0 && r.height > 0
                    ? { x: r.left, y: r.top, width: r.width, height: r.height }
                    : null
                );
              } else {
                resolve(null);
              }
            });
          } else if (
            Platform.OS === 'web' &&
            typeof (node as any).getBoundingClientRect === 'function'
          ) {
            const r = (node as any).getBoundingClientRect();
            resolve(
              r.width > 0 && r.height > 0
                ? { x: r.left, y: r.top, width: r.width, height: r.height }
                : null
            );
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    },
    []
  );

  const remeasure = useCallback(async () => {
    if (!isActive || !currentStep) {
      setTargetRect(null);
      return;
    }

    for (const tid of currentStep.targetIds) {
      const ref = targetsRef.current.get(tid);
      if (ref?.current) {
        const rect = await measureNode(ref.current);
        if (rect) {
          setTargetRect(rect);
          return;
        }
      }
    }
    setTargetRect(null);
  }, [isActive, currentStep, measureNode]);

  useEffect(() => {
    if (!isActive) return;
    // Slight delay allows layout/scroll to settle before measuring
    const t = setTimeout(() => {
      remeasure();
    }, 120);
    return () => clearTimeout(t);
  }, [isActive, stepIndex, mode, width, height, remeasure]);

  const stopSpeaking = useCallback(() => {
    VidyaVoiceService.stop();
    setIsSpeaking(false);
  }, []);

  const speakCurrentStep = useCallback(() => {
    if (!currentStep) return;
    const script =
      language === 'hi'
        ? currentStep.voiceScript.hi
        : currentStep.voiceScript.en;
    VidyaVoiceService.speak(script, {
      stepId: currentStep.id,
      language,
      onStart: () => setIsSpeaking(true),
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, [currentStep, language]);

  const toggleVoice = useCallback(() => {
    setVoiceEnabled((prev) => {
      const next = !prev;
      if (!next) {
        VidyaVoiceService.stop();
        setIsSpeaking(false);
      }
      return next;
    });
  }, []);

  // Auto-speak Vidya's explanation whenever active step or language changes (if voiceEnabled)
  useEffect(() => {
    if (!isActive || !currentStep) {
      VidyaVoiceService.stop();
      setIsSpeaking(false);
      return;
    }
    if (!voiceEnabled) return;

    const t = setTimeout(() => {
      speakCurrentStep();
    }, 180);

    return () => {
      clearTimeout(t);
      VidyaVoiceService.stop();
      setIsSpeaking(false);
    };
  }, [isActive, stepIndex, language, voiceEnabled, currentStep, speakCurrentStep]);

  const startWalkthrough = useCallback((nextMode: WalkthroughMode = 'home') => {
    setMode(nextMode);
    setStepIndex(0);
    setIsActive(true);
  }, []);

  const stopWalkthrough = useCallback(async (markDone = true) => {
    VidyaVoiceService.stop();
    setIsSpeaking(false);
    setIsActive(false);
    setTargetRect(null);
    setStepIndex(0);
    if (markDone) {
      await markWalkthroughCompleted();
    }
  }, []);

  const nextStep = useCallback(() => {
    if (stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      stopWalkthrough(true);
    }
  }, [stepIndex, steps.length, stopWalkthrough]);

  const prevStep = useCallback(() => {
    if (stepIndex > 0) {
      setStepIndex((i) => i - 1);
    }
  }, [stepIndex]);

  const goToStep = useCallback(
    (idx: number) => {
      if (idx >= 0 && idx < steps.length) {
        setStepIndex(idx);
      }
    },
    [steps.length]
  );

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'en' ? 'hi' : 'en');
  }, [language, setLanguage]);

  return (
    <WalkthroughContext.Provider
      value={{
        isActive,
        mode,
        stepIndex,
        steps,
        currentStep,
        targetRect,
        language,
        setLanguage,
        toggleLanguage,
        voiceEnabled,
        isSpeaking,
        toggleVoice,
        speakCurrentStep,
        stopSpeaking,
        registerTarget,
        unregisterTarget,
        startWalkthrough,
        stopWalkthrough,
        nextStep,
        prevStep,
        goToStep,
        remeasure,
      }}
    >
      {children}
    </WalkthroughContext.Provider>
  );
}
