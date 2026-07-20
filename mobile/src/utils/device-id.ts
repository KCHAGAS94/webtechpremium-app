import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'webtechpremium:device-mac';

// Modern Android/iOS no longer expose the real network MAC address to apps
// (the OS returns a fixed placeholder for privacy). Instead we generate a
// random, MAC-formatted id once per install and persist it in AsyncStorage,
// so it stays fixed across app restarts but is unique per device — same
// contract the painel already expects (a stable MAC per device).
function generateMac(): string {
  const bytes = Array.from({ length: 6 }, () => Math.floor(Math.random() * 256));
  // Set the locally-administered bit so this can never collide with a real,
  // vendor-assigned MAC.
  bytes[0] = (bytes[0] & 0xfe) | 0x02;
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join(':').toUpperCase();
}

let cached: Promise<string> | null = null;

export function getDeviceMac(): Promise<string> {
  if (!cached) {
    cached = (async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) return stored;
      const mac = generateMac();
      await AsyncStorage.setItem(STORAGE_KEY, mac);
      return mac;
    })();
  }
  return cached;
}
