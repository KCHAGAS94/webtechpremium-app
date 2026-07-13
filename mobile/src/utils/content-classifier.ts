export type ContentCategory = 'live' | 'movies' | 'series';

// "CANAIS"/"CANAL" is the standard Portuguese prefix IPTV providers use for
// live channel bouquets, even when a group is branded after a VOD service
// (e.g. "CANAIS: HBO", "CANAIS: PRIME VIDEO" are 24/7 linear feeds, not
// on-demand libraries). It's checked before movie/series brand keywords so
// those brands don't steal groups that are actually live TV.
const LIVE_PREFIX_HINTS = ['CANAIS', 'CANAL', 'CHANNELS', 'CHANNEL'];

const MOVIE_HINTS = ['FILME', 'FILMES', 'MOVIE', 'MOVIES', 'CINEMA', 'LANCAMENTO', 'LANCAMENTOS', '4K', 'COLETANEA',
  'COLETANEAS'];

const SERIES_HINTS = [
  'SERIE',
  'SERIES',
  'NETFLIX',
  'PRIME',
  'DISNEY',
  'HBO',
  'EPISODIO',
  'EPISODIOS',
  'NOVELA',
  'NOVELAS',
  'SHOW',
  'SHOWS',
];

const LIVE_HINTS = [
  'LIVE',
  'TV',
  'ABERTO',
  'ABERTOS',
  'ESPORTE',
  'ESPORTES',
  'PREMIERE',
  'NOTICIA',
  'NOTICIAS',
];

// Every hint list is compiled into a single alternation regex ONCE at module
// load, instead of allocating a `new RegExp` per term per call. With tens of
// thousands of channels this was the main source of GC pressure / main-thread
// stalls that crashed the app on large playlists.
function buildWordListRegex(terms: string[]): RegExp {
  return new RegExp(`\\b(?:${terms.join('|')})\\b`);
}

const LIVE_PREFIX_REGEX = buildWordListRegex(LIVE_PREFIX_HINTS);
const MOVIE_REGEX = buildWordListRegex(MOVIE_HINTS);
const SERIES_REGEX = buildWordListRegex(SERIES_HINTS);
const LIVE_REGEX = buildWordListRegex(LIVE_HINTS);
const YEAR_PATTERN = /\b(19|20)\d{2}\b/;
const DIACRITICS_PATTERN = /[̀-ͯ]/g;

function normalize(value: string): string {
  return value.normalize('NFD').replace(DIACRITICS_PATTERN, '').toUpperCase();
}

function classify(groupTitle: string): ContentCategory {
  const title = normalize(groupTitle);

  if (LIVE_PREFIX_REGEX.test(title)) return 'live';
  if (YEAR_PATTERN.test(title)) return 'movies';
  if (MOVIE_REGEX.test(title)) return 'movies';
  if (SERIES_REGEX.test(title)) return 'series';
  if (LIVE_REGEX.test(title)) return 'live';

  return 'live';
}

// A playlist with tens of thousands of channels typically has only a
// handful of distinct group-titles (e.g. "CANAIS: ESPN" repeated for every
// ESPN channel). Caching by the raw group-title turns classification cost
// into O(unique groups) instead of O(total channels).
const classificationCache = new Map<string, ContentCategory>();

/**
 * Heuristically classifies an M3U `group-title` into one of the app's three
 * content buckets. M3U playlists have no universal schema, so this relies on
 * common naming conventions rather than a fixed vocabulary; "live" is the
 * fallback for anything that doesn't clearly look like a movie or series pack.
 */
export function categorizeGroup(groupTitle: string): ContentCategory {
  const cached = classificationCache.get(groupTitle);
  if (cached) return cached;

  const category = classify(groupTitle);
  classificationCache.set(groupTitle, category);
  return category;
}
