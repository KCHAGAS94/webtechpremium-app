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
    const text = lines.slice(timeLineIndex + 1).join('\n').trim();
    if (!text || !startRaw || !endRaw) continue;

    cues.push({ start: timeToSeconds(startRaw), end: timeToSeconds(endRaw), text });
  }

  return cues;
}
