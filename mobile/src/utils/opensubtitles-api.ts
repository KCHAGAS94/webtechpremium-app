import { OPENSUBTITLES_API_KEY } from '@/config/opensubtitles';
import { parseSrt, type SubtitleCue } from './srt-parser';

const BASE_URL = 'https://api.opensubtitles.com/api/v1';
const REQUEST_TIMEOUT_MS = 8000;

type SearchParams = {
  title: string;
  year?: string | null;
};

export type SubtitleFetchResult = {
  cues: SubtitleCue[];
  /** True when the request itself failed/timed out — distinct from a clean
   * "no subtitle found for this title", which also returns an empty `cues`. */
  connectionError: boolean;
};

// Wraps `fetch` with a hard timeout — without this, a request that never
// gets a response (some networks silently drop instead of refusing) leaves
// the caller's promise pending forever, which looked like the subtitle
// button "doing nothing" when tapped: it flips state, but the loading
// spinner (and the toast that only fires once the fetch settles) never
// resolves either way.
async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// The `/download` step occasionally comes back 500/502/503/504 — Cloudflare
// throttling/edge hiccups that are usually gone a second later, not a real
// failure. Retrying beats surfacing "connection error" for something that
// would have worked on the very next tap anyway.
const DOWNLOAD_MAX_ATTEMPTS = 3;
const DOWNLOAD_RETRY_DELAY_MS = 1500;

async function postDownloadWithRetry(
  headers: Record<string, string>,
  fileId: number
): Promise<Response> {
  let lastResponse: Response | null = null;
  for (let attempt = 1; attempt <= DOWNLOAD_MAX_ATTEMPTS; attempt++) {
    const response = await fetchWithTimeout(`${BASE_URL}/download`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ file_id: fileId }),
    });
    if (response.ok || (response.status < 500 && response.status !== 429)) return response;
    lastResponse = response;
    console.warn('[subtitles] download falhou (tentativa', attempt, 'de', DOWNLOAD_MAX_ATTEMPTS, ')', response.status);
    if (attempt < DOWNLOAD_MAX_ATTEMPTS) await sleep(DOWNLOAD_RETRY_DELAY_MS * attempt);
  }
  return lastResponse!;
}

async function searchFileId(headers: Record<string, string>, title: string, year?: string | null): Promise<number | null> {
  const searchParams = new URLSearchParams({ query: title, languages: 'pt-br' });
  if (year) searchParams.set('year', year);

  console.warn('[subtitles] buscando', { title, year });
  const searchResponse = await fetchWithTimeout(`${BASE_URL}/subtitles?${searchParams.toString()}`, { headers });
  if (!searchResponse.ok) {
    console.warn('[subtitles] busca falhou', searchResponse.status, await searchResponse.text());
    return null;
  }
  const searchData = await searchResponse.json();
  const fileId = searchData?.data?.[0]?.attributes?.files?.[0]?.file_id;
  console.warn('[subtitles] resultados encontrados', searchData?.data?.length, 'fileId', fileId);
  return fileId ?? null;
}

// Free-tier OpenSubtitles: search by title/year, take the top result, resolve
// it to a download link, then fetch and parse the .srt. Anonymous (API key
// only, no login) — that caps daily downloads lower than an authenticated
// session, but keeps this feature free with no extra account plumbing.
export async function fetchSubtitleCues({ title, year }: SearchParams): Promise<SubtitleFetchResult> {
  if (!OPENSUBTITLES_API_KEY) {
    console.warn('[subtitles] sem OPENSUBTITLES_API_KEY configurada — pulando busca.');
    return { cues: [], connectionError: false };
  }

  const headers = {
    'Api-Key': OPENSUBTITLES_API_KEY,
    'User-Agent': 'WebtechPremiumApp v1.0.0',
    'Content-Type': 'application/json',
  };

  try {
    // The M3U provider's release year can disagree with OpenSubtitles' own
    // (a re-release, a listing typo, etc.), and the `year` filter is strict —
    // one mismatched digit silently zeroes out an otherwise-correct match.
    // Falling back to a year-less search catches that instead of reporting
    // "not found" for a title that's actually in the database.
    let fileId = await searchFileId(headers, title, year);
    if (!fileId && year) {
      fileId = await searchFileId(headers, title, null);
    }
    if (!fileId) return { cues: [], connectionError: false };

    const downloadResponse = await postDownloadWithRetry(headers, fileId);
    if (!downloadResponse.ok) {
      console.warn('[subtitles] download falhou', downloadResponse.status, await downloadResponse.text());
      return { cues: [], connectionError: true };
    }
    const downloadData = await downloadResponse.json();
    const link = downloadData?.link;
    if (!link) return { cues: [], connectionError: true };

    const srtResponse = await fetchWithTimeout(link, {});
    if (!srtResponse.ok) {
      console.warn('[subtitles] .srt falhou', srtResponse.status);
      return { cues: [], connectionError: true };
    }
    const srtContent = await srtResponse.text();
    const cues = parseSrt(srtContent);
    console.warn('[subtitles] cues parseados', cues.length);
    return { cues, connectionError: false };
  } catch (err) {
    console.warn('[subtitles] erro inesperado (ou timeout)', err);
    return { cues: [], connectionError: true };
  }
}
