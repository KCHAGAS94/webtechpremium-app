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

// Above this many channels, JSON.stringify-ing the whole state in one
// synchronous call risks a large enough momentary memory spike (original
// arrays + serialized string coexisting) to crash the app on low-RAM
// devices right after a big playlist finishes loading. Caching is a
// best-effort boot-speed optimization (see comment above), not the source
// of truth, so it's safe to just skip it for very large lists.
const MAX_CACHED_CHANNELS = 20000;

export async function setCachedPlaylistState(mac: string, state: CachedPlaylistState): Promise<void> {
  const totalChannels = state.tv.length + state.filmes.length + state.series.length;
  if (totalChannels > MAX_CACHED_CHANNELS) return;

  try {
    // Yield to the event loop first so this doesn't run in the same
    // synchronous stack as the parse/enrichment work that just finished.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await AsyncStorage.setItem(STORAGE_KEY_PREFIX + mac, JSON.stringify(state));
  } catch {
    // Best-effort — a failed write just means next boot falls back to network.
  }
}
