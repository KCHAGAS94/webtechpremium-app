import type { M3uChannel } from './m3u-parser';

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
};

// "Show Name S01E02", "Show Name S1 E2", "Show.Name.S01.E02.Title" — the
// dominant Xtream/M3U convention for series item names.
const SEASON_EPISODE_PATTERN = /^(.*?)[\s._-]*S\s*(\d{1,2})\s*[\s._-]*E\s*(\d{1,3})[\s._-]*(.*)$/i;
// "Show Name 1x02"
const NUMERIC_PATTERN = /^(.*?)[\s._-]*(\d{1,2})x(\d{1,3})[\s._-]*(.*)$/i;

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
  const match = rawName.match(SEASON_EPISODE_PATTERN) ?? rawName.match(NUMERIC_PATTERN);

  if (!match) {
    return { showName: cleanTitle(rawName), season: 1, episode: 1, episodeTitle: null };
  }

  const [, showNameRaw, seasonRaw, episodeRaw, titleRaw] = match;
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
 * first render.
 */
export async function groupSeriesShows(channels: M3uChannel[]): Promise<SeriesShow[]> {
  const shows = new Map<string, SeriesShow>();

  let sinceYield = 0;
  for (const channel of channels) {
    const { showName, season, episode, episodeTitle } = parseEpisodeInfo(channel.name);
    const key = showName.toUpperCase();

    let show = shows.get(key);
    if (!show) {
      show = {
        id: key,
        name: showName,
        logo: channel.logo,
        groupTitle: channel.groupTitle,
        seasons: [],
        episodesBySeason: new Map(),
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
