import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LiveTvScreen } from './src/components/live-tv-screen';
import { PlaylistSetupScreen } from './src/components/playlist-setup-screen';
import { loadChannels, saveChannels } from './src/utils/channel-storage';
import { type M3uChannel } from './src/utils/m3u-parser';

const PLAYLIST_URL_KEY = 'webtech.playlistUrl';

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
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [channels, setChannels] = useState<M3uChannel[]>([]);
  const tvItem = menuItems[0];
  const centerTop = menuItems[1];
  const rightTop = menuItems[2];
  const centerBottom = menuItems[3];
  const rightBottom = menuItems[4];
  const settingsItem = menuItems[5];

  useEffect(() => {
    (async () => {
      const [savedUrl, savedChannels] = await Promise.all([
        AsyncStorage.getItem(PLAYLIST_URL_KEY),
        loadChannels(),
      ]);
      if (savedUrl) setPlaylistUrl(savedUrl);
      if (savedChannels.length > 0) setChannels(savedChannels);
    })();
  }, []);

  const handlePlaylistLoaded = async (url: string, loadedChannels: M3uChannel[]) => {
    setPlaylistUrl(url);
    setChannels(loadedChannels);
    setCurrentScreen('tv');
    await Promise.all([AsyncStorage.setItem(PLAYLIST_URL_KEY, url), saveChannels(loadedChannels)]);
  };

  const handleMenuPress = (screen?: string) => {
    if (screen === 'exit') {
      console.log('Exiting...');
    } else if (screen === 'reload') {
      setCurrentScreen('home');
    } else if (screen === 'tv' && channels.length === 0) {
      setCurrentScreen('playlist');
    } else {
      setCurrentScreen(screen || 'home');
    }
  };

  if (currentScreen === 'playlist') {
    return (
      <PlaylistSetupScreen
        initialUrl={playlistUrl}
        onLoaded={handlePlaylistLoaded}
        onCancel={() => setCurrentScreen('home')}
      />
    );
  }

  if (currentScreen === 'tv') {
    return (
      <LiveTvScreen
        channels={channels}
        onNavigate={(key) => setCurrentScreen(key === 'live' ? 'tv' : key)}
        onChangePlaylist={() => setCurrentScreen('playlist')}
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

                {sideMenuItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.sideMenuItem}
                    onPress={() => handleMenuPress(item.screen)}
                    activeOpacity={0.75}
                  >
                    <Text allowFontScaling={false} style={styles.sideMenuIcon}>{item.icon}</Text>
                    <Text allowFontScaling={false} style={styles.sideMenuLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
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
  sideMenuLabel: {
    flex: 1,
    color: '#ffffff',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'left',
  },
});
