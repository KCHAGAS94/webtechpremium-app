import { parseM3u, type M3uChannel, type ParseM3uProgress } from './m3u-parser';
import { fetchSeriesGenreByName, fetchVodGenreByName, parseXtreamCredentials } from './xtream-api';

export type ClassifiedPlaylist = {
  tv: M3uChannel[];
  filmes: M3uChannel[];
  series: M3uChannel[];
  // Genre lookup by *show name*, applied once per show (not per episode) by
  // series-grouping.ts's groupSeriesShows — that's where each episode's show
  // name is already being parsed out anyway. Doing the lookup by episode
  // name here instead would re-run that same regex-based parse a second
  // time over the whole, possibly 100k+ episode, series list.
  seriesGenreByShowName: Map<string, string> | null;
};

// Bucketing an already-parsed list is O(n) over plain objects (cheap even at
// tens of thousands of entries), but we still yield periodically so it never
// adds a second long synchronous stretch on top of the parse itself.
const GROUP_CHUNK_SIZE = 5000;

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
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

  // The M3U tags every movie with one flat "FILMES" group — no genre. If this
  // is an Xtream playlist, enrich each movie's groupTitle with its real genre
  // from the JSON API (matched by exact name). Best-effort: a slow/failed
  // request just leaves the flat grouping in place instead of breaking the load.
  let seriesGenreByShowName: Map<string, string> | null = null;
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
      seriesGenreByShowName = await fetchSeriesGenreByName(credentials);
    } catch {
      // Xtream API unavailable/non-Xtream provider — keep the flat grouping.
    }
  }

  return { tv, filmes, series, seriesGenreByShowName };
}
