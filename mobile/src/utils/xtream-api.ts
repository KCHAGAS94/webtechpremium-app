// Enriches movies with real genre categories from the Xtream `player_api.php`
// JSON API. The playlist's M3U itself only tags every movie with one flat
// "FILMES" group-title (no genre), but Xtream's `get_vod_categories` /
// `get_vod_streams` endpoints expose the same catalog split by genre
// ("Filmes | Ação", "Filmes | Terror", ...). We can't use that API's
// stream_id to build a playback URL though — this provider's actual movie
// CDN (found in the M3U) uses an opaque UUID per title, not the numeric
// stream_id, so playback still goes through the M3U-parsed url; only the
// group-title gets replaced, matched by exact movie name.
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

async function fetchXtream<T>(creds: XtreamCredentials, action: string, extraParams = ''): Promise<T> {
  const url = `${creds.baseUrl}/player_api.php?username=${encodeURIComponent(creds.username)}&password=${encodeURIComponent(creds.password)}&action=${action}${extraParams}`;
  // Same Cloudflare User-Agent block as playlist-loader.ts's playlist fetch.
  const response = await fetch(url, { headers: { 'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
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

/**
 * Same idea as `fetchVodGenreByName`, but for live TV: the M3U tags every
 * channel with a broad technical bucket ("CANAIS 4K", "CANAIS SD", ...)
 * instead of a per-network category, but `get_live_categories`/
 * `get_live_streams` have the real ones ("Canais | Globo Sul", "Canais |
 * Rede Record", ...), matched by exact channel name (no per-episode parsing
 * needed here — live channels have no season/episode structure).
 */
export async function fetchLiveGenreByName(creds: XtreamCredentials): Promise<Map<string, string>> {
  const [categories, streams] = await Promise.all([
    fetchXtream<VodCategory[]>(creds, 'get_live_categories'),
    fetchXtream<LiveStream[]>(creds, 'get_live_streams'),
  ]);
  return toGenreByName(categories, streams);
}
