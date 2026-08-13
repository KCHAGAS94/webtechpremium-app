import { NextResponse } from 'next/server';

// Public, no-auth device endpoints (/api/devices, /api/app/*) are meant to be
// called by the app itself — the MAC is the only credential, same as an
// Xtream/IPTV portal keying access off a device id. Native fetch (Android/
// iOS) never enforces CORS, but the app's web build (Expo web, run from a
// browser during development) does, and the painel API sends no CORS headers
// by default — so a browser silently turns those responses into "Failed to
// fetch". These headers open just those specific routes to any origin.
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function withCors(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export function corsPreflight(): NextResponse {
  return withCors(new NextResponse(null, { status: 204 }));
}
