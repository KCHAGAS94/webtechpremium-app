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
            <Text style={styles.logoIcon}>🤖</Text>
            <Text style={styles.logoText}>webtech</Text>
          </View>

          <View style={styles.contentArea}>
            <View style={styles.layoutRow}>
              <TouchableOpacity
                key={tvItem.id}
                style={styles.tvCard}
                onPress={() => handleMenuPress(tvItem.screen)}
                activeOpacity={0.75}
              >
                <Text style={styles.tvIcon}>{tvItem.icon}</Text>
                <Text style={styles.tvLabel}>{tvItem.label}</Text>
              </TouchableOpacity>

              <View style={styles.midColumn}>
                <TouchableOpacity
                  key={centerTop.id}
                  style={styles.midCard}
                  onPress={() => handleMenuPress(centerTop.screen)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.midIcon}>{centerTop.icon}</Text>
                  <Text style={styles.midLabel}>{centerTop.label}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  key={centerBottom.id}
                  style={styles.midCard}
                  onPress={() => handleMenuPress(centerBottom.screen)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.midIcon}>{centerBottom.icon}</Text>
                  <Text style={styles.midLabel}>{centerBottom.label}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.midColumn}>
                <TouchableOpacity
                  key={rightTop.id}
                  style={styles.midCard}
                  onPress={() => handleMenuPress(rightTop.screen)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.midIcon}>{rightTop.icon}</Text>
                  <Text style={styles.midLabel}>{rightTop.label}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  key={rightBottom.id}
                  style={styles.midCard}
                  onPress={() => handleMenuPress(rightBottom.screen)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.midIcon}>{rightBottom.icon}</Text>
                  <Text style={styles.midLabel}>{rightBottom.label}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.sideMenu}>
                <TouchableOpacity
                  key={settingsItem.id}
                  style={styles.sideMenuItem}
                  onPress={() => handleMenuPress(settingsItem.screen)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.sideMenuIcon}>{settingsItem.icon}</Text>
                  <Text style={styles.sideMenuLabel}>{settingsItem.label}</Text>
                </TouchableOpacity>

                {sideMenuItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.sideMenuItem}
                    onPress={() => handleMenuPress(item.screen)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.sideMenuIcon}>{item.icon}</Text>
                    <Text style={styles.sideMenuLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.expiryText}>Vencimento: 15/07/2026</Text>
              <Text style={styles.versionText}>v3.8</Text>
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
    paddingTop: 8,
    paddingBottom: 8,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  logoIcon: {
    fontSize: 44,
    marginBottom: 0,
    color: '#8b5cff',
  },
  logoText: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#8b5cff',
    letterSpacing: 1,
    textTransform: 'lowercase',
  },
  contentArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  layoutRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 18,
  },
  tvCard: {
    flex: 1.35,
    backgroundColor: '#170066',
    borderColor: '#0286ff',
    borderWidth: 2,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  tvIcon: {
    fontSize: 120,
    marginBottom: 18,
  },
  tvLabel: {
    color: '#ffffff',
    fontSize: 48,
    fontWeight: '600',
    textAlign: 'center',
  },
  midColumn: {
    flex: 1,
    gap: 18,
  },
  midCard: {
    flex: 1,
    backgroundColor: '#170066',
    borderColor: '#0286ff',
    borderWidth: 2,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  midIcon: {
    fontSize: 72,
    marginBottom: 8,
  },
  midLabel: {
    color: '#ffffff',
    fontSize: 40,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 44,
  },
  sideMenu: {
    width: 360,
    gap: 18,
  },
  sideMenuItem: {
    flex: 1,
    backgroundColor: '#12004f',
    borderColor: '#0286ff',
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 16,
  },
  sideMenuIcon: {
    fontSize: 54,
    color: '#ffffff',
    lineHeight: 70,
  },
  sideMenuLabel: {
    color: '#ffffff',
    fontSize: 42,
    lineHeight: 70,
    textAlign: 'left',
  },
  footer: {
    marginTop: 14,
    borderTopWidth: 2,
    borderTopColor: '#0286ff',
    height: 72,
    justifyContent: 'center',
    position: 'relative',
  },
  expiryText: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '700',
    textAlign: 'center',
  },
  versionText: {
    position: 'absolute',
    right: 2,
    top: 16,
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '500',
  },
});
