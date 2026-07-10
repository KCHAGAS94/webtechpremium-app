import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

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
  const tvItem = menuItems[0];
  const centerTop = menuItems[1];
  const rightTop = menuItems[2];
  const centerBottom = menuItems[3];
  const rightBottom = menuItems[4];
  const settingsItem = menuItems[5];

  const handleMenuPress = (screen?: string) => {
    if (screen === 'exit') {
      console.log('Exiting...');
    } else if (screen === 'reload') {
      setCurrentScreen('home');
    } else {
      setCurrentScreen(screen || 'home');
    }
  };

  return (
    <LinearGradient
      colors={['#040031', '#120066', '#040031']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientBackground}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.mainContent}>
          <View style={styles.logoSection}>
            <Text allowFontScaling={false} style={styles.logoIcon}>🤖</Text>
            <Text allowFontScaling={false} style={styles.logoText}>webtech</Text>
          </View>

          <View style={styles.contentArea}>
            <View style={styles.layoutRow}>
              <TouchableOpacity
                key={tvItem.id}
                style={styles.tvCard}
                onPress={() => handleMenuPress(tvItem.screen)}
                activeOpacity={0.75}
              >
                <View style={styles.tvInnerFrame}>
                  <Text allowFontScaling={false} style={styles.tvIcon}>{tvItem.icon}</Text>
                  <Text allowFontScaling={false} style={styles.tvLabel}>{tvItem.label}</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.midColumn}>
                <TouchableOpacity
                  key={centerTop.id}
                  style={styles.midCard}
                  onPress={() => handleMenuPress(centerTop.screen)}
                  activeOpacity={0.75}
                >
                  <View style={styles.midInnerFrame}>
                    <Text allowFontScaling={false} style={styles.midIcon}>{centerTop.icon}</Text>
                    <Text allowFontScaling={false} style={styles.midLabel}>{centerTop.label}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  key={centerBottom.id}
                  style={styles.midCard}
                  onPress={() => handleMenuPress(centerBottom.screen)}
                  activeOpacity={0.75}
                >
                  <View style={styles.midInnerFrame}>
                    <Text allowFontScaling={false} style={styles.midIcon}>{centerBottom.icon}</Text>
                    <Text allowFontScaling={false} style={styles.midLabel}>{centerBottom.label}</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.midColumn}>
                <TouchableOpacity
                  key={rightTop.id}
                  style={styles.midCard}
                  onPress={() => handleMenuPress(rightTop.screen)}
                  activeOpacity={0.75}
                >
                  <View style={styles.midInnerFrame}>
                    <Text allowFontScaling={false} style={styles.midIcon}>{rightTop.icon}</Text>
                    <Text allowFontScaling={false} style={styles.midLabel}>{rightTop.label}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  key={rightBottom.id}
                  style={styles.midCard}
                  onPress={() => handleMenuPress(rightBottom.screen)}
                  activeOpacity={0.75}
                >
                  <View style={styles.midInnerFrame}>
                    <Text allowFontScaling={false} style={styles.midIcon}>{rightBottom.icon}</Text>
                    <Text allowFontScaling={false} style={styles.midLabel}>{rightBottom.label}</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.sideMenu}>
                <TouchableOpacity
                  key={settingsItem.id}
                  style={styles.sideMenuItem}
                  onPress={() => handleMenuPress(settingsItem.screen)}
                  activeOpacity={0.75}
                >
                  <View style={styles.sideInnerFrame}>
                    <Text allowFontScaling={false} style={styles.sideMenuIcon}>{settingsItem.icon}</Text>
                    <Text allowFontScaling={false} style={styles.sideMenuLabel}>{settingsItem.label}</Text>
                  </View>
                </TouchableOpacity>

                {sideMenuItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.sideMenuItem}
                    onPress={() => handleMenuPress(item.screen)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.sideInnerFrame}>
                      <Text allowFontScaling={false} style={styles.sideMenuIcon}>{item.icon}</Text>
                      <Text allowFontScaling={false} style={styles.sideMenuLabel}>{item.label}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.footer}>
              <Text allowFontScaling={false} style={styles.expiryText}>Vencimento: 15/07/2026</Text>
              <Text allowFontScaling={false} style={styles.versionText}>v3.8</Text>
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
    paddingHorizontal: 10,
    paddingTop: 2,
    paddingBottom: 4,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 4,
  },
  logoIcon: {
    fontSize: 14,
    marginBottom: 0,
    color: '#8b5cff',
  },
  logoText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#8b5cff',
    letterSpacing: 1,
    textTransform: 'lowercase',
  },
  contentArea: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 0,
  },
  layoutRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    minHeight: 0,
  },
  tvCard: {
    flex: 1.2,
    backgroundColor: 'transparent',
    borderColor: '#0286ff',
    borderWidth: 0,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tvIcon: {
    fontSize: 38,
    marginBottom: 4,
  },
  tvLabel: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 11,
  },
  tvInnerFrame: {
    backgroundColor: '#170066',
    borderColor: '#12b2ff',
    borderWidth: 0.8,
    borderRadius: 8,
    width: '58%',
    height: '66%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  midColumn: {
    flex: 1,
    gap: 4,
    minHeight: 0,
  },
  midCard: {
    flex: 1,
    backgroundColor: 'transparent',
    borderColor: '#0286ff',
    borderWidth: 0,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  midIcon: {
    fontSize: 24,
    marginBottom: 1,
  },
  midLabel: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 9,
  },
  midInnerFrame: {
    backgroundColor: '#170066',
    borderColor: '#12b2ff',
    borderWidth: 0.8,
    borderRadius: 8,
    width: '72%',
    height: '72%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideMenu: {
    width: 150,
    gap: 4,
  },
  sideMenuItem: {
    height: 52,
    backgroundColor: 'transparent',
    borderColor: '#0286ff',
    borderWidth: 0,
    borderRadius: 8,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sideInnerFrame: {
    backgroundColor: '#12004f',
    borderColor: '#12b2ff',
    borderWidth: 0.8,
    borderRadius: 8,
    width: '92%',
    height: '90%',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 8,
  },
  sideMenuIcon: {
    fontSize: 14,
    color: '#ffffff',
    lineHeight: 18,
  },
  sideMenuLabel: {
    flex: 1,
    color: '#ffffff',
    fontSize: 8,
    lineHeight: 18,
    textAlign: 'center',
  },
  footer: {
    marginTop: 2,
    borderTopWidth: 0.6,
    borderTopColor: '#0286ff',
    height: 28,
    justifyContent: 'center',
    position: 'relative',
  },
  expiryText: {
    color: '#ffffff',
    fontSize: 7,
    fontWeight: '600',
    textAlign: 'center',
  },
  versionText: {
    position: 'absolute',
    right: 2,
    top: 8,
    color: '#ffffff',
    fontSize: 7,
    fontWeight: '500',
  },
});
