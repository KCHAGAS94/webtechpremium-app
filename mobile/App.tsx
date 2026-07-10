import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
} from 'react-native';

const { width, height } = Dimensions.get('window');

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
  { id: '5', label: 'Mudar lista\nreprodução', icon: '🔄', screen: 'playlist' },
  { id: '6', label: 'Configurações', icon: '⚙️', screen: 'settings' },
];

const sideMenuItems: MenuItem[] = [
  { id: '7', label: 'recarregar', icon: '🔄', screen: 'reload' },
  { id: '8', label: 'saída', icon: '🚪', screen: 'exit' },
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home');

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
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContent}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <Text style={styles.logoIcon}>🎬</Text>
          <Text style={styles.logoText}>WebTech</Text>
        </View>

        {/* Main Content Area */}
        <ScrollView style={styles.contentArea} showsVerticalScrollIndicator={false}>
          {/* Menu Grid */}
          <View style={styles.gridContainer}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => handleMenuPress(item.screen)}
                activeOpacity={0.7}
              >
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.expiryText}>Vencimento: 15/07/2026 | v3.8</Text>
          </View>
        </ScrollView>
      </View>

      {/* Side Menu */}
      <View style={styles.sideMenu}>
        {sideMenuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.sideMenuItem}
            onPress={() => handleMenuPress(item.screen)}
            activeOpacity={0.7}
          >
            <Text style={styles.sideMenuIcon}>{item.icon}</Text>
            <Text style={styles.sideMenuLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0033',
    flexDirection: 'row',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00ffff',
    letterSpacing: 2,
  },
  contentArea: {
    flex: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  menuItem: {
    width: '48%',
    backgroundColor: '#1a0066',
    borderColor: '#0066ff',
    borderWidth: 2,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  menuLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#0066ff',
    marginTop: 20,
  },
  expiryText: {
    color: '#00ffff',
    fontSize: 12,
    textAlign: 'center',
  },
  sideMenu: {
    width: 60,
    backgroundColor: '#0a0033',
    borderLeftWidth: 2,
    borderLeftColor: '#0066ff',
    paddingVertical: 20,
    alignItems: 'center',
  },
  sideMenuItem: {
    width: '100%',
    paddingVertical: 20,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#0066ff',
    paddingLeft: 8,
  },
  sideMenuIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  sideMenuLabel: {
    color: '#ffffff',
    fontSize: 8,
    textAlign: 'center',
    width: '100%',
  },
});
