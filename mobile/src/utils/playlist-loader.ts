import { Directory, File, Paths } from 'expo-file-system';
import { IncrementalM3uParser, type M3uChannel, type ParseM3uProgress } from './m3u-parser';
import { fetchLiveChannels, fetchSeriesMetaByName, fetchVodMovies, parseXtreamCredentials, type SeriesMeta } from './xtream-api';
import type { ContentCategory } from './content-classifier';

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

// Some providers' CDN edges close the connection early (without a proper
// error) when the origin stalls generating a very large M3U response — OkHttp
// then sees a clean EOF, not a network error, so File.downloadFileAsync
// resolves "successfully" with a truncated file. That's what made Séries
// (still fully dependent on this download, unlike TV ao Vivo/Filmes above)
// intermittently come back with a fraction of the real catalog. Retrying a
// handful of times when the file looks cut off is cheap insurance against
// that — most retries succeed because it's a transient edge/origin hiccup,
// not a persistent one.
const MAX_DOWNLOAD_ATTEMPTS = 3;
const TRUNCATION_CHECK_TAIL_BYTES = 4096;

// File.downloadFileAsync has no built-in timeout option, and a server that
// accepts the connection but then stalls mid-response (keep-alive left open,
// no more bytes, no clean close either) makes it hang forever instead of
// rejecting — no error ever reaches downloadPlaylistVerified's try/catch
// below, so nothing retries and nothing surfaces to the caller. That's what
// made activation get stuck on the loading screen indefinitely for some
// providers. Racing each attempt against this timeout guarantees it always
// settles one way or another, even though the native download itself can't
// be cancelled and keeps running in the background until it does.
// The native download API exposes no progress events, so this can't tell a
// truly stalled connection apart from a legitimately large/slow playlist
// still downloading — it can only bound the worst case. Generous on purpose:
// large real-world catalogs can be tens of MB of text.
const DOWNLOAD_ATTEMPT_TIMEOUT_MS = 90000;

// Combined progress reported to callers is download-phase-fraction * this
// weight, plus parse-phase-fraction * (1 - this). Download dominates wall
// time on real playlists (tens of seconds vs ~1-2s to parse even 250k+
// lines, see parseM3uFile), so it gets most of the bar; the remainder still
// keeps the bar visibly moving during the fast parse pass instead of jumping
// straight from ~85% to 100%.
const DOWNLOAD_PROGRESS_WEIGHT = 0.85;
// Arbitrary fixed denominator so the combined progress can be expressed in
// the existing { processedLines, totalLines } shape (kept unchanged so
// App.tsx's `processedLines / totalLines` doesn't need to know phases exist).
const PROGRESS_SCALE = 1_000_000;
// Some providers serve the M3U over chunked transfer-encoding with no
// Content-Length (totalBytes comes back -1 from downloadFileAsync's
// onProgress) — there's no real total to divide by in that case. This
// reference size makes the bar approach, but never reach, 100% purely from
// bytes-written growth, so it still visibly advances instead of sitting at
// 0% for the whole download like before.
const UNKNOWN_TOTAL_REFERENCE_BYTES = 40 * 1024 * 1024;

function downloadFraction(bytesWritten: number, totalBytes: number): number {
  if (totalBytes > 0) return Math.min(bytesWritten / totalBytes, 1);
  return Math.min(0.9, bytesWritten / (bytesWritten + UNKNOWN_TOTAL_REFERENCE_BYTES));
}

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

// Heuristic: a well-formed M3U's last non-blank line is a stream URL (or the
// lone `#EXTM3U` header, for a pathologically empty list) — never a dangling
// `#EXTINF` whose URL line got cut off mid-transfer. Reading just the tail
// instead of the whole file keeps this cheap even on huge playlists.
function looksComplete(file: File): boolean {
  const size = file.info().size ?? 0;
  if (size === 0) return false;

  const handle = file.open();
  try {
    const tailLength = Math.min(size, TRUNCATION_CHECK_TAIL_BYTES);
    handle.offset = size - tailLength;
    const tailText = new TextDecoder('utf-8').decode(handle.readBytes(tailLength));
    const lines = tailText.split('\n').map((line) => line.trim()).filter(Boolean);
    const lastLine = lines[lines.length - 1] ?? '';
    return !lastLine.startsWith('#') || lastLine === '#EXTM3U';
  } finally {
    handle.close();
  }
}

async function downloadPlaylistVerified(
  url: string,
  dest: File,
  onDownloadProgress?: (fraction: number) => void
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_DOWNLOAD_ATTEMPTS; attempt++) {
    try {
      await withTimeout(
        File.downloadFileAsync(url, dest, {
          headers: { 'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18' },
          idempotent: true,
          onProgress: onDownloadProgress
            ? ({ bytesWritten, totalBytes }) => onDownloadProgress(downloadFraction(bytesWritten, totalBytes))
            : undefined,
        }),
        DOWNLOAD_ATTEMPT_TIMEOUT_MS,
        'Tempo esgotado ao baixar a playlist'
      );
      if (looksComplete(dest)) return;
      lastError = new Error('Download da playlist parece incompleto (conexão encerrada no meio da lista)');
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Falha ao baixar a playlist');
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
async function parseM3uFile(
  file: File,
  onProgress?: (progress: ParseM3uProgress) => void,
  onlyCategory?: ContentCategory
): Promise<M3uChannel[]> {
  const handle = file.open();
  const decoder = new TextDecoder('utf-8');
  const parser = new IncrementalM3uParser(onlyCategory);
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
  await downloadPlaylistVerified(url, persisted, (fraction) => {
    onProgress?.({
      processedLines: Math.round(fraction * DOWNLOAD_PROGRESS_WEIGHT * PROGRESS_SCALE),
      totalLines: PROGRESS_SCALE,
    });
  });

  const channels = await parseM3uFile(persisted, (parseProgress) => {
    const parseFraction = parseProgress.totalLines > 0 ? parseProgress.processedLines / parseProgress.totalLines : 0;
    onProgress?.({
      processedLines: Math.round(
        (DOWNLOAD_PROGRESS_WEIGHT + parseFraction * (1 - DOWNLOAD_PROGRESS_WEIGHT)) * PROGRESS_SCALE
      ),
      totalLines: PROGRESS_SCALE,
    });
  });
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
 * dependency on the playlist). Séries isn't touched here at all anymore for
 * an Xtream source: series-screen.tsx now loads its show list from
 * get_series directly (and each show's episodes lazily, on open) instead of
 * depending on `channels`, the same reliability upgrade as TV ao Vivo/Filmes.
 *
 * The persisted M3U file only still matters as the *offline* fallback below
 * (loadFastCatalog unreachable — no network, or a non-Xtream M3U-only
 * source, which has nowhere else to get any of the three buckets from). This
 * used to always parse the whole file at boot just to extract Séries, which
 * is what made a real boot take 110s: TV ao Vivo/Filmes are typically most
 * of a catalog's line count, and building ~200k+ throwaway channel objects
 * (plus the GC pressure from it) for data nothing even reads anymore dwarfed
 * the couple of small Xtream API calls that actually mattered. Returns null
 * only if this device never activated a playlist at all.
 */
export async function loadPlaylistFromDisk(
  url: string,
  mac: string,
  onProgress?: (progress: ParseM3uProgress) => void
): Promise<ClassifiedPlaylist | null> {
  const persisted = persistedPlaylistFile(mac);
  if (!persisted.exists) return null;

  const fast = await loadFastCatalog(url).catch(() => null);
  if (fast) {
    return { tv: fast.tv, filmes: fast.filmes, series: [], seriesMetaByShowName: null };
  }

  // No network / Xtream API unreachable, or a non-Xtream M3U-only source —
  // the M3U is the only place left to get anything from, so it's worth
  // paying to verify it before trusting it (see downloadPlaylistVerified's
  // doc comment: this endpoint has been observed streaming a truncated
  // response that still ends on a well-formed line).
  if (!looksComplete(persisted)) {
    await downloadPlaylistVerified(url, persisted).catch(() => null);
  }
  const local = await parseM3uFile(persisted, onProgress)
    .then(classify)
    .catch(() => ({ tv: [], filmes: [], series: [] }) as Awaited<ReturnType<typeof classify>>);

  return { tv: local.tv, filmes: local.filmes, series: local.series, seriesMetaByShowName: null };
}
