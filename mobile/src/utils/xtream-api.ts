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
};

async function fetchXtream<T>(creds: XtreamCredentials, action: string): Promise<T> {
  const url = `${creds.baseUrl}/player_api.php?username=${encodeURIComponent(creds.username)}&password=${encodeURIComponent(creds.password)}&action=${action}`;
  const response = await fetch(url);
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
 * Same idea as `fetchVodGenreByName`, but for series: looked up by show name
 * (not by episode name — the M3U carries one line per episode, e.g. "Volta
 * por Cima S1 E1", so callers must match on the show name parsed out of that
 * via `parseEpisodeInfo`, same as `get_series`' own `name` field).
 */
export async function fetchSeriesGenreByName(creds: XtreamCredentials): Promise<Map<string, string>> {
  const [categories, series] = await Promise.all([
    fetchXtream<VodCategory[]>(creds, 'get_series_categories'),
    fetchXtream<SeriesEntry[]>(creds, 'get_series'),
  ]);
  return toGenreByName(categories, series);
}
