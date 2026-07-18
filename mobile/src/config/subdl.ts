// Free key from https://subdl.com/panel/api — unlike OpenSubtitles' free
// "consumer" tier, SubDL's free key explicitly supports third-party app
// usage (2,000 requests/day, search + download both included). Set
// EXPO_PUBLIC_SUBDL_API_KEY in .env.local (see .env.example). Without it,
// fetchSubtitleCues() no-ops (no external calls are made).
export const SUBDL_API_KEY = process.env.EXPO_PUBLIC_SUBDL_API_KEY ?? '';
