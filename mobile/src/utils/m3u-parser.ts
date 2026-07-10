export type M3uChannel = {
  id: string;
  name: string;
  logo: string;
  groupTitle: string;
  url: string;
};

/**
 * Parses Xtream-style extended M3U playlists (#EXTM3U / #EXTINF lines
 * followed by a stream URL) into a flat channel list.
 */
export function parseM3u(raw: string): M3uChannel[] {
  const lines = raw.split(/\r?\n/);
  const channels: M3uChannel[] = [];

  let pendingName = '';
  let pendingLogo = '';
  let pendingGroup = '';
  let index = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('#EXTINF')) {
      const attrs = trimmed.match(/([a-zA-Z-]+)="([^"]*)"/g) ?? [];
      pendingLogo = '';
      pendingGroup = '';
      for (const attr of attrs) {
        const [, key, value] = attr.match(/([a-zA-Z-]+)="([^"]*)"/) ?? [];
        if (key === 'tvg-logo') pendingLogo = value;
        if (key === 'group-title') pendingGroup = value;
      }
      const commaIndex = trimmed.lastIndexOf(',');
      pendingName = commaIndex >= 0 ? trimmed.slice(commaIndex + 1).trim() : 'Canal';
      continue;
    }

    if (trimmed.startsWith('#')) continue;

    // Any non-comment, non-empty line after an #EXTINF is the stream URL.
    index += 1;
    channels.push({
      id: String(index),
      name: pendingName || `Canal ${index}`,
      logo: pendingLogo,
      groupTitle: pendingGroup || 'Geral',
      url: trimmed,
    });
    pendingName = '';
    pendingLogo = '';
    pendingGroup = '';
  }

  return channels;
}
