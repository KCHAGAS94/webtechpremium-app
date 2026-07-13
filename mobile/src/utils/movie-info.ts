// M3U playlists carry no structured metadata beyond name/logo/group/url, but
// providers commonly bake the release year into the title itself, e.g.
// "A Sociedade dos Assassinos (2024)". This best-effort parse pulls that out
// so the details screen has something to show; everything else the
// reference design wants (genre, duration, rating, date added) simply isn't
// present in an M3U and is left for the caller to render as "—".
const YEAR_SUFFIX_PATTERN = /\s*[([]((?:19|20)\d{2})[)\]]\s*$/;

export type ParsedMovieTitle = {
  title: string;
  year: string | null;
};

export function parseMovieTitle(rawName: string): ParsedMovieTitle {
  const match = rawName.match(YEAR_SUFFIX_PATTERN);
  if (!match) return { title: rawName.trim(), year: null };
  return { title: rawName.slice(0, match.index).trim(), year: match[1] };
}
