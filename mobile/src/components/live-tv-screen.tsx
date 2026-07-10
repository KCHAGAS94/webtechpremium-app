import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
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

type Props = {
  channels: M3uChannel[];
  onNavigate: (key: NavKey) => void;
  onChangePlaylist: () => void;
};

export function LiveTvScreen({ channels, onNavigate, onChangePlaylist }: Props) {
  const categories = useMemo<Category[]>(() => {
    const counts = new Map<string, number>();
    for (const channel of channels) {
      counts.set(channel.groupTitle, (counts.get(channel.groupTitle) ?? 0) + 1);
    }
    return [
      { id: 'all', title: 'Tudo', count: channels.length },
      ...Array.from(counts.entries()).map(([title, count]) => ({
        id: title,
        title,
        count,
      })),
    ];
  }, [channels]);

  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedChannel, setSelectedChannel] = useState<M3uChannel | undefined>(channels[0]);
  const [search, setSearch] = useState('');
  const [isBuffering, setIsBuffering] = useState(true);

  const player = useVideoPlayer(selectedChannel?.url ?? null, (instance) => {
    instance.play();
  });

  const filteredChannels = useMemo(() => {
    let list = channels;
    if (activeCategory !== 'all') {
      list = list.filter((c) => c.groupTitle === activeCategory);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    return list;
  }, [channels, activeCategory, search]);

  const handleSelectChannel = (channel: M3uChannel) => {
    setSelectedChannel(channel);
    setIsBuffering(true);
  };

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
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.categoryRow}
                  onPress={() => setActiveCategory(item.id)}
                >
                  <ThemedText
                    style={[
                      styles.categoryTitle,
                      item.id === activeCategory && styles.categoryTitleActive,
                    ]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </ThemedText>
                  <ThemedText style={styles.categoryCount}>{item.count}</ThemedText>
                </TouchableOpacity>
              )}
            />
          </View>

          {/* Channels */}
          <View style={styles.channelsColumn}>
            <FlatList
              data={filteredChannels}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isSelected = item.id === selectedChannel?.id;
                return (
                  <TouchableOpacity
                    style={[styles.channelRow, isSelected && styles.channelRowSelected]}
                    onPress={() => handleSelectChannel(item)}
                  >
                    <ThemedText style={styles.channelName} numberOfLines={1}>
                      {item.name}
                    </ThemedText>
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          {/* Preview */}
          <View style={styles.previewColumn}>
            <View style={styles.previewPlayer}>
              {selectedChannel ? (
                <>
                  <VideoView
                    style={styles.video}
                    player={player}
                    nativeControls
                    onFirstFrameRender={() => setIsBuffering(false)}
                  />
                  {isBuffering && (
                    <View style={styles.bufferingOverlay}>
                      <ActivityIndicator color="#4dd6ff" size="large" />
                    </View>
                  )}
                </>
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
