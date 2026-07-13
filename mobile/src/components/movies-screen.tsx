import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Image, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer } from 'expo-video';

import { MovieDetailsScreen } from '@/components/movie-details-screen';
import { MoviePlayer } from '@/components/movie-player';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { NavKey } from '@/components/content-browser-screen';
import type { M3uChannel } from '@/utils/m3u-parser';
import { parseMovieTitle } from '@/utils/movie-info';

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
  onPress: (movie: M3uChannel) => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.8}>
      {item.logo ? (
        <Image source={{ uri: item.logo }} style={styles.poster} resizeMode="cover" />
      ) : (
        <View style={[styles.poster, styles.posterPlaceholder]}>
          <ThemedText style={styles.posterPlaceholderIcon}>🎬</ThemedText>
        </View>
      )}
      <ThemedText style={styles.cardTitle} numberOfLines={2}>
        {item.name}
      </ThemedText>
    </TouchableOpacity>
  );
});

// Lazily creates a player only once the user asks to actually watch a movie,
// instead of preloading a stream for whatever the grid selection happens to
// be — mounting/unmounting this component owns the useVideoPlayer lifecycle.
function MovieVodPlayer({
  movie,
  isFavorite,
  onToggleFavorite,
  onClose,
}: {
  movie: M3uChannel;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClose: () => void;
}) {
  const player = useVideoPlayer(movie.url);
  const { title, year } = parseMovieTitle(movie.name);

  // Starting playback from useVideoPlayer's setup callback fires before the
  // VideoView below has ever attached a surface to this (brand new) player —
  // unlike Live TV, which reuses an already-playing preview player when it
  // expands to fullscreen. Waiting for mount ensures a surface exists first.
  useEffect(() => {
    player.play();
  }, [player]);

  return (
    <MoviePlayer
      player={player}
      title={title}
      year={year}
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
  onChangePlaylist: () => void;
};

export function MoviesScreen({ channels, activeNav, onNavigate, onChangePlaylist }: Props) {
  const { channelsByGroup, bucketChannels } = useMemo(() => {
    const byGroup = new Map<string, M3uChannel[]>();
    const bucket: M3uChannel[] = [];
    for (const channel of channels) {
      if (channel.category !== 'movies') continue;
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
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY_ID);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewingMovie, setViewingMovie] = useState<M3uChannel | null>(null);
  const [playingMovie, setPlayingMovie] = useState<M3uChannel | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [search]);

  const categoryList = useMemo<Category[]>(
    () => [
      { id: CONTINUE_WATCHING_CATEGORY_ID, title: 'Retomar para assistir', count: 0 },
      { id: ALL_CATEGORY_ID, title: 'Tudo', count: bucketChannels.length },
      { id: FAVORITES_CATEGORY_ID, title: 'Favorito', count: favorites.size },
      ...Array.from(channelsByGroup.entries()).map(([title, list]) => ({
        id: title,
        title,
        count: list.length,
      })),
    ],
    [bucketChannels.length, channelsByGroup, favorites.size]
  );

  const categoryChannels = useMemo(() => {
    if (selectedCategory === ALL_CATEGORY_ID) return bucketChannels;
    if (selectedCategory === CONTINUE_WATCHING_CATEGORY_ID) return [];
    if (selectedCategory === FAVORITES_CATEGORY_ID) {
      return bucketChannels.filter((c) => favorites.has(c.id));
    }
    return channelsByGroup.get(selectedCategory) ?? [];
  }, [bucketChannels, channelsByGroup, selectedCategory, favorites]);

  const filteredChannels = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return categoryChannels;
    return categoryChannels.filter((c) => c.name.toLowerCase().includes(q));
  }, [categoryChannels, debouncedSearch]);

  const handleOpenDetails = useCallback((movie: M3uChannel) => {
    setViewingMovie(movie);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setViewingMovie(null);
  }, []);

  const handlePlay = useCallback(() => {
    if (viewingMovie) setPlayingMovie(viewingMovie);
  }, [viewingMovie]);

  const handleClosePlayer = useCallback(() => {
    setPlayingMovie(null);
  }, []);

  const handleToggleFavorite = useCallback((movieId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(movieId)) next.delete(movieId);
      else next.add(movieId);
      return next;
    });
  }, []);

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
    ({ item }: { item: M3uChannel }) => <PosterCard item={item} onPress={handleOpenDetails} />,
    [handleOpenDetails]
  );

  const categoryKeyExtractor = useCallback((item: Category) => item.id, []);
  const channelKeyExtractor = useCallback((item: M3uChannel) => item.id, []);

  if (viewingMovie) {
    return (
      <>
        <MovieDetailsScreen
          movie={viewingMovie}
          isFavorite={favorites.has(viewingMovie.id)}
          onToggleFavorite={() => handleToggleFavorite(viewingMovie.id)}
          onPlay={handlePlay}
          onBack={handleCloseDetails}
        />
        {playingMovie && (
          <MovieVodPlayer
            movie={playingMovie}
            isFavorite={favorites.has(playingMovie.id)}
            onToggleFavorite={() => handleToggleFavorite(playingMovie.id)}
            onClose={handleClosePlayer}
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
              placeholder="Pesquisar filmes"
              placeholderTextColor="#8888aa"
              style={styles.searchInput}
            />
          </View>

          <TouchableOpacity onPress={onChangePlaylist}>
            <ThemedText style={styles.brand}>trocar lista</ThemedText>
          </TouchableOpacity>
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
  brand: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4dd6ff',
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
