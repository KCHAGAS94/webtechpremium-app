import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { translate, type TranslationKey } from '@/i18n/translations';
import { DEFAULT_LANGUAGE, loadLanguage, saveLanguage, type LanguageCode } from '@/utils/language-storage';

type LanguageContextValue = {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE);

  useEffect(() => {
    loadLanguage().then(setLanguageState);
  }, []);

  const setLanguage = useCallback((next: LanguageCode) => {
    setLanguageState(next);
    saveLanguage(next);
  }, []);

  const t = useCallback((key: TranslationKey) => translate(key, language), [language]);

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useTranslation must be used within a LanguageProvider');
  return ctx;
}
