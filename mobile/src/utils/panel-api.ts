import { PANEL_API_BASE_URL } from '@/config/device';

export type PanelPlaylist = {
  id: number;
  name: string;
  url: string;
};

// Panel-managed playlists for a device: the user (or reseller) links M3U
// lists to a MAC address in the external painel, and the app just asks
// "what's assigned to this MAC?" instead of storing any list config itself.
export async function fetchDevicePlaylists(mac: string): Promise<PanelPlaylist[]> {
  const response = await fetch(`${PANEL_API_BASE_URL}/devices?mac=${encodeURIComponent(mac)}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? (data as PanelPlaylist[]) : [];
}
