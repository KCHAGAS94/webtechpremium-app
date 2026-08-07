import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, Pressable, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
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
import type { SeriesMeta } from '@/utils/xtream-api';
import { loadFavorites, saveFavorites } from '@/utils/favorites-storage';
import { loadHiddenGroups } from '@/utils/hidden-groups-storage';
import { loadWatchHistory, upsertWatchHistoryProgress, type WatchHistoryEntry } from '@/utils/watch-history-storage';
import { normalizeSearchText } from '@/utils/text-normalize';
import { useTranslation } from '@/i18n/language-context';
import type { TranslationKey } from '@/i18n/translations';

// Stable identity for an episode's watch-history entry: survives a playlist
// reload the same way movie titles do (see favorites-storage.ts) since it's
// derived from the show id + season/episode, not the reload-volatile
// M3uChannel.id.
function episodeHistoryKey(showId: string, season: number, episode: number): string {
  return `${showId}::S${season}E${episode}`;
}

const NAV_ITEMS: { key: NavKey; labelKey: TranslationKey }[] = [
  { key: 'home', labelKey: 'nav_home' },
  { key: 'live', labelKey: 'nav_live' },
  { key: 'movies', labelKey: 'nav_movies' },
  { key: 'series', labelKey: 'nav_series' },
];

const ALL_CATEGORY_ID = 'all';
const FAVORITES_CATEGORY_ID = 'favorites';
const SEARCH_DEBOUNCE_MS = 200;
const NUM_COLUMNS = 5;

// See the identical constants in movies-screen.tsx: without a precomputed
// row height, FlatList has to measure each grid row as it scrolls/focuses
// into view instead of jumping straight to it — on a large catalog that's
// what makes the D-pad feel like it takes a moment to catch up after every
// arrow press. Mirrors the `card`/`poster`/`cardTitle` styles below exactly.
const CATEGORIES_COLUMN_WIDTH = 221; // styles.categoriesColumn width (220) + its 1px border
const GRID_HORIZONTAL_PADDING = 24; // styles.gridContent paddingHorizontal (12) * 2
const CARD_PADDING = 16; // styles.card padding (8) * 2
const CARD_GAP = 6; // styles.card gap
const CARD_TITLE_HEIGHT = 32; // styles.cardTitle: 2 lines at fontSize 12
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - CATEGORIES_COLUMN_WIDTH - GRID_HORIZONTAL_PADDING) / NUM_COLUMNS;
const POSTER_HEIGHT = ((CARD_WIDTH - CARD_PADDING) * 3) / 2;
const GRID_ROW_HEIGHT = CARD_PADDING + POSTER_HEIGHT + CARD_GAP + CARD_TITLE_HEIGHT;

type Category = {
  id: string;
  title: string;
  count: number;
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
      style={[styles.categoryRow, focused && styles.categoryRowFocused]}
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

const PosterCard = memo(function PosterCard({
  item,
  onPress,
}: {
  item: SeriesShow;
  onPress: (show: SeriesShow) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      style={[styles.card, focused && styles.cardFocused]}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={() => onPress(item)}
    >
      {item.logo ? (
        <Image source={{ uri: item.logo }} style={styles.poster} resizeMode="cover" />
      ) : (
        <View style={[styles.poster, styles.posterPlaceholder]}>
          <ThemedText style={styles.posterPlaceholderIcon}>📺</ThemedText>
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

  // Grouping episodes into show "folders" runs a regex per item, which is
  // cheap per episode but adds up over a huge playlist — doing it here
  // (async, chunked in groupSeriesShows) instead of in a synchronous useMemo
  // is what keeps navigating into this screen from stalling.
  useEffect(() => {
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
  }, [channels, bucketChannels, metaByShowName]);

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

  const handleOpenShow = useCallback((show: SeriesShow) => {
    setViewingShow(show);
  }, []);

  const handleCloseShow = useCallback(() => {
    setViewingShow(null);
  }, []);

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
    ({ item }: { item: SeriesShow }) => <PosterCard item={item} onPress={handleOpenShow} />,
    [handleOpenShow]
  );

  const categoryKeyExtractor = useCallback((item: Category) => item.id, []);
  const showKeyExtractor = useCallback((item: SeriesShow) => item.id, []);

  const getGridItemLayout = useCallback((_: unknown, index: number) => {
    const row = Math.floor(index / NUM_COLUMNS);
    return { length: GRID_ROW_HEIGHT, offset: GRID_ROW_HEIGHT * row, index };
  }, []);

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
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
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
              <ThemedText style={styles.sortLabel}>Ordenar por Adicionado </ThemedText>
              <ThemedText style={styles.totalLabel}>
                {categoryList.find((c) => c.id === selectedCategory)?.title ?? 'Tudo'}(
                {filteredShows.length})
              </ThemedText>
            </View>

            {isGrouping && allShows.length === 0 ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color="#4dd6ff" size="large" />
              </View>
            ) : (
              <FlatList
                data={filteredShows}
                keyExtractor={showKeyExtractor}
                renderItem={renderCard}
                numColumns={NUM_COLUMNS}
                extraData={favorites}
                getItemLayout={getGridItemLayout}
                initialNumToRender={20}
                maxToRenderPerBatch={20}
                windowSize={7}
                removeClippedSubviews
                contentContainerStyle={styles.gridContent}
              />
            )}
          </View>
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
  sortLabel: {
    fontSize: 13,
    color: '#c7c7e6',
    backgroundColor: '#1a1a45',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  totalLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  cardTitle: {
    fontSize: 12,
    color: '#c7c7e6',
    textAlign: 'center',
  },
});
