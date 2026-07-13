import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { M3uChannel } from '@/utils/m3u-parser';
import { parseMovieTitle } from '@/utils/movie-info';

// The M3U playlist has no cast data, so this is a static placeholder row
// matching the reference design until a real metadata source is wired up.
const MOCK_CAST = [
  'Manuela González',
  'Mabel Moreno',
  'Emmanuel Restrepo',
  'Claudio Cataño',
  'Emmanuel Espar...',
  'Julián Cerati',
];

type Props = {
  movie: M3uChannel;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onPlay: () => void;
  onBack: () => void;
};

export function MovieDetailsScreen({ movie, isFavorite, onToggleFavorite, onPlay, onBack }: Props) {
  const { title, year } = parseMovieTitle(movie.name);

  return (
    <ThemedView style={styles.container}>
      {movie.logo ? (
        <Image source={{ uri: movie.logo }} style={styles.backdrop} blurRadius={25} resizeMode="cover" />
      ) : null}
      <View style={styles.backdropScrim} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <TouchableOpacity onPress={onBack} hitSlop={12} style={styles.backButton}>
          <ThemedText style={styles.backIcon}>‹</ThemedText>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.mainRow}>
            <View style={styles.posterWrap}>
              {movie.logo ? (
                <Image source={{ uri: movie.logo }} style={styles.poster} resizeMode="cover" />
              ) : (
                <View style={[styles.poster, styles.posterPlaceholder]}>
                  <ThemedText style={styles.posterPlaceholderIcon}>🎬</ThemedText>
                </View>
              )}
            </View>

            <View style={styles.info}>
              <ThemedText style={styles.title}>{title}</ThemedText>

              <View style={styles.metaRow}>
                {year && <ThemedText style={styles.metaText}>{year}</ThemedText>}
                <ThemedText style={styles.metaText}>{movie.groupTitle}</ThemedText>
              </View>

              <View style={styles.detailLines}>
                <ThemedText style={styles.detailLine}>Duração: —</ThemedText>
                <ThemedText style={styles.detailLine}>Data adicionada: —</ThemedText>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity style={styles.playButton} onPress={onPlay}>
                  <ThemedText style={styles.playIcon}>▶</ThemedText>
                  <ThemedText style={styles.playLabel}>Assista agora</ThemedText>
                </TouchableOpacity>

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
    gap: 32,
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
  detailLines: {
    gap: 4,
    marginTop: 4,
  },
  detailLine: {
    fontSize: 13,
    color: '#8888aa',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#e63946',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  playIcon: {
    fontSize: 14,
    color: '#fff',
  },
  playLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  favoriteButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#4dd6ff',
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
