import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEvent } from 'expo';
import { useVideoPlayer } from 'expo-video';

import { MovieDetailsScreen } from '@/components/movie-details-screen';
import { MoviePlayer } from '@/components/movie-player';
import { OnScreenKeyboard } from '@/components/on-screen-keyboard';
import { ResumeWatchModal } from '@/components/resume-watch-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { NavKey } from '@/components/content-browser-screen';
import type { M3uChannel } from '@/utils/m3u-parser';
import { parseMovieTitle } from '@/utils/movie-info';
import { loadFavorites, saveFavorites } from '@/utils/favorites-storage';
import { loadHiddenGroups } from '@/utils/hidden-groups-storage';
import { loadWatchHistory, upsertWatchHistoryProgress, type WatchHistoryEntry } from '@/utils/watch-history-storage';
import { normalizeSearchText } from '@/utils/text-normalize';
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
const CONTINUE_WATCHING_CATEGORY_ID = 'continue';
const SEARCH_DEBOUNCE_MS = 200;
const NUM_COLUMNS = 5;

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
  hasTVPreferredFocus,
}: {
  item: Category;
  isActive: boolean;
  onPress: (id: string) => void;
  hasTVPreferredFocus?: boolean;
}) {
  const [focused, setFocused] = useState(!!hasTVPreferredFocus);
  return (
    <Pressable
      style={[styles.categoryRow, (focused || isActive) && styles.categoryRowFocused]}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={() => onPress(item.id)}
      hasTVPreferredFocus={hasTVPreferredFocus}
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
  hasTVPreferredFocus,
}: {
  item: M3uChannel;
  onPress: (movie: M3uChannel) => void;
  hasTVPreferredFocus?: boolean;
}) {
  const [focused, setFocused] = useState(!!hasTVPreferredFocus);
  return (
    <Pressable
      style={[styles.card, focused && styles.cardFocused]}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={() => onPress(item)}
      hasTVPreferredFocus={hasTVPreferredFocus}
    >
      {item.logo ? (
        <Image source={{ uri: item.logo }} style={styles.poster} contentFit="cover" />
      ) : (
        <View style={[styles.poster, styles.posterPlaceholder]}>
          <ThemedText style={styles.posterPlaceholderIcon}>🎬</ThemedText>
        </View>
      )}
      <ThemedText style={styles.cardTitle} numberOfLines={2}>
        {item.name}
      </ThemedText>
    </Pressable>
  );
});

// Lazily creates a player only once the user asks to actually watch a movie,
// instead of preloading a stream for whatever the grid selection happens to
// be — mounting/unmounting this component owns the useVideoPlayer lifecycle.
function MovieVodPlayer({
  movie,
  resumeFrom,
  isFavorite,
  onToggleFavorite,
  onClose,
  onProgress,
}: {
  movie: M3uChannel;
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
    () => ({ uri: movie.url, headers: { 'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18' } }),
    [movie.url]
  );
  const player = useVideoPlayer(videoSource);
  const { title, year } = parseMovieTitle(movie.name);
  const { currentTime } = useEvent(player, 'timeUpdate', {
    currentTime: 0,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
    bufferedPosition: 0,
  });

  // `onProgress` is an inline callback re-created on every parent render
  // (and calling it updates parent state, which re-renders). Depending on
  // it directly in the effect below would re-fire on every render, not just
  // every 5s tick — a `setState` loop that trips React's "Maximum update
  // depth exceeded". A ref keeps the effect's own deps limited to the
  // player's actual progress ticks.
  const onProgressRef = useRef(onProgress);
  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  // `resumeFrom` is recomputed by the parent from `history` on every
  // progress tick (~5s), so it keeps changing while playing — captured once
  // in a ref so the seek-and-play effect below only runs at mount, not on
  // every tick (which was re-seeking to the last saved position and
  // restarting playback every ~5s).
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

  // Starting playback from useVideoPlayer's setup callback fires before the
  // VideoView below has ever attached a surface to this (brand new) player —
  // unlike Live TV, which reuses an already-playing preview player when it
  // expands to fullscreen. Waiting for mount ensures a surface exists first.
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

  return (
    <>
      <MoviePlayer
        player={player}
        title={title}
        streamUrl={movie.url}
        year={year}
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
  playlistUrl: string;
  activeNav: NavKey;
  onNavigate: (key: NavKey) => void;
};

export function MoviesScreen({ channels, playlistUrl, activeNav, onNavigate }: Props) {
  const { t } = useTranslation();
  const [hiddenGroups, setHiddenGroups] = useState<Set<string>>(new Set());

  const { channelsByGroup, bucketChannels } = useMemo(() => {
    const byGroup = new Map<string, M3uChannel[]>();
    const bucket: M3uChannel[] = [];
    for (const channel of channels) {
      if (channel.category !== 'movies') continue;
      if (hiddenGroups.has(channel.groupTitle)) continue;
      bucket.push(channel);
      const list = byGroup.get(channel.groupTitle);
      if (list) {
        list.push(channel);
      } else {
        byGroup.set(channel.groupTitle, [channel]);
      }
    }
    return { channelsByGroup: byGroup, bucketChannels: bucket };
  }, [channels, hiddenGroups]);

  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<Map<string, WatchHistoryEntry>>(new Map());
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY_ID);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewingMovie, setViewingMovie] = useState<M3uChannel | null>(null);
  const [playingMovie, setPlayingMovie] = useState<M3uChannel | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [searchCursor, setSearchCursor] = useState(0);
  // Remembers which movie was last opened so the grid can restore focus/
  // scroll to it on the way back instead of resetting to the top — see the
  // identical pattern (and fuller explanation) in series-screen.tsx.
  const gridListRef = useRef<FlatList<M3uChannel>>(null);
  const [lastOpenedMovieId, setLastOpenedMovieId] = useState<string | null>(null);
  // Cycles Adicionado → A-Z → Z-A → Adicionado on each tap of the sort
  // button (see handleToggleSort/sortLabelText below).
  const [sortMode, setSortMode] = useState<SortMode>('added');
  const [sortFocused, setSortFocused] = useState(false);

  // Favorites/history live on disk (see favorites-storage.ts,
  // watch-history-storage.ts), keyed by movie title — not M3uChannel.id,
  // which is just positional and gets reshuffled by every playlist reload.
  // Loaded once per screen mount; only actually changes when the user
  // favorites something or watches further, never as a side effect of
  // `channels` refreshing.
  useEffect(() => {
    loadHiddenGroups('movies').then(setHiddenGroups);
    loadFavorites('movies').then(setFavorites);
    loadWatchHistory().then((entries) => {
      setHistory(new Map(entries.filter((e) => e.kind === 'movie').map((e) => [e.key, e])));
    });
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [search]);

  const continueWatchingChannels = useMemo(() => {
    return bucketChannels
      .filter((c) => history.has(c.name))
      .sort((a, b) => (history.get(b.name)?.updatedAt ?? 0) - (history.get(a.name)?.updatedAt ?? 0));
  }, [bucketChannels, history]);

  const categoryList = useMemo<Category[]>(
    () => [
      { id: CONTINUE_WATCHING_CATEGORY_ID, title: 'Retomar para assistir', count: continueWatchingChannels.length },
      { id: ALL_CATEGORY_ID, title: 'Tudo', count: bucketChannels.length },
      { id: FAVORITES_CATEGORY_ID, title: 'Favorito', count: favorites.size },
      ...Array.from(channelsByGroup.entries()).map(([title, list]) => ({
        id: title,
        title,
        count: list.length,
      })),
    ],
    [bucketChannels.length, channelsByGroup, favorites.size, continueWatchingChannels.length]
  );

  const categoryChannels = useMemo(() => {
    if (selectedCategory === ALL_CATEGORY_ID) return bucketChannels;
    if (selectedCategory === CONTINUE_WATCHING_CATEGORY_ID) return continueWatchingChannels;
    if (selectedCategory === FAVORITES_CATEGORY_ID) {
      return bucketChannels.filter((c) => favorites.has(c.name));
    }
    return channelsByGroup.get(selectedCategory) ?? [];
  }, [bucketChannels, channelsByGroup, selectedCategory, favorites, continueWatchingChannels]);

  const filteredChannels = useMemo(() => {
    const q = normalizeSearchText(debouncedSearch.trim());
    if (!q) return categoryChannels;
    return categoryChannels.filter((c) => normalizeSearchText(c.name).includes(q));
  }, [categoryChannels, debouncedSearch]);

  // 'added' keeps whatever order the category/search step above already
  // produced (the catalog's own order, closest thing to "recently added"
  // this data has) — az/za only kick in once the user taps the sort button.
  //
  // localeCompare is locale-aware (accents/case sorted "correctly") but very
  // slow per call — sorting a 25k-item catalog with it froze the app for
  // several seconds. Comparing precomputed normalizeSearchText keys (already
  // used for search, cheap ASCII-folded lowercase strings) instead does the
  // same "É"-sorts-next-to-"E" ordering without the per-comparison cost, and
  // normalizes each name once instead of twice per comparison.
  const sortedChannels = useMemo(() => {
    if (sortMode === 'added') return filteredChannels;
    const keyed = filteredChannels.map((channel) => ({ channel, key: normalizeSearchText(channel.name) }));
    keyed.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    const sorted = keyed.map((entry) => entry.channel);
    if (sortMode === 'za') sorted.reverse();
    return sorted;
  }, [filteredChannels, sortMode]);

  const handleToggleSort = useCallback(() => {
    setSortMode((prev) => NEXT_SORT_MODE[prev]);
  }, []);

  const handleOpenDetails = useCallback((movie: M3uChannel) => {
    setLastOpenedMovieId(movie.id);
    setViewingMovie(movie);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setViewingMovie(null);
  }, []);

  // Runs after the grid remounts (the whole screen, including this FlatList,
  // unmounts while a movie's details are open and mounts fresh once closed —
  // see the early `if (viewingMovie)` return below) to scroll the
  // last-opened movie back into view. hasTVPreferredFocus on its PosterCard
  // (see renderCard) handles the focus half; scrollToIndex handles actually
  // being visible on screen, since a freshly mounted FlatList always starts
  // at the top regardless of what has focus.
  useEffect(() => {
    if (viewingMovie || !lastOpenedMovieId) return;
    const index = sortedChannels.findIndex((c) => c.id === lastOpenedMovieId);
    if (index === -1) return;
    const timer = setTimeout(() => {
      gridListRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0.3 });
    }, 0);
    return () => clearTimeout(timer);
  }, [viewingMovie, lastOpenedMovieId, sortedChannels]);

  const handlePlay = useCallback(() => {
    if (viewingMovie) setPlayingMovie(viewingMovie);
  }, [viewingMovie]);

  const handleClosePlayer = useCallback(() => {
    setPlayingMovie(null);
    // The grid (and its "Retomar para assistir" bucket) only needs to
    // reflect the final position once playback stops — reloading here
    // instead of on every tick is what keeps the screen behind the player
    // from re-rendering a multi-thousand-item FlatList every 5s while a
    // video is actively decoding on top of it.
    loadWatchHistory().then((entries) => {
      setHistory(new Map(entries.filter((e) => e.kind === 'movie').map((e) => [e.key, e])));
    });
  }, []);

  const handleToggleFavorite = useCallback((movieName: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(movieName)) next.delete(movieName);
      else next.add(movieName);
      saveFavorites('movies', next);
      return next;
    });
  }, []);

  // Fire-and-forget persistence only — deliberately does NOT touch React
  // state (see handleClosePlayer above) so a tick every ~5s during playback
  // doesn't re-render this screen's FlatLists behind the player.
  const handleProgress = useCallback(
    (movie: M3uChannel, positionSeconds: number, durationSeconds: number) => {
      upsertWatchHistoryProgress({
        key: movie.name,
        kind: 'movie',
        title: movie.name,
        logo: movie.logo,
        positionSeconds,
        durationSeconds,
      });
    },
    []
  );

  const renderCategory = useCallback(
    ({ item }: { item: Category }) => (
      <CategoryRow
        item={item}
        isActive={item.id === selectedCategory}
        onPress={setSelectedCategory}
        hasTVPreferredFocus={item.id === selectedCategory}
      />
    ),
    [selectedCategory]
  );

  const renderCard = useCallback(
    ({ item }: { item: M3uChannel }) => (
      <PosterCard item={item} onPress={handleOpenDetails} hasTVPreferredFocus={item.id === lastOpenedMovieId} />
    ),
    [handleOpenDetails, lastOpenedMovieId]
  );

  const categoryKeyExtractor = useCallback((item: Category) => item.id, []);
  const channelKeyExtractor = useCallback((item: M3uChannel) => item.id, []);

  if (viewingMovie) {
    return (
      <>
        <MovieDetailsScreen
          movie={viewingMovie}
          playlistUrl={playlistUrl}
          isFavorite={favorites.has(viewingMovie.name)}
          onToggleFavorite={() => handleToggleFavorite(viewingMovie.name)}
          onPlay={handlePlay}
          onBack={handleCloseDetails}
        />
        {playingMovie && (
          <MovieVodPlayer
            movie={playingMovie}
            resumeFrom={history.get(playingMovie.name)?.positionSeconds ?? 0}
            isFavorite={favorites.has(playingMovie.name)}
            onToggleFavorite={() => handleToggleFavorite(playingMovie.name)}
            onClose={handleClosePlayer}
            onProgress={(position, duration) => handleProgress(playingMovie, position, duration)}
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
              placeholder={t('search_movies')}
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
                {filteredChannels.length})
              </ThemedText>
            </View>

            <FlatList
              ref={gridListRef}
              data={sortedChannels}
              keyExtractor={channelKeyExtractor}
              renderItem={renderCard}
              numColumns={NUM_COLUMNS}
              extraData={[favorites, lastOpenedMovieId]}
              onScrollToIndexFailed={({ index }) =>
                setTimeout(() => gridListRef.current?.scrollToIndex({ index, animated: false }), 50)
              }
              initialNumToRender={20}
              maxToRenderPerBatch={20}
              windowSize={7}
              contentContainerStyle={styles.gridContent}
            />
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
