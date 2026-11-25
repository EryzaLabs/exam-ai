import { Platform } from 'react-native';
import * as Speech from 'expo-speech';

export type VoiceLang = 'en' | 'hi';

interface SpeakOptions {
  stepId?: string;
  language: VoiceLang;
  onStart?: () => void;
  onDone?: () => void;
  onError?: () => void;
}

const STEP_AUDIO_PREFIX: Record<string, string> = {
  'exam-switcher': 'home-exam-switcher',
  'search-bar': 'home-search-bar',
  'hero-cta': 'home-hero-cta',
  'nav-practice': 'home-nav-practice',
  'nav-vidya': 'home-nav-vidya',
  'nav-analytics': 'home-nav-analytics',
  'guest-change-exam': 'guest-change-exam',
  'guest-hero-cta': 'guest-hero-cta',
  'guest-sample-preview': 'guest-sample-preview',
  'guest-test-list': 'guest-test-list',
};

let activePlaybackId = 0;
let activeWebAudio: HTMLAudioElement | null = null;

function getWalkthroughAudioUrl(stepId: string | undefined, language: VoiceLang): string | null {
  if (!stepId) return null;
  const prefix = STEP_AUDIO_PREFIX[stepId];
  if (!prefix) return null;
  return `/audio/walkthrough/${prefix}-${language}.mp3`;
}

export const VidyaVoiceService = {
  isSupported(): boolean {
    if (Platform.OS === 'web') {
      return typeof window !== 'undefined' && typeof Audio !== 'undefined';
    }
    return true;
  },

  stop(): void {
    activePlaybackId++;
    try {
      if (Platform.OS === 'web') {
        if (activeWebAudio) {
          activeWebAudio.pause();
          activeWebAudio.currentTime = 0;
          activeWebAudio.onplaying = null;
          activeWebAudio.onended = null;
          activeWebAudio.onerror = null;
          activeWebAudio = null;
        }
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
    this.stop();

    const myId = ++activePlaybackId;
    const { stepId, language, onStart, onDone, onError } = options;

    if (Platform.OS === 'web') {
      const audioUrl = getWalkthroughAudioUrl(stepId, language);
      if (audioUrl && typeof Audio !== 'undefined') {
        try {
          const audio = new Audio(audioUrl);
          activeWebAudio = audio;

          audio.onplaying = () => {
            if (myId === activePlaybackId) {
              onStart?.();
            }
          };
          audio.onended = () => {
            if (myId === activePlaybackId) {
              activeWebAudio = null;
              onDone?.();
            }
          };
          audio.onerror = () => {
            if (myId === activePlaybackId) {
              activeWebAudio = null;
              onError?.();
            }
          };

          const playPromise = audio.play();
          if (playPromise && typeof playPromise.then === 'function') {
            playPromise.catch(() => {
              // Autoplay blocked before user gesture — fail silently and let user tap Play
              if (myId === activePlaybackId) {
                activeWebAudio = null;
                onError?.();
              }
            });
          }
          return;
        } catch {
          onError?.();
          return;
        }
      }

      onError?.();
      return;
    }

    // Native fallback (iOS / Android) via expo-speech
    if (!text.trim()) return;
    try {
      Speech.speak(text, {
        language: language === 'hi' ? 'hi-IN' : 'en-IN',
        rate: language === 'hi' ? 0.94 : 0.98,
        pitch: 1.05,
        onStart: () => {
          if (myId === activePlaybackId) onStart?.();
        },
        onDone: () => {
          if (myId === activePlaybackId) onDone?.();
        },
        onStopped: () => {
          if (myId === activePlaybackId) onDone?.();
        },
        onError: () => {
          if (myId === activePlaybackId) onError?.();
        },
      });
    } catch {
      onError?.();
    }
  },
};

export default VidyaVoiceService;
