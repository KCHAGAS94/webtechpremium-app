import AsyncStorage from '@react-native-async-storage/async-storage';

// Persists the show-name → genre map (see playlist-loader.ts, xtream-api.ts)
// alongside the cached channel list, so a normal boot — which restores
// `channels` straight from disk and skips loadPlaylist entirely (see
// App.tsx) — still has real genres for the Séries screen instead of losing
// them until the next "recarregar". Small (a few thousand short strings), so
// unlike channel-storage.ts's chunking this is a single JSON blob.
const KEY = 'webtech.seriesGenreByShowName';

export async function saveSeriesGenreByShowName(genreByShowName: Map<string, string>): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(Array.from(genreByShowName.entries())));
}

export async function loadSeriesGenreByShowName(): Promise<Map<string, string>> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return new Map();
  try {
    return new Map(JSON.parse(raw) as [string, string][]);
  } catch {
    return new Map();
  }
}
