import { Platform } from 'react-native';
import * as Speech from 'expo-speech';

export type VoiceLang = 'en' | 'hi';

interface SpeakOptions {
  language: VoiceLang;
  onStart?: () => void;
  onDone?: () => void;
  onError?: () => void;
}

let activeUtteranceId = 0;

function pickPreferredWebVoice(lang: VoiceLang): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  if (voices.length === 0) return null;

  if (lang === 'hi') {
    const hiVoices = voices.filter((v) =>
      v.lang.toLowerCase().startsWith('hi')
    );
    if (hiVoices.length > 0) {
      // Prefer natural/female Hindi voices (Google हिन्दी, Swara, Lekha, Kalpana)
      const preferred = hiVoices.find((v) =>
        /google|swara|lekha|kalpana|heera|female|natural/i.test(v.name)
      );
      return preferred || hiVoices[0];
    }
    return null;
  }

  // English: prefer Indian English female/natural voices first, then clear English voices
  const enInVoices = voices.filter((v) =>
    v.lang.toLowerCase().startsWith('en-in')
  );
  if (enInVoices.length > 0) {
    const preferredIn = enInVoices.find((v) =>
      /veena|neerja|google|isha|female|natural/i.test(v.name)
    );
    return preferredIn || enInVoices[0];
  }

  const enVoices = voices.filter((v) =>
    v.lang.toLowerCase().startsWith('en')
  );
  const preferredEn = enVoices.find((v) =>
    /female|samantha|aria|jenny|google uk english female|zira|natural/i.test(v.name)
  );
  return preferredEn || enVoices[0] || null;
}

export const VidyaVoiceService = {
  isSupported(): boolean {
    if (Platform.OS === 'web') {
      return typeof window !== 'undefined' && 'speechSynthesis' in window;
    }
    return true;
  },

  stop(): void {
    activeUtteranceId++;
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      } else {
        Speech.stop();
      }
    } catch {
      // Safe no-op
    }
  },

  speak(text: string, options: SpeakOptions): void {
    if (!text.trim()) return;
    this.stop();

    const myId = ++activeUtteranceId;
    const { language, onStart, onDone, onError } = options;

    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        onError?.();
        return;
      }

      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
        utterance.rate = language === 'hi' ? 0.96 : 1.0;
        utterance.pitch = 1.05;

        const voice = pickPreferredWebVoice(language);
        if (voice) {
          utterance.voice = voice;
        }

        utterance.onstart = () => {
          if (myId === activeUtteranceId) {
            onStart?.();
          }
        };
        utterance.onend = () => {
          if (myId === activeUtteranceId) {
            onDone?.();
          }
        };
        utterance.onerror = () => {
          if (myId === activeUtteranceId) {
            onError?.();
          }
        };

        window.speechSynthesis.speak(utterance);
      } catch {
        onError?.();
      }
      return;
    }

    // Native (iOS / Android) via expo-speech
    try {
      Speech.speak(text, {
        language: language === 'hi' ? 'hi-IN' : 'en-IN',
        rate: language === 'hi' ? 0.94 : 0.98,
        pitch: 1.05,
        onStart: () => {
          if (myId === activeUtteranceId) onStart?.();
        },
        onDone: () => {
          if (myId === activeUtteranceId) onDone?.();
        },
        onStopped: () => {
          if (myId === activeUtteranceId) onDone?.();
        },
        onError: () => {
          if (myId === activeUtteranceId) onError?.();
        },
      });
    } catch {
      onError?.();
    }
  },
};

export default VidyaVoiceService;
