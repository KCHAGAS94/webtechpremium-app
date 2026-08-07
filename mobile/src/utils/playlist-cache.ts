import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PanelPlaylist } from './panel-api';

const STORAGE_KEY_PREFIX = 'webtechpremium:playlist-cache:';

// Lets boot know which panel playlist was active last session, without
// touching the panel over the network. Deliberately just this — id/url/name
// metadata, not the parsed channel arrays — so there's no size cap tied to
// playlist length (the old version stored full channel arrays here and
// silently skipped caching above ~20k entries, which is smaller than a lot
// of real Xtream catalogs). The actual channel data is restored from the
// per-device file loadPlaylistFromDisk reads (see playlist-loader.ts).
export type CachedPlaylistState = {
  panelPlaylists: PanelPlaylist[];
  activePlaylistId: number | null;
};

export async function getCachedPlaylistState(mac: string): Promise<CachedPlaylistState | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_PREFIX + mac);
    if (!raw) return null;
    return JSON.parse(raw) as CachedPlaylistState;
  } catch {
    return null;
  }
}

export async function setCachedPlaylistState(mac: string, state: CachedPlaylistState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_PREFIX + mac, JSON.stringify(state));
  } catch {
    // Best-effort — a failed write just means next boot falls back to manual reload.
  }
}
