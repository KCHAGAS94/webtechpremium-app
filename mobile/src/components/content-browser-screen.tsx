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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';

import { FullscreenPlayer } from '@/components/fullscreen-player';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { ContentCategory } from '@/utils/content-classifier';
import type { M3uChannel } from '@/utils/m3u-parser';

export type NavKey = 'home' | 'live' | 'movies' | 'series';

type Category = {
  id: string;
  title: string;
  count: number;
};

const NAV_ITEMS: { key: NavKey; label: string }[] = [
  { key: 'home', label: 'Casa' },
  { key: 'live', label: 'TV ao Vivo' },
  { key: 'movies', label: 'Filmes' },
  { key: 'series', label: 'Séries' },
];

// Per-category copy so the same screen reads naturally whether it's browsing
// live channels, movies, or series.
const CONTENT_LABELS: Record<ContentCategory, { searchPlaceholder: string; emptyPreview: string }> = {
  live: { searchPlaceholder: 'Buscar canal', emptyPreview: 'Selecione um canal' },
  movies: { searchPlaceholder: 'Buscar filme', emptyPreview: 'Selecione um filme' },
  series: { searchPlaceholder: 'Buscar série', emptyPreview: 'Selecione uma série' },
};

const ALL_CATEGORY_ID = 'all';
const SEARCH_DEBOUNCE_MS = 200;
const LIVE_EDGE_THRESHOLD_SECONDS = 10;

// Must stay in sync with categoryRow / channelRow paddingVertical + borderBottomWidth below,
// so FlatList can skip cell measurement (getItemLayout) on very large lists.
const CATEGORY_ROW_HEIGHT = 41;
const CHANNEL_ROW_HEIGHT = 37;

type Props = {
  channels: M3uChannel[];
  /** Which content bucket this screen browses (see content-classifier.ts). */
  category: ContentCategory;
  /** Which header nav item to highlight as active. */
  activeNav: NavKey;
  onNavigate: (key: NavKey) => void;
};

const CategoryRow = memo(function CategoryRow({
  item,
  isActive,
  onPress,
}: {
  item: Category;
  isActive: boolean;
  onPress: (id: string) => void;
}) {
  return (
    <TouchableOpacity style={styles.categoryRow} onPress={() => onPress(item.id)}>
      <ThemedText
        style={[styles.categoryTitle, isActive && styles.categoryTitleActive]}
        numberOfLines={1}
      >
        {item.title}
      </ThemedText>
      <ThemedText style={styles.categoryCount}>{item.count}</ThemedText>
    </TouchableOpacity>
  );
});

const ChannelRow = memo(function ChannelRow({
  item,
  isSelected,
  onPress,
}: {
  item: M3uChannel;
  isSelected: boolean;
  onPress: (channel: M3uChannel) => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.channelRow, isSelected && styles.channelRowSelected]}
      onPress={() => onPress(item)}
    >
      <ThemedText style={styles.channelName} numberOfLines={1}>
        {item.name}
      </ThemedText>
    </TouchableOpacity>
  );
});

export function ContentBrowserScreen({ channels, category, activeNav, onNavigate }: Props) {
  const labels = CONTENT_LABELS[category];

  // Single pass over the (potentially huge) channel list: keep only groups
  // classified into this screen's `category` (see content-classifier.ts) and
  // group them by `group-title` once per playlist load, instead of
  // re-filtering the full list every time the user switches category or
  // types in the search box.
  const { categories, channelsByGroup, bucketChannels } = useMemo(() => {
    const byGroup = new Map<string, M3uChannel[]>();
    const bucket: M3uChannel[] = [];
    for (const channel of channels) {
      if (channel.category !== category) continue;
      bucket.push(channel);
      const list = byGroup.get(channel.groupTitle);
      if (list) {
        list.push(channel);
      } else {
        byGroup.set(channel.groupTitle, [channel]);
      }
    }
    const cats: Category[] = [
      { id: ALL_CATEGORY_ID, title: 'Tudo', count: bucket.length },
      ...Array.from(byGroup.entries()).map(([title, list]) => ({
        id: title,
        title,
        count: list.length,
      })),
    ];
    return { categories: cats, channelsByGroup: byGroup, bucketChannels: bucket };
  }, [channels, category]);

  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY_ID);
  const [selectedChannel, setSelectedChannel] = useState<M3uChannel | undefined>(bucketChannels[0]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isBuffering, setIsBuffering] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Xtream/live stream URLs (e.g. get.php?...&output=hls) rarely end in
  // `.m3u8`, so expo-video's `auto` content-type detection (by extension)
  // misses them and falls back to a progressive-download demuxer, which
  // can't parse an HLS playlist. Live channels need `contentType: 'hls'`
  // forced explicitly; movies/series keep `auto` since those already work.
  const videoSource = useMemo(() => {
    if (!selectedChannel) return null;
    if (category === 'live') return { uri: selectedChannel.url, contentType: 'hls' as const };
    return selectedChannel.url;
  }, [selectedChannel, category]);

  const player = useVideoPlayer(videoSource, (instance) => {
    instance.play();
  });
  const { status, error } = useEvent(player, 'statusChange', { status: player.status, error: undefined });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const { currentOffsetFromLive } = useEvent(player, 'timeUpdate', {
    currentTime: player.currentTime,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
    bufferedPosition: player.bufferedPosition,
  });

  // Owned here (not in FullscreenPlayer) so it keeps emitting — and the
  // preview's "voltar ao vivo" badge keeps working — after the user exits
  // fullscreen, instead of getting reset to 0 when that component unmounts.
  useEffect(() => {
    if (category !== 'live') return;
    player.timeUpdateEventInterval = 1;
    return () => {
      player.timeUpdateEventInterval = 0;
    };
  }, [player, category]);

  // Most IPTV/Xtream streams don't send the `EXT-X-PROGRAM-DATE-TIME` tag
  // expo-video needs to report `currentOffsetFromLive`, so it stays `null`
  // and the "voltar ao vivo" badge never shows even after a long pause.
  // Fall back to timing the pause ourselves: playback position freezes while
  // paused but real time keeps moving, so the gap when resuming is (roughly)
  // how far behind live the stream now is.
  const pausedAtRef = useRef<number | null>(null);
  const [manualOffsetSeconds, setManualOffsetSeconds] = useState(0);

  useEffect(() => {
    if (category !== 'live') return;
    if (!isPlaying) {
      pausedAtRef.current = Date.now();
      return;
    }
    if (pausedAtRef.current !== null) {
      const elapsedSeconds = (Date.now() - pausedAtRef.current) / 1000;
      pausedAtRef.current = null;
      if (currentOffsetFromLive == null) {
        setManualOffsetSeconds((prev) => prev + elapsedSeconds);
      }
    }
  }, [isPlaying, category, currentOffsetFromLive]);

  useEffect(() => {
    setManualOffsetSeconds(0);
    pausedAtRef.current = null;
  }, [selectedChannel?.id]);

  const offsetFromLive = currentOffsetFromLive ?? (manualOffsetSeconds > 0 ? manualOffsetSeconds : null);

  const handleExpandFullscreen = useCallback(() => {
    setIsFullscreen(true);
  }, []);

  const handleCloseFullscreen = useCallback(() => {
    setIsFullscreen(false);
  }, []);

  const handleTogglePreviewPlayPause = useCallback(() => {
    if (player.playing) player.pause();
    else player.play();
  }, [player]);

  const handleGoLive = useCallback(() => {
    if (offsetFromLive) player.seekBy(offsetFromLive);
    setManualOffsetSeconds(0);
    player.play();
  }, [player, offsetFromLive]);

  const isBehindLive = category === 'live' && !!offsetFromLive && offsetFromLive > LIVE_EDGE_THRESHOLD_SECONDS;

  // Debounce the search text so we don't re-filter on every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [search]);

  // Cheap lookup instead of a full-list filter: only recomputes when the
  // playlist reloads or the selected category actually changes.
  const categoryChannels = useMemo(() => {
    if (selectedCategory === ALL_CATEGORY_ID) return bucketChannels;
    return channelsByGroup.get(selectedCategory) ?? [];
  }, [bucketChannels, channelsByGroup, selectedCategory]);

  // Search only runs against the already-narrowed category subset, so typing
  // inside "CANAIS: ESPORTES" (35 items) never touches the other ~19k channels.
  const filteredChannels = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return categoryChannels;
    return categoryChannels.filter((c: M3uChannel) => c.name.toLowerCase().includes(q));
  }, [categoryChannels, debouncedSearch]);

  const handleSelectChannel = useCallback((channel: M3uChannel) => {
    setSelectedChannel(channel);
    setIsBuffering(true);
  }, []);

  const renderCategory = useCallback(
    ({ item }: { item: Category }) => (
      <CategoryRow item={item} isActive={item.id === selectedCategory} onPress={setSelectedCategory} />
    ),
    [selectedCategory]
  );

  const renderChannel = useCallback(
    ({ item }: { item: M3uChannel }) => (
      <ChannelRow item={item} isSelected={item.id === selectedChannel?.id} onPress={handleSelectChannel} />
    ),
    [selectedChannel?.id, handleSelectChannel]
  );

  const categoryKeyExtractor = useCallback((item: Category) => item.id, []);
  const channelKeyExtractor = useCallback((item: M3uChannel) => item.id, []);

  const getCategoryItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: CATEGORY_ROW_HEIGHT,
      offset: CATEGORY_ROW_HEIGHT * index,
      index,
    }),
    []
  );

  const getChannelItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: CHANNEL_ROW_HEIGHT,
      offset: CHANNEL_ROW_HEIGHT * index,
      index,
    }),
    []
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
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
              placeholder={labels.searchPlaceholder}
              placeholderTextColor="#8888aa"
              style={styles.searchInput}
            />
          </View>
        </View>

        {/* Body */}
        <View style={styles.body}>
          {/* Categories */}
          <View style={styles.categoriesColumn}>
            <FlatList
              data={categories}
              keyExtractor={categoryKeyExtractor}
              renderItem={renderCategory}
              extraData={selectedCategory}
              getItemLayout={getCategoryItemLayout}
              initialNumToRender={16}
              maxToRenderPerBatch={16}
              windowSize={7}
              removeClippedSubviews
            />
          </View>

          {/* Channels */}
          <View style={styles.channelsColumn}>
            <FlatList
              data={filteredChannels}
              keyExtractor={channelKeyExtractor}
              renderItem={renderChannel}
              extraData={selectedChannel?.id}
              getItemLayout={getChannelItemLayout}
              initialNumToRender={16}
              maxToRenderPerBatch={16}
              windowSize={7}
              removeClippedSubviews
            />
          </View>

          {/* Preview */}
          <View style={styles.previewColumn}>
            <View style={styles.previewPlayer}>
              {selectedChannel ? (
                <Pressable style={styles.previewPressable} onPress={handleExpandFullscreen}>
                  {/* Only one VideoView may attach to `player` at a time: while
                      FullscreenPlayer's VideoView is mounted, this one must be
                      unmounted, otherwise expo-video hands the render surface
                      back to a stale frame instead of the live one on exit. */}
                  {!isFullscreen && (
                    <VideoView
                      style={styles.video}
                      player={player}
                      nativeControls={false}
                      onFirstFrameRender={() => setIsBuffering(false)}
                    />
                  )}
                  {isBuffering && status !== 'error' && (
                    <View style={styles.bufferingOverlay}>
                      <ActivityIndicator color="#4dd6ff" size="large" />
                    </View>
                  )}
                  {status === 'error' && (
                    <View style={styles.bufferingOverlay}>
                      <ThemedText style={styles.previewErrorText}>
                        Não foi possível carregar{error?.message ? `: ${error.message}` : '.'}
                      </ThemedText>
                    </View>
                  )}
                  {status !== 'error' && (
                    <TouchableOpacity
                      onPress={handleTogglePreviewPlayPause}
                      style={styles.previewPlayButton}
                      hitSlop={8}
                    >
                      <ThemedText style={styles.previewPlayIcon}>{isPlaying ? '⏸' : '▶'}</ThemedText>
                    </TouchableOpacity>
                  )}
                  {isBehindLive && status !== 'error' && (
                    <TouchableOpacity style={styles.goLiveBadgePreview} onPress={handleGoLive}>
                      <View style={styles.liveDotPreview} />
                      <ThemedText style={styles.goLiveBadgePreviewText}>Voltar ao vivo</ThemedText>
                    </TouchableOpacity>
                  )}
                  <View style={styles.expandHint} pointerEvents="none">
                    <ThemedText style={styles.expandHintIcon}>⤢</ThemedText>
                  </View>
                </Pressable>
              ) : (
                <ThemedText style={styles.previewPlaceholder}>▶</ThemedText>
              )}
            </View>

            <View style={styles.previewInfo}>
              <ThemedText style={styles.previewTitle}>
                {selectedChannel?.name ?? labels.emptyPreview}
              </ThemedText>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {isFullscreen && selectedChannel && (
        <FullscreenPlayer
          player={player}
          title={selectedChannel.name}
          onClose={handleCloseFullscreen}
          offsetFromLive={offsetFromLive}
          onGoLive={handleGoLive}
        />
      )}
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
  channelsColumn: {
    width: 260,
    borderRightWidth: 1,
    borderRightColor: '#1e1e50',
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a45',
  },
  channelRowSelected: {
    backgroundColor: '#1a3a6b',
  },
  channelName: {
    fontSize: 13,
    color: '#fff',
    flexShrink: 1,
  },
  previewColumn: {
    flex: 1,
  },
  previewPlayer: {
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPressable: {
    width: '100%',
    height: '100%',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  bufferingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 16,
  },
  previewErrorText: {
    fontSize: 13,
    color: '#fff',
    textAlign: 'center',
  },
  expandHint: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  expandHintIcon: {
    fontSize: 14,
    color: '#fff',
  },
  previewPlayButton: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  previewPlayIcon: {
    fontSize: 15,
    color: '#fff',
  },
  goLiveBadgePreview: {
    position: 'absolute',
    bottom: 8,
    left: 48,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(230, 57, 70, 0.85)',
  },
  liveDotPreview: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  goLiveBadgePreviewText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  previewPlaceholder: {
    fontSize: 40,
    color: '#4dd6ff',
  },
  previewInfo: {
    padding: 16,
    gap: 6,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
});
