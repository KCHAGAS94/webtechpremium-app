import AsyncStorage from '@react-native-async-storage/async-storage';

import type { M3uChannel } from './m3u-parser';

// AsyncStorage (SQLite-backed on Android) is documented to choke on single
// values much past ~1-2MB, throwing "Row too big to fit into CursorWindow".
// A playlist with tens of thousands of channels serializes to several MB, so
// storing it as one JSON.stringify + setItem call both blocks the JS thread
// for a long synchronous stretch AND can crash outright on Android. Splitting
// it into small chunks keeps each write tiny and lets us yield between them.
const CHUNK_SIZE = 2000;
const CHUNK_COUNT_KEY = 'webtech.playlistChannels.chunkCount';
const chunkKey = (index: number) => `webtech.playlistChannels.chunk.${index}`;

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export async function saveChannels(channels: M3uChannel[]): Promise<void> {
  const previousCountRaw = await AsyncStorage.getItem(CHUNK_COUNT_KEY);
  const previousCount = previousCountRaw ? Number(previousCountRaw) : 0;

  const chunkCount = channels.length === 0 ? 0 : Math.ceil(channels.length / CHUNK_SIZE);
  for (let i = 0; i < chunkCount; i++) {
    const chunk = channels.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    await AsyncStorage.setItem(chunkKey(i), JSON.stringify(chunk));
    await yieldToEventLoop();
  }

  // Drop leftover chunks if the new playlist has fewer chunks than the last one.
  if (previousCount > chunkCount) {
    const staleKeys = Array.from({ length: previousCount - chunkCount }, (_, i) =>
      chunkKey(chunkCount + i)
    );
    await AsyncStorage.multiRemove(staleKeys);
  }

  await AsyncStorage.setItem(CHUNK_COUNT_KEY, String(chunkCount));
}

export async function loadChannels(): Promise<M3uChannel[]> {
  const countRaw = await AsyncStorage.getItem(CHUNK_COUNT_KEY);
  const count = countRaw ? Number(countRaw) : 0;
  if (count === 0) return [];

  const keys = Array.from({ length: count }, (_, i) => chunkKey(i));
  const pairs = await AsyncStorage.multiGet(keys);

  const channels: M3uChannel[] = [];
  for (const [, value] of pairs) {
    if (!value) continue;
    channels.push(...(JSON.parse(value) as M3uChannel[]));
    await yieldToEventLoop();
  }
  return channels;
}
