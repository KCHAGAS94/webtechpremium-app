import JSZip from 'jszip';

import { SUBDL_API_KEY } from '@/config/subdl';
import { decodeSrtBytes, parseSrt, type SubtitleCue } from './srt-parser';

const SEARCH_URL = 'https://api.subdl.com/api/v1/subtitles';
const DOWNLOAD_HOST = 'https://dl.subdl.com';
const REQUEST_TIMEOUT_MS = 8000;

type SearchParams = {
  title: string;
  year?: string | null;
  /** Season/episode of the specific episode being played — SubDL treats a
   * search as a movie lookup unless `type=tv` plus both of these are sent,
   * so omitting them for a series either finds nothing or returns whatever
   * unrelated subtitle matched the show's name alone. */
  season?: number;
  episode?: number;
};

export type SubtitleFetchResult = {
  cues: SubtitleCue[];
  /** True when the request itself failed/timed out — distinct from a clean
   * "no subtitle found for this title", which also returns an empty `cues`. */
  connectionError: boolean;
};

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// SubDL (unlike OpenSubtitles' free "consumer" tier) explicitly supports
// being embedded in a third-party app on its free key — search + download,
// 2,000 requests/day, no separate "resolve a download link" round trip.
export async function fetchSubtitleCues({ title, year, season, episode }: SearchParams): Promise<SubtitleFetchResult> {
  if (!SUBDL_API_KEY) {
    console.warn('[subtitles] sem EXPO_PUBLIC_SUBDL_API_KEY configurada — pulando busca.');
    return { cues: [], connectionError: false };
  }

  try {
    // SubDL's search rejects apostrophes/quotes outright ("Film name
    // contains potentially unsafe characters") instead of just ignoring
    // them — which would otherwise break every title like "Ocean's Eleven".
    const sanitizedTitle = title.replace(/['"’‘]/g, '');

    // Confirmed by hand against the live API: "POB" (the code some docs/
    // examples use for Brazilian Portuguese) silently filters nothing —
    // results come back in random languages. "PT" is what actually narrows
    // results to Portuguese.
    const searchParams = new URLSearchParams({
      api_key: SUBDL_API_KEY,
      film_name: sanitizedTitle,
      languages: 'PT',
    });
    if (year) searchParams.set('year', year);
    if (season != null && episode != null) {
      searchParams.set('type', 'tv');
      searchParams.set('season_number', String(season));
      searchParams.set('episode_number', String(episode));
    }

    console.warn('[subtitles] buscando (subdl)', { title: sanitizedTitle, year, season, episode });
    const searchResponse = await fetchWithTimeout(`${SEARCH_URL}?${searchParams.toString()}`);
    if (!searchResponse.ok) {
      console.warn('[subtitles] busca falhou', searchResponse.status, await searchResponse.text());
      return { cues: [], connectionError: true };
    }
    const searchData = await searchResponse.json();
    // SubDL returns HTTP 200 even for "can't find movie/tv" — that's a
    // clean "not found", not a connection error, so it's not logged as one.
    if (searchData?.status === false) {
      console.warn('[subtitles] busca sem resultado', searchData?.error);
      return { cues: [], connectionError: false };
    }
    const subtitleUrl: string | undefined = searchData?.subtitles?.[0]?.url;
    console.warn('[subtitles] resultados encontrados', searchData?.subtitles?.length, 'url', subtitleUrl);
    if (!subtitleUrl) return { cues: [], connectionError: false };

    // `url` already starts with "/subtitle/..." — the docs' example is
    // literally `DOWNLOAD_HOST + url`, not `DOWNLOAD_HOST + "/subtitle/" + url`.
    const zipResponse = await fetchWithTimeout(`${DOWNLOAD_HOST}${subtitleUrl}`);
    if (!zipResponse.ok) {
      console.warn('[subtitles] download falhou', zipResponse.status);
      return { cues: [], connectionError: true };
    }
    const zipBuffer = await zipResponse.arrayBuffer();
    const zip = await JSZip.loadAsync(zipBuffer);
    const srtEntry = Object.values(zip.files).find(
      (file) => !file.dir && file.name.toLowerCase().endsWith('.srt')
    );
    if (!srtEntry) {
      console.warn('[subtitles] nenhum .srt dentro do .zip');
      return { cues: [], connectionError: true };
    }
    // Not `.async('text')` — that always assumes UTF-8, and these releases
    // are frequently Windows-1252/Latin-1 (see decodeSrtBytes for why that
    // matters).
    const srtBytes = await srtEntry.async('uint8array');
    const cues = parseSrt(decodeSrtBytes(srtBytes));
    console.warn('[subtitles] cues parseados', cues.length);
    return { cues, connectionError: false };
  } catch (err) {
    console.warn('[subtitles] erro inesperado (ou timeout)', err);
    return { cues: [], connectionError: true };
  }
}
