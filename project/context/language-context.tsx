import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppLanguage = 'en' | 'hi';

const LANGUAGE_STORAGE_KEY = '@astra_app_language_v1';

interface LanguageContextType {
  lang: AppLanguage;
  isHindi: boolean;
  testLanguage: 'english' | 'hindi';
  setLang: (next: AppLanguage) => void;
  toggleLang: () => void;
  t: (en: string, hi: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  isHindi: false,
  testLanguage: 'english',
  setLang: () => {},
  toggleLang: () => {},
  t: (en) => en,
});

export const useLanguage = () => useContext(LanguageContext);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<AppLanguage>('en');

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      .then((saved) => {
        if (saved === 'en' || saved === 'hi') {
          setLangState(saved);
        }
      })
      .catch(() => {});
  }, []);

  const setLang = useCallback((next: AppLanguage) => {
    setLangState(next);
    AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, next).catch(() => {});
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => {
      const next: AppLanguage = prev === 'en' ? 'hi' : 'en';
      AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const t = useCallback(
    (en: string, hi: string) => {
      return lang === 'hi' ? hi : en;
    },
    [lang]
  );

  return (
    <LanguageContext.Provider
      value={{
        lang,
        isHindi: lang === 'hi',
        testLanguage: lang === 'hi' ? 'hindi' : 'english',
        setLang,
        toggleLang,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export default LanguageContext;
