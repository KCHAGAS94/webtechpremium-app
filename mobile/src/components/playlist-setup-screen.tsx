import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { M3uChannel } from '@/utils/m3u-parser';
import { loadPlaylist } from '@/utils/playlist-loader';

type Props = {
  initialUrl?: string;
  onLoaded: (url: string, channels: M3uChannel[]) => void;
  onCancel: () => void;
};

export function PlaylistSetupScreen({ initialUrl, onLoaded, onCancel }: Props) {
  const [url, setUrl] = useState(initialUrl ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  const handleLoad = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError('Cole a URL da lista M3U.');
      return;
    }

    setLoading(true);
    setProgress(0);
    setError('');

    try {
      const { tv, filmes, series } = await loadPlaylist(trimmedUrl, ({ processedLines, totalLines }) => {
        setProgress(totalLines > 0 ? processedLines / totalLines : 0);
      });
      // App state (and on-disk cache) still keep one flat list tagged per
      // item's `category` — loadPlaylist's tv/filmes/series split is done
      // once here just to validate the playlist actually has content.
      const channels: M3uChannel[] = [...tv, ...filmes, ...series];

      if (channels.length === 0) {
        setError('Nenhum canal encontrado nessa lista.');
        setLoading(false);
        return;
      }

      onLoaded(trimmedUrl, channels);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Falha ao carregar a lista: ${err.message}`
          : 'Falha ao carregar a lista.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.card}>
          <ThemedText style={styles.title}>Conectar lista M3U</ThemedText>
          <ThemedText style={styles.subtitle}>
            Cole a URL completa da sua playlist (Xtream get.php ou .m3u).
          </ThemedText>

          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder="http://servidor:porta/get.php?username=...&password=...&type=m3u_plus&output=ts"
            placeholderTextColor="#8888aa"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            multiline
          />

          {!!error && <ThemedText style={styles.error}>{error}</ThemedText>}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <ThemedText style={styles.cancelButtonText}>Cancelar</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loadButton}
              onPress={handleLoad}
              disabled={loading}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#fff" />
                  {progress > 0 && (
                    <ThemedText style={styles.loadButtonText}>
                      {Math.round(progress * 100)}%
                    </ThemedText>
                  )}
                </View>
              ) : (
                <ThemedText style={styles.loadButtonText}>Carregar lista</ThemedText>
              )}
            </TouchableOpacity>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: '#12004f',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1aa2ff',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: 13,
    color: '#c7c7e6',
    marginBottom: 8,
  },
  input: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: '#4dd6ff',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 13,
    textAlignVertical: 'top',
  },
  error: {
    color: '#ff6b6b',
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#c7c7e6',
    fontSize: 14,
    fontWeight: '600',
  },
  loadButton: {
    backgroundColor: '#2a5fd6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 130,
    alignItems: 'center',
  },
  loadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
