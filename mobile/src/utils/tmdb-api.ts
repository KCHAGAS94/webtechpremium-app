import { TMDB_READ_TOKEN } from '@/config/tmdb';

const SEARCH_URL = 'https://api.themoviedb.org/3/search/person';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w185';

// TMDB has no way to look up a person by name+movie together — cast comes
// from the Xtream panel as bare names (see xtream-api.ts's VodInfo.cast), so
// this is a best-effort search/person match on the name alone. Common names
// can occasionally return the wrong person's photo; that's an accepted
// trade-off since the panel gives us nothing else to disambiguate with.
const photoCache = new Map<string, string | null>();

/** Resolves an actor's name to a TMDB profile photo URL, or null if not found/no token set. */
export async function fetchCastPhoto(name: string): Promise<string | null> {
  if (!TMDB_READ_TOKEN) return null;

  const cached = photoCache.get(name);
  if (cached !== undefined) return cached;

  try {
    const response = await fetch(`${SEARCH_URL}?query=${encodeURIComponent(name)}&language=pt-BR`, {
      headers: { Authorization: `Bearer ${TMDB_READ_TOKEN}`, accept: 'application/json' },
    });
    if (!response.ok) {
      photoCache.set(name, null);
      return null;
    }

    const data = await response.json();
    const profilePath: string | null = data?.results?.[0]?.profile_path ?? null;
    const url = profilePath ? `${IMAGE_BASE_URL}${profilePath}` : null;
    photoCache.set(name, url);
    return url;
  } catch {
    photoCache.set(name, null);
    return null;
  }
}
