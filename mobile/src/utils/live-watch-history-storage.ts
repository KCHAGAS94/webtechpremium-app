import AsyncStorage from '@react-native-async-storage/async-storage';

// A plain watch *log* for Live TV — "channel X at time Y" — separate from
// watch-history-storage.ts's "continue watching" progress (which needs a
// position/duration and auto-drops finished titles, neither of which makes
// sense for a live stream with no fixed length).
export type LiveWatchHistoryEntry = {
  id: string;
  channelName: string;
  watchedAt: number;
};

const STORAGE_KEY = 'webtech.liveWatchHistory';
const MAX_ENTRIES = 200;

export async function loadLiveWatchHistory(): Promise<LiveWatchHistoryEntry[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as LiveWatchHistoryEntry[];
  } catch {
    return [];
  }
}

export async function addLiveWatchHistoryEntry(channelName: string): Promise<void> {
  const entries = await loadLiveWatchHistory();
  const entry: LiveWatchHistoryEntry = {
    id: `${channelName}-${Date.now()}`,
    channelName,
    watchedAt: Date.now(),
  };
  const next = [entry, ...entries].slice(0, MAX_ENTRIES);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function clearLiveWatchHistory(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function removeLiveWatchHistoryEntries(ids: string[]): Promise<void> {
  const idSet = new Set(ids);
  const entries = await loadLiveWatchHistory();
  const next = entries.filter((e) => !idSet.has(e.id));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
