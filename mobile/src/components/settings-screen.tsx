import React, { useState } from 'react';
import { Modal, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

const subtitleColors = [
  '#ffffff',
  '#808080',
  '#000000',
  '#0000ff',
  '#29a3f0',
  '#33cc33',
  '#128c12',
  '#ffee33',
  '#999900',
  '#ff0000',
  '#8b0000',
  '#c94f4f',
  '#6b4a3a',
  '#c9a789',
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

  const [subtitleModalVisible, setSubtitleModalVisible] = useState(false);
  const [legendasHabilitadas, setLegendasHabilitadas] = useState(false);
  const [tamanhoLegenda, setTamanhoLegenda] = useState(12);
  const [corLegenda, setCorLegenda] = useState('#ffffff');
  const [fundoLegenda, setFundoLegenda] = useState('#000000');
  const [fundoLegendaHabilitado, setFundoLegendaHabilitado] = useState(true);
  const [colorModalVisible, setColorModalVisible] = useState(false);
  const [colorModalTarget, setColorModalTarget] = useState<'texto' | 'fundo'>('texto');

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
    if (id === 'subtitle-settings') {
      setSubtitleModalVisible(true);
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

      <Modal
        visible={subtitleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSubtitleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.subtitleModalBox}>
            <View style={styles.subtitleModalHeader}>
              <Text allowFontScaling={false} style={[styles.modalTitle, styles.subtitleModalHeaderTitle]}>
                Configurações de legenda
              </Text>
              <TouchableOpacity
                onPress={() => setSubtitleModalVisible(false)}
                activeOpacity={0.75}
                style={styles.subtitleModalCloseButton}
              >
                <Text allowFontScaling={false} style={styles.subtitleModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.subtitleRow}>
              <Text allowFontScaling={false} style={styles.subtitleRowIcon}>▤</Text>
              <Text allowFontScaling={false} style={styles.subtitleRowLabel}>habilitar legendas</Text>
              <Switch
                value={legendasHabilitadas}
                onValueChange={setLegendasHabilitadas}
                trackColor={{ false: '#3a3a4a', true: '#1aa2ff' }}
                thumbColor="#ffffff"
              />
            </View>

            <View style={styles.subtitleRow}>
              <Text allowFontScaling={false} style={styles.subtitleRowIcon}>Tt</Text>
              <Text allowFontScaling={false} style={styles.subtitleRowLabel}>tamanho da legenda</Text>
              <View style={styles.subtitleStepper}>
                <TouchableOpacity
                  style={styles.subtitleStepperButton}
                  onPress={() => setTamanhoLegenda((size) => Math.max(8, size - 1))}
                  activeOpacity={0.75}
                >
                  <Text allowFontScaling={false} style={styles.subtitleStepperButtonText}>−</Text>
                </TouchableOpacity>
                <View style={styles.subtitleStepperValue}>
                  <Text allowFontScaling={false} style={styles.subtitleStepperValueText}>
                    {tamanhoLegenda}pt
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.subtitleStepperButton}
                  onPress={() => setTamanhoLegenda((size) => Math.min(32, size + 1))}
                  activeOpacity={0.75}
                >
                  <Text allowFontScaling={false} style={styles.subtitleStepperButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.subtitleRow}
              onPress={() => {
                setColorModalTarget('texto');
                setColorModalVisible(true);
              }}
              activeOpacity={0.75}
            >
              <Text allowFontScaling={false} style={styles.subtitleRowIcon}>A</Text>
              <Text allowFontScaling={false} style={styles.subtitleRowLabel}>cor da legenda</Text>
              <View style={[styles.subtitleColorSwatch, { backgroundColor: corLegenda }]} />
            </TouchableOpacity>

            <View style={[styles.subtitleRow, styles.subtitleRowLast]}>
              <Text allowFontScaling={false} style={styles.subtitleRowIcon}>◒</Text>
              <Text allowFontScaling={false} style={styles.subtitleRowLabel}>fundo da legenda</Text>
              <Switch
                value={fundoLegendaHabilitado}
                onValueChange={setFundoLegendaHabilitado}
                trackColor={{ false: '#3a3a4a', true: '#1aa2ff' }}
                thumbColor="#ffffff"
              />
              <TouchableOpacity
                onPress={() => {
                  setColorModalTarget('fundo');
                  setColorModalVisible(true);
                }}
                disabled={!fundoLegendaHabilitado}
                activeOpacity={0.75}
                style={styles.subtitleSwitchSpacing}
              >
                <View
                  style={[
                    styles.subtitleColorSwatch,
                    { backgroundColor: fundoLegenda },
                    !fundoLegendaHabilitado && styles.subtitleColorSwatchDisabled,
                  ]}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={colorModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setColorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.colorModalBox}>
            <View style={styles.subtitleModalHeader}>
              <Text allowFontScaling={false} style={[styles.modalTitle, styles.subtitleModalHeaderTitle]}>
                {colorModalTarget === 'texto' ? 'Cor da legenda' : 'Fundo da legenda'}
              </Text>
              <TouchableOpacity
                onPress={() => setColorModalVisible(false)}
                activeOpacity={0.75}
                style={styles.subtitleModalCloseButton}
              >
                <Text allowFontScaling={false} style={styles.subtitleModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.colorModalBody}>
              <View style={styles.colorGrid}>
                {subtitleColors.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[styles.colorSwatchOption, { backgroundColor: color }]}
                    onPress={() => {
                      if (colorModalTarget === 'texto') {
                        setCorLegenda(color);
                      } else {
                        setFundoLegenda(color);
                      }
                      setColorModalVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    {color === (colorModalTarget === 'texto' ? corLegenda : fundoLegenda) && (
                      <Text allowFontScaling={false} style={styles.colorSwatchCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
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
  subtitleModalBox: {
    backgroundColor: '#12004f',
    borderColor: '#1aa2ff',
    borderWidth: 1,
    borderRadius: 10,
    width: 380,
    overflow: 'hidden',
  },
  subtitleModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#170066',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  subtitleModalHeaderTitle: {
    flex: 1,
    marginBottom: 0,
  },
  subtitleModalCloseButton: {
    marginLeft: 12,
  },
  subtitleModalCloseText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(26, 162, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  subtitleRowLast: {
    paddingBottom: 16,
  },
  subtitleRowIcon: {
    width: 24,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitleRowLabel: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
  },
  subtitleColorSwatch: {
    width: 26,
    height: 26,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  subtitleColorSwatchDisabled: {
    opacity: 0.3,
  },
  subtitleSwitchSpacing: {
    marginLeft: 12,
  },
  subtitleStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  subtitleStepperButton: {
    backgroundColor: '#170066',
    width: 28,
    height: 28,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitleStepperButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  subtitleStepperValue: {
    backgroundColor: '#170066',
    minWidth: 44,
    height: 28,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitleStepperValueText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  colorModalBox: {
    backgroundColor: '#12004f',
    borderColor: '#1aa2ff',
    borderWidth: 1,
    borderRadius: 10,
    width: 380,
    overflow: 'hidden',
  },
  colorModalBody: {
    padding: 16,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorSwatchOption: {
    width: 48,
    height: 48,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchCheck: {
    color: '#f4c542',
    fontSize: 18,
    fontWeight: '700',
  },
});
