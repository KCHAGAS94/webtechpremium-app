import AsyncStorage from '@react-native-async-storage/async-storage';
import type { M3uChannel } from './m3u-parser';
import type { PanelPlaylist } from './panel-api';
import type { SeriesMeta } from './xtream-api';

const STORAGE_KEY_PREFIX = 'webtechpremium:playlist-cache:';

// Lets boot show the previous session's channel list immediately instead of
// blocking on the panel + M3U download + genre enrichment every cold start.
// The fresh fetch still runs in the background and overwrites this once it
// resolves (see App.tsx), so this is purely a "show something now" cache,
// not a source of truth.
export type CachedPlaylistState = {
  panelPlaylists: PanelPlaylist[];
  activePlaylistId: number | null;
  tv: M3uChannel[];
  filmes: M3uChannel[];
  series: M3uChannel[];
  seriesMetaByShowName: [string, SeriesMeta][];
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
    // Best-effort — a failed write just means next boot falls back to network.
  }
}
