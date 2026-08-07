import { memo, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { SeriesEpisode, SeriesShow } from '@/utils/series-grouping';
import { episodeHistoryKey, type WatchHistoryEntry } from '@/utils/watch-history-storage';
import { getSeriesInfo, parseXtreamCredentials, type SeriesInfo } from '@/utils/xtream-api';

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

// Same "treat >=95% as finished" cutoff watch-history-storage.ts itself uses
// when deciding whether to keep an entry at all — a finished episode has no
// stored entry (see upsertWatchHistoryProgress), so this only ever matters
// for an entry that exists but happens to report right at the edge.
function watchedFraction(entry: WatchHistoryEntry | undefined): number | null {
  if (!entry || entry.durationSeconds <= 0) return null;
  const fraction = entry.positionSeconds / entry.durationSeconds;
  if (fraction <= 0) return null;
  return Math.min(fraction, 1);
}

type Props = {
  show: SeriesShow;
  playlistUrl: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onPlayEpisode: (episode: SeriesEpisode) => void;
  onBack: () => void;
  /** Episode watch progress, keyed by episodeHistoryKey — an episode with no
   * entry here (never started, or already finished and cleared) shows no
   * progress bar at all. */
  history: Map<string, WatchHistoryEntry>;
};

const SeasonTab = memo(function SeasonTab({
  season,
  active,
  onPress,
}: {
  season: number;
  active: boolean;
  onPress: (season: number) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      style={[styles.seasonTab, active && styles.seasonTabActive, focused && styles.seasonTabFocused]}
      onPress={() => onPress(season)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <ThemedText style={[styles.seasonTabText, active && styles.seasonTabTextActive]}>
        Season {season}
      </ThemedText>
    </Pressable>
  );
});

const EpisodeRow = memo(function EpisodeRow({
  show,
  episode,
  progress,
  onPress,
}: {
  show: SeriesShow;
  episode: SeriesEpisode;
  /** 0-1, or null to show no progress bar at all. */
  progress: number | null;
  onPress: (episode: SeriesEpisode) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      style={[styles.episodeRow, focused && styles.episodeRowFocused]}
      onPress={() => onPress(episode)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <View style={styles.episodeThumbWrap}>
        {episode.channel.logo ? (
          <Image source={{ uri: episode.channel.logo }} style={styles.episodeThumb} resizeMode="cover" />
        ) : (
          <View style={[styles.episodeThumb, styles.episodeThumbPlaceholder]}>
            <ThemedText style={styles.episodeThumbIcon}>▶</ThemedText>
          </View>
        )}
        {progress != null && (
          <View style={styles.episodeProgressTrack}>
            <View style={[styles.episodeProgressFill, { width: `${progress * 100}%` }]} />
          </View>
        )}
      </View>
      <View style={styles.episodeInfo}>
        <ThemedText style={styles.episodeTitle} numberOfLines={1}>
          {show.name} - S{pad2(episode.season)}E{pad2(episode.episode)}
          {episode.episodeTitle ? ` - ${episode.episodeTitle}` : ''}
        </ThemedText>
      </View>
    </Pressable>
  );
});

export function SeriesDetailsScreen({
  show,
  playlistUrl,
  isFavorite,
  onToggleFavorite,
  onPlayEpisode,
  onBack,
  history,
}: Props) {
  const [selectedSeason, setSelectedSeason] = useState(show.seasons[0] ?? 1);
  const episodes = show.episodesBySeason.get(selectedSeason) ?? [];
  const [info, setInfo] = useState<SeriesInfo | null>(null);
  const [backFocused, setBackFocused] = useState(false);
  const [favoriteFocused, setFavoriteFocused] = useState(false);

  useEffect(() => {
    setInfo(null);
    if (!show.seriesId) return;
    const credentials = parseXtreamCredentials(playlistUrl);
    if (!credentials) return;
    let cancelled = false;
    getSeriesInfo(credentials, show.seriesId)
      .then((result) => {
        if (!cancelled) setInfo(result);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [show.seriesId, playlistUrl]);

  return (
    <ThemedView style={styles.container}>
      {show.logo ? (
        <Image source={{ uri: show.logo }} style={styles.backdrop} blurRadius={25} resizeMode="cover" />
      ) : null}
      <View style={styles.backdropScrim} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Pressable
          onPress={onBack}
          onFocus={() => setBackFocused(true)}
          onBlur={() => setBackFocused(false)}
          hitSlop={12}
          style={[styles.backButton, backFocused && styles.backButtonFocused]}
        >
          <ThemedText style={styles.backIcon}>‹</ThemedText>
        </Pressable>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.mainRow}>
            <View style={styles.posterWrap}>
              {show.logo ? (
                <Image source={{ uri: show.logo }} style={styles.poster} resizeMode="cover" />
              ) : (
                <View style={[styles.poster, styles.posterPlaceholder]}>
                  <ThemedText style={styles.posterPlaceholderIcon}>📺</ThemedText>
                </View>
              )}
            </View>

            <View style={styles.info}>
              <ThemedText style={styles.title}>{show.name}</ThemedText>

              <View style={styles.metaRow}>
                <ThemedText style={styles.metaText}>{show.groupTitle}</ThemedText>
              </View>

              {info?.plot && <ThemedText style={styles.plot}>{info.plot}</ThemedText>}

              <Pressable
                style={[
                  styles.favoriteButton,
                  isFavorite && styles.favoriteButtonActive,
                  favoriteFocused && styles.favoriteButtonFocused,
                ]}
                onPress={onToggleFavorite}
                onFocus={() => setFavoriteFocused(true)}
                onBlur={() => setFavoriteFocused(false)}
              >
                <ThemedText style={[styles.favoriteIcon, isFavorite && styles.favoriteIconActive]}>
                  {isFavorite ? '♥' : '♡'}
                </ThemedText>
              </Pressable>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.seasonTabs}>
            {show.seasons.map((season) => (
              <SeasonTab key={season} season={season} active={season === selectedSeason} onPress={setSelectedSeason} />
            ))}
          </ScrollView>

          <View style={styles.episodeList}>
            {episodes.map((episode) => (
              <EpisodeRow
                key={episode.channel.id}
                show={show}
                episode={episode}
                progress={watchedFraction(history.get(episodeHistoryKey(show.id, episode.season, episode.episode)))}
                onPress={onPlayEpisode}
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a2e',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  backdropScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,46,0.55)',
  },
  safeArea: {
    flex: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    marginLeft: 16,
    marginTop: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  backButtonFocused: {
    borderColor: '#4dd6ff',
    backgroundColor: '#132a4d',
  },
  backIcon: {
    fontSize: 24,
    color: '#fff',
    marginTop: -2,
  },
  content: {
    padding: 24,
    gap: 20,
  },
  mainRow: {
    flexDirection: 'row',
    gap: 24,
  },
  posterWrap: {
    width: 180,
  },
  poster: {
    width: 180,
    height: 270,
    borderRadius: 10,
  },
  posterPlaceholder: {
    backgroundColor: '#1a1a45',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterPlaceholderIcon: {
    fontSize: 40,
  },
  info: {
    flex: 1,
    gap: 10,
    paddingTop: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 14,
  },
  metaText: {
    fontSize: 14,
    color: '#c7c7e6',
  },
  plot: {
    fontSize: 14,
    lineHeight: 20,
    color: '#c7c7e6',
    marginTop: 4,
  },
  favoriteButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#4dd6ff',
    marginTop: 8,
  },
  favoriteButtonActive: {
    backgroundColor: 'rgba(230,57,70,0.15)',
    borderColor: '#e63946',
  },
  favoriteButtonFocused: {
    borderWidth: 2,
    borderColor: '#4dd6ff',
    backgroundColor: 'rgba(77,214,255,0.15)',
  },
  favoriteIcon: {
    fontSize: 20,
    color: '#4dd6ff',
  },
  favoriteIconActive: {
    color: '#e63946',
  },
  seasonTabs: {
    flexGrow: 0,
  },
  seasonTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1a1a45',
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  seasonTabActive: {
    backgroundColor: '#e63946',
  },
  seasonTabFocused: {
    borderColor: '#4dd6ff',
  },
  seasonTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#c7c7e6',
  },
  seasonTabTextActive: {
    color: '#fff',
  },
  episodeList: {
    gap: 1,
  },
  episodeRow: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: 'rgba(230,57,70,0.12)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    padding: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  episodeRowFocused: {
    borderColor: '#4dd6ff',
    backgroundColor: 'rgba(77,214,255,0.15)',
  },
  episodeThumbWrap: {
    width: 96,
    height: 64,
  },
  episodeThumb: {
    width: 96,
    height: 64,
    borderRadius: 6,
    backgroundColor: '#1a1a45',
  },
  episodeProgressTrack: {
    position: 'absolute',
    left: 4,
    right: 4,
    bottom: 4,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    overflow: 'hidden',
  },
  episodeProgressFill: {
    height: '100%',
    backgroundColor: '#e63946',
  },
  episodeThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodeThumbIcon: {
    fontSize: 20,
    color: '#fff',
  },
  episodeInfo: {
    flex: 1,
    gap: 4,
  },
  episodeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
