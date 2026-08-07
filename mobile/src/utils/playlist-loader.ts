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

// Where each device's last-downloaded M3U is kept permanently (Paths.document,
// not Paths.cache — the OS can evict cache dir contents under storage
// pressure, which would silently break the "skip straight to Home on next
// boot" flow this backs). One file per MAC, overwritten on every successful
// activation/reload; read back by loadPlaylistFromDisk on cold boot so the
// app never needs to re-hit the panel/M3U network just to restore the
// previous session, no matter how large the playlist is.
function persistedPlaylistFile(mac: string): File {
  const dest = new Directory(Paths.document, 'playlists');
  dest.create({ intermediates: true, idempotent: true });
  return new File(dest, `current-${mac}.m3u`);
}

async function classify(channels: M3uChannel[]): Promise<Pick<ClassifiedPlaylist, 'tv' | 'filmes' | 'series'>> {
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

  return { tv, filmes, series };
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
 *
 * `mac` also doubles as the persistence key: the downloaded file lands at
 * its permanent, per-device path (see persistedPlaylistFile) instead of a
 * throwaway temp file, so loadPlaylistFromDisk can restore this exact
 * playlist on a later cold boot without any network call.
 */
export async function loadPlaylist(
  url: string,
  mac: string,
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
  const persisted = persistedPlaylistFile(mac);

  let channels: M3uChannel[];
  const downloaded = await File.downloadFileAsync(url, persisted, {
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

  const { tv, filmes, series } = await classify(channels);

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

/**
 * Restores the last playlist activated for `mac` straight from the file
 * loadPlaylist persisted, with no network call at all — this is what lets
 * cold boot skip both the "MAC não ativado" and "Minhas listas" screens and
 * land directly on Home once a device has activated a playlist at least
 * once, regardless of how large that playlist is (unlike the old
 * AsyncStorage-JSON cache, there's no channel-count cap here: the file is
 * already on disk, not held as one big JS string/array).
 *
 * Xtream enrichment (real genre grouping, vodId) is intentionally skipped
 * here — it needs network round-trips this path exists to avoid. It's
 * re-applied the next time the user does a manual "Recarregar" reload.
 * Returns null if this device never activated a playlist, or the persisted
 * file is missing/unreadable.
 */
export async function loadPlaylistFromDisk(
  mac: string,
  onProgress?: (progress: ParseM3uProgress) => void
): Promise<Omit<ClassifiedPlaylist, 'seriesMetaByShowName'> | null> {
  const persisted = persistedPlaylistFile(mac);
  if (!persisted.exists) return null;

  try {
    const raw = await persisted.text();
    const channels = await parseM3u(raw, onProgress);
    return classify(channels);
  } catch {
    return null;
  }
}
