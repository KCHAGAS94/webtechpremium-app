import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer } from 'expo-video';

import { MoviePlayer } from '@/components/movie-player';
import { SeriesDetailsScreen } from '@/components/series-details-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { NavKey } from '@/components/content-browser-screen';
import type { M3uChannel } from '@/utils/m3u-parser';
import { groupSeriesShows, type SeriesEpisode, type SeriesShow } from '@/utils/series-grouping';

const NAV_ITEMS: { key: NavKey; label: string }[] = [
  { key: 'home', label: 'Casa' },
  { key: 'live', label: 'TV ao Vivo' },
  { key: 'movies', label: 'Filmes' },
  { key: 'series', label: 'Séries' },
];

const ALL_CATEGORY_ID = 'all';
const FAVORITES_CATEGORY_ID = 'favorites';
const SEARCH_DEBOUNCE_MS = 200;
const NUM_COLUMNS = 5;

type Category = {
  id: string;
  title: string;
  count: number;
};

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

const PosterCard = memo(function PosterCard({
  item,
  onPress,
}: {
  item: SeriesShow;
  onPress: (show: SeriesShow) => void;
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

// Same lazy-creation pattern as MovieVodPlayer (see movies-screen.tsx): the
// player is only ever instantiated once an episode is actually picked, and
// playback starts after mount so the VideoView already has a surface
// attached by the time `.play()` runs.
function SeriesVodPlayer({
  episode,
  showName,
  isFavorite,
  onToggleFavorite,
  onClose,
}: {
  episode: SeriesEpisode;
  showName: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClose: () => void;
}) {
  const player = useVideoPlayer(episode.channel.url);

  useEffect(() => {
    player.play();
  }, [player]);

  const title = `${showName} - S${pad2(episode.season)}E${pad2(episode.episode)}`;

  return (
    <MoviePlayer
      player={player}
      title={title}
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

export function SeriesScreen({ channels, activeNav, onNavigate, onChangePlaylist }: Props) {
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
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY_ID);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewingShow, setViewingShow] = useState<SeriesShow | null>(null);
  const [playingEpisode, setPlayingEpisode] = useState<SeriesEpisode | null>(null);
  const [allShows, setAllShows] = useState<SeriesShow[]>([]);
  const [isGrouping, setIsGrouping] = useState(true);
  const [sortOrder, setSortOrder] = useState<'az' | 'za'>('az');

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [search]);

  // Grouping episodes into show "folders" runs a regex per item, which is
  // cheap per episode but adds up over a huge playlist — doing it here
  // (async, chunked in groupSeriesShows) instead of in a synchronous useMemo
  // is what keeps navigating into this screen from stalling like it used to.
  useEffect(() => {
    let cancelled = false;
    setIsGrouping(true);
    groupSeriesShows(bucketChannels).then((shows) => {
      if (!cancelled) {
        setAllShows(shows);
        setIsGrouping(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [bucketChannels]);

  // Categories should count shows (folders), not raw episodes — a group with
  // one show and 200 episodes must show "1", not "200".
  const showCountByGroup = useMemo(() => {
    const counts = new Map<string, number>();
    for (const show of allShows) {
      counts.set(show.groupTitle, (counts.get(show.groupTitle) ?? 0) + 1);
    }
    return counts;
  }, [allShows]);

  const categoryList = useMemo<Category[]>(
    () => [
      { id: ALL_CATEGORY_ID, title: 'Tudo', count: allShows.length },
      { id: FAVORITES_CATEGORY_ID, title: 'Favorito', count: favorites.size },
      ...Array.from(channelsByGroup.keys()).map((title) => ({
        id: title,
        title,
        count: showCountByGroup.get(title) ?? 0,
      })),
    ],
    [allShows.length, channelsByGroup, favorites.size, showCountByGroup]
  );

  // Every episode of a show shares the same source group-title (see
  // groupSeriesShows), so filtering the already-grouped list by it is a
  // cheap O(shows) pass — no need to re-group a subset from scratch.
  const categoryShows = useMemo(() => {
    if (selectedCategory === ALL_CATEGORY_ID) return allShows;
    if (selectedCategory === FAVORITES_CATEGORY_ID) {
      return allShows.filter((s) => favorites.has(s.id));
    }
    return allShows.filter((s) => s.groupTitle === selectedCategory);
  }, [allShows, selectedCategory, favorites]);

  const searchedShows = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return categoryShows;
    return categoryShows.filter((s) => s.name.toLowerCase().includes(q));
  }, [categoryShows, debouncedSearch]);

  const filteredShows = useMemo(() => {
    const sorted = [...searchedShows].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    if (sortOrder === 'za') sorted.reverse();
    return sorted;
  }, [searchedShows, sortOrder]);

  const handleToggleSort = useCallback(() => {
    setSortOrder((current) => (current === 'az' ? 'za' : 'az'));
  }, []);

  const handleOpenDetails = useCallback((show: SeriesShow) => {
    setViewingShow(show);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setViewingShow(null);
  }, []);

  const handlePlayEpisode = useCallback((episode: SeriesEpisode) => {
    setPlayingEpisode(episode);
  }, []);

  const handleClosePlayer = useCallback(() => {
    setPlayingEpisode(null);
  }, []);

  const handleToggleFavorite = useCallback((showId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(showId)) next.delete(showId);
      else next.add(showId);
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
    ({ item }: { item: SeriesShow }) => <PosterCard item={item} onPress={handleOpenDetails} />,
    [handleOpenDetails]
  );

  const categoryKeyExtractor = useCallback((item: Category) => item.id, []);
  const showKeyExtractor = useCallback((item: SeriesShow) => item.id, []);

  if (viewingShow) {
    return (
      <>
        <SeriesDetailsScreen
          show={viewingShow}
          isFavorite={favorites.has(viewingShow.id)}
          onToggleFavorite={() => handleToggleFavorite(viewingShow.id)}
          onPlayEpisode={handlePlayEpisode}
          onBack={handleCloseDetails}
        />
        {playingEpisode && (
          <SeriesVodPlayer
            episode={playingEpisode}
            showName={viewingShow.name}
            isFavorite={favorites.has(viewingShow.id)}
            onToggleFavorite={() => handleToggleFavorite(viewingShow.id)}
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
              placeholder="Pesquisar séries"
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
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={true}
            />
          </View>

          <View style={styles.gridColumn}>
            <View style={styles.gridToolbar}>
              <TouchableOpacity onPress={handleToggleSort}>
                <ThemedText style={styles.sortLabel}>
                  Ordenar por {sortOrder === 'az' ? 'A - Z' : 'Z - A'} 
                </ThemedText>
              </TouchableOpacity>
              <ThemedText style={styles.totalLabel}>
                {categoryList.find((c) => c.id === selectedCategory)?.title ?? 'Tudo'}(
                {filteredShows.length})
              </ThemedText>
            </View>

            {isGrouping ? (
              <View style={styles.groupingOverlay}>
                <ActivityIndicator color="#4dd6ff" size="large" />
              </View>
            ) : (
              <FlatList
                data={filteredShows}
                keyExtractor={showKeyExtractor}
                renderItem={renderCard}
                numColumns={NUM_COLUMNS}
                extraData={favorites}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={true}
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
  groupingOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
