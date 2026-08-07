import AsyncStorage from '@react-native-async-storage/async-storage';

// "Continue watching" progress, keyed the same content-identity way as
// favorites (see favorites-storage.ts): a movie by its title, an episode by
// `${showId}::S{season}E{episode}`. That's what lets progress survive a
// playlist "recarregar" instead of being tied to the reload-volatile
// M3uChannel.id.
export type WatchHistoryEntry = {
  key: string;
  kind: 'movie' | 'episode';
  title: string;
  logo: string;
  positionSeconds: number;
  durationSeconds: number;
  updatedAt: number;
  showId?: string;
  season?: number;
  episode?: number;
};

// Stable identity for an episode's watch-history entry: survives a playlist
// "recarregar" the same way a movie's title-based key does, instead of being
// tied to the reload-volatile M3uChannel.id.
export function episodeHistoryKey(showId: string, season: number, episode: number): string {
  return `${showId}::S${season}E${episode}`;
}

const STORAGE_KEY = 'webtech.watchHistory';
const MAX_ENTRIES = 200;
// Below this we treat "resume" as noise (an accidental tap); above the
// completion ratio we treat the title as finished and drop it instead of
// cluttering "Retomar para assistir" with things already watched through.
const MIN_RESUME_SECONDS = 10;
const COMPLETION_RATIO = 0.95;

let cache: WatchHistoryEntry[] | null = null;

async function readAll(): Promise<WatchHistoryEntry[]> {
  if (cache) return cache;
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  cache = raw ? (JSON.parse(raw) as WatchHistoryEntry[]) : [];
  return cache;
}

async function writeAll(entries: WatchHistoryEntry[]): Promise<void> {
  cache = entries;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export async function loadWatchHistory(): Promise<WatchHistoryEntry[]> {
  return readAll();
}

export async function upsertWatchHistoryProgress(
  entry: Omit<WatchHistoryEntry, 'updatedAt'>
): Promise<void> {
  if (entry.positionSeconds < MIN_RESUME_SECONDS) return;

  const entries = await readAll();
  const withoutKey = entries.filter((e) => e.key !== entry.key);

  const isFinished =
    entry.durationSeconds > 0 && entry.positionSeconds / entry.durationSeconds >= COMPLETION_RATIO;
  if (isFinished) {
    await writeAll(withoutKey);
    return;
  }

  const next = [{ ...entry, updatedAt: Date.now() }, ...withoutKey].slice(0, MAX_ENTRIES);
  await writeAll(next);
}

export async function removeWatchHistoryEntry(key: string): Promise<void> {
  const entries = await readAll();
  await writeAll(entries.filter((e) => e.key !== key));
}

export async function removeWatchHistoryEntries(keys: string[]): Promise<void> {
  const keySet = new Set(keys);
  const entries = await readAll();
  await writeAll(entries.filter((e) => !keySet.has(e.key)));
}

export async function clearWatchHistoryByKind(kind: WatchHistoryEntry['kind']): Promise<void> {
  const entries = await readAll();
  await writeAll(entries.filter((e) => e.kind !== kind));
}
