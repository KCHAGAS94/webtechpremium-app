import { Directory, File, Paths } from 'expo-file-system';
import { parseM3u, type M3uChannel, type ParseM3uProgress } from './m3u-parser';
import { fetchLiveGenreByName, fetchSeriesMetaByName, fetchVodMetaByName, parseXtreamCredentials, type SeriesMeta } from './xtream-api';

export type ClassifiedPlaylist = {
  tv: M3uChannel[];
  filmes: M3uChannel[];
  series: M3uChannel[];
  // Genre + series_id lookup by *show name*, applied once per show (not per
  // episode) by series-grouping.ts's groupSeriesShows — that's where each
  // episode's show name is already being parsed out anyway. Doing the lookup
  // by episode name here instead would re-run that same regex-based parse a
  // second time over the whole, possibly 100k+ episode, series list.
  seriesMetaByShowName: Map<string, SeriesMeta> | null;
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
  // Some Xtream panels sit behind Cloudflare's bot protection and reject
  // React Native's default fetch User-Agent (returning a 403 challenge page
  // instead of the playlist) while accepting VLC's — see stream-format.ts's
  // header spoof for the same reason on individual channel/episode streams.
  //
  // Deliberately not using fetch() here: RN's networking bridge reads the
  // whole HTTP response into a native byte[] (and, past a size threshold,
  // wraps it as a Blob) before JS ever sees it. A single big playlist
  // response is exactly the kind of allocation that OOM-kills the app on
  // Android TV boxes' tight heap limits. File.downloadFileAsync streams the
  // response straight to disk on Android instead, so that peak allocation
  // never happens — the same approach production IPTV apps use for large
  // M3U/Xtream lists.
  const dest = new Directory(Paths.cache, 'playlists');
  dest.create({ intermediates: true, idempotent: true });
  const tempFile = new File(dest, `playlist-${Date.now()}.m3u`);

  let channels: M3uChannel[];
  try {
    const downloaded = await File.downloadFileAsync(url, tempFile, {
      headers: { 'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18' },
      idempotent: true,
    });

    // Scoped so the raw text (tens of MB on large playlists) is eligible for
    // GC as soon as parsing is done, instead of staying referenced for the
    // rest of this function while the enrichment fetches below run — that
    // would otherwise stack a second memory-heavy phase on top of it right at
    // the peak.
    {
      const raw = await downloaded.text();
      channels = await parseM3u(raw, onProgress);
    }
  } finally {
    if (tempFile.exists) tempFile.delete();
  }

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

  // The M3U tags every movie/channel with a broad flat/technical group
  // ("FILMES", "CANAIS 4K") — no real category. If this is an Xtream
  // playlist, enrich groupTitle with the real one from the JSON API (matched
  // by exact name). Best-effort: a slow/failed request just leaves the flat
  // grouping in place instead of breaking the load.
  let seriesMetaByShowName: Map<string, SeriesMeta> | null = null;
  const credentials = parseXtreamCredentials(url);
  if (credentials) {
    // These three calls are independent (different endpoints, different
    // buckets) so they run concurrently instead of one after another —
    // roughly a 3x cut of this section's wall-clock time. Each is still
    // best-effort: a failure only leaves that bucket's flat grouping in
    // place instead of breaking the whole load.
    const [vodResult, seriesResult, liveResult] = await Promise.allSettled([
      fetchVodMetaByName(credentials),
      fetchSeriesMetaByName(credentials),
      fetchLiveGenreByName(credentials),
    ]);

    if (vodResult.status === 'fulfilled') {
      for (const movie of filmes) {
        const meta = vodResult.value.get(movie.name);
        if (!meta) continue;
        if (meta.genre) movie.groupTitle = meta.genre;
        movie.vodId = meta.vodId;
        if (meta.addedAt) movie.addedAt = meta.addedAt;
      }
    }

    if (seriesResult.status === 'fulfilled') {
      seriesMetaByShowName = seriesResult.value;
    }

    if (liveResult.status === 'fulfilled') {
      for (const channel of tv) {
        const genre = liveResult.value.get(channel.name);
        if (genre) channel.groupTitle = genre;
      }
    }
  }

  return { tv, filmes, series, seriesMetaByShowName };
}
