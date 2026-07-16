import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

// Front-end only for now — each card just reports its id through onSelectItem.
// The actual behavior behind each one (layout change, hiding categories,
// clearing history, etc.) gets wired in one at a time later.
export type SettingsItemId =
  | 'parental-control'
  | 'change-language'
  | 'hide-live-categories'
  | 'hide-vod-categories'
  | 'hide-series-categories'
  | 'clear-movie-history'
  | 'clear-live-history'
  | 'clear-series-history'
  | 'subtitle-settings'
  | 'update-now';

type SettingsItem = {
  id: SettingsItemId;
  icon: string;
  label: string;
  subtitle?: string;
};

const settingsItems: SettingsItem[] = [
  { id: 'parental-control', icon: '🔒', label: 'Controle dos Pais' },
  { id: 'change-language', icon: '🌐', label: 'mudar idioma' },
  { id: 'subtitle-settings', icon: '💬', label: 'Configurações de legenda' },
  { id: 'hide-live-categories', icon: '🚫', label: 'Ocultar Categorias ao Vivo' },
  { id: 'hide-vod-categories', icon: '🚫', label: 'Ocultar Categorias Vod' },
  { id: 'hide-series-categories', icon: '🚫', label: 'Ocultar Categorias Series' },
  {
    id: 'clear-movie-history',
    icon: '🗑️',
    label: 'Limpar histórico de filmes',
  },
  {
    id: 'clear-live-history',
    icon: '🗑️',
    label: 'Limpar histórico Tv ao vivo',
  },
  {
    id: 'clear-series-history',
    icon: '🗑️',
    label: 'Limpar histórico Series',
  },
  { id: 'update-now',
    icon: '⬇️',
    label: 'atualize agora' },
];

type Props = {
  onBack: () => void;
  onSelectItem?: (id: SettingsItemId) => void;
};

export function SettingsScreen({ onBack, onSelectItem }: Props) {
  const [parentalModalVisible, setParentalModalVisible] = useState(false);
  const [senha, setSenha] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  const closeParentalModal = () => {
    setParentalModalVisible(false);
    setSenha('');
    setNovaSenha('');
    setConfirmarSenha('');
  };

  const handleSelectItem = (id: SettingsItemId) => {
    if (id === 'parental-control') {
      setParentalModalVisible(true);
      return;
    }
    onSelectItem?.(id);
  };

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
              onPress={() => handleSelectItem(item.id)}
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

      <Modal
        visible={parentalModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeParentalModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text allowFontScaling={false} style={styles.modalTitle}>Controle dos Pais</Text>

            <Text allowFontScaling={false} style={styles.modalLabel}>Senha</Text>
            <TextInput
              style={styles.modalInput}
              value={senha}
              onChangeText={setSenha}
              secureTextEntry
              placeholderTextColor="#c7c7e6"
            />

            <Text allowFontScaling={false} style={styles.modalLabel}>Nova Senha</Text>
            <TextInput
              style={styles.modalInput}
              value={novaSenha}
              onChangeText={setNovaSenha}
              secureTextEntry
              placeholderTextColor="#c7c7e6"
            />

            <Text allowFontScaling={false} style={styles.modalLabel}>Confirme a Senha</Text>
            <TextInput
              style={styles.modalInput}
              value={confirmarSenha}
              onChangeText={setConfirmarSenha}
              secureTextEntry
              placeholderTextColor="#c7c7e6"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={closeParentalModal}
                activeOpacity={0.75}
              >
                <Text allowFontScaling={false} style={styles.modalButtonText}>SIM</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={closeParentalModal}
                activeOpacity={0.75}
              >
                <Text allowFontScaling={false} style={styles.modalButtonText}>CANCELAR</Text>
              </TouchableOpacity>
            </View>
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
    paddingHorizontal: 70,
    paddingBottom: 15,
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
    width: '23%',
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171ba0',
    borderRadius: 6,
    paddingHorizontal: 8,
    gap: 6,
  },
  cardIcon: {
    fontSize: 12,
    color: '#ffffff',
    width: 15,
    textAlign: 'center',
  },
  cardTextWrap: {
    flex: 1,
  },
  cardLabel: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '500',
  },
  cardSubtitle: {
    color: '#9fa3d1',
    fontSize: 8,
    marginTop: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#12004f',
    borderColor: '#1aa2ff',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    width: 280,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  modalLabel: {
    color: '#ffffff',
    fontSize: 12,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#170066',
    borderColor: '#1aa2ff',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: '#ffffff',
    marginBottom: 10,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
  },
  modalButton: {
    backgroundColor: '#170066',
    borderColor: '#1aa2ff',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
