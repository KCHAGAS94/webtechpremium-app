import { PANEL_API_BASE_URL } from '@/config/device';

export type PanelPlaylist = {
  id: number;
  name: string;
  url: string;
  expiracaoData: string | null;
};

// Panel-managed playlists for a device: the reseller links M3U lists to a
// MAC address directly in the external painel (not from this app). The app
// never sends the MAC automatically — it only asks "what's assigned to this
// MAC?" when the user explicitly triggers it (see handleReloadPlaylist in
// App.tsx), after the reseller has told them the lista is linked.
export async function fetchDevicePlaylists(mac: string): Promise<PanelPlaylist[]> {
  const response = await fetch(`${PANEL_API_BASE_URL}/devices?mac=${encodeURIComponent(mac)}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? (data as PanelPlaylist[]) : [];
}
