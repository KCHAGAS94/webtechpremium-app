import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEvent } from 'expo';
import { useVideoPlayer } from 'expo-video';

import { MoviePlayer } from '@/components/movie-player';
import { OnScreenKeyboard } from '@/components/on-screen-keyboard';
import { ResumeWatchModal } from '@/components/resume-watch-modal';
import { SeriesDetailsScreen } from '@/components/series-details-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { NavKey } from '@/components/content-browser-screen';
import type { M3uChannel } from '@/utils/m3u-parser';
import { groupSeriesShows, type SeriesEpisode, type SeriesShow } from '@/utils/series-grouping';
import { fetchSeriesEpisodes, fetchSeriesShows, parseXtreamCredentials, type SeriesMeta } from '@/utils/xtream-api';
import { loadFavorites, saveFavorites } from '@/utils/favorites-storage';
import { loadHiddenGroups } from '@/utils/hidden-groups-storage';
import {
  episodeHistoryKey,
  loadWatchHistory,
  upsertWatchHistoryProgress,
  type WatchHistoryEntry,
} from '@/utils/watch-history-storage';
import { normalizeSearchText } from '@/utils/text-normalize';
import { useBackStackEntry } from '@/utils/back-stack';
import { useTranslation } from '@/i18n/language-context';
import type { TranslationKey } from '@/i18n/translations';

const NAV_ITEMS: { key: NavKey; labelKey: TranslationKey }[] = [
  { key: 'home', labelKey: 'nav_home' },
  { key: 'live', labelKey: 'nav_live' },
  { key: 'movies', labelKey: 'nav_movies' },
  { key: 'series', labelKey: 'nav_series' },
];

const ALL_CATEGORY_ID = 'all';
const FAVORITES_CATEGORY_ID = 'favorites';
const SEARCH_DEBOUNCE_MS = 200;
// get_series/get_series_categories occasionally hiccups the same way the
// painel's own API does (a transient timeout/edge-cache miss, not a real
// "this MAC has no series") — without a retry, that one failed request
// permanently left the grid on "Tudo(0)" until the user backed out to
// Filmes and back in, which just re-ran this effect and got lucky on the
// second try. Retrying here does the same thing automatically.
const FETCH_SERIES_MAX_RETRIES = 2;
const FETCH_SERIES_RETRY_DELAY_MS = 1200;

// Cycled by the loading modal below while the (potentially huge) series
// catalog is still being grouped — some IPTV panels/devices take a while
// here, so this keeps the user informed instead of staring at a bare
// spinner and assuming the app froze.
const LOADING_MESSAGES = [
  'Estamos carregando as séries…',
  '♡ Favorite as séries que mais assiste para encontrá-las mais rápido',
  '📺 Espelhe na TV tocando no ícone de cast dentro do player',
  '↻ Seu progresso é salvo automaticamente — continue de onde parou',
];
const LOADING_MESSAGE_INTERVAL_MS = 3000;
const NUM_COLUMNS = 5;
// getItemLayout previously precomputed a fixed row height here so
// scrollToIndex could jump straight to a row without FlatList measuring
// everything first. Title height varies (1 vs 2 lines), so any fixed
// estimate drifts from the real rendered layout — on a catalog this size
// (thousands of rows) that drift compounds into the FlatList virtualization
// window landing on the wrong offset, rendering nothing for most of the
// list. Relying on FlatList's own measurement (slower to jump far via
// scrollToIndex, but correct) is the tradeoff that actually works at this
// scale; see onScrollToIndexFailed below for the retry that covers the
// slower jump.

type Category = {
  id: string;
  title: string;
  count: number;
};

type SortMode = 'added' | 'az' | 'za';

const SORT_LABEL: Record<SortMode, string> = {
  added: 'Ordenar por Adicionado',
  az: 'Ordenar A-Z',
  za: 'Ordenar Z-A',
};

const NEXT_SORT_MODE: Record<SortMode, SortMode> = {
  added: 'az',
  az: 'za',
  za: 'added',
};

// Grouping is the expensive part of opening this screen (a regex per
// episode across a potentially huge playlist). `channels` is owned by
// App.tsx and keeps the same array reference across Home <-> Séries
// navigation — it only changes when a playlist is actually (re)loaded (see
// App.tsx's activatePlaylist, which always builds a fresh array) — so
// caching the grouped result by that reference means revisiting this screen
// with the same list is instant, while a real reload still regroups from
// scratch exactly as before.
const seriesGroupCache = new WeakMap<M3uChannel[], SeriesShow[]>();

const HeaderNavItem = memo(function HeaderNavItem({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      style={[styles.headerNavItemBox, focused && styles.headerNavItemFocused]}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
    >
      <ThemedText style={[styles.headerNavItem, active && styles.headerNavItemActive]}>{label}</ThemedText>
    </Pressable>
  );
});

const CategoryRow = memo(function CategoryRow({
  item,
  isActive,
  onPress,
}: {
  item: Category;
  isActive: boolean;
  onPress: (id: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      style={[styles.categoryRow, (focused || isActive) && styles.categoryRowFocused]}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={() => onPress(item.id)}
    >
      <ThemedText style={[styles.categoryTitle, isActive && styles.categoryTitleActive]} numberOfLines={1}>
        {item.title}
      </ThemedText>
      <ThemedText style={styles.categoryCount}>{item.count}</ThemedText>
    </Pressable>
  );
});

// The provider's own tvg-logo (item.logo) is sometimes a dead/blocked URL —
// that permanently blanks the poster since expo-image doesn't retry on its
// own. `sourceIndex` walks [logo, logoFallback] (the Xtream/TMDB cover) in
// order, falling through to the next candidate on error before giving up to
// the placeholder icon. `attempt` forces a fresh Image mount per try (also
// covers plain transient network blips on an otherwise-good URL).
const PosterCard = memo(function PosterCard({
  item,
  onPress,
  loading,
  hasTVPreferredFocus,
}: {
  item: SeriesShow;
  onPress: (show: SeriesShow) => void;
  loading?: boolean;
  hasTVPreferredFocus?: boolean;
}) {
  const [focused, setFocused] = useState(!!hasTVPreferredFocus);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const sources = useMemo(
    () => [item.logo, item.logoFallback].filter((uri, i, arr): uri is string => !!uri && arr.indexOf(uri) === i),
    [item.logo, item.logoFallback]
  );
  const currentSource = sources[sourceIndex];
  return (
    <Pressable
      style={[styles.card, focused && styles.cardFocused]}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={() => onPress(item)}
      hasTVPreferredFocus={hasTVPreferredFocus}
    >
      {currentSource ? (
        <Image
          key={`${sourceIndex}-${attempt}`}
          source={{ uri: currentSource }}
          style={styles.poster}
          contentFit="cover"
          onError={() => {
            if (attempt < 1) {
              setAttempt((a) => a + 1);
            } else if (sourceIndex < sources.length - 1) {
              setSourceIndex((i) => i + 1);
              setAttempt(0);
            }
          }}
        />
      ) : (
        <View style={[styles.poster, styles.posterPlaceholder]}>
          <ThemedText style={styles.posterPlaceholderIcon}>📺</ThemedText>
        </View>
      )}
      {loading && (
        <View style={[styles.poster, styles.posterLoadingOverlay]}>
          <ActivityIndicator color="#4dd6ff" />
        </View>
      )}
      <ThemedText style={styles.cardTitle} numberOfLines={2}>
        {item.name}
      </ThemedText>
    </Pressable>
  );
});

// Same lazy-creation pattern as MovieVodPlayer (see movies-screen.tsx): the
// player is only ever instantiated once an episode is actually picked, and
// playback starts after mount so the VideoView already has a surface
// attached by the time `.play()` runs.
function SeriesVodPlayer({
  episode,
  showName,
  resumeFrom,
  isFavorite,
  onToggleFavorite,
  onClose,
  onProgress,
}: {
  episode: SeriesEpisode;
  showName: string;
  resumeFrom: number;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClose: () => void;
  onProgress: (positionSeconds: number, durationSeconds: number) => void;
}) {
  // Some IPTV/CDN providers block ExoPlayer's default User-Agent and serve a
  // challenge page instead of the stream; VLC's User-Agent is accepted, same
  // spoof already used for live channels (see content-browser-screen.tsx).
  const videoSource = useMemo(
    () => ({ uri: episode.channel.url, headers: { 'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18' } }),
    [episode.channel.url]
  );
  const player = useVideoPlayer(videoSource);
  const { currentTime } = useEvent(player, 'timeUpdate', {
    currentTime: 0,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
    bufferedPosition: 0,
  });

  const onProgressRef = useRef(onProgress);
  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  const resumeFromRef = useRef(resumeFrom);

  // When there's a saved position, playback waits for the user to pick
  // "continuar" vs "começar do início" instead of auto-resuming.
  const [resumeChoice, setResumeChoice] = useState<'pending' | 'resume' | 'restart'>(
    resumeFromRef.current > 0 ? 'pending' : 'restart'
  );

  // While the resume modal is pending, prebuffer muted from position 0 so
  // whichever option the user picks doesn't pay a cold-start buffering cost —
  // "começar do início" is then already buffered, and "continuar de onde
  // parou" only pays for the seek to the saved position, not the initial load.
  useEffect(() => {
    if (resumeChoice !== 'pending') return;
    player.muted = true;
    player.play();
  }, [player, resumeChoice]);

  useEffect(() => {
    if (resumeChoice === 'pending') return;
    if (resumeChoice === 'resume' && resumeFromRef.current > 0) player.currentTime = resumeFromRef.current;
    player.muted = false;
    player.play();
    player.timeUpdateEventInterval = 1;
    return () => {
      try {
        player.timeUpdateEventInterval = 0;
      } catch {}
    };
  }, [player, resumeChoice]);

  // `timeUpdateEventInterval` is 1s so the seek bar/clock stay smooth — this
  // throttles the actual progress save to ~5s so "Retomar para assistir"
  // survives an app kill without writing to storage on every tick.
  const lastSavedAtRef = useRef(0);
  useEffect(() => {
    if (currentTime <= 0 || player.duration <= 0) return;
    if (currentTime - lastSavedAtRef.current < 5) return;
    lastSavedAtRef.current = currentTime;
    onProgressRef.current(currentTime, player.duration);
  }, [currentTime, player]);

  const title = `${showName} - S${String(episode.season).padStart(2, '0')}E${String(episode.episode).padStart(2, '0')}`;

  return (
    <>
      <MoviePlayer
        player={player}
        title={title}
        streamUrl={episode.channel.url}
        subtitleSearchTitle={showName}
        subtitleSeason={episode.season}
        subtitleEpisode={episode.episode}
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
        onClose={onClose}
      />
      {resumeChoice === 'pending' && (
        <ResumeWatchModal
          title={title}
          onResume={() => setResumeChoice('resume')}
          onRestart={() => setResumeChoice('restart')}
        />
      )}
    </>
  );
}

type Props = {
  channels: M3uChannel[];
  /** Real genre + series_id per show name from the Xtream API (see playlist-loader.ts). */
  metaByShowName?: Map<string, SeriesMeta>;
  playlistUrl: string;
  activeNav: NavKey;
  onNavigate: (key: NavKey) => void;
};

export function SeriesScreen({ channels, metaByShowName, playlistUrl, activeNav, onNavigate }: Props) {
  const { t } = useTranslation();
  const [hiddenGroups, setHiddenGroups] = useState<Set<string>>(new Set());

  const bucketChannels = useMemo(() => channels.filter((c) => c.category === 'series'), [channels]);

  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<Map<string, WatchHistoryEntry>>(new Map());
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY_ID);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewingShow, setViewingShow] = useState<SeriesShow | null>(null);
  const [playingEpisode, setPlayingEpisode] = useState<SeriesEpisode | null>(null);
  const [allShows, setAllShows] = useState<SeriesShow[]>([]);
  const [isGrouping, setIsGrouping] = useState(true);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const isLoadingCatalog = isGrouping && allShows.length === 0;

  useEffect(() => {
    if (!isLoadingCatalog) return;
    setLoadingMessageIndex(0);
    const timer = setInterval(() => {
      setLoadingMessageIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, LOADING_MESSAGE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isLoadingCatalog]);
  // Remembers which show was last opened so the grid can restore focus/scroll
  // to it on the way back, instead of resetting to the top — the grid screen
  // fully unmounts while `viewingShow` is set (see the early `if (viewingShow)`
  // return below) and remounts from scratch when it closes, so this can't be
  // read back from the FlatList's own scroll state; it has to be kept here.
  const gridListRef = useRef<FlatList<SeriesShow>>(null);
  const [lastOpenedShowId, setLastOpenedShowId] = useState<string | null>(null);
  // Cycles Adicionado → A-Z → Z-A → Adicionado on each tap of the sort
  // button (see handleToggleSort/SORT_LABEL below).
  const [sortMode, setSortMode] = useState<SortMode>('added');
  const [sortFocused, setSortFocused] = useState(false);
  // Show id currently fetching its episodes on-demand (see handleOpenShow) —
  // drives a small loading affordance on that one PosterCard so tapping a
  // show doesn't look like nothing happened while get_series_info resolves.
  const [loadingShowId, setLoadingShowId] = useState<string | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [searchCursor, setSearchCursor] = useState(0);

  useEffect(() => {
    loadHiddenGroups('series').then(setHiddenGroups);
    loadFavorites('series').then(setFavorites);
    loadWatchHistory().then((entries) => {
      setHistory(new Map(entries.filter((e) => e.kind === 'episode').map((e) => [e.key, e])));
    });
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [search]);

  // Séries comes straight from the Xtream API when available — get_series is
  // one small, reliable JSON call for the whole show list (episodes are
  // loaded lazily per-show in handleOpenShow below). This replaced grouping
  // episodes out of the M3U as the primary source because that M3U endpoint
  // turned out to be unreliable on its own: it streams a dynamically-generated
  // response with no `Content-Length`, and two consecutive downloads of the
  // "same" playlist came back with wildly different sizes — the source itself
  // was inconsistent, not just the network. groupSeriesShows is still used
  // for non-Xtream playlists (no API to call at all) AND as a last-resort
  // fallback below when get_series comes back empty/broken but the M3U
  // itself does carry series — some providers only expose series through the
  // M3U group-title/`/series/` entries and never populate get_series.
  useEffect(() => {
    const credentials = parseXtreamCredentials(playlistUrl);
    if (credentials) {
      let cancelled = false;
      setIsGrouping(true);

      // Falls back to grouping series out of the already-parsed M3U when the
      // Xtream `get_series` endpoint comes back empty or keeps failing — some
      // providers have a broken/empty get_series while the M3U itself does
      // carry series (group-title/`/series/` entries, classified by
      // categorizeGroup during the playlist parse). Only used as a last
      // resort so playlists where get_series already works (the common case)
      // are completely unaffected.
      const fallbackToM3uGrouping = async () => {
        if (cancelled) return;
        if (bucketChannels.length === 0) {
          setAllShows([]);
          setIsGrouping(false);
          return;
        }
        const shows = await groupSeriesShows(
          bucketChannels,
          (partialShows) => {
            if (!cancelled) setAllShows(partialShows);
          },
          metaByShowName
        );
        if (!cancelled) {
          setAllShows(shows);
          setIsGrouping(false);
        }
      };

      const loadWithRetries = async () => {
        for (let attempt = 0; attempt <= FETCH_SERIES_MAX_RETRIES; attempt++) {
          try {
            const shows = await fetchSeriesShows(credentials);
            if (cancelled) return;
            if (shows.length > 0) {
              setAllShows(shows);
              setIsGrouping(false);
              return;
            }
            break;
          } catch {
            if (cancelled) return;
            if (attempt < FETCH_SERIES_MAX_RETRIES) {
              await new Promise((resolve) => setTimeout(resolve, FETCH_SERIES_RETRY_DELAY_MS));
            }
          }
        }
        await fallbackToM3uGrouping();
      };
      loadWithRetries();

      return () => {
        cancelled = true;
      };
    }

    // Non-Xtream M3U-only playlist — no API to fall back on, so this is the
    // only source of Séries. Grouping episodes into show "folders" runs a
    // regex per item, cheap per episode but adds up over a huge playlist —
    // doing it here (async, chunked in groupSeriesShows) instead of in a
    // synchronous useMemo is what keeps navigating into this screen from
    // stalling.
    const cached = seriesGroupCache.get(channels);
    if (cached) {
      setAllShows(cached);
      setIsGrouping(false);
      return;
    }

    let cancelled = false;
    setIsGrouping(true);
    groupSeriesShows(
      bucketChannels,
      (partialShows) => {
        if (!cancelled) {
          setAllShows(partialShows);
        }
      },
      metaByShowName
    ).then((shows) => {
      if (!cancelled) {
        seriesGroupCache.set(channels, shows);
        setAllShows(shows);
        setIsGrouping(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [channels, bucketChannels, metaByShowName, playlistUrl]);

  // Hidden groups are matched against `show.groupTitle` (genre-enriched, see
  // groupSeriesShows), not the raw M3U channel `group-title` — most series
  // streams carry a generic group like "SÉRIES"/"NOVELAS", and the real
  // per-provider folders (Netflix, GloboPlay, ...) only exist after that
  // enrichment. Filtering here, post-grouping, is what makes "Ocultar
  // Categorias Series" match what Configurações actually lists.
  const visibleShows = useMemo(
    () => allShows.filter((s) => !hiddenGroups.has(s.groupTitle)),
    [allShows, hiddenGroups]
  );

  const showsByGroup = useMemo(() => {
    const byGroup = new Map<string, SeriesShow[]>();
    for (const show of visibleShows) {
      const list = byGroup.get(show.groupTitle);
      if (list) list.push(show);
      else byGroup.set(show.groupTitle, [show]);
    }
    return byGroup;
  }, [visibleShows]);

  const categoryList = useMemo<Category[]>(
    () => [
      { id: ALL_CATEGORY_ID, title: 'Tudo', count: visibleShows.length },
      { id: FAVORITES_CATEGORY_ID, title: 'Favorito', count: favorites.size },
      ...Array.from(showsByGroup.entries()).map(([title, list]) => ({
        id: title,
        title,
        count: list.length,
      })),
    ],
    [visibleShows.length, showsByGroup, favorites.size]
  );

  const categoryShows = useMemo(() => {
    if (selectedCategory === ALL_CATEGORY_ID) return visibleShows;
    if (selectedCategory === FAVORITES_CATEGORY_ID) return visibleShows.filter((s) => favorites.has(s.id));
    return showsByGroup.get(selectedCategory) ?? [];
  }, [visibleShows, showsByGroup, selectedCategory, favorites]);

  const filteredShows = useMemo(() => {
    const q = normalizeSearchText(debouncedSearch.trim());
    if (!q) return categoryShows;
    return categoryShows.filter((s) => normalizeSearchText(s.name).includes(q));
  }, [categoryShows, debouncedSearch]);

  // 'added' keeps whatever order the category/search step above already
  // produced — az/za only kick in once the user taps the sort button.
  //
  // localeCompare is locale-aware but very slow per call — sorting a huge
  // catalog with it can freeze the app for several seconds (see the same fix
  // in movies-screen.tsx). Comparing precomputed normalizeSearchText keys
  // (already used for search) instead avoids that cost.
  const sortedShows = useMemo(() => {
    if (sortMode === 'added') return filteredShows;
    const keyed = filteredShows.map((show) => ({ show, key: normalizeSearchText(show.name) }));
    keyed.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    const sorted = keyed.map((entry) => entry.show);
    if (sortMode === 'za') sorted.reverse();
    return sorted;
  }, [filteredShows, sortMode]);

  const handleToggleSort = useCallback(() => {
    setSortMode((prev) => NEXT_SORT_MODE[prev]);
  }, []);

  // Shows from fetchSeriesShows arrive with empty seasons/episodesBySeason —
  // filled in here, on demand, the first time this specific show is opened
  // (get_series_info is one small call per show, not per catalog). Shows
  // from the M3U fallback path already have episodes, so this is a no-op for
  // those (seasons.length > 0).
  const handleOpenShow = useCallback(
    async (show: SeriesShow) => {
      setLastOpenedShowId(show.id);

      if (show.seasons.length > 0 || !show.seriesId) {
        setViewingShow(show);
        return;
      }

      const credentials = parseXtreamCredentials(playlistUrl);
      if (!credentials) {
        setViewingShow(show);
        return;
      }

      setLoadingShowId(show.id);
      try {
        const { seasons, episodesBySeason } = await fetchSeriesEpisodes(credentials, show.seriesId);
        const updatedShow: SeriesShow = { ...show, seasons, episodesBySeason };
        setAllShows((prev) => prev.map((s) => (s.id === show.id ? updatedShow : s)));
        setViewingShow(updatedShow);
      } catch {
        // Best-effort — open anyway so the user sees the show page (with no
        // episodes listed) instead of the tap silently doing nothing.
        setViewingShow(show);
      } finally {
        setLoadingShowId(null);
      }
    },
    [playlistUrl]
  );

  // Runs after the grid remounts (see the `if (viewingShow)` early return
  // below — the whole screen, including this FlatList, unmounts while a show
  // is open and mounts fresh when it closes) to scroll the last-opened show
  // back into view. hasTVPreferredFocus on its PosterCard (see renderCard)
  // handles the focus half; scrollToIndex handles the "actually visible on
  // screen" half, since a freshly mounted FlatList always starts at the top
  // regardless of what has focus.
  useEffect(() => {
    if (viewingShow || !lastOpenedShowId) return;
    const index = sortedShows.findIndex((s) => s.id === lastOpenedShowId);
    if (index === -1) return;
    // A frame late so the FlatList has laid out at least once — calling this
    // in the same tick as mount can miss on some devices.
    const timer = setTimeout(() => {
      gridListRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0.3 });
    }, 0);
    return () => clearTimeout(timer);
  }, [viewingShow, lastOpenedShowId, sortedShows]);

  const handleCloseShow = useCallback(() => {
    setViewingShow(null);
  }, []);

  // Lets the TV remote/hardware back key close the show's details screen
  // first (restoring the grid's scroll position via the effect above)
  // instead of App.tsx's own back-stack entry for the whole "series" screen
  // firing first and unmounting this component straight to Home.
  useBackStackEntry(!!viewingShow, handleCloseShow);

  const handlePlayEpisode = useCallback((episode: SeriesEpisode) => {
    setPlayingEpisode(episode);
  }, []);

  const handleClosePlayer = useCallback(() => {
    setPlayingEpisode(null);
    loadWatchHistory().then((entries) => {
      setHistory(new Map(entries.filter((e) => e.kind === 'episode').map((e) => [e.key, e])));
    });
  }, []);

  const handleToggleFavorite = useCallback((showId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(showId)) next.delete(showId);
      else next.add(showId);
      saveFavorites('series', next);
      return next;
    });
  }, []);

  const handleProgress = useCallback(
    (show: SeriesShow, episode: SeriesEpisode, positionSeconds: number, durationSeconds: number) => {
      upsertWatchHistoryProgress({
        key: episodeHistoryKey(show.id, episode.season, episode.episode),
        kind: 'episode',
        title: `${show.name} - S${episode.season}E${episode.episode}`,
        logo: episode.channel.logo || show.logo,
        positionSeconds,
        durationSeconds,
      });
    },
    []
  );

  const renderCategory = useCallback(
    ({ item }: { item: Category }) => (
      <CategoryRow item={item} isActive={item.id === selectedCategory} onPress={setSelectedCategory} />
    ),
    [selectedCategory]
  );

  const renderCard = useCallback(
    ({ item }: { item: SeriesShow }) => (
      <PosterCard
        item={item}
        onPress={handleOpenShow}
        loading={item.id === loadingShowId}
        hasTVPreferredFocus={item.id === lastOpenedShowId}
      />
    ),
    [handleOpenShow, loadingShowId, lastOpenedShowId]
  );

  const categoryKeyExtractor = useCallback((item: Category) => item.id, []);
  const showKeyExtractor = useCallback((item: SeriesShow) => item.id, []);

  if (viewingShow) {
    return (
      <>
        <SeriesDetailsScreen
          show={viewingShow}
          playlistUrl={playlistUrl}
          isFavorite={favorites.has(viewingShow.id)}
          onToggleFavorite={() => handleToggleFavorite(viewingShow.id)}
          onPlayEpisode={handlePlayEpisode}
          onBack={handleCloseShow}
          history={history}
        />
        {playingEpisode && (
          <SeriesVodPlayer
            episode={playingEpisode}
            showName={viewingShow.name}
            resumeFrom={
              history.get(episodeHistoryKey(viewingShow.id, playingEpisode.season, playingEpisode.episode))
                ?.positionSeconds ?? 0
            }
            isFavorite={favorites.has(viewingShow.id)}
            onToggleFavorite={() => handleToggleFavorite(viewingShow.id)}
            onClose={handleClosePlayer}
            onProgress={(position, duration) => handleProgress(viewingShow, playingEpisode, position, duration)}
          />
        )}
      </>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.header}>
          <View style={styles.headerNav}>
            {NAV_ITEMS.map((item) => (
              <HeaderNavItem
                key={item.key}
                active={item.key === activeNav}
                label={t(item.labelKey)}
                onPress={() => onNavigate(item.key)}
              />
            ))}
          </View>

          <TouchableOpacity
            style={styles.searchBox}
            activeOpacity={1}
            onPress={() => {
              setSearchCursor(search.length);
              setKeyboardOpen(true);
            }}
          >
            <ThemedText style={styles.searchIcon}>🔍</ThemedText>
            <TextInput
              value={keyboardOpen ? `${search.slice(0, searchCursor)}|${search.slice(searchCursor)}` : search}
              onChangeText={setSearch}
              placeholder={t('search_series')}
              placeholderTextColor="#8888aa"
              style={styles.searchInput}
              showSoftInputOnFocus={false}
              caretHidden
              editable={false}
              pointerEvents="none"
            />
          </TouchableOpacity>
        </View>

        {keyboardOpen && (
          <OnScreenKeyboard
            value={search}
            cursor={searchCursor}
            onChangeText={setSearch}
            onCursorChange={setSearchCursor}
            onClose={() => setKeyboardOpen(false)}
          />
        )}

        <View style={styles.body}>
          <View style={styles.categoriesColumn}>
            <FlatList
              data={categoryList}
              keyExtractor={categoryKeyExtractor}
              renderItem={renderCategory}
              extraData={selectedCategory}
              initialNumToRender={16}
              maxToRenderPerBatch={16}
              windowSize={7}
              removeClippedSubviews
            />
          </View>

          <View style={styles.gridColumn}>
            <View style={styles.gridToolbar}>
              <Pressable
                style={[styles.sortButton, sortFocused && styles.sortButtonFocused]}
                onPress={handleToggleSort}
                onFocus={() => setSortFocused(true)}
                onBlur={() => setSortFocused(false)}
              >
                <ThemedText style={styles.sortLabel}>{SORT_LABEL[sortMode]}</ThemedText>
              </Pressable>
              <ThemedText style={styles.totalLabel}>
                {categoryList.find((c) => c.id === selectedCategory)?.title ?? 'Tudo'}(
                {filteredShows.length})
              </ThemedText>
            </View>

            <FlatList
              ref={gridListRef}
              data={sortedShows}
              keyExtractor={showKeyExtractor}
              renderItem={renderCard}
              numColumns={NUM_COLUMNS}
              extraData={[favorites, loadingShowId, lastOpenedShowId]}
              onScrollToIndexFailed={({ index }) =>
                setTimeout(
                  () => gridListRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0.3 }),
                  50
                )
              }
              initialNumToRender={20}
              maxToRenderPerBatch={20}
              windowSize={7}
              // Android defaults FlatList to removeClippedSubviews=true when
              // unset. Combined with async poster images (expo-image/Glide),
              // recycled cells sometimes never repaint after the image
              // finishes loading off-screen — the bitmap is cached but the
              // view stays blank. Explicitly disabling it trades a little
              // memory for correct rendering on a catalog this size.
              removeClippedSubviews={false}
              contentContainerStyle={styles.gridContent}
            />
          </View>

          {/* Some IPTV panels/set-top boxes take a while to return the
              series catalog — this overlays just the body (header/nav stays
              visible, matching the rest of the app) and cycles informational
              messages so the wait doesn't read as the app being frozen. */}
          {isLoadingCatalog && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color="#4dd6ff" size="large" />
              <ThemedText style={styles.loadingMessage}>{LOADING_MESSAGES[loadingMessageIndex]}</ThemedText>
            </View>
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a2e',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#252560',
  },
  headerNav: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
  },
  headerNavItemBox: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerNavItemFocused: {
    backgroundColor: '#132a4d',
  },
  headerNavItem: {
    fontSize: 15,
    color: '#c7c7e6',
    fontWeight: '500',
  },
  headerNavItemActive: {
    color: '#4dd6ff',
    fontWeight: '700',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4dd6ff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  searchIcon: {
    fontSize: 14,
    color: '#8888aa',
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    padding: 0,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
  },
  categoriesColumn: {
    width: 220,
    borderRightWidth: 1,
    borderRightColor: '#1e1e50',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a45',
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  categoryRowFocused: {
    borderLeftColor: '#4dd6ff',
    backgroundColor: '#132a4d',
  },
  categoryTitle: {
    fontSize: 13,
    color: '#c7c7e6',
    flexShrink: 1,
    paddingRight: 8,
  },
  categoryTitleActive: {
    color: '#4dd6ff',
    fontWeight: '700',
  },
  categoryCount: {
    fontSize: 13,
    color: '#8888aa',
  },
  gridColumn: {
    flex: 1,
  },
  gridToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sortButton: {
    backgroundColor: '#1a1a45',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sortButtonFocused: {
    borderColor: '#4dd6ff',
    backgroundColor: '#132a4d',
  },
  sortLabel: {
    fontSize: 13,
    color: '#c7c7e6',
  },
  totalLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 40,
    backgroundColor: '#0a0a2e',
  },
  loadingMessage: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    maxWidth: 420,
  },
  gridContent: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  card: {
    flex: 1 / NUM_COLUMNS,
    padding: 8,
    gap: 6,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 10,
  },
  cardFocused: {
    borderColor: '#4dd6ff',
    backgroundColor: '#132a4d',
  },
  poster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 8,
    backgroundColor: '#1a1a45',
  },
  posterPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterPlaceholderIcon: {
    fontSize: 28,
  },
  posterLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 10, 46, 0.6)',
  },
  cardTitle: {
    fontSize: 12,
    color: '#c7c7e6',
    textAlign: 'center',
  },
});
