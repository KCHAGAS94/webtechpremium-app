import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';

/**
 * Shown for the brief window between app mount and the boot effect in
 * App.tsx resolving (checking cached channels/playlist, or — first run —
 * hitting the painel). Without this, that gap rendered whatever screen
 * `currentScreen` defaulted to with empty data, which read as broken rather
 * than loading.
 */
export function BootLoadingScreen() {
  return (
    <LinearGradient
      colors={['#04041a', '#0a0a2e', '#04041a']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.background}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <ActivityIndicator color="#4dd6ff" size="large" />
          <ThemedText style={styles.text}>Carregando sua lista...</ThemedText>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 14,
  },
  text: {
    fontSize: 14,
    color: '#c7c7e6',
  },
});
