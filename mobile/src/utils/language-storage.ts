import AsyncStorage from '@react-native-async-storage/async-storage';

export type LanguageCode = 'pt' | 'en' | 'es' | 'ja' | 'zh';

export const DEFAULT_LANGUAGE: LanguageCode = 'pt';

const STORAGE_KEY = 'webtech.language';

export async function loadLanguage(): Promise<LanguageCode> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw === 'pt' || raw === 'en' || raw === 'es' || raw === 'ja' || raw === 'zh') return raw;
  return DEFAULT_LANGUAGE;
}

export async function saveLanguage(language: LanguageCode): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, language);
}
