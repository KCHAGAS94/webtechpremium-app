// Strips diacritics so search matches regardless of accents — "magica"
// finds "Mágica" and vice versa. NFD splits accented chars into a base
// letter + combining mark (e.g. "á" -> "a" + U+0301), then the regex drops
// every combining mark (U+0300-U+036F).
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}
