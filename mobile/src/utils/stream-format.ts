// Xtream panels can hand out the same channel either as an HLS manifest
// (`get.php?...&output=hls`, URL usually has no `.m3u8` extension) or as a
// raw MPEG-TS stream (`get.php?...&output=ts`). expo-video's `auto`
// content-type detection already handles the `.ts`/no-extension progressive
// case correctly — it's specifically the extension-less HLS URLs that need
// `contentType: 'hls'` forced, otherwise the player tries to progressively
// download an HLS playlist file and fails. Forcing 'hls' on a `.ts` stream
// would break it the same way, so this has to be decided per-URL, not
// assumed for every live channel.
export function isHlsStreamUrl(url: string): boolean {
  return /[?&]output=hls\b/i.test(url) || /\.m3u8(\?|$)/i.test(url);
}
