import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';

type BootLoadingScreenProps = {
  text?: string;
  /** 0-1. Omitted (or undefined) falls back to the indeterminate spinner —
   * used whenever there's no byte-level progress to report yet (e.g. still
   * waiting on the download to start). */
  progress?: number;
};

// Cycled above the logo while the boot fetch/parse (or a fresh playlist
// download) is running — same idea as series-screen.tsx's loading modal:
// gives the user something to read instead of staring at a bare spinner
// long enough to start wondering if the app is frozen.
const TIPS = [
  '♡ Favorite os filmes e séries que mais assiste para encontrá-los mais rápido',
  '📺 Espelhe na TV tocando no ícone de cast dentro do player',
  '↻ Seu progresso é salvo automaticamente — continue de onde parou',
  '💬 Configure tamanho, cor e fundo da legenda em Configurações > Configurações de legenda',
];
const TIP_INTERVAL_MS = 3000;

/**
 * Shown for the brief window between app mount and the boot effect in
 * App.tsx resolving (checking cached channels/playlist, or — first run —
 * hitting the painel), and reused by activatePlaylist while it downloads +
 * parses a freshly activated playlist's full M3U — without it, that second
 * case let the user land on a Home that looked ready but wasn't (channels
 * still loading in the background), so taps went unanswered and it read as
 * the app being frozen/buggy instead of just working.
 */
// The native download only fires onProgress a handful of times (sometimes
// just once near the end), so the raw `progress` prop can jump straight from
// 0% to 86% in a single update. Smoothing it into a steady +1%-per-tick climb
// here makes the bar always look like it's actively progressing.
const DISPLAY_STEP_INTERVAL_MS = 30;

export function BootLoadingScreen({ text = 'Carregando sua lista...', progress }: BootLoadingScreenProps) {
  const showBar = typeof progress === 'number' && Number.isFinite(progress);
  const targetPct = showBar ? Math.max(0, Math.min(1, progress as number)) : 0;
  const targetPercent = Math.round(targetPct * 100);

  const [displayPercent, setDisplayPercent] = useState(0);
  useEffect(() => {
    if (!showBar) {
      setDisplayPercent(0);
      return;
    }
    if (displayPercent >= targetPercent) return;
    const timer = setInterval(() => {
      setDisplayPercent((p) => Math.min(p + 1, targetPercent));
    }, DISPLAY_STEP_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [showBar, targetPercent, displayPercent]);

  const pct = displayPercent / 100;

  const [tipIndex, setTipIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTipIndex((i) => (i + 1) % TIPS.length);
    }, TIP_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <LinearGradient
      colors={['#04041a', '#0a0a2e', '#04041a']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.background}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <ThemedText style={styles.tip}>{TIPS[tipIndex]}</ThemedText>
          <Image
            source={require('@/assets/images/logo_quadrada_sem_fundo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          {showBar ? (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(pct * 100)}%` }]} />
            </View>
          ) : (
            <ActivityIndicator color="#4dd6ff" size="large" />
          )}
          <ThemedText style={styles.text}>
            {showBar ? `${text} ${Math.round(pct * 100)}%` : text}
          </ThemedText>
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
  logo: {
    width: 140,
    height: 140,
  },
  tip: {
    fontSize: 13,
    color: '#c7c7e6',
    textAlign: 'center',
    maxWidth: 320,
  },
  text: {
    fontSize: 14,
    color: '#c7c7e6',
  },
  progressTrack: {
    width: 220,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1a1a3d',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#4dd6ff',
  },
});
