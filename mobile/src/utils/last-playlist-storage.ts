import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PanelPlaylist } from './panel-api';

// Which playlist was active last time, paired with channel-storage.ts's
// cached channel list — together they let the app boot straight to Home
// with something to watch instead of blocking on the painel + provider
// round trip every single launch.
const KEY = 'webtech.lastPlaylist';

export async function saveLastPlaylist(playlist: PanelPlaylist): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(playlist));
}

export async function loadLastPlaylist(): Promise<PanelPlaylist | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PanelPlaylist;
  } catch {
    return null;
  }
}
