import { Directory, File, Paths } from 'expo-file-system';
import { IncrementalM3uParser, type M3uChannel, type ParseM3uProgress } from './m3u-parser';
import { fetchLiveChannels, fetchSeriesMetaByName, fetchVodMovies, parseXtreamCredentials, type SeriesMeta } from './xtream-api';

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

export type FastCatalog = Pick<ClassifiedPlaylist, 'tv' | 'filmes'>;

// Bucketing an already-parsed list is O(n) over plain objects (cheap even at
// tens of thousands of entries), but we still yield periodically so it never
// adds a second long synchronous stretch on top of the parse itself.
const GROUP_CHUNK_SIZE = 5000;

// Read size for parseM3uFile below. Large enough to keep the number of
// synchronous native readBytes() round-trips (and RN bridge crossings) low
// on multi-hundred-MB playlists, but still tiny next to available heap —
// nowhere close to the single whole-file allocation that OOM-killed the app
// via File.text()/File.bytes().
const READ_CHUNK_BYTES = 4 * 1024 * 1024;
// setTimeout(0) yields are clamped to a handful of ms by Android's timer
// throttling, so yielding too often (the original 2000) adds up to real
// wall-clock time on playlists with hundreds of thousands of lines. Yielding
// less often trades a bit of responsiveness for a lot of speed — still well
// under the ANR watchdog's ~5s budget between yields.
const LINES_PER_YIELD = 20000;

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
 * Parses an M3U file straight off disk, reading it in small fixed-size byte
 * chunks (via File.open()'s FileHandle) instead of File.text()/bytes(),
 * which pull the *entire* file into one JS string/array before returning.
 * For a large real-world playlist that single allocation is enough to OOM
 * the app on Android TV's tight heap — this keeps peak memory bounded to
 * roughly one chunk + the growing (much smaller, structured) channel list,
 * no matter how big the file on disk is.
 */
async function parseM3uFile(file: File, onProgress?: (progress: ParseM3uProgress) => void): Promise<M3uChannel[]> {
  const handle = file.open();
  const decoder = new TextDecoder('utf-8');
  const parser = new IncrementalM3uParser();
  const totalBytes = handle.size ?? 0;

  let carry = '';
  let processedBytes = 0;
  let linesSinceYield = 0;

  try {
    while (true) {
      const chunk = handle.readBytes(READ_CHUNK_BYTES);
      if (!chunk || chunk.length === 0) break;
      processedBytes += chunk.length;

      const text = carry + decoder.decode(chunk, { stream: true });
      let start = 0;
      let newlineIndex: number;
      while ((newlineIndex = text.indexOf('\n', start)) !== -1) {
        parser.pushLine(text.slice(start, newlineIndex));
        start = newlineIndex + 1;
        linesSinceYield += 1;

        if (linesSinceYield >= LINES_PER_YIELD) {
          linesSinceYield = 0;
          onProgress?.({ processedLines: processedBytes, totalLines: totalBytes || processedBytes });
          await yieldToEventLoop();
        }
      }
      carry = text.slice(start);
    }

    // Flush whatever the decoder buffered internally for a trailing
    // multi-byte sequence, plus any partial last line with no closing '\n'.
    const trailing = carry + decoder.decode();
    if (trailing) parser.pushLine(trailing);
  } finally {
    handle.close();
  }

  onProgress?.({ processedLines: processedBytes, totalLines: totalBytes || processedBytes });
  return parser.channels;
}

/**
 * Builds TV ao Vivo + Filmes straight from the Xtream JSON API (see
 * xtream-api.ts) — a couple of small requests, independent of how big the
 * playlist's M3U file is. This is what lets the app show something watchable
 * within a second or two of activation/boot instead of waiting on the full
 * M3U download + parse (which loadPlaylist below still does, but only for
 * Séries now). Returns null for non-Xtream M3U-only sources, where the
 * caller has no choice but to wait for the full parse.
 */
export async function loadFastCatalog(url: string): Promise<FastCatalog | null> {
  const credentials = parseXtreamCredentials(url);
  if (!credentials) return null;

  const [liveResult, vodResult] = await Promise.allSettled([
    fetchLiveChannels(credentials),
    fetchVodMovies(credentials),
  ]);
  if (liveResult.status === 'rejected' && vodResult.status === 'rejected') return null;

  return {
    tv: liveResult.status === 'fulfilled' ? liveResult.value : [],
    filmes: vodResult.status === 'fulfilled' ? vodResult.value : [],
  };
}

/**
 * Downloads an Xtream/M3U playlist from `url` and parses it. This is now
 * only the *complete* source of truth for a non-Xtream (plain M3U) playlist;
 * for an Xtream source, callers get TV ao Vivo/Filmes near-instantly from
 * loadFastCatalog instead, and this function's tv/filmes results exist only
 * as the offline/no-network fallback — its real job for Xtream sources is
 * parsing out Séries (which still needs the M3U: listing a show's episodes
 * from the Xtream API would take one get_series_info call *per show*, far
 * more round-trips than one M3U parse) and persisting the file for
 * loadPlaylistFromDisk's cold-boot restore.
 *
 * The M3U download+parse (chunked, see parseM3uFile) and, for Xtream
 * sources, loadFastCatalog's two API calls, run concurrently — call them
 * both and race loadFastCatalog if you want TV/Filmes on screen without
 * waiting for this to finish (see App.tsx's activatePlaylist).
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
  await File.downloadFileAsync(url, persisted, {
    headers: { 'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18' },
    idempotent: true,
  });

  const channels = await parseM3uFile(persisted, onProgress);
  const { tv, filmes, series } = await classify(channels);

  // Séries still needs the real genre from the Xtream API — the M3U only
  // tags every episode with one flat group-title. Best-effort: a failed
  // request just leaves the flat grouping in place.
  let seriesMetaByShowName: Map<string, SeriesMeta> | null = null;
  const credentials = parseXtreamCredentials(url);
  if (credentials) {
    const seriesResult = await fetchSeriesMetaByName(credentials).catch(() => null);
    if (seriesResult) seriesMetaByShowName = seriesResult;
  }

  return { tv, filmes, series, seriesMetaByShowName };
}

/**
 * Restores the last playlist activated for `mac`. TV ao Vivo/Filmes come
 * from loadFastCatalog (network, but just two small JSON calls — no size
 * dependency on the playlist); Séries is read back from the file
 * loadPlaylist persisted, with no network call, so cold boot can still land
 * on Home even if the panel/Xtream API is briefly unreachable (Séries just
 * arrives empty until the next successful reload in that case). Returns
 * null only if this device never activated a playlist at all.
 */
export async function loadPlaylistFromDisk(
  url: string,
  mac: string,
  onProgress?: (progress: ParseM3uProgress) => void
): Promise<ClassifiedPlaylist | null> {
  const persisted = persistedPlaylistFile(mac);
  if (!persisted.exists) return null;

  // The M3U is parsed once regardless (Séries always needs it); its tv/filmes
  // buckets are only actually used if loadFastCatalog fails (no network /
  // Xtream API unreachable at boot), so boot still shows something instead
  // of an empty Home in that case.
  const [fast, local] = await Promise.all([
    loadFastCatalog(url).catch(() => null),
    parseM3uFile(persisted, onProgress)
      .then(classify)
      .catch(() => ({ tv: [], filmes: [], series: [] }) as Awaited<ReturnType<typeof classify>>),
  ]);

  return {
    tv: fast?.tv ?? local.tv,
    filmes: fast?.filmes ?? local.filmes,
    series: local.series,
    seriesMetaByShowName: null,
  };
}
