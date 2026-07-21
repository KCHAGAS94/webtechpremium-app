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
import { OnScreenKeyboard } from '@/components/on-screen-keyboard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { ContentCategory } from '@/utils/content-classifier';
import { loadFavoriteGroups, saveFavoriteGroups } from '@/utils/favorite-groups-storage';
import { loadFavorites, saveFavorites } from '@/utils/favorites-storage';
import { loadHiddenGroups } from '@/utils/hidden-groups-storage';
import { addLiveWatchHistoryEntry } from '@/utils/live-watch-history-storage';
import type { M3uChannel } from '@/utils/m3u-parser';
import { normalizeSearchText } from '@/utils/text-normalize';
import { useTranslation } from '@/i18n/language-context';
import type { TranslationKey } from '@/i18n/translations';

export type NavKey = 'home' | 'live' | 'movies' | 'series';

type Category = {
  id: string;
  title: string;
  count: number;
  /** "Tudo"/"Favoritos" aren't real groups — no favorite heart on those rows. */
  isGroup: boolean;
};

const NAV_ITEMS: { key: NavKey; labelKey: TranslationKey }[] = [
  { key: 'home', labelKey: 'nav_home' },
  { key: 'live', labelKey: 'nav_live' },
  { key: 'movies', labelKey: 'nav_movies' },
  { key: 'series', labelKey: 'nav_series' },
];

// Per-category copy so the same screen reads naturally whether it's browsing
// live channels, movies, or series.
const CONTENT_LABELS: Record<ContentCategory, { searchPlaceholder: TranslationKey; emptyPreview: TranslationKey }> = {
  live: { searchPlaceholder: 'search_channel', emptyPreview: 'preview_select_channel' },
  movies: { searchPlaceholder: 'search_movie', emptyPreview: 'preview_select_movie' },
  series: { searchPlaceholder: 'search_show', emptyPreview: 'preview_select_show' },
};

const ALL_CATEGORY_ID = 'all';
const FAVORITES_CATEGORY_ID = 'favorites';
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
  isFavorite,
  onPress,
  onToggleFavorite,
}: {
  item: Category;
  isActive: boolean;
  isFavorite: boolean;
  onPress: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      style={[styles.categoryRow, focused && styles.categoryRowFocused]}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={() => onPress(item.id)}
    >
      <View style={styles.categoryLeft}>
        {item.isGroup && (
          <TouchableOpacity onPress={() => onToggleFavorite(item.id)} hitSlop={8}>
            <ThemedText style={[styles.categoryFavoriteIcon, isFavorite && styles.categoryFavoriteIconActive]}>
              {isFavorite ? '♥' : '♡'}
            </ThemedText>
          </TouchableOpacity>
        )}
        <ThemedText
          style={[styles.categoryTitle, isActive && styles.categoryTitleActive]}
          numberOfLines={1}
        >
          {item.title}
        </ThemedText>
      </View>
      <ThemedText style={styles.categoryCount}>{item.count}</ThemedText>
    </Pressable>
  );
});

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

const ChannelRow = memo(function ChannelRow({
  item,
  isSelected,
  isFavorite,
  onPress,
}: {
  item: M3uChannel;
  isSelected: boolean;
  isFavorite: boolean;
  onPress: (channel: M3uChannel) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      style={[
        styles.channelRow,
        isSelected && styles.channelRowSelected,
        focused && styles.channelRowFocused,
      ]}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={() => onPress(item)}
    >
      <ThemedText style={styles.channelName} numberOfLines={1}>
        {item.name}
      </ThemedText>
      {isFavorite && <ThemedText style={styles.channelFavoriteIcon}>♥</ThemedText>}
    </Pressable>
  );
});

export function ContentBrowserScreen({ channels, category, activeNav, onNavigate }: Props) {
  const { t } = useTranslation();
  const labels = CONTENT_LABELS[category];

  const [hiddenGroups, setHiddenGroups] = useState<Set<string>>(new Set());

  // Single pass over the (potentially huge) channel list: keep only groups
  // classified into this screen's `category` (see content-classifier.ts) and
  // group them by `group-title` once per playlist load, instead of
  // re-filtering the full list every time the user switches category or
  // types in the search box. Groups hidden in Configurações are dropped
  // entirely here, so they disappear from "Tudo"/search too, not just the
  // folder list.
  const { categoryShells, channelsByGroup, bucketChannels } = useMemo(() => {
    const byGroup = new Map<string, M3uChannel[]>();
    const bucket: M3uChannel[] = [];
    for (const channel of channels) {
      if (channel.category !== category) continue;
      if (hiddenGroups.has(channel.groupTitle)) continue;
      bucket.push(channel);
      const list = byGroup.get(channel.groupTitle);
      if (list) {
        list.push(channel);
      } else {
        byGroup.set(channel.groupTitle, [channel]);
      }
    }
    const cats: Omit<Category, 'count'>[] = [
      { id: ALL_CATEGORY_ID, title: 'Tudo', isGroup: false },
      { id: FAVORITES_CATEGORY_ID, title: 'Favoritos', isGroup: false },
      ...Array.from(byGroup.entries()).map(([title]) => ({ id: title, title, isGroup: true })),
    ];
    return { categoryShells: cats, channelsByGroup: byGroup, bucketChannels: bucket };
  }, [channels, category, hiddenGroups]);

  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY_ID);
  const [selectedChannel, setSelectedChannel] = useState<M3uChannel | undefined>(bucketChannels[0]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isBuffering, setIsBuffering] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoriteGroups, setFavoriteGroups] = useState<Set<string>>(new Set());
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [searchCursor, setSearchCursor] = useState(0);
  const [searchFocused, setSearchFocused] = useState(false);

  // Logs "channel X watched at time Y" to Configurações > Limpar histórico Tv
  // ao vivo — only for the live section, once per channel selection
  // (including the initial `bucketChannels[0]` default, since the preview
  // starts playing it immediately).
  useEffect(() => {
    if (category !== 'live' || !selectedChannel) return;
    addLiveWatchHistoryEntry(selectedChannel.name);
  }, [category, selectedChannel?.id]);

  // Favorites live on disk (see favorites-storage.ts), keyed by channel name
  // rather than `selectedChannel.id` — that id is just the item's position
  // in the last parsed playlist, so it shifts on every reload.
  useEffect(() => {
    loadHiddenGroups(category).then(setHiddenGroups);
    loadFavorites(category).then(setFavorites);
    loadFavoriteGroups(category).then(setFavoriteGroups);
  }, [category]);

  // Filled in here (not in the categoryShells memo above) because "Favoritos"
  // needs a live count and `favorites` isn't loaded from disk yet at that point.
  // Favorited groups are pulled to the front (right after "Tudo"/"Favoritos"),
  // keeping their relative order otherwise — lets someone build a personal
  // "shortlist" of folders without losing the rest of the catalog's ordering.
  const categories = useMemo<Category[]>(() => {
    const withCounts = categoryShells.map((shell) => {
      if (shell.id === ALL_CATEGORY_ID) return { ...shell, count: bucketChannels.length };
      if (shell.id === FAVORITES_CATEGORY_ID) return { ...shell, count: favorites.size };
      return { ...shell, count: channelsByGroup.get(shell.id)?.length ?? 0 };
    });
    const pinned = withCounts.filter((c) => !c.isGroup);
    const groups = withCounts.filter((c) => c.isGroup);
    const favoriteGroupRows = groups.filter((c) => favoriteGroups.has(c.id));
    const restGroupRows = groups.filter((c) => !favoriteGroups.has(c.id));
    return [...pinned, ...favoriteGroupRows, ...restGroupRows];
  }, [categoryShells, bucketChannels.length, favorites.size, favoriteGroups, channelsByGroup]);

  const handleToggleFavorite = useCallback(() => {
    if (!selectedChannel) return;
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(selectedChannel.name)) next.delete(selectedChannel.name);
      else next.add(selectedChannel.name);
      saveFavorites(category, next);
      return next;
    });
  }, [category, selectedChannel]);

  const handleToggleFavoriteGroup = useCallback(
    (groupTitle: string) => {
      setFavoriteGroups((prev) => {
        const next = new Set(prev);
        if (next.has(groupTitle)) next.delete(groupTitle);
        else next.add(groupTitle);
        saveFavoriteGroups(category, next);
        return next;
      });
    },
    [category]
  );

  const isSelectedChannelFavorite = !!selectedChannel && favorites.has(selectedChannel.name);

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
      // useVideoPlayer releases the previous player synchronously (inside
      // useMemo, during render) whenever selectedChannel changes, which
      // happens before this cleanup runs — so on a channel switch `player`
      // here is already a released native object and touching it throws.
      try {
        player.timeUpdateEventInterval = 0;
      } catch {
        // already released — nothing to clean up.
      }
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
    if (selectedCategory === FAVORITES_CATEGORY_ID) return bucketChannels.filter((c) => favorites.has(c.name));
    return channelsByGroup.get(selectedCategory) ?? [];
  }, [bucketChannels, channelsByGroup, selectedCategory, favorites]);

  // Search only runs against the already-narrowed category subset, so typing
  // inside "CANAIS: ESPORTES" (35 items) never touches the other ~19k channels.
  const filteredChannels = useMemo(() => {
    const q = normalizeSearchText(debouncedSearch.trim());
    if (!q) return categoryChannels;
    return categoryChannels.filter((c: M3uChannel) => normalizeSearchText(c.name).includes(q));
  }, [categoryChannels, debouncedSearch]);

  const handleSelectChannel = useCallback((channel: M3uChannel) => {
    setSelectedChannel(channel);
    setIsBuffering(true);
  }, []);

  // "Next/previous channel" in the fullscreen player cycles through whatever
  // list the user is currently browsing (a group, a search, or — with as few
  // as 3 channels — "Favoritos"), wrapping around at the ends.
  const handleStepChannel = useCallback(
    (direction: 1 | -1) => {
      if (filteredChannels.length === 0) return;
      const currentIndex = filteredChannels.findIndex((c) => c.id === selectedChannel?.id);
      const baseIndex = currentIndex === -1 ? 0 : currentIndex;
      const nextIndex = (baseIndex + direction + filteredChannels.length) % filteredChannels.length;
      handleSelectChannel(filteredChannels[nextIndex]);
    },
    [filteredChannels, selectedChannel?.id, handleSelectChannel]
  );

  const handleNextChannel = useCallback(() => handleStepChannel(1), [handleStepChannel]);
  const handlePreviousChannel = useCallback(() => handleStepChannel(-1), [handleStepChannel]);
  const canStepChannel = filteredChannels.length > 1;

  const renderCategory = useCallback(
    ({ item }: { item: Category }) => (
      <CategoryRow
        item={item}
        isActive={item.id === selectedCategory}
        isFavorite={favoriteGroups.has(item.id)}
        onPress={setSelectedCategory}
        onToggleFavorite={handleToggleFavoriteGroup}
      />
    ),
    [selectedCategory, favoriteGroups, handleToggleFavoriteGroup]
  );

  const renderChannel = useCallback(
    ({ item }: { item: M3uChannel }) => (
      <ChannelRow
        item={item}
        isSelected={item.id === selectedChannel?.id}
        isFavorite={favorites.has(item.name)}
        onPress={handleSelectChannel}
      />
    ),
    [selectedChannel?.id, favorites, handleSelectChannel]
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
              <HeaderNavItem
                key={item.key}
                active={item.key === activeNav}
                label={t(item.labelKey)}
                onPress={() => onNavigate(item.key)}
              />
            ))}
          </View>

          <Pressable
            style={[styles.searchBox, searchFocused && styles.searchBoxFocused]}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            onPress={() => {
              setSearchCursor(search.length);
              setKeyboardOpen(true);
            }}
          >
            <ThemedText style={styles.searchIcon}>🔍</ThemedText>
            <TextInput
              value={keyboardOpen ? `${search.slice(0, searchCursor)}|${search.slice(searchCursor)}` : search}
              onChangeText={setSearch}
              placeholder={t(labels.searchPlaceholder)}
              placeholderTextColor="#8888aa"
              style={styles.searchInput}
              showSoftInputOnFocus={false}
              caretHidden
              editable={false}
              pointerEvents="none"
            />
          </Pressable>
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

        {/* Body */}
        <View style={styles.body}>
          {/* Categories */}
          <View style={styles.categoriesColumn}>
            <FlatList
              data={categories}
              keyExtractor={categoryKeyExtractor}
              renderItem={renderCategory}
              extraData={[selectedCategory, favoriteGroups]}
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
              extraData={[selectedChannel?.id, favorites]}
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
                  <TouchableOpacity onPress={handleToggleFavorite} style={styles.favoriteHint} hitSlop={8}>
                    <ThemedText
                      style={[styles.favoriteHintIcon, isSelectedChannelFavorite && styles.favoriteHintIconActive]}
                    >
                      {isSelectedChannelFavorite ? '♥' : '♡'}
                    </ThemedText>
                  </TouchableOpacity>
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
                {selectedChannel?.name ?? t(labels.emptyPreview)}
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
          isFavorite={isSelectedChannelFavorite}
          onToggleFavorite={handleToggleFavorite}
          onNextChannel={canStepChannel ? handleNextChannel : undefined}
          onPreviousChannel={canStepChannel ? handlePreviousChannel : undefined}
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
  searchBoxFocused: {
    backgroundColor: '#132a4d',
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
  categoryLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
  },
  categoryFavoriteIcon: {
    fontSize: 13,
    color: '#8888aa',
  },
  categoryFavoriteIconActive: {
    color: '#e63946',
  },
  categoryTitle: {
    fontSize: 13,
    color: '#c7c7e6',
    flexShrink: 1,
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
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  channelRowSelected: {
    backgroundColor: '#1a3a6b',
  },
  channelRowFocused: {
    borderLeftColor: '#4dd6ff',
    backgroundColor: '#132a4d',
  },
  channelName: {
    fontSize: 13,
    color: '#fff',
    flexShrink: 1,
  },
  channelFavoriteIcon: {
    fontSize: 13,
    color: '#e63946',
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
  favoriteHint: {
    position: 'absolute',
    top: 8,
    right: 44,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  favoriteHintIcon: {
    fontSize: 15,
    color: '#fff',
  },
  favoriteHintIconActive: {
    color: '#e63946',
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
