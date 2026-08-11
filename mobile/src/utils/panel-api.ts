import { PANEL_API_BASE_URL } from '@/config/device';

export type PanelPlaylist = {
  id: number;
  name: string;
  url: string;
  expiracaoData: string | null;
  /** ANUAL | VITALICIO | null — drives the tela "Conta"'s validity label
   * ("Vitalício" instead of a date). Absent/null for lists added by the user
   * themselves rather than activated through the painel. */
  tipo?: 'ANUAL' | 'VITALICIO' | null;
  /** Same source of truth as the painel's own "Expirado" column. */
  expirado?: boolean;
};

// Panel-managed playlists for a device: the reseller links M3U lists to a
// MAC address directly in the external painel (not from this app). The app
// never sends the MAC automatically — it only asks "what's assigned to this
// MAC?" when the user explicitly triggers it (see handleReloadPlaylist in
// App.tsx), after the reseller has told them the lista is linked.
//
// Note: /devices only ever returns *non-expired* listas (see the dashboard
// route) — a device whose only listas are expired gets an empty array here,
// same as a device with none linked at all. Use `fetchDeviceStatus` to tell
// those two cases apart.
export async function fetchDevicePlaylists(mac: string): Promise<PanelPlaylist[]> {
  const response = await fetch(`${PANEL_API_BASE_URL}/devices?mac=${encodeURIComponent(mac)}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? (data as PanelPlaylist[]) : [];
}

export type DeviceStatus = {
  mac: string;
  dataExpiracao: string | null;
  expirado: boolean | null;
};

// Backs the boot-time "did this device's plan expire?" check — unlike
// /devices, this looks at the lista with the furthest-out expiration
// regardless of whether it's already past due, so the app can tell "never
// activated" (expirado: null) apart from "was activated but expired"
// (expirado: true) and react accordingly (see App.tsx's bootstrap).
export async function fetchDeviceStatus(mac: string): Promise<DeviceStatus> {
  const response = await fetch(`${PANEL_API_BASE_URL}/app/device-status?mac=${encodeURIComponent(mac)}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}
