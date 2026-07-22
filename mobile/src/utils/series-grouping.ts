import type { M3uChannel } from './m3u-parser';
import type { SeriesMeta } from './xtream-api';

export type ParsedEpisode = {
  showName: string;
  season: number;
  episode: number;
  episodeTitle: string | null;
};

export type SeriesEpisode = {
  channel: M3uChannel;
  season: number;
  episode: number;
  episodeTitle: string | null;
};

export type SeriesShow = {
  id: string;
  name: string;
  logo: string;
  groupTitle: string;
  seasons: number[];
  episodesBySeason: Map<number, SeriesEpisode[]>;
  // Xtream numeric series id, filled in best-effort by playlist-loader.ts
  // (matched by exact show name against get_series) — required to call the
  // per-show get_series_info endpoint for plot/cast. Absent for non-Xtream
  // M3Us or if the name match failed.
  seriesId?: string;
};

// "Show Name S01E02", "Show Name S1 E2", "Show.Name.S01.E02.Title" — the
// dominant Xtream/M3U convention for series item names.
//
// Deliberately NOT the more "obvious" `^(.*?)[\s._-]*S\s*(\d)...[\s._-]*(.*)$`
// shape: two adjacent star-quantified classes that both match whitespace
// (`\s*` immediately followed by `[\s._-]*`) are ambiguous — on a title
// with a long run of spaces/dots that ultimately doesn't match (common in
// messy M3U titles), the engine tries exponentially many ways to split that
// run between the two quantifiers before giving up. A single provider list
// with a handful of such titles was enough to stall the whole "Séries"
// screen for the better part of a minute. These patterns use exactly one
// quantified separator class between any two fixed points, and skip the
// leading `.*?`/trailing `.*` entirely — `parseEpisodeInfo` below slices the
// show name / episode title around the match position instead, since
// `cleanTitle` already strips the separator chars from both sides anyway.
const SEASON_EPISODE_PATTERN = /S\s*(\d{1,2})[\s._-]*E\s*(\d{1,3})/i;
// "Show Name 1x02"
const NUMERIC_PATTERN = /(\d{1,2})x(\d{1,3})/i;

function cleanTitle(value: string): string {
  return value.replace(/^[\s._-]+|[\s._-]+$/g, '').trim();
}

// Grouping runs a regex match per episode, which is cheap per item but adds
// up over tens of thousands of episodes. Yielding every GROUP_CHUNK_SIZE
// items keeps this from blocking the JS thread long enough to make
// navigating into the Séries screen feel slow, the same way m3u-parser.ts
// and playlist-loader.ts chunk their own per-item loops.
const GROUP_CHUNK_SIZE = 1500;

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Best-effort extraction of a show name + season/episode number out of a
 * single M3U item name. Playlists carry no structured season/episode
 * fields, so anything that doesn't match a recognizable pattern is treated
 * as its own single-episode "show" — nothing is dropped, it just doesn't
 * get grouped with anything else.
 */
export function parseEpisodeInfo(rawName: string): ParsedEpisode {
  const match = SEASON_EPISODE_PATTERN.exec(rawName) ?? NUMERIC_PATTERN.exec(rawName);

  if (!match) {
    return { showName: cleanTitle(rawName), season: 1, episode: 1, episodeTitle: null };
  }

  // Slice around the match instead of relying on leading `(.*?)`/trailing
  // `(.*)` capture groups (see the comment above SEASON_EPISODE_PATTERN) —
  // cleanTitle already trims whatever separator chars are left dangling on
  // either side.
  const showNameRaw = rawName.slice(0, match.index);
  const titleRaw = rawName.slice(match.index + match[0].length);
  const [, seasonRaw, episodeRaw] = match;
  const showName = cleanTitle(showNameRaw) || cleanTitle(rawName);
  const episodeTitle = cleanTitle(titleRaw);

  return {
    showName,
    season: Number(seasonRaw),
    episode: Number(episodeRaw),
    episodeTitle: episodeTitle || null,
  };
}

/**
 * Folds a flat list of series episodes (each a plain M3uChannel) into one
 * "folder" per show, with episodes bucketed by season — this is what lets
 * the Séries grid show one poster per show (like Filmes) instead of one
 * poster per episode, and the details screen list episodes under season
 * tabs, matching the reference layout.
 *
 * Async and chunked (see GROUP_CHUNK_SIZE above) so grouping tens of
 * thousands of episodes doesn't block the JS thread on the Séries screen's
 * first render. `onProgress`, if given, is called with the shows found *so
 * far* at every yield point — on a catalog with 100k+ episodes, the caller
 * can show/browse the first batch of shows immediately instead of blocking
 * on the entire list, letting the rest keep grouping in the background.
 *
 * `genreByShowName` (see xtream-api.ts/playlist-loader.ts) is applied once
 * per *show*, at the moment its folder is created — not once per episode —
 * since the show name is already being parsed out of the first episode
 * anyway. Doing the genre lookup per-episode instead would re-run this same
 * regex-based parse a second time over the whole (possibly 100k+ episode)
 * list, which is what made the Séries screen feel heavy before.
 */
export async function groupSeriesShows(
  channels: M3uChannel[],
  onProgress?: (shows: SeriesShow[]) => void,
  metaByShowName?: Map<string, SeriesMeta> | null
): Promise<SeriesShow[]> {
  const shows = new Map<string, SeriesShow>();

  let sinceYield = 0;
  for (const channel of channels) {
    const { showName, season, episode, episodeTitle } = parseEpisodeInfo(channel.name);
    const key = showName.toUpperCase();

    let show = shows.get(key);
    if (!show) {
      const meta = metaByShowName?.get(showName);
      show = {
        id: key,
        name: showName,
        logo: channel.logo,
        groupTitle: meta?.genre ?? channel.groupTitle,
        seasons: [],
        episodesBySeason: new Map(),
        seriesId: meta?.seriesId,
      };
      shows.set(key, show);
    } else if (!show.logo && channel.logo) {
      show.logo = channel.logo;
    }

    let seasonEpisodes = show.episodesBySeason.get(season);
    if (!seasonEpisodes) {
      seasonEpisodes = [];
      show.episodesBySeason.set(season, seasonEpisodes);
      show.seasons.push(season);
    }
    seasonEpisodes.push({ channel, season, episode, episodeTitle });

    sinceYield += 1;
    if (sinceYield >= GROUP_CHUNK_SIZE) {
      sinceYield = 0;
      // Snapshot before yielding, not after: the caller can start rendering
      // this batch of shows during the same tick the event loop is freed
      // up, instead of waiting for the entire (possibly 100k+ episode)
      // catalog to finish.
      onProgress?.(Array.from(shows.values()));
      await yieldToEventLoop();
    }
  }

  for (const show of shows.values()) {
    show.seasons.sort((a, b) => a - b);
    for (const episodes of show.episodesBySeason.values()) {
      episodes.sort((a, b) => a.episode - b.episode);
    }
  }

  return Array.from(shows.values());
}
