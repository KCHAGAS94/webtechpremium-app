import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import {
  addPlaylist,
  getActivePlaylistId,
  getSavedPlaylists,
  removePlaylist,
  setActivePlaylistId,
  type SavedPlaylist,
} from '@/utils/playlist-storage';

type Props = {
  onActivated: (channels: M3uChannel[]) => void;
  onActiveRemoved: () => void;
  onClose: () => void;
};

export function PlaylistManagerScreen({ onActivated, onActiveRemoved, onClose }: Props) {
  const [playlists, setPlaylists] = useState<SavedPlaylist[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const [savedPlaylists, savedActiveId] = await Promise.all([
        getSavedPlaylists(),
        getActivePlaylistId(),
      ]);
      setPlaylists(savedPlaylists);
      setActiveId(savedActiveId);
    })();
  }, []);

  const handleAdd = async () => {
    const trimmedUrl = newUrl.trim();
    if (!trimmedUrl) {
      setError('Cole a URL da lista M3U.');
      return;
    }
    setError('');
    const playlist = await addPlaylist(trimmedUrl, newName);
    setPlaylists((prev) => [...prev, playlist]);
    setNewUrl('');
    setNewName('');
  };

  const handleActivate = async (playlist: SavedPlaylist) => {
    setActivatingId(playlist.id);
    setProgress(0);
    setError('');
    try {
      const { tv, filmes, series } = await loadPlaylist(
        playlist.url,
        ({ processedLines, totalLines }) => {
          setProgress(totalLines > 0 ? processedLines / totalLines : 0);
        }
      );
      const channels: M3uChannel[] = [...tv, ...filmes, ...series];
      if (channels.length === 0) {
        setError('Nenhum canal encontrado nessa lista.');
        return;
      }
      await setActivePlaylistId(playlist.id);
      setActiveId(playlist.id);
      onActivated(channels);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Falha ao carregar a lista: ${err.message}`
          : 'Falha ao carregar a lista.'
      );
    } finally {
      setActivatingId(null);
    }
  };

  const handleDelete = async (playlist: SavedPlaylist) => {
    await removePlaylist(playlist.id);
    setPlaylists((prev) => prev.filter((p) => p.id !== playlist.id));
    if (playlist.id === activeId) {
      setActiveId(null);
      onActiveRemoved();
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>Minhas listas</ThemedText>
          <TouchableOpacity onPress={onClose}>
            <ThemedText style={styles.closeButton}>Fechar</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.addRow}>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="Nome da lista (opcional)"
            placeholderTextColor="#8888aa"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.nameInput}
          />
          <View style={styles.urlRow}>
            <TextInput
              value={newUrl}
              onChangeText={setNewUrl}
              placeholder="http://servidor:porta/get.php?username=...&password=...&type=m3u_plus&output=ts"
              placeholderTextColor="#8888aa"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.urlInput}
              multiline
            />
            <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
              <ThemedText style={styles.addButtonText}>+</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {!!error && <ThemedText style={styles.error}>{error}</ThemedText>}

        <FlatList
          data={playlists}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <ThemedText style={styles.emptyText}>
              Nenhuma lista salva ainda. Adicione uma URL acima.
            </ThemedText>
          }
          renderItem={({ item }) => {
            const isActive = item.id === activeId;
            const isActivating = activatingId === item.id;
            return (
              <TouchableOpacity
                style={[styles.item, isActive && styles.itemActive]}
                onPress={() => handleActivate(item)}
                disabled={!!activatingId}
                activeOpacity={0.75}
              >
                <View style={styles.itemInfo}>
                  <ThemedText style={styles.itemName}>{item.name}</ThemedText>
                  <ThemedText style={styles.itemUrl} numberOfLines={1}>
                    {item.url}
                  </ThemedText>
                  {isActive && <ThemedText style={styles.activeBadge}>Ativa</ThemedText>}
                </View>

                {isActivating ? (
                  <View style={styles.itemActionColumn}>
                    <ActivityIndicator color="#fff" />
                    {progress > 0 && (
                      <ThemedText style={styles.itemProgress}>
                        {Math.round(progress * 100)}%
                      </ThemedText>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <ThemedText style={styles.deleteButtonText}>🗑️</ThemedText>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          }}
        />
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
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  closeButton: {
    color: '#4dd6ff',
    fontSize: 14,
    fontWeight: '600',
  },
  addRow: {
    backgroundColor: '#12004f',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1aa2ff',
    padding: 16,
    gap: 10,
    marginBottom: 16,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: '#4dd6ff',
    borderRadius: 10,
    padding: 10,
    color: '#fff',
    fontSize: 13,
  },
  urlRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  urlInput: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#4dd6ff',
    borderRadius: 10,
    padding: 10,
    color: '#fff',
    fontSize: 13,
    textAlignVertical: 'top',
  },
  addButton: {
    backgroundColor: '#2a5fd6',
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 26,
  },
  error: {
    color: '#ff6b6b',
    fontSize: 13,
    marginBottom: 12,
  },
  list: {
    gap: 12,
    paddingBottom: 24,
  },
  emptyText: {
    color: '#c7c7e6',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 24,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#170066',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1aa2ff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  itemActive: {
    borderColor: '#3ddc84',
    borderWidth: 2,
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  itemUrl: {
    color: '#c7c7e6',
    fontSize: 12,
  },
  activeBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    color: '#3ddc84',
    fontSize: 11,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: '#3ddc84',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  itemActionColumn: {
    alignItems: 'center',
    gap: 4,
  },
  itemProgress: {
    color: '#fff',
    fontSize: 11,
  },
  deleteButton: {
    padding: 6,
  },
  deleteButtonText: {
    fontSize: 20,
  },
});
