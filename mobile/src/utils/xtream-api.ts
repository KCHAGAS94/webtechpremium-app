import type { M3uChannel } from './m3u-parser';
import type { SeriesEpisode, SeriesShow } from './series-grouping';

// Talks to the Xtream `player_api.php` JSON API, used two ways:
//  1. fetchLiveChannels/fetchVodMovies (below) build the whole TV ao Vivo /
//     Filmes catalog straight from this API instead of parsing the M3U —
//     confirmed against a real provider that requesting
//     `{baseUrl}/live|movie/{user}/{pass}/{stream_id}.{ext}` (the standard
//     Xtream URL pattern, built from fields this API already returns) 302s to
//     the exact same CDN file the M3U lists directly. JSON.parse over this
//     compact per-stream list (no per-item URL/logo/attribute text to scan)
//     is far cheaper than regex-parsing the equivalent M3U block, which is
//     what made cold boot/reload slow on large catalogs.
//  2. The fetch*MetaByName functions enrich series (still M3U-sourced, since
//     listing a show's episodes needs one get_series_info call *per show* —
//     fine for a handful of enrichment lookups, too many round-trips to be
//     the primary source for a whole large catalog) with the real genre
//     Xtream exposes, matched by exact name against the M3U-parsed catalog.
export type XtreamCredentials = {
  baseUrl: string;
  username: string;
  password: string;
};

type VodCategory = {
  category_id: string;
  category_name: string;
};

type VodStream = {
  name: string;
  category_id: string;
  stream_id: number;
  added?: string;
};

type VodStreamFull = VodStream & {
  stream_icon?: string;
  container_extension?: string;
};

type LiveStreamFull = {
  name: string;
  category_id: string;
  stream_id: number;
  stream_icon?: string;
};

export type VodMeta = {
  genre: string | null;
  vodId: string;
  addedAt: string | null;
};

export type VodInfo = {
  plot: string | null;
  duration: string | null;
  cast: string | null;
  director: string | null;
  releaseDate: string | null;
  rating: string | null;
};

/** Extracts Xtream credentials from a `get.php`-style playlist URL, if it is one. */
export function parseXtreamCredentials(playlistUrl: string): XtreamCredentials | null {
  try {
    const parsed = new URL(playlistUrl);
    const username = parsed.searchParams.get('username');
    const password = parsed.searchParams.get('password');
    if (!username || !password) return null;
    return { baseUrl: `${parsed.protocol}//${parsed.host}`, username, password };
  } catch {
    return null;
  }
}

type SeriesEntry = {
  name: string;
  category_id: string;
  series_id: number;
  cover?: string;
};

export type SeriesMeta = {
  genre: string | null;
  seriesId: string;
  // Xtream's own poster for the show — used as a fallback when the M3U
  // itself never carries a `tvg-logo` on any of that show's episode lines
  // (see series-grouping.ts), instead of depending on the provider's M3U
  // being complete for every show.
  cover: string | null;
};

export type SeriesInfo = {
  plot: string | null;
  cast: string | null;
  director: string | null;
  releaseDate: string | null;
  rating: string | null;
};

type LiveStream = {
  name: string;
  category_id: string;
};

// fetch() has no default timeout — a provider whose player_api.php accepts
// the connection but never responds (dead upstream, overloaded box) leaves
// this pending forever instead of rejecting, which used to hang
// loadFastCatalog (and, through it, the whole "Carregando sua lista..."
// screen) indefinitely with no way to recover short of force-closing the
// app. AbortController + a fixed budget guarantees every call here settles.
const XTREAM_REQUEST_TIMEOUT_MS = 15000;

async function fetchXtream<T>(creds: XtreamCredentials, action: string, extraParams = ''): Promise<T> {
  const url = `${creds.baseUrl}/player_api.php?username=${encodeURIComponent(creds.username)}&password=${encodeURIComponent(creds.password)}&action=${action}${extraParams}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), XTREAM_REQUEST_TIMEOUT_MS);
  try {
    // Same Cloudflare User-Agent block as playlist-loader.ts's playlist fetch.
    const response = await fetch(url, {
      headers: { 'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function toGenreByName<T extends { name: string; category_id: string }>(
  categories: VodCategory[],
  entries: T[]
): Map<string, string> {
  const categoryNameById = new Map(categories.map((c) => [c.category_id, c.category_name]));
  const genreByName = new Map<string, string>();
  for (const entry of entries) {
    const genre = categoryNameById.get(entry.category_id);
    if (genre) genreByName.set(entry.name, genre);
  }
  return genreByName;
}

/**
 * Returns a movie-name → genre lookup built from the Xtream VOD catalog.
 * Two requests total, regardless of how many thousands of movies/categories
 * exist. Callers should treat failures as non-fatal (the flat "FILMES"
 * group-title from the M3U still works as a fallback).
 */
export async function fetchVodGenreByName(creds: XtreamCredentials): Promise<Map<string, string>> {
  const [categories, streams] = await Promise.all([
    fetchXtream<VodCategory[]>(creds, 'get_vod_categories'),
    fetchXtream<VodStream[]>(creds, 'get_vod_streams'),
  ]);
  return toGenreByName(categories, streams);
}

/**
 * Same two requests as `fetchVodGenreByName`, but also keeps each movie's
 * numeric `stream_id` (needed to call `getVodInfo` for duration/plot/cast)
 * and its `added` timestamp (list-level "date added", no per-item call
 * needed for that one) — everything get_vod_streams exposes per movie, all
 * still matched by exact name against the M3U-parsed catalog.
 */
export async function fetchVodMetaByName(creds: XtreamCredentials): Promise<Map<string, VodMeta>> {
  const [categories, streams] = await Promise.all([
    fetchXtream<VodCategory[]>(creds, 'get_vod_categories'),
    fetchXtream<VodStream[]>(creds, 'get_vod_streams'),
  ]);
  const categoryNameById = new Map(categories.map((c) => [c.category_id, c.category_name]));
  const metaByName = new Map<string, VodMeta>();
  for (const stream of streams) {
    metaByName.set(stream.name, {
      genre: categoryNameById.get(stream.category_id) ?? null,
      vodId: String(stream.stream_id),
      addedAt: stream.added ?? null,
    });
  }
  return metaByName;
}

/**
 * Per-movie detail call — the only way to get duration/plot/cast, which
 * `get_vod_streams` (the bulk list endpoint) doesn't expose. Callers should
 * treat failures as non-fatal (details screen just keeps showing "—").
 */
export async function getVodInfo(creds: XtreamCredentials, vodId: string): Promise<VodInfo | null> {
  const response = await fetchXtream<{ info?: Record<string, unknown> }>(
    creds,
    'get_vod_info',
    `&vod_id=${encodeURIComponent(vodId)}`
  );
  const info = response?.info;
  if (!info) return null;
  const asString = (value: unknown): string | null =>
    typeof value === 'string' && value.trim() ? value.trim() : null;
  return {
    plot: asString(info.plot ?? info.description),
    duration: asString(info.duration),
    cast: asString(info.cast ?? info.actors),
    director: asString(info.director),
    releaseDate: asString(info.releasedate ?? info.release_date),
    rating: asString(info.rating),
  };
}

/**
 * Same idea as `fetchVodGenreByName`, but for series: looked up by *show*
 * name — the M3U has one line per episode ("Volta por Cima S1 E1"), so
 * callers must extract the show name out of that first (see
 * `extractShowName` in playlist-loader.ts) to match `get_series`' own `name`
 * field ("Volta por Cima").
 */
export async function fetchSeriesGenreByName(creds: XtreamCredentials): Promise<Map<string, string>> {
  const [categories, series] = await Promise.all([
    fetchXtream<VodCategory[]>(creds, 'get_series_categories'),
    fetchXtream<SeriesEntry[]>(creds, 'get_series'),
  ]);
  return toGenreByName(categories, series);
}

/**
 * Same idea as `fetchVodMetaByName`, but for series: also keeps each show's
 * numeric `series_id` (needed to call `getSeriesInfo` for plot/cast), looked
 * up by show name the same way `fetchSeriesGenreByName` is.
 */
export async function fetchSeriesMetaByName(creds: XtreamCredentials): Promise<Map<string, SeriesMeta>> {
  const [categories, series] = await Promise.all([
    fetchXtream<VodCategory[]>(creds, 'get_series_categories'),
    fetchXtream<SeriesEntry[]>(creds, 'get_series'),
  ]);
  const categoryNameById = new Map(categories.map((c) => [c.category_id, c.category_name]));
  const metaByName = new Map<string, SeriesMeta>();
  for (const entry of series) {
    metaByName.set(entry.name, {
      genre: categoryNameById.get(entry.category_id) ?? null,
      seriesId: String(entry.series_id),
      cover: entry.cover?.trim() || null,
    });
  }
  return metaByName;
}

/**
 * Per-show detail call — the only way to get plot/cast for a series, which
 * `get_series` (the bulk list endpoint) doesn't expose. Callers should treat
 * failures as non-fatal (details screen just shows nothing extra).
 */
export async function getSeriesInfo(creds: XtreamCredentials, seriesId: string): Promise<SeriesInfo | null> {
  const response = await fetchXtream<{ info?: Record<string, unknown> }>(
    creds,
    'get_series_info',
    `&series_id=${encodeURIComponent(seriesId)}`
  );
  const info = response?.info;
  if (!info) return null;
  const asString = (value: unknown): string | null =>
    typeof value === 'string' && value.trim() ? value.trim() : null;
  return {
    plot: asString(info.plot ?? info.description),
    cast: asString(info.cast ?? info.actors),
    director: asString(info.director),
    releaseDate: asString(info.releasedate ?? info.release_date),
    rating: asString(info.rating),
  };
}

type SeriesInfoEpisode = {
  id: string;
  episode_num: number;
  title?: string;
  container_extension?: string;
};

/**
 * Builds the Séries grid straight from the Xtream API — categories +
 * get_series, one small JSON call each, same as fetchLiveChannels/
 * fetchVodMovies above. Shows come back with empty `seasons`/
 * `episodesBySeason`: listing every show's episodes up front would mean one
 * get_series_info call *per show* (thousands of round-trips for a large
 * catalog) just for a grid the user hasn't opened yet. fetchSeriesEpisodes
 * below fills a single show in on demand instead, when it's actually opened.
 *
 * Replaces the old M3U-parsed Séries source, which turned out to be
 * unreliable on its own: this provider's playlist endpoint streams a
 * dynamically-generated response with no `Content-Length` (chunked transfer
 * encoding) through a CDN, and two consecutive downloads of the "same" M3U
 * came back with wildly different sizes (546k vs 154k lines) — the source
 * itself, not just the network, was inconsistent. get_series is the same
 * small, consistent JSON call already proven reliable for Filmes.
 */
export async function fetchSeriesShows(creds: XtreamCredentials): Promise<SeriesShow[]> {
  const [categories, series] = await Promise.all([
    fetchXtream<VodCategory[]>(creds, 'get_series_categories'),
    fetchXtream<SeriesEntry[]>(creds, 'get_series'),
  ]);
  const categoryNameById = new Map(categories.map((c) => [c.category_id, c.category_name]));
  return series.map((entry) => ({
    id: String(entry.series_id),
    name: entry.name,
    logo: entry.cover?.trim() || '',
    groupTitle: categoryNameById.get(entry.category_id) ?? 'Geral',
    seasons: [],
    episodesBySeason: new Map(),
    seriesId: String(entry.series_id),
  }));
}

/**
 * Lazily loads one show's episodes (grouped by season, with playable URLs
 * built the same verified way as fetchLiveChannels/fetchVodMovies) — called
 * when the user actually opens a show, not up front for the whole catalog.
 */
export async function fetchSeriesEpisodes(
  creds: XtreamCredentials,
  seriesId: string
): Promise<Pick<SeriesShow, 'seasons' | 'episodesBySeason'>> {
  const response = await fetchXtream<{ episodes?: Record<string, SeriesInfoEpisode[]> }>(
    creds,
    'get_series_info',
    `&series_id=${encodeURIComponent(seriesId)}`
  );

  const episodesBySeason = new Map<number, SeriesEpisode[]>();
  const seasons: number[] = [];

  for (const [seasonKey, episodes] of Object.entries(response.episodes ?? {})) {
    const season = Number(seasonKey);
    if (!Number.isFinite(season) || !Array.isArray(episodes)) continue;

    const list: SeriesEpisode[] = episodes
      .map((ep) => {
        const title = ep.title?.trim() || null;
        const channel: M3uChannel = {
          id: `ep-${ep.id}`,
          name: title || `Episódio ${ep.episode_num}`,
          logo: '',
          groupTitle: '',
          url: buildStreamUrl(creds, 'series', Number(ep.id), ep.container_extension || 'mp4'),
          category: 'series',
        };
        return { channel, season, episode: ep.episode_num, episodeTitle: title };
      })
      .sort((a, b) => a.episode - b.episode);

    episodesBySeason.set(season, list);
    seasons.push(season);
  }
  seasons.sort((a, b) => a - b);

  return { seasons, episodesBySeason };
}

/**
 * Same idea as `fetchVodGenreByName`, but for live TV: the M3U tags every
 * channel with a broad technical bucket ("CANAIS 4K", "CANAIS SD", ...)
 * instead of a per-network category, but `get_live_categories`/
 * `get_live_streams` have the real ones ("Canais | Globo Sul", "Canais |
 * Rede Record", ...), matched by exact channel name (no per-episode parsing
 * needed here — live channels have no season/episode structure).
 */
// Standard Xtream playback URL pattern — confirmed against a real provider
// (see the module comment above) that this redirects to the same file the
// M3U lists directly for all three stream kinds.
function buildStreamUrl(creds: XtreamCredentials, kind: 'live' | 'movie' | 'series', streamId: number, ext: string) {
  return `${creds.baseUrl}/${kind}/${creds.username}/${creds.password}/${streamId}.${ext}`;
}

/**
 * Builds the whole "TV ao Vivo" catalog straight from the Xtream API —
 * categories + streams, two small JSON requests total — instead of parsing
 * the M3U's live-channel lines. This is playlist-loader.ts's primary source
 * for `tv` now; the M3U is only still parsed for `series` (see module
 * comment above for why).
 */
export async function fetchLiveChannels(creds: XtreamCredentials): Promise<M3uChannel[]> {
  const [categories, streams] = await Promise.all([
    fetchXtream<VodCategory[]>(creds, 'get_live_categories'),
    fetchXtream<LiveStreamFull[]>(creds, 'get_live_streams'),
  ]);
  const categoryNameById = new Map(categories.map((c) => [c.category_id, c.category_name]));
  return streams.map((stream) => ({
    id: `live-${stream.stream_id}`,
    name: stream.name,
    logo: stream.stream_icon ?? '',
    groupTitle: categoryNameById.get(stream.category_id) ?? 'Geral',
    url: buildStreamUrl(creds, 'live', stream.stream_id, 'ts'),
    category: 'live' as const,
  }));
}

/**
 * Same idea as fetchLiveChannels, for "Filmes" — categories + get_vod_streams
 * (which already carries the real genre via category_id, the numeric id
 * needed for getVodInfo, and the add date, so no separate enrichment pass is
 * needed the way the old M3U-sourced path required).
 */
export async function fetchVodMovies(creds: XtreamCredentials): Promise<M3uChannel[]> {
  const [categories, streams] = await Promise.all([
    fetchXtream<VodCategory[]>(creds, 'get_vod_categories'),
    fetchXtream<VodStreamFull[]>(creds, 'get_vod_streams'),
  ]);
  const categoryNameById = new Map(categories.map((c) => [c.category_id, c.category_name]));
  return streams.map((stream) => ({
    id: `vod-${stream.stream_id}`,
    name: stream.name,
    logo: stream.stream_icon ?? '',
    groupTitle: categoryNameById.get(stream.category_id) ?? 'Geral',
    url: buildStreamUrl(creds, 'movie', stream.stream_id, stream.container_extension || 'mp4'),
    category: 'movies' as const,
    vodId: String(stream.stream_id),
    addedAt: stream.added,
  }));
}

/**
 * Calling player_api.php with no `action` param returns Xtream's own account
 * info instead of a stream list — `exp_date` there is the provider's real
 * plan validity (Unix seconds, or the literal string "0"/null for an
 * unlimited/no-expiry account), independent of whatever the painel's own
 * Lista.dataExpiracao/tipo says. That painel field is filled in manually at
 * ativação time and can drift from the truth (e.g. a lista created before
 * the tipo column existed, or a provider that extends a plan on their own
 * side without the reseller updating the painel) — this hits the same
 * source of truth "Minhas listas" ultimately depends on.
 */
export async function fetchAccountExpiration(creds: XtreamCredentials): Promise<Date | null> {
  const url = `${creds.baseUrl}/player_api.php?username=${encodeURIComponent(creds.username)}&password=${encodeURIComponent(creds.password)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), XTREAM_REQUEST_TIMEOUT_MS);
  let data: { user_info?: { exp_date?: unknown } };
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18' }, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = await response.json();
  } finally {
    clearTimeout(timer);
  }
  const expDate = data?.user_info?.exp_date;
  if (expDate === null || expDate === undefined || expDate === '' || expDate === '0') return null;
  const seconds = Number(expDate);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000);
}

export async function fetchLiveGenreByName(creds: XtreamCredentials): Promise<Map<string, string>> {
  const [categories, streams] = await Promise.all([
    fetchXtream<VodCategory[]>(creds, 'get_live_categories'),
    fetchXtream<LiveStream[]>(creds, 'get_live_streams'),
  ]);
  return toGenreByName(categories, streams);
}
