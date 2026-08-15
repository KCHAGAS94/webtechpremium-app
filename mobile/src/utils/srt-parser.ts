export type SubtitleCue = {
  start: number;
  end: number;
  text: string;
};

function timeToSeconds(time: string): number {
  const [h, m, rest] = time.trim().replace(',', '.').split(':');
  const [s, ms] = rest.split('.');
  return Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms || 0) / 1000;
}

// We render cue text as plain RN <Text>, which doesn't interpret markup —
// left in, tags like <i>/<font color=...> show up as literal characters
// instead of styling anything. {\an8}-style ASS/SSA override blocks (also
// common in .srt releases muxed from ASS) are stripped the same way, and
// the handful of entities subtitle releases actually use are decoded.
function stripMarkup(text: string): string {
  return text
    .replace(/\{[^}]*\}/g, '')
    .replace(/<\/?[a-zA-Z][^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// Subtitle .srt releases are frequently ISO-8859-1/Windows-1252 (legacy
// encoding predating widespread UTF-8 adoption), not UTF-8 — decoding one
// as the other doesn't fail loudly, it just mangles every accented
// character into mojibake (occasionally landing on an unrelated codepoint
// entirely, e.g. a stray CJK character in the middle of Portuguese text).
// `�` (the replacement character) is what invalid UTF-8 byte sequences
// decode to, so its presence means "this wasn't UTF-8" — re-decoding the
// raw bytes 1:1 as Latin-1 recovers those the way a real Windows-1252
// decoder would for the common Portuguese subtitle case (full accuracy
// would need the 0x80–0x9F code page range too, but that's a rarer miss).
export function decodeSrtBytes(bytes: Uint8Array): string {
  const utf8 = new TextDecoder('utf-8').decode(bytes);
  if (!utf8.includes('�')) return utf8;
  let latin1 = '';
  for (let i = 0; i < bytes.length; i++) latin1 += String.fromCharCode(bytes[i]);
  return latin1;
}

// Standard .srt: index line, "start --> end" line, one or more text lines,
// blank line separating blocks. OpenSubtitles downloads come in this format.
export function parseSrt(content: string): SubtitleCue[] {
  const blocks = content.replace(/\r/g, '').trim().split(/\n\n+/);
  const cues: SubtitleCue[] = [];

  for (const block of blocks) {
    const lines = block.split('\n').filter((line) => line.trim().length > 0);
    const timeLineIndex = lines.findIndex((line) => line.includes('-->'));
    if (timeLineIndex === -1) continue;

    const [startRaw, endRaw] = lines[timeLineIndex].split('-->');
    const text = stripMarkup(lines.slice(timeLineIndex + 1).join('\n').trim());
    if (!text || !startRaw || !endRaw) continue;

    cues.push({ start: timeToSeconds(startRaw), end: timeToSeconds(endRaw), text });
  }

  return cues;
}
