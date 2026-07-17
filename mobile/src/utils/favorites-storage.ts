import AsyncStorage from '@react-native-async-storage/async-storage';

// Favorites are keyed by content identity (movie title / series show id),
// never by M3uChannel.id — that id is just the item's position in the last
// parsed playlist (see m3u-parser.ts), so it shifts on every reload even
// when the underlying content hasn't changed. Keying by name/showId is what
// lets a favorite survive a "recarregar" and only actually change if the
// list itself changes (a title being added/removed).
export type FavoritesKind = 'movies' | 'series' | 'live';

const keyFor = (kind: FavoritesKind) => `webtech.favorites.${kind}`;

export async function loadFavorites(kind: FavoritesKind): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(keyFor(kind));
  if (!raw) return new Set();
  try {
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export async function saveFavorites(kind: FavoritesKind, favorites: Set<string>): Promise<void> {
  await AsyncStorage.setItem(keyFor(kind), JSON.stringify(Array.from(favorites)));
}
