import { OPENSUBTITLES_API_KEY } from '@/config/opensubtitles';
import { parseSrt, type SubtitleCue } from './srt-parser';

const BASE_URL = 'https://api.opensubtitles.com/api/v1';

type SearchParams = {
  title: string;
  year?: string | null;
};

// Free-tier OpenSubtitles: search by title/year, take the top result, resolve
// it to a download link, then fetch and parse the .srt. Anonymous (API key
// only, no login) — that caps daily downloads lower than an authenticated
// session, but keeps this feature free with no extra account plumbing.
export async function fetchSubtitleCues({ title, year }: SearchParams): Promise<SubtitleCue[]> {
  if (!OPENSUBTITLES_API_KEY) {
    console.warn('[subtitles] sem OPENSUBTITLES_API_KEY configurada — pulando busca.');
    return [];
  }

  const headers = {
    'Api-Key': OPENSUBTITLES_API_KEY,
    'User-Agent': 'WebtechPremiumApp v1.0.0',
    'Content-Type': 'application/json',
  };

  try {
    const searchParams = new URLSearchParams({ query: title, languages: 'pt-br' });
    if (year) searchParams.set('year', year);

    console.warn('[subtitles] buscando', { title, year });
    const searchResponse = await fetch(`${BASE_URL}/subtitles?${searchParams.toString()}`, { headers });
    if (!searchResponse.ok) {
      console.warn('[subtitles] busca falhou', searchResponse.status, await searchResponse.text());
      return [];
    }
    const searchData = await searchResponse.json();
    const fileId = searchData?.data?.[0]?.attributes?.files?.[0]?.file_id;
    console.warn('[subtitles] resultados encontrados', searchData?.data?.length, 'fileId', fileId);
    if (!fileId) return [];

    const downloadResponse = await fetch(`${BASE_URL}/download`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ file_id: fileId }),
    });
    if (!downloadResponse.ok) {
      console.warn('[subtitles] download falhou', downloadResponse.status, await downloadResponse.text());
      return [];
    }
    const downloadData = await downloadResponse.json();
    const link = downloadData?.link;
    if (!link) return [];

    const srtResponse = await fetch(link);
    if (!srtResponse.ok) {
      console.warn('[subtitles] .srt falhou', srtResponse.status);
      return [];
    }
    const srtContent = await srtResponse.text();
    const cues = parseSrt(srtContent);
    console.warn('[subtitles] cues parseados', cues.length);
    return cues;
  } catch (err) {
    console.warn('[subtitles] erro inesperado', err);
    return [];
  }
}
