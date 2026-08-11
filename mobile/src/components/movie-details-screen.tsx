import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlayerControlButton } from '@/components/player-control-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { M3uChannel } from '@/utils/m3u-parser';
import { parseMovieTitle } from '@/utils/movie-info';
import { fetchCastPhoto } from '@/utils/tmdb-api';
import { getVodInfo, parseXtreamCredentials, type VodInfo } from '@/utils/xtream-api';

function CastItem({ name }: { name: string }) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCastPhoto(name).then((url) => {
      if (!cancelled) setPhotoUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [name]);

  return (
    <View style={styles.castItem}>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.castAvatar} />
      ) : (
        <View style={styles.castAvatar} />
      )}
      <ThemedText style={styles.castName} numberOfLines={1}>
        {name}
      </ThemedText>
    </View>
  );
}

type Props = {
  movie: M3uChannel;
  playlistUrl: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onPlay: () => void;
  onBack: () => void;
};

function formatAddedAt(addedAt?: string): string | null {
  if (!addedAt) return null;
  // Xtream's `added` field is a unix seconds timestamp (as a string).
  const seconds = Number(addedAt);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000).toLocaleDateString('pt-BR');
}

export function MovieDetailsScreen({ movie, playlistUrl, isFavorite, onToggleFavorite, onPlay, onBack }: Props) {
  const { title, year } = parseMovieTitle(movie.name);
  const [info, setInfo] = useState<VodInfo | null>(null);
  const [backFocused, setBackFocused] = useState(false);

  useEffect(() => {
    setInfo(null);
    if (!movie.vodId) return;
    const credentials = parseXtreamCredentials(playlistUrl);
    if (!credentials) return;
    let cancelled = false;
    getVodInfo(credentials, movie.vodId)
      .then((result) => {
        if (!cancelled) setInfo(result);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [movie.vodId, playlistUrl]);

  const addedLabel = formatAddedAt(movie.addedAt);
  const castNames = info?.cast?.split(',').map((name) => name.trim()).filter(Boolean) ?? [];

  return (
    <ThemedView style={styles.container}>
      {movie.logo ? (
        <Image source={{ uri: movie.logo }} style={styles.backdrop} blurRadius={25} resizeMode="cover" />
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
                <ThemedText style={styles.detailLine}>Duração: {info?.duration ?? '—'}</ThemedText>
                <ThemedText style={styles.detailLine}>Data adicionada: {addedLabel ?? '—'}</ThemedText>
              </View>

              {info?.plot && <ThemedText style={styles.plot}>{info.plot}</ThemedText>}

              <View style={styles.actions}>
                <PlayerControlButton
                  style={styles.playButton}
                  focusedStyle={styles.playButtonFocused}
                  onPress={onPlay}
                  autoFocus
                >
                  <ThemedText style={styles.playIcon}>▶</ThemedText>
                  <ThemedText style={styles.playLabel}>Assista agora</ThemedText>
                </PlayerControlButton>

                <PlayerControlButton
                  style={[styles.favoriteButton, isFavorite && styles.favoriteButtonActive]}
                  focusedStyle={styles.favoriteButtonFocused}
                  onPress={onToggleFavorite}
                >
                  <ThemedText style={[styles.favoriteIcon, isFavorite && styles.favoriteIconActive]}>
                    {isFavorite ? '♥' : '♡'}
                  </ThemedText>
                </PlayerControlButton>
              </View>
            </View>
          </View>

          {castNames.length > 0 && (
          <View style={styles.castSection}>
            <ThemedText style={styles.castHeading}>Elenco:</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.castRow}>
              {castNames.slice(0, 10).map((name) => (
                <CastItem key={name} name={name} />
              ))}
            </ScrollView>
          </View>
          )}
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
  plot: {
    fontSize: 14,
    lineHeight: 20,
    color: '#c7c7e6',
    marginTop: 8,
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
  playButtonFocused: {
    borderWidth: 2,
    borderColor: '#4dd6ff',
    transform: [{ scale: 1.05 }],
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
  favoriteButtonFocused: {
    borderWidth: 2,
    borderColor: '#4dd6ff',
    transform: [{ scale: 1.08 }],
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
