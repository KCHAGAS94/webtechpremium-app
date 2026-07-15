import React, { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { PanelPlaylist } from '@/utils/panel-api';

type Props = {
  playlists: PanelPlaylist[];
  activePlaylistId: number | null;
  macAddress: string;
  onSelect: (playlist: PanelPlaylist) => Promise<void> | void;
  onClose: () => void;
};

export function PlaylistManagerScreen({ playlists, activePlaylistId, macAddress, onSelect, onClose }: Props) {
  const [activatingId, setActivatingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const handleSelect = async (playlist: PanelPlaylist) => {
    setActivatingId(playlist.id);
    setError('');
    try {
      await onSelect(playlist);
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

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>Minhas listas</ThemedText>
          <TouchableOpacity onPress={onClose}>
            <ThemedText style={styles.closeButton}>Fechar</ThemedText>
          </TouchableOpacity>
        </View>

        <ThemedText style={styles.subtitle}>
          Listas vinculadas a este dispositivo no painel.
        </ThemedText>

        {!!error && <ThemedText style={styles.error}>{error}</ThemedText>}

        <View style={styles.body}>
          <FlatList
            style={styles.listColumn}
            data={playlists}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const isActive = item.id === activePlaylistId;
              const isActivating = activatingId === item.id;
              return (
                <TouchableOpacity
                  style={[styles.item, isActive && styles.itemActive]}
                  onPress={() => handleSelect(item)}
                  disabled={!!activatingId}
                  activeOpacity={0.75}
                >
                  <View style={styles.itemInfo}>
                    <ThemedText style={styles.itemName}>{item.name}</ThemedText>
                    {isActive && <ThemedText style={styles.activeBadge}>Ativa</ThemedText>}
                  </View>

                  {isActivating && <ActivityIndicator color="#fff" />}
                </TouchableOpacity>
              );
            }}
          />

          <View style={styles.macPanel}>
            <ThemedText style={styles.macLabel}>Endereço MAC</ThemedText>
            <ThemedText style={styles.macValue}>{macAddress}</ThemedText>
            <ThemedText style={styles.macHint}>
              Use este endereço para vincular listas a este dispositivo no painel.
            </ThemedText>
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
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
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
  subtitle: {
    fontSize: 13,
    color: '#c7c7e6',
    marginBottom: 16,
  },
  error: {
    color: '#ff6b6b',
    fontSize: 13,
    marginBottom: 12,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    gap: 20,
  },
  listColumn: {
    flex: 1,
  },
  list: {
    gap: 12,
    paddingBottom: 24,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
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
    gap: 4,
  },
  itemName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
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
  macPanel: {
    width: 220,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(18, 0, 79, 0.55)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(77, 214, 255, 0.35)',
    paddingHorizontal: 16,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 8,
  },
  macLabel: {
    fontSize: 10,
    color: '#9fa3d1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  macValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4dd6ff',
    letterSpacing: 1,
    textAlign: 'center',
  },
  macHint: {
    fontSize: 11,
    color: '#8888aa',
    textAlign: 'center',
    lineHeight: 15,
  },
});
