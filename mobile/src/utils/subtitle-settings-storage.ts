import AsyncStorage from '@react-native-async-storage/async-storage';

// Read by every player screen (movie-player.tsx, fullscreen-player.tsx) to
// decide whether/how to show subtitles, and written by settings-screen.tsx's
// "Configurações de legenda" modal — the two live in separate component
// trees with no shared state, so AsyncStorage is the only way settings reach
// the player.
export type SubtitleSettings = {
  enabled: boolean;
  fontSize: number;
  textColor: string;
  backgroundEnabled: boolean;
  backgroundColor: string;
};

const KEY = 'webtech.subtitleSettings';

const DEFAULT_SETTINGS: SubtitleSettings = {
  enabled: false,
  fontSize: 12,
  textColor: '#ffffff',
  backgroundEnabled: true,
  backgroundColor: '#000000',
};

export async function saveSubtitleSettings(settings: SubtitleSettings): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(settings));
}

export async function loadSubtitleSettings(): Promise<SubtitleSettings> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<SubtitleSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
