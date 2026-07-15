import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BootLoadingScreen } from './src/components/boot-loading-screen';
import { ContentBrowserScreen, type NavKey } from './src/components/content-browser-screen';
import { DeviceActivationScreen } from './src/components/device-activation-screen';
import { MoviesScreen } from './src/components/movies-screen';
import { PlaylistManagerScreen } from './src/components/playlist-manager-screen';
import { SeriesScreen } from './src/components/series-screen';
import { MOCK_MAC } from './src/config/device';
import { loadChannels, saveChannels } from './src/utils/channel-storage';
import type { ContentCategory } from './src/utils/content-classifier';
import { loadLastPlaylist, saveLastPlaylist } from './src/utils/last-playlist-storage';
import { type M3uChannel } from './src/utils/m3u-parser';
import { fetchDevicePlaylists, type PanelPlaylist } from './src/utils/panel-api';
import { loadPlaylist } from './src/utils/playlist-loader';

// Maps a dashboard/menu screen key to the content bucket its browser screen
// should show (see content-classifier.ts). Same screen component for all
// three - only the category (and which nav item lights up) changes.
const CONTENT_SCREENS: Partial<Record<string, ContentCategory>> = {
  tv: 'live',
  movies: 'movies',
  series: 'series',
};

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  screen?: string;
}

const menuItems: MenuItem[] = [
  { id: '1', label: 'TV ao Vivo', icon: '📺', screen: 'tv' },
  { id: '2', label: 'Filmes', icon: '▶️', screen: 'movies' },
  { id: '3', label: 'Séries', icon: '🎬', screen: 'series' },
  { id: '4', label: 'Conta', icon: '👤', screen: 'account' },
  { id: '5', label: 'mudar lista de\nreprodução', icon: '🔄', screen: 'playlist' },
  { id: '6', label: 'Configurações', icon: '⚙️', screen: 'settings' },
];

const sideMenuItems: MenuItem[] = [
  { id: '7', label: 'recarregar', icon: '🔄', screen: 'reload' },
  { id: '8', label: 'saída', icon: '🚪', screen: 'exit' },
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [channels, setChannels] = useState<M3uChannel[]>([]);
  const [playlists, setPlaylists] = useState<PanelPlaylist[]>([]);
  const [activePlaylistId, setActivePlaylistId] = useState<number | null>(null);
  const [reloadingPlaylist, setReloadingPlaylist] = useState(false);
  const [reloadingChannels, setReloadingChannels] = useState(false);
  const [reloadChannelsError, setReloadChannelsError] = useState('');
  const [reloadBlockedMessage, setReloadBlockedMessage] = useState('');
  const [exitModalVisible, setExitModalVisible] = useState(false);
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  // True only for the initial boot check (cache lookup, or first-run painel
  // fetch) — shows BootLoadingScreen so that gap doesn't render an empty
  // Home/activation screen that looks broken rather than loading.
  const [booting, setBooting] = useState(true);
  const tvItem = menuItems[0];
  const centerTop = menuItems[1];
  const rightTop = menuItems[2];
  const centerBottom = menuItems[3];
  const rightBottom = menuItems[4];
  const settingsItem = menuItems[5];
  const activePlaylist = playlists.find((p) => p.id === activePlaylistId);
  const playlistExpiration = activePlaylist?.expiracaoData;

  useEffect(() => {
    if (!reloadBlockedMessage) return;
    const timer = setTimeout(() => setReloadBlockedMessage(''), 2000);
    return () => clearTimeout(timer);
  }, [reloadBlockedMessage]);

  const activatePlaylist = async (playlist: PanelPlaylist) => {
    const { tv, filmes, series } = await loadPlaylist(playlist.url);
    const freshChannels: M3uChannel[] = [...tv, ...filmes, ...series];
    setActivePlaylistId(playlist.id);
    setChannels(freshChannels);
    setCurrentScreen('home');
    // Cached so the next boot can skip straight to Home (see the boot
    // useEffect below) instead of blocking on the painel + provider round
    // trip every launch.
    saveLastPlaylist(playlist);
    saveChannels(freshChannels);
  };

  const fetchAndActivateFromPanel = async () => {
    const panelPlaylists = await fetchDevicePlaylists(MOCK_MAC);
    setPlaylists(panelPlaylists);

    if (panelPlaylists.length === 0) {
      setActivePlaylistId(null);
      setChannels([]);
      setCurrentScreen('playlist');
      return;
    }

    await activatePlaylist(panelPlaylists[0]);
  };

  useEffect(() => {
    (async () => {
      const [cachedPlaylist, cachedChannels] = await Promise.all([loadLastPlaylist(), loadChannels()]);

      if (cachedPlaylist && cachedChannels.length > 0) {
        // Straight to Home with what was on screen last time — no network
        // wait. The painel is still checked in the background so "Minhas
        // listas" and future reloads have fresh data, but it never blocks
        // or interrupts what the user is already browsing/watching.
        setActivePlaylistId(cachedPlaylist.id);
        setChannels(cachedChannels);
        setPlaylists([cachedPlaylist]);
        setCurrentScreen('home');
        setBooting(false);
        fetchDevicePlaylists(MOCK_MAC)
          .then(setPlaylists)
          .catch(() => {});
        return;
      }

      try {
        await fetchAndActivateFromPanel();
      } catch {
        // No painel reachable at boot: stay on the activation/lock screen.
        setCurrentScreen('playlist');
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  if (booting) {
    return <BootLoadingScreen />;
  }

  const handleReloadPlaylist = async () => {
    setReloadingPlaylist(true);
    try {
      await fetchAndActivateFromPanel();
    } catch {
      // Reload is best-effort; user stays on the activation screen to retry.
    } finally {
      setReloadingPlaylist(false);
    }
  };

  // Re-downloads and re-parses the *currently active* playlist's channels
  // (same URL, fresh content) without touching `playlists`/`activePlaylistId`.
  // Favorites and watch history live in AsyncStorage keyed by title/show id
  // (see favorites-storage.ts, watch-history-storage.ts), not by channel
  // list index, so they're untouched by this — they only change if the user
  // acts on them or the list itself changes (a title added/removed).
  const handleReloadChannels = async () => {
    const active = playlists.find((p) => p.id === activePlaylistId);
    if (!active) {
      setCurrentScreen('playlist');
      return;
    }
    setReloadingChannels(true);
    setReloadChannelsError('');
    try {
      await activatePlaylist(active);
    } catch (err) {
      // Previously failed silently, so a network hiccup looked exactly like
      // the button doing nothing. Now it's visible (banner below) instead
      // of just keeping the stale channels with no explanation.
      setReloadChannelsError(
        err instanceof Error ? `Falha ao recarregar: ${err.message}` : 'Falha ao recarregar a lista.'
      );
    } finally {
      setReloadingChannels(false);
    }
  };

  const handleMenuPress = (screen?: string) => {
    if (reloadingChannels) {
      setReloadBlockedMessage('Aguarde o fim do carregamento...');
      return;
    }
    if (screen === 'exit') {
      setExitModalVisible(true);
    } else if (screen === 'account') {
      setAccountModalVisible(true);
    } else if (screen === 'reload') {
      handleReloadChannels();
    } else if (screen && screen in CONTENT_SCREENS && channels.length === 0) {
      setCurrentScreen('playlist');
    } else {
      setCurrentScreen(screen || 'home');
    }
  };

  const handleConfirmExit = () => {
    setExitModalVisible(false);
    BackHandler.exitApp();
  };

  if (currentScreen === 'playlist') {
    if (playlists.length === 0) {
      return (
        <DeviceActivationScreen
          macAddress={MOCK_MAC}
          onReload={handleReloadPlaylist}
          reloading={reloadingPlaylist}
        />
      );
    }

    return (
      <PlaylistManagerScreen
        playlists={playlists}
        activePlaylistId={activePlaylistId}
        macAddress={MOCK_MAC}
        onSelect={activatePlaylist}
        onClose={() => setCurrentScreen('home')}
      />
    );
  }

  if (currentScreen === 'movies') {
    return (
      <MoviesScreen
        channels={channels}
        activeNav="movies"
        onNavigate={(key) => setCurrentScreen(key === 'live' ? 'tv' : key)}
      />
    );
  }

  if (currentScreen === 'series') {
    return (
      <SeriesScreen
        channels={channels}
        activeNav="series"
        onNavigate={(key) => setCurrentScreen(key === 'live' ? 'tv' : key)}
      />
    );
  }

  const contentCategory = CONTENT_SCREENS[currentScreen];
  if (contentCategory) {
    return (
      <ContentBrowserScreen
        channels={channels}
        category={contentCategory}
        activeNav={currentScreen === 'tv' ? 'live' : (currentScreen as NavKey)}
        onNavigate={(key) => setCurrentScreen(key === 'live' ? 'tv' : key)}
      />
    );
  }

  return (
    <LinearGradient
      colors={['#050042', '#0d0569', '#050042']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientBackground}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.mainContent}>
          <View style={styles.contentArea}>
            <View style={styles.layoutRow}>
              <TouchableOpacity
                key={tvItem.id}
                style={styles.tvCard}
                onPress={() => handleMenuPress(tvItem.screen)}
                activeOpacity={0.75}
              >
                <Text allowFontScaling={false} style={styles.tvIcon}>{tvItem.icon}</Text>
                <Text allowFontScaling={false} style={styles.tvLabel}>{tvItem.label}</Text>
              </TouchableOpacity>

              <View style={styles.midColumn}>
                <TouchableOpacity
                  key={centerTop.id}
                  style={styles.midCard}
                  onPress={() => handleMenuPress(centerTop.screen)}
                  activeOpacity={0.75}
                >
                  <Text allowFontScaling={false} style={styles.midIcon}>{centerTop.icon}</Text>
                  <Text allowFontScaling={false} style={styles.midLabel}>{centerTop.label}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  key={centerBottom.id}
                  style={styles.midCard}
                  onPress={() => handleMenuPress(centerBottom.screen)}
                  activeOpacity={0.75}
                >
                  <Text allowFontScaling={false} style={styles.midIcon}>{centerBottom.icon}</Text>
                  <Text allowFontScaling={false} style={styles.midLabel}>{centerBottom.label}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.midColumn}>
                <TouchableOpacity
                  key={rightTop.id}
                  style={styles.midCard}
                  onPress={() => handleMenuPress(rightTop.screen)}
                  activeOpacity={0.75}
                >
                  <Text allowFontScaling={false} style={styles.midIcon}>{rightTop.icon}</Text>
                  <Text allowFontScaling={false} style={styles.midLabel}>{rightTop.label}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  key={rightBottom.id}
                  style={styles.midCard}
                  onPress={() => handleMenuPress(rightBottom.screen)}
                  activeOpacity={0.75}
                >
                  <Text allowFontScaling={false} style={styles.midIcon}>{rightBottom.icon}</Text>
                  <Text allowFontScaling={false} style={styles.midLabel}>{rightBottom.label}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.sideMenu}>
                <TouchableOpacity
                  key={settingsItem.id}
                  style={styles.sideMenuItem}
                  onPress={() => handleMenuPress(settingsItem.screen)}
                  activeOpacity={0.75}
                >
                  <Text allowFontScaling={false} style={styles.sideMenuIcon}>{settingsItem.icon}</Text>
                  <Text allowFontScaling={false} style={styles.sideMenuLabel}>{settingsItem.label}</Text>
                </TouchableOpacity>

                {sideMenuItems.map((item) => {
                  const isReloadItem = item.screen === 'reload';
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.sideMenuItem}
                      onPress={() => handleMenuPress(item.screen)}
                      activeOpacity={0.75}
                    >
                      {isReloadItem && reloadingChannels ? (
                        <ActivityIndicator color="#4dd6ff" style={styles.sideMenuSpinner} />
                      ) : (
                        <Text allowFontScaling={false} style={styles.sideMenuIcon}>{item.icon}</Text>
                      )}
                      <Text allowFontScaling={false} style={styles.sideMenuLabel}>
                        {isReloadItem && reloadingChannels ? 'recarregando...' : item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {!!(reloadBlockedMessage || reloadChannelsError) && (
            <View style={styles.reloadErrorBanner}>
              <Text allowFontScaling={false} style={styles.reloadErrorText}>
                {reloadBlockedMessage || reloadChannelsError}
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>

      <Modal
        visible={exitModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setExitModalVisible(false)}
      >
        <View style={styles.exitModalOverlay}>
          <View style={styles.exitModalBox}>
            <Text allowFontScaling={false} style={styles.exitModalTitle}>
              Deseja sair do app?
            </Text>
            <View style={styles.exitModalActions}>
              <TouchableOpacity
                style={[styles.exitModalButton, styles.exitModalButtonNo]}
                onPress={() => setExitModalVisible(false)}
                activeOpacity={0.75}
              >
                <Text allowFontScaling={false} style={styles.exitModalButtonText}>Não</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.exitModalButton, styles.exitModalButtonYes]}
                onPress={handleConfirmExit}
                activeOpacity={0.75}
              >
                <Text allowFontScaling={false} style={styles.exitModalButtonText}>Sim</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={accountModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAccountModalVisible(false)}
      >
        <View style={styles.exitModalOverlay}>
          <View style={styles.accountModalBox}>
            <Text allowFontScaling={false} style={styles.accountModalTitle}>Conta</Text>

            <View style={styles.accountRow}>
              <Text allowFontScaling={false} style={styles.accountRowLabel}>Endereço Mac</Text>
              <Text allowFontScaling={false} style={styles.accountRowValue}>{MOCK_MAC}</Text>
            </View>
            <View style={styles.accountRow}>
              <Text allowFontScaling={false} style={styles.accountRowLabel}>Estado da conta</Text>
              <Text allowFontScaling={false} style={styles.accountRowValue}>Free Trial</Text>
            </View>
            <View style={styles.accountRow}>
              <Text allowFontScaling={false} style={styles.accountRowLabel}>Data de validade</Text>
              <Text allowFontScaling={false} style={styles.accountRowValue}>
                {playlistExpiration || 'Não informada'}
              </Text>
            </View>
            <Text allowFontScaling={false} style={styles.accountRenewHint}>
              Renove sua assinatura em{'\n'}
              <Text style={styles.accountRenewLink}>webtech.pro.kchagas.com.br</Text>
            </Text>

            <TouchableOpacity
              style={styles.accountModalClose}
              onPress={() => setAccountModalVisible(false)}
              activeOpacity={0.75}
            >
              <Text allowFontScaling={false} style={styles.exitModalButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  contentArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 0,
  },
  layoutRow: {
    flex: 1,
    flexDirection: 'row',
    width: '95%',
    gap: 8,
    minHeight: 0,
    maxHeight: 286,
  },
  tvCard: {
    flex: 1.25,
    backgroundColor: '#170066',
    borderColor: '#1aa2ff',
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  tvIcon: {
    fontSize: 64,
    marginBottom: 8,
  },
  tvLabel: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
  },
  midColumn: {
    flex: 1,
    gap: 8,
    minHeight: 0,
  },
  midCard: {
    flex: 1,
    backgroundColor: '#170066',
    borderColor: '#1aa2ff',
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  midIcon: {
    fontSize: 40,
    marginBottom: 6,
  },
  midLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
  sideMenu: {
    width: 255,
    gap: 8,
  },
  sideMenuItem: {
    flex: 1,
    backgroundColor: '#12004f',
    borderColor: '#1aa2ff',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  sideMenuIcon: {
    fontSize: 28,
    color: '#ffffff',
    lineHeight: 32,
  },
  sideMenuSpinner: {
    width: 28,
  },
  sideMenuLabel: {
    flex: 1,
    color: '#ffffff',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'left',
  },
  reloadErrorBanner: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(120, 0, 0, 0.85)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  reloadErrorText: {
    color: '#ffffff',
    fontSize: 12,
    textAlign: 'center',
  },
  exitModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitModalBox: {
    backgroundColor: '#12004f',
    borderColor: '#1aa2ff',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: 220,
    alignItems: 'center',
  },
  exitModalTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  exitModalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  exitModalButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
    borderWidth: 1,
  },
  exitModalButtonNo: {
    backgroundColor: '#170066',
    borderColor: '#1aa2ff',
  },
  exitModalButtonYes: {
    backgroundColor: '#7a0000',
    borderColor: '#ff4d4d',
  },
  exitModalButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  accountModalBox: {
    backgroundColor: '#12004f',
    borderColor: '#1aa2ff',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    width: 320,
  },
  accountModalTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(77, 214, 255, 0.25)',
    paddingVertical: 10,
    gap: 12,
  },
  accountRowLabel: {
    color: '#c7c7e6',
    fontSize: 12,
  },
  accountRowValue: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
  accountRenewHint: {
    color: '#8888aa',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
    marginTop: 14,
  },
  accountRenewLink: {
    color: '#4dd6ff',
    fontWeight: '600',
  },
  accountModalClose: {
    marginTop: 16,
    alignSelf: 'center',
    backgroundColor: '#170066',
    borderColor: '#1aa2ff',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
});
