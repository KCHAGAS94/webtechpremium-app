import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PanelPlaylist } from './panel-api';

const STORAGE_KEY_PREFIX = 'webtechpremium:local-playlists:';

// Playlists the user types in themselves (the full M3U link) instead of
// getting a ready-made URL from the painel — the app never ships with a
// server baked in, so there's nothing here until the user adds one. Shares
// the PanelPlaylist shape so the rest of the app (activation, caching,
// channel screens) can treat panel- and user-added playlists identically.
export type LocalPlaylistInput = {
  url: string;
};

export async function getLocalPlaylists(mac: string): Promise<PanelPlaylist[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_PREFIX + mac);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PanelPlaylist[]) : [];
  } catch {
    return [];
  }
}

async function saveLocalPlaylists(mac: string, playlists: PanelPlaylist[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_PREFIX + mac, JSON.stringify(playlists));
}

// "Servidor N" is always based on current position, not a name fixed at
// creation time — so deleting #1 out of a two-server list leaves the
// survivor renumbered down to #1 instead of staying "Servidor 2".
function renumber(playlists: PanelPlaylist[]): PanelPlaylist[] {
  return playlists.map((p, index) => ({ ...p, name: `Servidor ${index + 1}` }));
}

export async function addLocalPlaylist(mac: string, input: LocalPlaylistInput): Promise<PanelPlaylist> {
  const existing = await getLocalPlaylists(mac);
  const newPlaylist: PanelPlaylist = {
    // Timestamp-based id so it never collides with a painel-assigned id.
    id: Date.now(),
    name: '',
    url: input.url.trim(),
    expiracaoData: null,
  };
  const renumbered = renumber([...existing, newPlaylist]);
  await saveLocalPlaylists(mac, renumbered);
  return renumbered[renumbered.length - 1];
}

export async function removeLocalPlaylist(mac: string, id: number): Promise<PanelPlaylist[]> {
  const remaining = renumber((await getLocalPlaylists(mac)).filter((p) => p.id !== id));
  await saveLocalPlaylists(mac, remaining);
  return remaining;
}
