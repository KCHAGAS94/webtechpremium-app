import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ContentCategory } from '@/utils/content-classifier';

// Hidden channel *groups* (folders) per section — "Ocultar Categorias" in
// Configurações. Keyed by `group-title`, same identity favorite-groups-storage.ts
// uses, since that's the only stable id a group has across playlist reloads.
const keyFor = (category: ContentCategory) => `webtech.hiddenGroups.${category}`;

export async function loadHiddenGroups(category: ContentCategory): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(keyFor(category));
  if (!raw) return new Set();
  try {
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export async function saveHiddenGroups(category: ContentCategory, groups: Set<string>): Promise<void> {
  await AsyncStorage.setItem(keyFor(category), JSON.stringify(Array.from(groups)));
}
