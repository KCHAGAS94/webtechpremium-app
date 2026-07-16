import React, { useEffect, useState } from 'react';
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
  const activePlaylist = playlists.find((p) => p.id === activePlaylistId);
  const expirationDate = activePlaylist?.expiracaoData;

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(''), 3000);
    return () => clearTimeout(timer);
  }, [error]);

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
                  <ThemedText style={styles.itemName}>{item.name}</ThemedText>
                  {isActive && <ThemedText style={styles.activeBadge}>Ativa</ThemedText>}

                  {isActivating && <ActivityIndicator color="#fff" style={styles.itemSpinner} />}
                </TouchableOpacity>
              );
            }}
          />

          <View style={styles.separator} />

          <View style={styles.macPanel}>
            <ThemedText style={styles.macLabel}>Endereço MAC</ThemedText>
            <ThemedText style={styles.macValue}>{macAddress}</ThemedText>
            <ThemedText style={styles.macHint}>
              Use este endereço para vincular listas a este dispositivo no painel.
            </ThemedText>

            <ThemedText style={styles.macLabel}>Data de Expiração</ThemedText>
            <ThemedText style={styles.expirationValue}>{expirationDate || 'Não informada'}</ThemedText>
            <ThemedText style={styles.macHint}>
              Renove sua assinatura em{' '}
              <ThemedText style={styles.renewLink}>webtech.pro.kchagas.com.br</ThemedText>
            </ThemedText>
          </View>
        </View>

        {!!error && (
          <View style={styles.errorBanner}>
            <ThemedText style={styles.errorBannerText}>{error}</ThemedText>
          </View>
        )}
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
    paddingHorizontal: 110,
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
  errorBanner: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(120, 0, 0, 0.85)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorBannerText: {
    color: '#ffffff',
    fontSize: 12,
    textAlign: 'center',
  },
  separator: {
    alignSelf: 'stretch',
    width: 1,
    backgroundColor: 'rgba(77, 214, 255, 0.35)',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 40,
  },
  listColumn: {
    flex: 1,
  },
  list: {
    gap: 12,
    paddingBottom: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  item: {
    width: 100,
    height: 100,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: '#170066',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1aa2ff',
    padding: 10,
  },
  itemActive: {
    borderColor: '#3ddc84',
    borderWidth: 2,
  },
  itemName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  itemSpinner: {
    marginTop: 8,
  },
  activeBadge: {
    alignSelf: 'flex-start',
    color: '#3ddc84',
    fontSize: 11,
    fontWeight: '700',
  },
  macPanel: {
    width: 320,
    paddingHorizontal: 24,
    paddingVertical: 26,
    alignItems: 'center',
    gap: 8,
  },
  expirationValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  renewLink: {
    color: '#4dd6ff',
    fontWeight: '600',
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
