import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HideCategoriesModal } from '@/components/hide-categories-modal';
import { LanguageModal } from '@/components/language-modal';
import { OnScreenKeyboard } from '@/components/on-screen-keyboard';
import { PasswordPromptModal } from '@/components/password-prompt-modal';
import { WatchHistoryModal, type WatchHistoryRow } from '@/components/watch-history-modal';
import { useBackStackEntry } from '@/utils/back-stack';
import { useTranslation } from '@/i18n/language-context';
import type { TranslationKey } from '@/i18n/translations';
import type { ContentCategory } from '@/utils/content-classifier';
import { loadHiddenGroups, saveHiddenGroups } from '@/utils/hidden-groups-storage';
import { clearParentalPassword, loadParentalPassword, saveParentalPassword } from '@/utils/parental-control-storage';
import {
  clearLiveWatchHistory,
  loadLiveWatchHistory,
  removeLiveWatchHistoryEntries,
} from '@/utils/live-watch-history-storage';
import type { M3uChannel } from '@/utils/m3u-parser';
import { groupSeriesShows } from '@/utils/series-grouping';
import type { SeriesMeta } from '@/utils/xtream-api';
import { loadSubtitleSettings, saveSubtitleSettings } from '@/utils/subtitle-settings-storage';
import { clearWatchHistoryByKind, loadWatchHistory, removeWatchHistoryEntries } from '@/utils/watch-history-storage';

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
  | 'backup-now';

type SettingsItem = {
  id: SettingsItemId;
  icon: string;
  label: TranslationKey;
  subtitle?: string;
};

const settingsItems: SettingsItem[] = [
  { id: 'parental-control', icon: '🔒', label: 'settings_parental_control' },
  { id: 'change-language', icon: '🌐', label: 'settings_change_language' },
  { id: 'subtitle-settings', icon: '💬', label: 'settings_subtitles' },
  { id: 'hide-live-categories', icon: '🚫', label: 'settings_hide_live' },
  { id: 'hide-vod-categories', icon: '🚫', label: 'settings_hide_vod' },
  { id: 'hide-series-categories', icon: '🚫', label: 'settings_hide_series' },
  { id: 'clear-movie-history', icon: '🗑️', label: 'settings_clear_movie_history' },
  { id: 'clear-live-history', icon: '🗑️', label: 'settings_clear_live_history' },
  { id: 'clear-series-history', icon: '🗑️', label: 'settings_clear_series_history' },
  { id: 'backup-now', icon: '⬇️', label: 'settings_backup' },
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
  /** Full playlist — used to list each section's folders in "Ocultar Categorias". */
  channels?: M3uChannel[];
  /** Genre lookup by show name (see playlist-loader.ts) — series folders are only
   * derived from this at grouping time, not baked into `channel.groupTitle`
   * like movies/live are, so listing series categories needs the same
   * grouping series-screen.tsx uses instead of the raw M3U group-title. */
  seriesMetaByShowName?: Map<string, SeriesMeta>;
};

const HIDE_CATEGORIES_ITEM_TO_CONTENT: Partial<Record<SettingsItemId, ContentCategory>> = {
  'hide-live-categories': 'live',
  'hide-vod-categories': 'movies',
  'hide-series-categories': 'series',
};

const HISTORY_ITEM_TO_KIND: Partial<Record<SettingsItemId, 'live' | 'movie' | 'episode'>> = {
  'clear-live-history': 'live',
  'clear-movie-history': 'movie',
  'clear-series-history': 'episode',
};

const HISTORY_MODAL_TITLES: Record<'live' | 'movie' | 'episode', string> = {
  live: 'Histórico Tv ao vivo',
  movie: 'Histórico de filmes',
  episode: 'Histórico de séries',
};

function formatHistoryDate(timestampMs: number): string {
  const date = new Date(timestampMs);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month} ${hours}:${minutes}`;
}

// Highlights whichever card currently has TV-remote (D-pad) focus. Without
// this, navigating the grid with a remote gives no visual clue which card
// is selected — see App.tsx's FocusableCard for the same pattern on Home.
function SettingsCard({ onPress, children }: { onPress: () => void; children: React.ReactNode }) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      style={[styles.card, focused && styles.cardFocused]}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
    >
      {children}
    </Pressable>
  );
}

function FocusableBackButton({ onPress }: { onPress: () => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      style={[styles.backButton, focused && styles.backButtonFocused]}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
    >
      <Text allowFontScaling={false} style={styles.backIcon}>‹</Text>
    </Pressable>
  );
}

export function SettingsScreen({ onBack, onSelectItem, channels = [], seriesMetaByShowName }: Props) {
  const { t } = useTranslation();
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [parentalModalVisible, setParentalModalVisible] = useState(false);
  const [senha, setSenha] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [parentalError, setParentalError] = useState('');
  const [parentalKeyboardField, setParentalKeyboardField] = useState<
    'senha' | 'novaSenha' | 'confirmarSenha' | null
  >(null);
  const [parentalKeyboardCursor, setParentalKeyboardCursor] = useState(0);

  // Once a password is registered, "Ocultar Categorias" and "Limpar
  // Históricos" require it. No password set means everyone keeps normal
  // access, same as before this feature existed.
  const [parentalPassword, setParentalPassword] = useState<string | null>(null);
  const [passwordPromptVisible, setPasswordPromptVisible] = useState(false);
  const pendingProtectedAction = React.useRef<(() => void) | null>(null);

  useEffect(() => {
    loadParentalPassword().then(setParentalPassword);
  }, []);

  const runProtected = (action: () => void) => {
    if (!parentalPassword) {
      action();
      return;
    }
    pendingProtectedAction.current = action;
    setPasswordPromptVisible(true);
  };

  const handlePasswordConfirm = (password: string): boolean => {
    if (password !== parentalPassword) return false;
    setPasswordPromptVisible(false);
    const action = pendingProtectedAction.current;
    pendingProtectedAction.current = null;
    action?.();
    return true;
  };

  const cancelPasswordPrompt = () => {
    pendingProtectedAction.current = null;
    setPasswordPromptVisible(false);
  };

  const [hideCategoriesTarget, setHideCategoriesTarget] = useState<ContentCategory | null>(null);
  const [hideCategoriesOptions, setHideCategoriesOptions] = useState<{ id: string; title: string }[]>([]);
  const [hideCategoriesInitial, setHideCategoriesInitial] = useState<Set<string>>(new Set());

  const [historyModalKind, setHistoryModalKind] = useState<'live' | 'movie' | 'episode' | null>(null);
  const [historyRows, setHistoryRows] = useState<WatchHistoryRow[]>([]);

  // Live/movies get their real category baked into `channel.groupTitle`
  // directly at playlist-load time (see playlist-loader.ts), so the raw
  // group-title is accurate for them — only series needs groupSeriesShows.
  const groupTitlesByCategory = useMemo(() => {
    const byCategory = new Map<ContentCategory, Set<string>>();
    for (const channel of channels) {
      const category = channel.category as ContentCategory;
      if (category === 'series') continue;
      let titles = byCategory.get(category);
      if (!titles) {
        titles = new Set();
        byCategory.set(category, titles);
      }
      titles.add(channel.groupTitle);
    }
    return byCategory;
  }, [channels]);

  const [subtitleModalVisible, setSubtitleModalVisible] = useState(false);
  const [legendasHabilitadas, setLegendasHabilitadas] = useState(false);
  const [tamanhoLegenda, setTamanhoLegenda] = useState(12);
  const [corLegenda, setCorLegenda] = useState('#ffffff');
  const [fundoLegenda, setFundoLegenda] = useState('#000000');
  const [fundoLegendaHabilitado, setFundoLegendaHabilitado] = useState(true);
  const [colorModalVisible, setColorModalVisible] = useState(false);
  const [colorModalTarget, setColorModalTarget] = useState<'texto' | 'fundo'>('texto');

  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    loadSubtitleSettings().then((settings) => {
      setLegendasHabilitadas(settings.enabled);
      setTamanhoLegenda(settings.fontSize);
      setCorLegenda(settings.textColor);
      setFundoLegendaHabilitado(settings.backgroundEnabled);
      setFundoLegenda(settings.backgroundColor);
      setSettingsLoaded(true);
    });
  }, []);

  // Only persists once the initial load above has run, so this doesn't
  // clobber saved settings with the useState defaults on first render.
  useEffect(() => {
    if (!settingsLoaded) return;
    saveSubtitleSettings({
      enabled: legendasHabilitadas,
      fontSize: tamanhoLegenda,
      textColor: corLegenda,
      backgroundEnabled: fundoLegendaHabilitado,
      backgroundColor: fundoLegenda,
    });
  }, [settingsLoaded, legendasHabilitadas, tamanhoLegenda, corLegenda, fundoLegendaHabilitado, fundoLegenda]);

  const closeParentalModal = () => {
    setParentalModalVisible(false);
    setSenha('');
    setNovaSenha('');
    setConfirmarSenha('');
    setParentalError('');
    setParentalKeyboardField(null);
  };

  const parentalFieldValue = (field: 'senha' | 'novaSenha' | 'confirmarSenha') =>
    field === 'senha' ? senha : field === 'novaSenha' ? novaSenha : confirmarSenha;

  const setParentalFieldValue = (field: 'senha' | 'novaSenha' | 'confirmarSenha', value: string) => {
    if (field === 'senha') setSenha(value);
    else if (field === 'novaSenha') setNovaSenha(value);
    else setConfirmarSenha(value);
  };

  const openParentalKeyboard = (field: 'senha' | 'novaSenha' | 'confirmarSenha') => {
    setParentalKeyboardCursor(parentalFieldValue(field).length);
    setParentalKeyboardField(field);
  };

  const handleSaveParentalPassword = () => {
    if (!novaSenha || novaSenha !== confirmarSenha) {
      setParentalError('Nova senha e confirmação não conferem');
      return;
    }
    saveParentalPassword(novaSenha);
    setParentalPassword(novaSenha);
    closeParentalModal();
  };

  const handleRemoveParentalPassword = () => {
    if (senha !== parentalPassword) {
      setParentalError('Senha incorreta');
      return;
    }
    clearParentalPassword();
    setParentalPassword(null);
    closeParentalModal();
  };

  const handleSelectItem = (id: SettingsItemId) => {
    if (id === 'parental-control') {
      setParentalModalVisible(true);
      return;
    }
    if (id === 'change-language') {
      setLanguageModalVisible(true);
      return;
    }
    if (id === 'subtitle-settings') {
      setSubtitleModalVisible(true);
      return;
    }
    const hideCategory = HIDE_CATEGORIES_ITEM_TO_CONTENT[id];
    if (hideCategory) {
      // Load the saved hidden set BEFORE opening the modal — opening it first
      // and patching `hideCategoriesInitial` in once the promise resolves is
      // too late, since the modal only re-syncs its checkboxes from that prop
      // on the moment it transitions to visible.
      const titlesPromise: Promise<string[]> =
        hideCategory === 'series'
          ? groupSeriesShows(
              channels.filter((c) => c.category === 'series'),
              undefined,
              seriesMetaByShowName
            ).then((shows) => {
              // Same first-appearance order series-screen.tsx's own
              // showsByGroup ends up with — not alphabetical.
              const seen = new Set<string>();
              const titles: string[] = [];
              for (const show of shows) {
                if (seen.has(show.groupTitle)) continue;
                seen.add(show.groupTitle);
                titles.push(show.groupTitle);
              }
              return titles;
            })
          : Promise.resolve(Array.from(groupTitlesByCategory.get(hideCategory) ?? []));

      runProtected(() => {
        titlesPromise.then((titles) => {
          setHideCategoriesOptions(titles.map((title) => ({ id: title, title })));
          loadHiddenGroups(hideCategory).then((hidden) => {
            setHideCategoriesInitial(hidden);
            setHideCategoriesTarget(hideCategory);
          });
        });
      });
      return;
    }
    const historyKind = HISTORY_ITEM_TO_KIND[id];
    if (historyKind) {
      runProtected(() => {
        if (historyKind === 'live') {
          loadLiveWatchHistory().then((entries) => {
            setHistoryRows(
              entries.map((e) => ({ id: e.id, title: e.channelName, subtitle: formatHistoryDate(e.watchedAt) }))
            );
            setHistoryModalKind('live');
          });
        } else {
          loadWatchHistory().then((entries) => {
            setHistoryRows(
              entries
                .filter((e) => e.kind === historyKind)
                .map((e) => ({ id: e.key, title: e.title, subtitle: formatHistoryDate(e.updatedAt) }))
            );
            setHistoryModalKind(historyKind);
          });
        }
      });
      return;
    }
    onSelectItem?.(id);
  };

  const closeHideCategoriesModal = () => setHideCategoriesTarget(null);

  const handleSaveHideCategories = (hidden: Set<string>) => {
    if (!hideCategoriesTarget) return;
    saveHiddenGroups(hideCategoriesTarget, hidden);
    setHideCategoriesTarget(null);
  };

  const closeHistoryModal = () => setHistoryModalKind(null);

  // Each modal (and the keyboard nested inside the parental-control modal)
  // registers itself on the shared back-stack while visible, so remote
  // "voltar" closes exactly the topmost one first — retracing the same path
  // that was used to open it — instead of jumping straight back to Casa.
  useBackStackEntry(languageModalVisible, () => setLanguageModalVisible(false));
  useBackStackEntry(parentalModalVisible, closeParentalModal);
  useBackStackEntry(!!parentalKeyboardField, () => setParentalKeyboardField(null));
  useBackStackEntry(passwordPromptVisible, cancelPasswordPrompt);
  useBackStackEntry(hideCategoriesTarget !== null, closeHideCategoriesModal);
  useBackStackEntry(historyModalKind !== null, closeHistoryModal);
  useBackStackEntry(subtitleModalVisible, () => setSubtitleModalVisible(false));
  useBackStackEntry(colorModalVisible, () => setColorModalVisible(false));

  const handleClearAllHistory = () => {
    if (!historyModalKind) return;
    if (historyModalKind === 'live') clearLiveWatchHistory();
    else clearWatchHistoryByKind(historyModalKind);
    setHistoryRows([]);
  };

  const handleClearSelectedHistory = (ids: string[]) => {
    if (!historyModalKind) return;
    if (historyModalKind === 'live') removeLiveWatchHistoryEntries(ids);
    else removeWatchHistoryEntries(ids);
    const idSet = new Set(ids);
    setHistoryRows((prev) => prev.filter((row) => !idSet.has(row.id)));
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
          <FocusableBackButton onPress={onBack} />
          <Text allowFontScaling={false} style={styles.title}>{t('settings_title')}</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.grid}>
          {settingsItems.map((item) => (
            <SettingsCard key={item.id} onPress={() => handleSelectItem(item.id)}>
              <Text allowFontScaling={false} style={styles.cardIcon}>{item.icon}</Text>
              <View style={styles.cardTextWrap}>
                <Text allowFontScaling={false} style={styles.cardLabel} numberOfLines={1}>
                  {t(item.label)}
                </Text>
                {!!item.subtitle && (
                  <Text allowFontScaling={false} style={styles.cardSubtitle} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                )}
              </View>
            </SettingsCard>
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

            {parentalPassword ? (
              <>
                <Text allowFontScaling={false} style={styles.modalLabel}>Digite a senha para remover</Text>
                <TouchableOpacity
                  style={styles.modalInput}
                  onPress={() => openParentalKeyboard('senha')}
                  activeOpacity={0.75}
                >
                  <Text allowFontScaling={false} style={styles.modalInputText}>
                    {'•'.repeat(senha.length) || ' '}
                  </Text>
                </TouchableOpacity>

                {!!parentalError && (
                  <Text allowFontScaling={false} style={styles.modalErrorText}>{parentalError}</Text>
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={handleRemoveParentalPassword}
                    activeOpacity={0.75}
                  >
                    <Text allowFontScaling={false} style={styles.modalButtonText}>REMOVER</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={closeParentalModal}
                    activeOpacity={0.75}
                  >
                    <Text allowFontScaling={false} style={styles.modalButtonText}>CANCELAR</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text allowFontScaling={false} style={styles.modalLabel}>Nova Senha</Text>
                <TouchableOpacity
                  style={styles.modalInput}
                  onPress={() => openParentalKeyboard('novaSenha')}
                  activeOpacity={0.75}
                >
                  <Text allowFontScaling={false} style={styles.modalInputText}>
                    {'•'.repeat(novaSenha.length) || ' '}
                  </Text>
                </TouchableOpacity>

                <Text allowFontScaling={false} style={styles.modalLabel}>Confirme a Senha</Text>
                <TouchableOpacity
                  style={styles.modalInput}
                  onPress={() => openParentalKeyboard('confirmarSenha')}
                  activeOpacity={0.75}
                >
                  <Text allowFontScaling={false} style={styles.modalInputText}>
                    {'•'.repeat(confirmarSenha.length) || ' '}
                  </Text>
                </TouchableOpacity>

                {!!parentalError && (
                  <Text allowFontScaling={false} style={styles.modalErrorText}>{parentalError}</Text>
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={handleSaveParentalPassword}
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
              </>
            )}
          </View>
        </View>
      </Modal>

      {parentalModalVisible && parentalKeyboardField && (
        <OnScreenKeyboard
          value={parentalFieldValue(parentalKeyboardField)}
          cursor={parentalKeyboardCursor}
          onChangeText={(text) => setParentalFieldValue(parentalKeyboardField, text)}
          onCursorChange={setParentalKeyboardCursor}
          onClose={() => setParentalKeyboardField(null)}
        />
      )}

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

      <HideCategoriesModal
        visible={hideCategoriesTarget !== null}
        categories={hideCategoriesOptions}
        initiallyHidden={hideCategoriesInitial}
        onSave={handleSaveHideCategories}
        onCancel={closeHideCategoriesModal}
      />

      <WatchHistoryModal
        visible={historyModalKind !== null}
        title={historyModalKind ? HISTORY_MODAL_TITLES[historyModalKind] : ''}
        entries={historyRows}
        onClearAll={handleClearAllHistory}
        onClearSelected={handleClearSelectedHistory}
        onClose={closeHistoryModal}
      />

      <LanguageModal visible={languageModalVisible} onClose={() => setLanguageModalVisible(false)} />

      <PasswordPromptModal
        visible={passwordPromptVisible}
        onConfirm={handlePasswordConfirm}
        onCancel={cancelPasswordPrompt}
      />
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
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  backButtonFocused: {
    borderColor: '#3ddc84',
    backgroundColor: '#1f24c2',
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
    borderWidth: 2,
    borderColor: 'transparent',
    paddingHorizontal: 8,
    gap: 6,
  },
  cardFocused: {
    borderColor: '#3ddc84',
    backgroundColor: '#1f24c2',
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
    paddingVertical: 8,
    marginBottom: 10,
    minHeight: 30,
    justifyContent: 'center',
  },
  modalInputText: {
    color: '#ffffff',
    fontSize: 14,
    letterSpacing: 2,
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
  modalErrorText: {
    color: '#ff6b6b',
    fontSize: 11,
    marginTop: -4,
    marginBottom: 8,
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
