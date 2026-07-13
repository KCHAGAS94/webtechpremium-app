import AsyncStorage from '@react-native-async-storage/async-storage';

export type SavedPlaylist = {
  id: string;
  name: string;
  url: string;
};

const PLAYLISTS_KEY = '@listas_salvas';
const ACTIVE_KEY = '@lista_ativa';

export async function getSavedPlaylists(): Promise<SavedPlaylist[]> {
  const raw = await AsyncStorage.getItem(PLAYLISTS_KEY);
  return raw ? (JSON.parse(raw) as SavedPlaylist[]) : [];
}

async function setSavedPlaylists(playlists: SavedPlaylist[]): Promise<void> {
  await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
}

export function shortenUrl(url: string): string {
  try {
    const { hostname, pathname } = new URL(url);
    return `${hostname}${pathname}`.slice(0, 40);
  } catch {
    return url.slice(0, 40);
  }
}

export async function addPlaylist(url: string, name?: string): Promise<SavedPlaylist> {
  const playlists = await getSavedPlaylists();
  const playlist: SavedPlaylist = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name?.trim() || shortenUrl(url),
    url,
  };
  await setSavedPlaylists([...playlists, playlist]);
  return playlist;
}

export async function removePlaylist(id: string): Promise<void> {
  const playlists = await getSavedPlaylists();
  await setSavedPlaylists(playlists.filter((p) => p.id !== id));

  const activeId = await AsyncStorage.getItem(ACTIVE_KEY);
  if (activeId === id) {
    await AsyncStorage.removeItem(ACTIVE_KEY);
  }
}

export async function getActivePlaylistId(): Promise<string | null> {
  return AsyncStorage.getItem(ACTIVE_KEY);
}

export async function setActivePlaylistId(id: string): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_KEY, id);
}

export async function getActivePlaylist(): Promise<SavedPlaylist | null> {
  const activeId = await getActivePlaylistId();
  if (!activeId) return null;
  const playlists = await getSavedPlaylists();
  return playlists.find((p) => p.id === activeId) ?? null;
}
