// Fixed test MAC until the app can read the device's real network MAC address.
// Must match exactly (case-insensitive) the MAC registered for a device in
// the painel's "Usuários" screen.
export const MOCK_MAC = '00:1A:2B:A3:02:11';

// 10.0.2.2 is the Android emulator's alias for the host machine's localhost,
// where `npm run dev` serves the dashboard on :3000. Testing on a physical
// phone on the same Wi-Fi? Swap this for your machine's LAN IP, e.g.
// 'http://192.168.0.42:3000/api'.
export const PANEL_API_BASE_URL = 'http://192.168.1.5:3000/api';
