import { categorizeGroup, type ContentCategory } from './content-classifier';

export type M3uChannel = {
  id: string;
  name: string;
  logo: string;
  groupTitle: string;
  url: string;
  category: ContentCategory;
  // Xtream numeric stream id, filled in best-effort by playlist-loader.ts
  // (matched by exact name against get_vod_streams) — required to call the
  // per-item get_vod_info endpoint for duration/plot/cast. Absent for
  // non-Xtream M3Us or if the name match failed.
  vodId?: string;
  // Unix seconds string from get_vod_streams' `added` field, same best-effort
  // enrichment as vodId.
  addedAt?: string;
};

export type ParseM3uProgress = {
  processedLines: number;
  totalLines: number;
};

// How many lines to parse per synchronous burst before yielding back to the
// event loop. Keeps a single macrotask short enough that the JS thread never
// blocks long enough to trip React Native's bridge/ANR watchdog on huge
// playlists (tens of thousands of lines).
const CHUNK_LINES = 1000;

// Reused across every #EXTINF line instead of allocating a fresh RegExp per
// line (and a second one per matched attribute, as the previous version did).
const ATTR_REGEX = /([a-zA-Z-]+)="([^"]*)"/g;

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// Counts lines without allocating a `raw.split()` array, just to size the
// progress bar up front. A single pass over indices, no large temporaries.
function countLines(text: string): number {
  let count = 1;
  let idx = -1;
  while ((idx = text.indexOf('\n', idx + 1)) !== -1) count++;
  return count;
}

/**
 * Parses Xtream-style extended M3U playlists (#EXTM3U / #EXTINF lines
 * followed by a stream URL) into a flat channel list.
 *
 * Walks the raw string directly instead of pre-splitting it into a `lines`
 * array, so a multi-hundred-thousand-line playlist never holds two full
 * copies of itself in memory at once. Processing runs in bursts of
 * `CHUNK_LINES`, yielding to the event loop between them, so the JS thread
 * never blocks long enough to freeze the UI or get killed by the OS watchdog.
 */
export async function parseM3u(
  raw: string,
  onProgress?: (progress: ParseM3uProgress) => void
): Promise<M3uChannel[]> {
  const totalLines = countLines(raw);
  const channels: M3uChannel[] = [];

  let pendingName = '';
  let pendingLogo = '';
  let pendingGroup = '';
  let index = 0;
  let pos = 0;
  let lineNumber = 0;
  let linesSinceYield = 0;
  const rawLength = raw.length;

  while (pos <= rawLength) {
    let newlineIndex = raw.indexOf('\n', pos);
    if (newlineIndex === -1) newlineIndex = rawLength;
    const trimmed = raw.slice(pos, newlineIndex).trim();
    pos = newlineIndex + 1;
    lineNumber += 1;
    linesSinceYield += 1;

    if (trimmed) {
      if (trimmed.startsWith('#EXTINF')) {
        pendingLogo = '';
        pendingGroup = '';

        ATTR_REGEX.lastIndex = 0;
        let attrMatch: RegExpExecArray | null;
        while ((attrMatch = ATTR_REGEX.exec(trimmed))) {
          const key = attrMatch[1];
          if (key === 'tvg-logo') pendingLogo = attrMatch[2];
          else if (key === 'group-title') pendingGroup = attrMatch[2];
        }

        const commaIndex = trimmed.lastIndexOf(',');
        pendingName = commaIndex >= 0 ? trimmed.slice(commaIndex + 1).trim() : 'Canal';
      } else if (!trimmed.startsWith('#')) {
        // Any non-comment, non-empty line after an #EXTINF is the stream URL.
        index += 1;
        const groupTitle = pendingGroup || 'Geral';
        channels.push({
          id: String(index),
          name: pendingName || `Canal ${index}`,
          logo: pendingLogo,
          groupTitle,
          url: trimmed,
          category: categorizeGroup(groupTitle),
        });
        pendingName = '';
        pendingLogo = '';
        pendingGroup = '';
      }
    }

    if (linesSinceYield >= CHUNK_LINES || newlineIndex >= rawLength) {
      onProgress?.({ processedLines: lineNumber, totalLines });
      linesSinceYield = 0;
      await yieldToEventLoop();
    }
  }

  return channels;
}
