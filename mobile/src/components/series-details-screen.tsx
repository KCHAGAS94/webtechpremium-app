import { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { SeriesEpisode, SeriesShow } from '@/utils/series-grouping';

// The M3U playlist has no cast data, so this is a static placeholder row
// matching the movie details screen until a real metadata source is wired up.
const MOCK_CAST = ['Manuela González', 'Mabel Moreno', 'Emmanuel Restrepo', 'Claudio Cataño', 'Julián Cerati'];

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

type Props = {
  show: SeriesShow;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onPlayEpisode: (episode: SeriesEpisode) => void;
  onBack: () => void;
};

export function SeriesDetailsScreen({ show, isFavorite, onToggleFavorite, onPlayEpisode, onBack }: Props) {
  const [selectedSeason, setSelectedSeason] = useState(show.seasons[0]);
  const episodes = useMemo(
    () => show.episodesBySeason.get(selectedSeason) ?? [],
    [show, selectedSeason]
  );

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
                <ThemedText style={styles.metaText}>
                  {show.seasons.length} temporada{show.seasons.length > 1 ? 's' : ''}
                </ThemedText>
              </View>

              <TouchableOpacity
                style={[styles.favoriteButton, isFavorite && styles.favoriteButtonActive]}
                onPress={onToggleFavorite}
              >
                <ThemedText style={[styles.favoriteIcon, isFavorite && styles.favoriteIconActive]}>
                  {isFavorite ? '♥' : '♡'}
                </ThemedText>
                <ThemedText style={[styles.favoriteLabel, isFavorite && styles.favoriteIconActive]}>
                  {isFavorite ? 'Favoritado' : 'Favoritar'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.seasonTabs}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.seasonTabsRow}>
              {show.seasons.map((season) => (
                <TouchableOpacity
                  key={season}
                  style={[styles.seasonTab, season === selectedSeason && styles.seasonTabActive]}
                  onPress={() => setSelectedSeason(season)}
                >
                  <ThemedText
                    style={[styles.seasonTabText, season === selectedSeason && styles.seasonTabTextActive]}
                  >
                    Temporada {season}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.episodeList}>
            {episodes.map((ep) => (
              <TouchableOpacity
                key={ep.channel.id}
                style={styles.episodeRow}
                onPress={() => onPlayEpisode(ep)}
                activeOpacity={0.8}
              >
                {ep.channel.logo ? (
                  <Image source={{ uri: ep.channel.logo }} style={styles.episodeThumb} resizeMode="cover" />
                ) : (
                  <View style={[styles.episodeThumb, styles.episodeThumbPlaceholder]}>
                    <ThemedText style={styles.episodeThumbIcon}>▶</ThemedText>
                  </View>
                )}
                <View style={styles.episodeInfo}>
                  <ThemedText style={styles.episodeTitle} numberOfLines={1}>
                    {show.name} - S{pad2(ep.season)}E{pad2(ep.episode)}
                    {ep.episodeTitle ? ` - ${ep.episodeTitle}` : ` - Episódio ${ep.episode}`}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.castSection}>
            <ThemedText style={styles.castHeading}>Elenco:</ThemedText>
            <View style={styles.castRow}>
              {MOCK_CAST.map((name) => (
                <View key={name} style={styles.castItem}>
                  <View style={styles.castAvatar} />
                  <ThemedText style={styles.castName} numberOfLines={1}>
                    {name}
                  </ThemedText>
                </View>
              ))}
            </View>
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
    gap: 24,
  },
  mainRow: {
    flexDirection: 'row',
    gap: 24,
  },
  posterWrap: {
    width: 160,
  },
  poster: {
    width: 160,
    height: 240,
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
  favoriteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#4dd6ff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 8,
  },
  favoriteButtonActive: {
    backgroundColor: 'rgba(230,57,70,0.15)',
    borderColor: '#e63946',
  },
  favoriteIcon: {
    fontSize: 16,
    color: '#4dd6ff',
  },
  favoriteLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4dd6ff',
  },
  favoriteIconActive: {
    color: '#e63946',
  },
  seasonTabs: {
    marginTop: 4,
  },
  seasonTabsRow: {
    gap: 10,
  },
  seasonTab: {
    borderWidth: 1,
    borderColor: '#4dd6ff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  seasonTabActive: {
    backgroundColor: '#4dd6ff',
  },
  seasonTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4dd6ff',
  },
  seasonTabTextActive: {
    color: '#0a0a2e',
  },
  episodeList: {
    gap: 10,
  },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(26,26,69,0.7)',
    borderRadius: 10,
    padding: 8,
  },
  episodeThumb: {
    width: 110,
    height: 62,
    borderRadius: 6,
    backgroundColor: '#1a1a45',
  },
  episodeThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodeThumbIcon: {
    fontSize: 18,
    color: '#4dd6ff',
  },
  episodeInfo: {
    flex: 1,
  },
  episodeTitle: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  castSection: {
    gap: 14,
  },
  castHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  castRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  castItem: {
    width: 84,
    alignItems: 'center',
    gap: 6,
  },
  castAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2a2a66',
  },
  castName: {
    fontSize: 11,
    color: '#c7c7e6',
    textAlign: 'center',
  },
});
