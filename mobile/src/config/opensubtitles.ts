// Free-tier key from https://www.opensubtitles.com/consumers — create an
// account, register a "consumer" app, and set EXPO_PUBLIC_OPENSUBTITLES_API_KEY
// in .env.local (see .env.example). Without it, fetchSubtitleCues() no-ops
// (no external calls are made).
export const OPENSUBTITLES_API_KEY = process.env.EXPO_PUBLIC_OPENSUBTITLES_API_KEY ?? '';
