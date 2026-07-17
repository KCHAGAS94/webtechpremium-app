import { parseM3u, type M3uChannel, type ParseM3uProgress } from './m3u-parser';
import { fetchSeriesGenreByName, fetchVodGenreByName, parseXtreamCredentials } from './xtream-api';

export type ClassifiedPlaylist = {
  tv: M3uChannel[];
  filmes: M3uChannel[];
  series: M3uChannel[];
};

// Bucketing an already-parsed list is O(n) over plain objects (cheap even at
// tens of thousands of entries), but we still yield periodically so it never
// adds a second long synchronous stretch on top of the parse itself.
const GROUP_CHUNK_SIZE = 5000;

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// "Show Name S01E02", "Show Name S1 E2" — just enough to recover the show
// name for genre matching against Xtream's `get_series` (series-screen.tsx
// itself no longer groups episodes by show, so this single per-episode pass
// is the only place this parsing happens now — see the note on
// fetchSeriesGenreByName below for why that matters).
const SEASON_EPISODE_PATTERN = /S\s*(\d{1,2})[\s._-]*E\s*(\d{1,3})/i;
const NUMERIC_PATTERN = /(\d{1,2})x(\d{1,3})/i;

function extractShowName(episodeName: string): string {
  const match = SEASON_EPISODE_PATTERN.exec(episodeName) ?? NUMERIC_PATTERN.exec(episodeName);
  const raw = match ? episodeName.slice(0, match.index) : episodeName;
  return raw.replace(/^[\s._-]+|[\s._-]+$/g, '').trim() || episodeName;
}

/**
 * Downloads an Xtream/M3U playlist from `url`, parses it, and splits the
 * result into TV ao Vivo / Filmes / Séries — the three buckets the rest of
 * the app needs — in one pass. This is the app's single entry point for
 * loading a playlist: the caller awaits one promise and updates state
 * exactly once with the finished `{ tv, filmes, series }` object, instead of
 * juggling partial updates while a multi-hundred-thousand-line list streams
 * in.
 *
 * Both the download and the classification are async and chunked
 * (parseM3u yields every CHUNK_LINES lines while walking the raw text;
 * grouping yields every GROUP_CHUNK_SIZE parsed channels) so the JS thread
 * never blocks long enough to freeze the UI or trip Android's ANR watchdog,
 * no matter how large the playlist is.
 */
export async function loadPlaylist(
  url: string,
  onProgress?: (progress: ParseM3uProgress) => void
): Promise<ClassifiedPlaylist> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const raw = await response.text();

  const channels = await parseM3u(raw, onProgress);

  const tv: M3uChannel[] = [];
  const filmes: M3uChannel[] = [];
  const series: M3uChannel[] = [];

  let sinceYield = 0;
  for (const channel of channels) {
    if (channel.category === 'series') series.push(channel);
    else if (channel.category === 'movies') filmes.push(channel);
    else tv.push(channel);

    sinceYield += 1;
    if (sinceYield >= GROUP_CHUNK_SIZE) {
      sinceYield = 0;
      await yieldToEventLoop();
    }
  }

  // The M3U tags every movie/series episode with one flat group ("FILMES",
  // "NOVELAS") — no genre. If this is an Xtream playlist, enrich groupTitle
  // with the real genre from the JSON API (matched by name). Best-effort: a
  // slow/failed request just leaves the flat grouping in place instead of
  // breaking the load.
  const credentials = parseXtreamCredentials(url);
  if (credentials) {
    try {
      const vodGenreByName = await fetchVodGenreByName(credentials);
      for (const movie of filmes) {
        const genre = vodGenreByName.get(movie.name);
        if (genre) movie.groupTitle = genre;
      }
    } catch {
      // Xtream API unavailable/non-Xtream provider — keep the flat grouping.
    }

    try {
      const seriesGenreByName = await fetchSeriesGenreByName(credentials);
      for (const episode of series) {
        const genre = seriesGenreByName.get(extractShowName(episode.name));
        if (genre) episode.groupTitle = genre;
      }
    } catch {
      // Xtream API unavailable/non-Xtream provider — keep the flat grouping.
    }
  }

  return { tv, filmes, series };
}
