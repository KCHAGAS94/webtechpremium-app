import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { SeriesEpisode, SeriesShow } from '@/utils/series-grouping';
import { getSeriesInfo, parseXtreamCredentials, type SeriesInfo } from '@/utils/xtream-api';

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

type Props = {
  show: SeriesShow;
  playlistUrl: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onPlayEpisode: (episode: SeriesEpisode) => void;
  onBack: () => void;
};

export function SeriesDetailsScreen({ show, playlistUrl, isFavorite, onToggleFavorite, onPlayEpisode, onBack }: Props) {
  const [selectedSeason, setSelectedSeason] = useState(show.seasons[0] ?? 1);
  const episodes = show.episodesBySeason.get(selectedSeason) ?? [];
  const [info, setInfo] = useState<SeriesInfo | null>(null);

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
        <TouchableOpacity onPress={onBack} hitSlop={12} style={styles.backButton}>
          <ThemedText style={styles.backIcon}>‹</ThemedText>
        </TouchableOpacity>

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

              <TouchableOpacity
                style={[styles.favoriteButton, isFavorite && styles.favoriteButtonActive]}
                onPress={onToggleFavorite}
              >
                <ThemedText style={[styles.favoriteIcon, isFavorite && styles.favoriteIconActive]}>
                  {isFavorite ? '♥' : '♡'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.seasonTabs}>
            {show.seasons.map((season) => (
              <TouchableOpacity
                key={season}
                style={[styles.seasonTab, season === selectedSeason && styles.seasonTabActive]}
                onPress={() => setSelectedSeason(season)}
              >
                <ThemedText
                  style={[styles.seasonTabText, season === selectedSeason && styles.seasonTabTextActive]}
                >
                  Season {season}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.episodeList}>
            {episodes.map((episode) => (
              <TouchableOpacity
                key={episode.channel.id}
                style={styles.episodeRow}
                onPress={() => onPlayEpisode(episode)}
                activeOpacity={0.8}
              >
                {episode.channel.logo ? (
                  <Image source={{ uri: episode.channel.logo }} style={styles.episodeThumb} resizeMode="cover" />
                ) : (
                  <View style={[styles.episodeThumb, styles.episodeThumbPlaceholder]}>
                    <ThemedText style={styles.episodeThumbIcon}>▶</ThemedText>
                  </View>
                )}
                <View style={styles.episodeInfo}>
                  <ThemedText style={styles.episodeTitle} numberOfLines={1}>
                    {show.name} - S{pad2(episode.season)}E{pad2(episode.episode)}
                    {episode.episodeTitle ? ` - ${episode.episodeTitle}` : ''}
                  </ThemedText>
                </View>
              </TouchableOpacity>
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
  },
  seasonTabActive: {
    backgroundColor: '#e63946',
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
  },
  episodeThumb: {
    width: 96,
    height: 64,
    borderRadius: 6,
    backgroundColor: '#1a1a45',
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
