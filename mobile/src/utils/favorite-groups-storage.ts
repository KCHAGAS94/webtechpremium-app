import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ContentCategory } from '@/utils/content-classifier';

// Favorite channel *groups* (folders), separate from favorite-storage.ts's
// favorite individual channels/movies/shows — keyed by `group-title` since
// that's the only stable identity a group has across playlist reloads.
const keyFor = (category: ContentCategory) => `webtech.favoriteGroups.${category}`;

export async function loadFavoriteGroups(category: ContentCategory): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(keyFor(category));
  if (!raw) return new Set();
  try {
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export async function saveFavoriteGroups(category: ContentCategory, groups: Set<string>): Promise<void> {
  await AsyncStorage.setItem(keyFor(category), JSON.stringify(Array.from(groups)));
}
