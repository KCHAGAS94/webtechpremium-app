import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LiveTvScreen } from '@/components/live-tv-screen';

const { width } = Dimensions.get('window');
const SIDE_MENU_WIDTH = 120;

type ScreenKey = 'home' | 'live' | 'movies' | 'series';

export default function HomeScreen() {
  const [showSideMenu, setShowSideMenu] = useState(true);
  const [view, setView] = useState<ScreenKey>('home');

  const menuItems = [
    {
      id: 'live',
      title: 'TV ao Vivo',
      icon: '📺',
      color: '#0066FF',
    },
    {
      id: 'movies',
      title: 'Filmes',
      icon: '▶️',
      color: '#6644FF',
    },
    {
      id: 'series',
      title: 'Séries',
      icon: '🎬',
      color: '#FF6B9D',
    },
    {
      id: 'account',
      title: 'Conta',
      icon: '👤',
      color: '#9D44FF',
    },
    {
      id: 'playlist',
      title: 'mudar lista de\nreprodução',
      icon: '👥',
      color: '#00D9FF',
    },
  ];

  const rightMenuItems = [
    { id: 'settings', title: 'Configurações', icon: '⚙️' },
    { id: 'reload', title: 'recarregar', icon: '🔄' },
    { id: 'logout', title: 'saída', icon: '🚪' },
  ];

  if (view === 'live') {
    return <LiveTvScreen onNavigate={(key) => setView(key)} />;
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title" style={styles.logo}>
            WebTech
          </ThemedText>
          <TouchableOpacity
            onPress={() => setShowSideMenu(!showSideMenu)}
            style={styles.menuButton}
          >
            <ThemedText style={styles.menuButtonText}>☰</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <View style={styles.contentWrapper}>
          {/* Left Menu */}
          {showSideMenu && (
            <View style={styles.leftMenu}>
              <ScrollView contentContainerStyle={styles.menuContent}>
                {menuItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.menuItemContainer}
                    onPress={() => item.id === 'live' && setView('live')}
                  >
                    <View
                      style={[
                        styles.menuItem,
                        { backgroundColor: item.color },
                      ]}
                    >
                      <ThemedText style={styles.menuIcon}>{item.icon}</ThemedText>
                      <ThemedText style={styles.menuTitle}>{item.title}</ThemedText>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Center Content */}
          <View style={styles.centerContent}>
            <View style={styles.featuredBox}>
              <View style={styles.logoPlaceholder} />
              <ThemedText style={styles.featuredText}>WebTech Premium</ThemedText>
            </View>

            {/* Grid de Conteúdo */}
            <View style={styles.gridContainer}>
              <View style={styles.gridRow}>
                <TouchableOpacity style={styles.gridItem} onPress={() => setView('live')}>
                  <View style={styles.gridBox}>
                    <ThemedText style={styles.gridIcon}>📺</ThemedText>
                    <ThemedText style={styles.gridTitle}>TV ao Vivo</ThemedText>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.gridItem}>
                  <View style={styles.gridBox}>
                    <ThemedText style={styles.gridIcon}>▶️</ThemedText>
                    <ThemedText style={styles.gridTitle}>Filmes</ThemedText>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.gridRow}>
                <TouchableOpacity style={styles.gridItem}>
                  <View style={styles.gridBox}>
                    <ThemedText style={styles.gridIcon}>🎬</ThemedText>
                    <ThemedText style={styles.gridTitle}>Séries</ThemedText>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.gridItem}>
                  <View style={styles.gridBox}>
                    <ThemedText style={styles.gridIcon}>👤</ThemedText>
                    <ThemedText style={styles.gridTitle}>Conta</ThemedText>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.gridRow}>
                <TouchableOpacity style={[styles.gridItem, styles.fullWidth]}>
                  <View style={styles.gridBox}>
                    <ThemedText style={styles.gridIcon}>👥</ThemedText>
                    <ThemedText style={styles.gridTitle}>mudar lista de reprodução</ThemedText>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Right Menu */}
          <View style={styles.rightMenu}>
            {rightMenuItems.map((item) => (
              <TouchableOpacity key={item.id} style={styles.rightMenuItem}>
                <ThemedText style={styles.rightMenuIcon}>{item.icon}</ThemedText>
                <ThemedText style={styles.rightMenuTitle}>{item.title}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>Vencimento: 15/07/2026</ThemedText>
          <ThemedText style={styles.versionText}>v3.8</ThemedText>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a3a',
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  menuButton: {
    padding: 8,
  },
  menuButtonText: {
    fontSize: 24,
    color: '#fff',
  },
  contentWrapper: {
    flex: 1,
    flexDirection: 'row',
  },
  leftMenu: {
    width: SIDE_MENU_WIDTH,
    backgroundColor: '#0a0a1a',
    borderRightWidth: 1,
    borderRightColor: '#1a1a3a',
    paddingVertical: 8,
  },
  menuContent: {
    gap: 8,
    paddingHorizontal: 8,
  },
  menuItemContainer: {
    width: '100%',
  },
  menuItem: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  menuIcon: {
    fontSize: 24,
  },
  menuTitle: {
    fontSize: 10,
    textAlign: 'center',
    color: '#fff',
    fontWeight: '600',
  },
  centerContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  featuredBox: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: '#1a1a3a',
    borderRadius: 16,
    marginBottom: 12,
  },
  featuredText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  gridContainer: {
    gap: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gridItem: {
    flex: 1,
  },
  fullWidth: {
    flex: 1,
  },
  gridBox: {
    backgroundColor: '#1a1a3a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    gap: 8,
  },
  gridIcon: {
    fontSize: 32,
  },
  gridTitle: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  rightMenu: {
    width: 90,
    backgroundColor: '#0a0a1a',
    borderLeftWidth: 1,
    borderLeftColor: '#1a1a3a',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 12,
  },
  rightMenuItem: {
    alignItems: 'center',
    padding: 8,
    gap: 4,
  },
  rightMenuIcon: {
    fontSize: 24,
  },
  rightMenuTitle: {
    fontSize: 10,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1a1a3a',
  },
  footerText: {
    fontSize: 14,
    color: '#fff',
  },
  versionText: {
    fontSize: 12,
    color: '#666',
  },
});
