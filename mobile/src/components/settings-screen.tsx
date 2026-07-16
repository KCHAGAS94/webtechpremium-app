import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

// Front-end only for now — each card just reports its id through onSelectItem.
// The actual behavior behind each one (layout change, hiding categories,
// clearing history, etc.) gets wired in one at a time later.
export type SettingsItemId =
  | 'add-playlist'
  | 'parental-control'
  | 'change-playlist'
  | 'change-language'
  | 'change-layout'
  | 'hide-live-categories'
  | 'hide-vod-categories'
  | 'hide-series-categories'
  | 'clear-movie-history'
  | 'live-stream-format'
  | 'external-player'
  | 'automatic'
  | 'time-format'
  | 'subtitle-settings'
  | 'select-device-type'
  | 'update-now';

type SettingsItem = {
  id: SettingsItemId;
  icon: string;
  label: string;
  subtitle?: string;
};

const settingsItems: SettingsItem[] = [
  { id: 'add-playlist', icon: '📋', label: 'adicionar lista de reprodução' },
  { id: 'parental-control', icon: '🔒', label: 'Controle dos Pais' },
  { id: 'change-playlist', icon: '📋', label: 'mudar lista de reprodução' },
  { id: 'change-language', icon: '🌐', label: 'mudar idioma' },
  { id: 'change-layout', icon: '▦', label: 'Alterar layout' },
  { id: 'hide-live-categories', icon: '🚫', label: 'Ocultar Categorias ao Vivo' },
  { id: 'hide-vod-categories', icon: '🚫', label: 'Ocultar Categorias Vod' },
  { id: 'hide-series-categories', icon: '🚫', label: 'Ocultar Categorias Series' },
  {
    id: 'clear-movie-history',
    icon: '🗑️',
    label: 'Limpar histórico de filmes',
    subtitle: 'Não há filmes vistos recentemente.',
  },
  { id: 'live-stream-format', icon: '📡', label: 'Live Stream Format' },
  { id: 'external-player', icon: '▶️', label: 'jogador externo' },
  { id: 'automatic', icon: '✨', label: 'automática' },
  { id: 'time-format', icon: '🕐', label: 'Formato da hora' },
  { id: 'subtitle-settings', icon: '💬', label: 'Configurações de legenda' },
  { id: 'select-device-type', icon: '🖥️', label: 'Select Device Type' },
  { id: 'update-now', icon: '⬇️', label: 'atualize agora' },
];

type Props = {
  onBack: () => void;
  onSelectItem?: (id: SettingsItemId) => void;
};

export function SettingsScreen({ onBack, onSelectItem }: Props) {
  return (
    <LinearGradient
      colors={['#050042', '#0d0569', '#050042']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientBackground}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} activeOpacity={0.75} style={styles.backButton}>
            <Text allowFontScaling={false} style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text allowFontScaling={false} style={styles.title}>Configurações</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.grid}>
          {settingsItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => onSelectItem?.(item.id)}
              activeOpacity={0.75}
            >
              <Text allowFontScaling={false} style={styles.cardIcon}>{item.icon}</Text>
              <View style={styles.cardTextWrap}>
                <Text allowFontScaling={false} style={styles.cardLabel} numberOfLines={1}>
                  {item.label}
                </Text>
                {!!item.subtitle && (
                  <Text allowFontScaling={false} style={styles.cardSubtitle} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
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
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    width: 28,
    alignItems: 'flex-start',
  },
  backIcon: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '300',
  },
  title: {
    flex: 1,
    color: '#e6e6f5',
    fontSize: 18,
    fontWeight: '400',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    gap: 8,
  },
  card: {
    width: '23.5%',
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171ba0',
    borderRadius: 8,
    paddingHorizontal: 10,
    gap: 8,
  },
  cardIcon: {
    fontSize: 14,
    color: '#ffffff',
    width: 18,
    textAlign: 'center',
  },
  cardTextWrap: {
    flex: 1,
  },
  cardLabel: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '500',
  },
  cardSubtitle: {
    color: '#9fa3d1',
    fontSize: 9,
    marginTop: 1,
  },
});
