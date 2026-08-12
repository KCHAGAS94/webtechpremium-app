import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { PanelPlaylist } from '@/utils/panel-api';
import { fetchAccountExpiration, parseXtreamCredentials } from '@/utils/xtream-api';

type Props = {
  playlists: PanelPlaylist[];
  activePlaylistId: number | null;
  macAddress: string;
  onSelect: (playlist: PanelPlaylist) => Promise<void> | void;
  /** Omitted while `expired` — there's nowhere useful to go back to yet. */
  onClose?: () => void;
  /** True when the painel says the device's plan lapsed (see App.tsx's
   * bootstrap fresh-check). Hides the close button and shows a banner
   * explaining why the user is stuck here until they pick a valid lista. */
  expired?: boolean;
};

function CloseButton({ onPress }: { onPress: () => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      style={[styles.closeButtonBox, focused && styles.closeButtonBoxFocused]}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
    >
      <ThemedText style={styles.closeButton}>Fechar</ThemedText>
    </Pressable>
  );
}

function ServerCard({
  isActive,
  disabled,
  autoFocus,
  onPress,
  children,
}: {
  isActive: boolean;
  disabled: boolean;
  autoFocus?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const [focused, setFocused] = useState(!!autoFocus);
  return (
    <Pressable
      style={[styles.item, isActive && styles.itemActive, focused && styles.itemFocused]}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      disabled={disabled}
      hasTVPreferredFocus={autoFocus}
    >
      {children}
    </Pressable>
  );
}

// dataExpiracao comes back as YYYY-MM-DD (see dashboard's /api/devices) —
// reformatted here to the DD/MM/YYYY Brazilian users expect, same as the
// painel itself shows it (mirrors App.tsx's formatPlaylistValidity).
function formatExpirationDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

export function PlaylistManagerScreen({ playlists, activePlaylistId, macAddress, onSelect, onClose, expired }: Props) {
  const [activatingId, setActivatingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const activePlaylist = playlists.find((p) => p.id === activePlaylistId);
  // The painel's own Lista.dataExpiracao/tipo are filled in manually at
  // ativação time and can drift from the truth (a lista created before the
  // tipo column existed, a provider that extends a plan on their own side
  // without the reseller updating the painel, ...) — the provider's own
  // Xtream account (get_account_info's exp_date) is the real source of
  // truth, so that's tried first and the painel fields are only the
  // fallback for non-Xtream (plain M3U) lists or while that fetch is
  // pending/fails.
  const [xtreamExpiration, setXtreamExpiration] = useState<Date | null | undefined>(undefined);

  useEffect(() => {
    setXtreamExpiration(undefined);
    if (!activePlaylist) return;
    const credentials = parseXtreamCredentials(activePlaylist.url);
    if (!credentials) {
      setXtreamExpiration(null);
      return;
    }
    let cancelled = false;
    fetchAccountExpiration(credentials)
      .then((date) => {
        if (!cancelled) setXtreamExpiration(date);
      })
      .catch(() => {
        if (!cancelled) setXtreamExpiration(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activePlaylist]);

  const painelExpirationDate =
    activePlaylist?.tipo === 'VITALICIO'
      ? 'Vitalício'
      : activePlaylist?.expiracaoData
        ? formatExpirationDate(activePlaylist.expiracaoData)
        : null;
  const expirationDate = xtreamExpiration
    ? xtreamExpiration.toLocaleDateString('pt-BR')
    : painelExpirationDate;

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
          {onClose && <CloseButton onPress={onClose} />}
        </View>

        {expired ? (
          <View style={styles.expiredBanner}>
            <ThemedText style={styles.expiredBannerText}>
              Sua lista expirou e não é possível assistir no momento. Escolha uma lista válida abaixo ou
              renove sua assinatura para continuar.
            </ThemedText>
          </View>
        ) : (
          <ThemedText style={styles.subtitle}>
            Listas vinculadas a este dispositivo no painel.
          </ThemedText>
        )}

        <View style={styles.body}>
          <ScrollView style={styles.listColumn} contentContainerStyle={styles.list}>
            {playlists.map((item, index) => {
              const isActive = item.id === activePlaylistId;
              const isActivating = activatingId === item.id;
              return (
                <ServerCard
                  key={item.id}
                  isActive={isActive}
                  disabled={!!activatingId}
                  // First server in the list always grabs D-pad focus on
                  // entry, same as the Home screen's "TV ao vivo" card —
                  // otherwise nothing shows as selected until the user
                  // presses a direction key.
                  autoFocus={index === 0}
                  onPress={() => handleSelect(item)}
                >
                  <ThemedText style={styles.itemName}>{item.name}</ThemedText>
                  {isActive && <ThemedText style={styles.activeBadge}>Ativa</ThemedText>}

                  {isActivating && <ActivityIndicator color="#fff" style={styles.itemSpinner} />}
                </ServerCard>
              );
            })}
          </ScrollView>

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
              Renove sua assinatura em{' \n'}
              <ThemedText style={styles.renewLink}>https://painel.webtechpremium.kchagas.com.br/</ThemedText>
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
  closeButtonBox: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  closeButtonBoxFocused: {
    borderColor: '#4dd6ff',
    backgroundColor: '#1f24c2',
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
  expiredBanner: {
    backgroundColor: 'rgba(120, 0, 0, 0.35)',
    borderWidth: 1,
    borderColor: '#ff4d4d',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  expiredBannerText: {
    fontSize: 13,
    color: '#ffdddd',
    lineHeight: 18,
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
  itemFocused: {
    borderColor: '#4dd6ff',
    borderWidth: 2,
    backgroundColor: '#1f24c2',
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
