import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Application from 'expo-application';

const STORAGE_KEY = 'webtechpremium:device-mac';

// Modern Android/iOS no longer expose the real network MAC address to apps
// (the OS returns a fixed placeholder for privacy), so this is not a real
// MAC — it's a MAC-formatted id the painel already expects one stable value
// per device for.
//
// Android's ANDROID_ID survives an uninstall/reinstall of this app (it only
// changes on a factory reset), so hashing it into our id closes the "free
// trial farming" hole a purely random-per-install id had: reinstalling no
// longer gets you a new device. iOS's vendor id resets if every app from
// this developer is removed, which is a much narrower window than "any
// reinstall" but still the most stable id iOS exposes to a regular app.
async function stableSeed(): Promise<string | null> {
  try {
    if (Platform.OS === 'android') {
      return Application.getAndroidId();
    }
    if (Platform.OS === 'ios') {
      return await Application.getIosIdForVendorAsync();
    }
  } catch {
    // Falls through to the random fallback below.
  }
  return null;
}

// FNV-1a: fast, dependency-free, good enough distribution for turning an
// arbitrary-length platform id into 6 bytes — this isn't a security hash,
// just a way to fit ANDROID_ID/vendor-id into the MAC-shaped string the
// painel stores.
function hashToBytes(input: string, count: number): number[] {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const bytes: number[] = [];
  for (let i = 0; i < count; i++) {
    hash = Math.imul(hash ^ i, 0x01000193);
    bytes.push((hash >>> ((i % 4) * 8)) & 0xff);
  }
  return bytes;
}

function generateRandomMac(): string {
  const bytes = Array.from({ length: 6 }, () => Math.floor(Math.random() * 256));
  // Set the locally-administered bit so this can never collide with a real,
  // vendor-assigned MAC.
  bytes[0] = (bytes[0] & 0xfe) | 0x02;
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join(':').toUpperCase();
}

function macFromSeed(seed: string): string {
  const bytes = hashToBytes(seed, 6);
  bytes[0] = (bytes[0] & 0xfe) | 0x02;
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join(':').toUpperCase();
}

let cached: Promise<string> | null = null;

export function getDeviceMac(): Promise<string> {
  if (!cached) {
    cached = (async () => {
      // A device that already installed the app before this change keeps its
      // existing (random) id — switching it now would orphan whatever
      // ativação is already linked to that MAC in the painel.
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) return stored;

      const seed = await stableSeed();
      const mac = seed ? macFromSeed(seed) : generateRandomMac();
      await AsyncStorage.setItem(STORAGE_KEY, mac);
      return mac;
    })();
  }
  return cached;
}
