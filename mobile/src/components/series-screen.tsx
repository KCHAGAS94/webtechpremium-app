import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Image, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEvent } from 'expo';
import { useVideoPlayer } from 'expo-video';

import { MoviePlayer } from '@/components/movie-player';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { NavKey } from '@/components/content-browser-screen';
import type { M3uChannel } from '@/utils/m3u-parser';
import { loadFavorites, saveFavorites } from '@/utils/favorites-storage';
import { loadWatchHistory, upsertWatchHistoryProgress, type WatchHistoryEntry } from '@/utils/watch-history-storage';

// Deliberately flat: one card per M3U entry (each entry is one episode, e.g.
// "Volta por Cima S1 E1"), grouped only by the playlist's own group-title —
// same shape as movies-screen.tsx, no show/season folding on top. Simple and
// fast is the point; a "one poster per show" grouping can come back later as
// its own separate feature once it's built to not regress load time.
const NAV_ITEMS: { key: NavKey; label: string }[] = [
  { key: 'home', label: 'Casa' },
  { key: 'live', label: 'TV ao Vivo' },
  { key: 'movies', label: 'Filmes' },
  { key: 'series', label: 'Séries' },
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

const PosterCard = memo(function PosterCard({
  item,
  onPress,
}: {
  item: M3uChannel;
  onPress: (episode: M3uChannel) => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.8}>
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
    </TouchableOpacity>
  );
});

// Same lazy-creation pattern as MovieVodPlayer (movies-screen.tsx): the
// player is only ever instantiated once an episode is actually picked.
function SeriesVodPlayer({
  episode,
  resumeFrom,
  isFavorite,
  onToggleFavorite,
  onClose,
  onProgress,
}: {
  episode: M3uChannel;
  resumeFrom: number;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClose: () => void;
  onProgress: (positionSeconds: number, durationSeconds: number) => void;
}) {
  const player = useVideoPlayer(episode.url);
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

  useEffect(() => {
    if (resumeFromRef.current > 0) player.currentTime = resumeFromRef.current;
    player.play();
    player.timeUpdateEventInterval = 5;
    return () => {
      try {
        player.timeUpdateEventInterval = 0;
      } catch {}
    };
  }, [player]);

  useEffect(() => {
    if (currentTime > 0 && player.duration > 0) {
      onProgressRef.current(currentTime, player.duration);
    }
  }, [currentTime, player]);

  return (
    <MoviePlayer
      player={player}
      title={episode.name}
      isFavorite={isFavorite}
      onToggleFavorite={onToggleFavorite}
      onClose={onClose}
    />
  );
}

type Props = {
  channels: M3uChannel[];
  activeNav: NavKey;
  onNavigate: (key: NavKey) => void;
};

export function SeriesScreen({ channels, activeNav, onNavigate }: Props) {
  const { channelsByGroup, bucketChannels } = useMemo(() => {
    const byGroup = new Map<string, M3uChannel[]>();
    const bucket: M3uChannel[] = [];
    for (const channel of channels) {
      if (channel.category !== 'series') continue;
      bucket.push(channel);
      const list = byGroup.get(channel.groupTitle);
      if (list) {
        list.push(channel);
      } else {
        byGroup.set(channel.groupTitle, [channel]);
      }
    }
    return { channelsByGroup: byGroup, bucketChannels: bucket };
  }, [channels]);

  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<Map<string, WatchHistoryEntry>>(new Map());
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY_ID);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [playingEpisode, setPlayingEpisode] = useState<M3uChannel | null>(null);

  // Favorites/history live on disk (see favorites-storage.ts,
  // watch-history-storage.ts), keyed by episode title — not M3uChannel.id,
  // which is just positional and gets reshuffled by every playlist reload.
  useEffect(() => {
    loadFavorites('series').then(setFavorites);
    loadWatchHistory().then((entries) => {
      setHistory(new Map(entries.filter((e) => e.kind === 'episode').map((e) => [e.key, e])));
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
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return categoryChannels;
    return categoryChannels.filter((c) => c.name.toLowerCase().includes(q));
  }, [categoryChannels, debouncedSearch]);

  const handlePlay = useCallback((episode: M3uChannel) => {
    setPlayingEpisode(episode);
  }, []);

  const handleClosePlayer = useCallback(() => {
    setPlayingEpisode(null);
    loadWatchHistory().then((entries) => {
      setHistory(new Map(entries.filter((e) => e.kind === 'episode').map((e) => [e.key, e])));
    });
  }, []);

  const handleToggleFavorite = useCallback((episodeName: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(episodeName)) next.delete(episodeName);
      else next.add(episodeName);
      saveFavorites('series', next);
      return next;
    });
  }, []);

  const handleProgress = useCallback(
    (episode: M3uChannel, positionSeconds: number, durationSeconds: number) => {
      upsertWatchHistoryProgress({
        key: episode.name,
        kind: 'episode',
        title: episode.name,
        logo: episode.logo,
        positionSeconds,
        durationSeconds,
      });
    },
    []
  );

  const renderCategory = useCallback(
    ({ item }: { item: Category }) => (
      <TouchableOpacity style={styles.categoryRow} onPress={() => setSelectedCategory(item.id)}>
        <ThemedText
          style={[styles.categoryTitle, item.id === selectedCategory && styles.categoryTitleActive]}
          numberOfLines={1}
        >
          {item.title}
        </ThemedText>
        <ThemedText style={styles.categoryCount}>{item.count}</ThemedText>
      </TouchableOpacity>
    ),
    [selectedCategory]
  );

  const renderCard = useCallback(
    ({ item }: { item: M3uChannel }) => <PosterCard item={item} onPress={handlePlay} />,
    [handlePlay]
  );

  const categoryKeyExtractor = useCallback((item: Category) => item.id, []);
  const channelKeyExtractor = useCallback((item: M3uChannel) => item.id, []);

  if (playingEpisode) {
    return (
      <SeriesVodPlayer
        episode={playingEpisode}
        resumeFrom={history.get(playingEpisode.name)?.positionSeconds ?? 0}
        isFavorite={favorites.has(playingEpisode.name)}
        onToggleFavorite={() => handleToggleFavorite(playingEpisode.name)}
        onClose={handleClosePlayer}
        onProgress={(position, duration) => handleProgress(playingEpisode, position, duration)}
      />
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.headerNav}>
            {NAV_ITEMS.map((item) => (
              <TouchableOpacity key={item.key} onPress={() => onNavigate(item.key)}>
                <ThemedText
                  style={[styles.headerNavItem, item.key === activeNav && styles.headerNavItemActive]}
                >
                  {item.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.searchBox}>
            <ThemedText style={styles.searchIcon}>🔍</ThemedText>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Pesquisar séries"
              placeholderTextColor="#8888aa"
              style={styles.searchInput}
            />
          </View>
        </View>

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
                {filteredChannels.length})
              </ThemedText>
            </View>

            <FlatList
              data={filteredChannels}
              keyExtractor={channelKeyExtractor}
              renderItem={renderCard}
              numColumns={NUM_COLUMNS}
              extraData={favorites}
              initialNumToRender={20}
              maxToRenderPerBatch={20}
              windowSize={7}
              removeClippedSubviews
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
  gridContent: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  card: {
    flex: 1 / NUM_COLUMNS,
    padding: 8,
    gap: 6,
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
