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
import { useVideoPlayer, VideoView } from 'expo-video';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { M3uChannel } from '@/utils/m3u-parser';

type NavKey = 'home' | 'live' | 'movies' | 'series';

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

const ALL_CATEGORY_ID = 'all';
const SEARCH_DEBOUNCE_MS = 200;

// Must stay in sync with categoryRow / channelRow paddingVertical + borderBottomWidth below,
// so FlatList can skip cell measurement (getItemLayout) on very large lists.
const CATEGORY_ROW_HEIGHT = 41;
const CHANNEL_ROW_HEIGHT = 37;

type Props = {
  channels: M3uChannel[];
  onNavigate: (key: NavKey) => void;
  onChangePlaylist: () => void;
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

export function LiveTvScreen({ channels, onNavigate, onChangePlaylist }: Props) {
  // Single pass over the (potentially huge) channel list: group channels by
  // `group-title` once per playlist load, instead of re-filtering the full
  // list every time the user switches category or types in the search box.
  const { categories, channelsByGroup } = useMemo(() => {
    const byGroup = new Map<string, M3uChannel[]>();
    for (const channel of channels) {
      const list = byGroup.get(channel.groupTitle);
      if (list) {
        list.push(channel);
      } else {
        byGroup.set(channel.groupTitle, [channel]);
      }
    }
    const cats: Category[] = [
      { id: ALL_CATEGORY_ID, title: 'Tudo', count: channels.length },
      ...Array.from(byGroup.entries()).map(([title, list]) => ({
        id: title,
        title,
        count: list.length,
      })),
    ];
    return { categories: cats, channelsByGroup: byGroup };
  }, [channels]);

  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY_ID);
  const [selectedChannel, setSelectedChannel] = useState<M3uChannel | undefined>(channels[0]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isBuffering, setIsBuffering] = useState(true);

  const player = useVideoPlayer(selectedChannel?.url ?? null, (instance) => {
    instance.play();
  });

  const videoViewRef = useRef<VideoView>(null);

  const handleExpandFullscreen = useCallback(() => {
    videoViewRef.current?.enterFullscreen();
  }, []);

  // Debounce the search text so we don't re-filter on every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [search]);

  // Cheap lookup instead of a full-list filter: only recomputes when the
  // playlist reloads or the selected category actually changes.
  const categoryChannels = useMemo(() => {
    if (selectedCategory === ALL_CATEGORY_ID) return channels;
    return channelsByGroup.get(selectedCategory) ?? [];
  }, [channels, channelsByGroup, selectedCategory]);

  // Search only runs against the already-narrowed category subset, so typing
  // inside "CANAIS: ESPORTES" (35 items) never touches the other ~19k channels.
  const filteredChannels = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return categoryChannels;
    return categoryChannels.filter((c) => c.name.toLowerCase().includes(q));
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
                  style={[styles.headerNavItem, item.key === 'live' && styles.headerNavItemActive]}
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
              placeholder="Buscar canal"
              placeholderTextColor="#8888aa"
              style={styles.searchInput}
            />
          </View>

          <TouchableOpacity onPress={onChangePlaylist}>
            <ThemedText style={styles.brand}>trocar lista</ThemedText>
          </TouchableOpacity>
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
                  <VideoView
                    ref={videoViewRef}
                    style={styles.video}
                    player={player}
                    nativeControls={false}
                    fullscreenOptions={{ enable: true, orientation: 'landscape' }}
                    onFirstFrameRender={() => setIsBuffering(false)}
                  />
                  {isBuffering && (
                    <View style={styles.bufferingOverlay}>
                      <ActivityIndicator color="#4dd6ff" size="large" />
                    </View>
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
                {selectedChannel?.name ?? 'Selecione um canal'}
              </ThemedText>
            </View>
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
