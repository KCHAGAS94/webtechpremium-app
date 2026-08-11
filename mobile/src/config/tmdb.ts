// Free "Read Access Token" (v4 auth, JWT) from
// https://www.themoviedb.org/settings/api — used as a Bearer token, not the
// old v3 `api_key` query param. Set EXPO_PUBLIC_TMDB_READ_TOKEN in .env.local
// (see .env.example). Without it, fetchCastPhotos() no-ops.
export const TMDB_READ_TOKEN = process.env.EXPO_PUBLIC_TMDB_READ_TOKEN ?? '';
