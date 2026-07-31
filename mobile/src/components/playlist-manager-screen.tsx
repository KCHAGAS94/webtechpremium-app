import * as Clipboard from 'expo-clipboard';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OnScreenKeyboard } from '@/components/on-screen-keyboard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { LocalPlaylistInput } from '@/utils/local-playlists';
import type { PanelPlaylist } from '@/utils/panel-api';

type Props = {
  playlists: PanelPlaylist[];
  activePlaylistId: number | null;
  localPlaylistIds: Set<number>;
  macAddress: string;
  onSelect: (playlist: PanelPlaylist) => Promise<void> | void;
  onAddServer: (input: LocalPlaylistInput) => Promise<void> | void;
  onRemoveServer: (playlist: PanelPlaylist) => Promise<void> | void;
  onClose: () => void;
};

function HeaderButton({
  label,
  emphasized,
  onPress,
}: {
  label: string;
  emphasized?: boolean;
  onPress: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      style={[
        styles.headerButtonBox,
        emphasized && styles.headerButtonBoxEmphasized,
        focused && styles.headerButtonBoxFocused,
      ]}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
    >
      <ThemedText style={[styles.headerButtonText, emphasized && styles.headerButtonTextEmphasized]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function ServerCard({
  isActive,
  disabled,
  autoFocus,
  onPress,
  children,
}: {
  isActive: boolean;
  disabled: boolean;
  autoFocus?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const [focused, setFocused] = useState(!!autoFocus);
  return (
    <Pressable
      style={[styles.item, isActive && styles.itemActive, focused && styles.itemFocused]}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      disabled={disabled}
      hasTVPreferredFocus={autoFocus}
    >
      {children}
    </Pressable>
  );
}

// One field of the "add server" form: a focusable box that opens the shared
// on-screen QWERTY grid (see on-screen-keyboard.tsx) instead of the system
// keyboard, same pattern used by the search boxes — needed because this app
// runs on Android TV remotes as much as touch devices.
function PasteButton({ onPaste }: { onPaste: () => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      style={[styles.pasteButton, focused && styles.pasteButtonFocused]}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPaste}
    >
      <ThemedText style={styles.pasteButtonText}>Colar</ThemedText>
    </Pressable>
  );
}

function FormField({
  label,
  value,
  secure,
  pasteable,
  tall,
  onChangeText,
}: {
  label: string;
  value: string;
  secure?: boolean;
  pasteable?: boolean;
  tall?: boolean;
  onChangeText: (value: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [cursor, setCursor] = useState(value.length);

  const displayValue = secure && value && !keyboardOpen ? '•'.repeat(value.length) : value;

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (!text) return;
    onChangeText(text);
    setCursor(text.length);
  };

  return (
    <View style={styles.fieldWrap}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <View style={styles.fieldRow}>
        <Pressable
          style={[
            styles.fieldBox,
            styles.fieldBoxFlex,
            tall && styles.fieldBoxTall,
            focused && styles.fieldBoxFocused,
          ]}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onPress={() => {
            setCursor(value.length);
            setKeyboardOpen(true);
          }}
        >
          <TextInput
            value={keyboardOpen ? `${value.slice(0, cursor)}|${value.slice(cursor)}` : displayValue}
            onChangeText={onChangeText}
            placeholder={label}
            placeholderTextColor="#6a6a99"
            style={[styles.fieldInput, tall && styles.fieldInputTall]}
            multiline={tall}
            showSoftInputOnFocus={false}
            caretHidden
            editable={false}
            pointerEvents="none"
          />
        </Pressable>
        {pasteable && <PasteButton onPaste={handlePaste} />}
      </View>

      {keyboardOpen && (
        <OnScreenKeyboard
          value={value}
          cursor={cursor}
          onChangeText={onChangeText}
          onCursorChange={setCursor}
          onClose={() => setKeyboardOpen(false)}
        />
      )}
    </View>
  );
}

function AddServerForm({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (input: LocalPlaylistInput) => Promise<void> | void;
}) {
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canSave = url.trim().length > 0;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setError('');
    try {
      await onSave({ url });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao adicionar servidor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.formPanel}>
      <ScrollView contentContainerStyle={styles.formFields} showsVerticalScrollIndicator={false}>
        <ThemedText style={styles.formTitle}>Adicionar servidor</ThemedText>
        <FormField label="Link M3U completo" value={url} pasteable tall onChangeText={setUrl} />

        {!!error && <ThemedText style={styles.formError}>{error}</ThemedText>}
      </ScrollView>

      <View style={styles.formActions}>
        <Pressable style={styles.formButtonSecondary} onPress={onCancel} disabled={saving}>
          <ThemedText style={styles.formButtonSecondaryText}>Cancelar</ThemedText>
        </Pressable>
        <Pressable
          style={[styles.formButtonPrimary, (!canSave || saving) && styles.formButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave || saving}
        >
          {saving ? (
            <ActivityIndicator color="#0a0a2e" />
          ) : (
            <ThemedText style={styles.formButtonPrimaryText}>Salvar</ThemedText>
          )}
        </Pressable>
      </View>
    </View>
  );
}

export function PlaylistManagerScreen({
  playlists,
  activePlaylistId,
  localPlaylistIds,
  macAddress,
  onSelect,
  onAddServer,
  onRemoveServer,
  onClose,
}: Props) {
  const [activatingId, setActivatingId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<PanelPlaylist | null>(null);
  const activePlaylist = playlists.find((p) => p.id === activePlaylistId);
  const expirationDate = activePlaylist?.expiracaoData;

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(''), 3000);
    return () => clearTimeout(timer);
  }, [error]);

  const handleSelect = async (playlist: PanelPlaylist) => {
    setActivatingId(playlist.id);
    setError('');
    try {
      await onSelect(playlist);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Falha ao carregar a lista: ${err.message}`
          : 'Falha ao carregar a lista.'
      );
    } finally {
      setActivatingId(null);
    }
  };

  const handleRemove = async (playlist: PanelPlaylist) => {
    setRemovingId(playlist.id);
    setError('');
    try {
      await onRemoveServer(playlist);
    } catch (err) {
      setError(err instanceof Error ? `Falha ao remover: ${err.message}` : 'Falha ao remover servidor.');
    } finally {
      setRemovingId(null);
    }
  };

  const handleConfirmRemove = async () => {
    if (!pendingRemove) return;
    const playlist = pendingRemove;
    setPendingRemove(null);
    await handleRemove(playlist);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>Minhas listas</ThemedText>
          <View style={styles.headerActions}>
            <HeaderButton label="+ Adicionar" emphasized onPress={() => setFormOpen(true)} />
            <HeaderButton label="Fechar" onPress={onClose} />
          </View>
        </View>

        <ThemedText style={styles.subtitle}>
          Listas vinculadas a este dispositivo no painel.
        </ThemedText>

        <View style={styles.body}>
          <ScrollView style={styles.listColumn} contentContainerStyle={styles.list}>
            {playlists.map((item, index) => {
              const isActive = item.id === activePlaylistId;
              const isActivating = activatingId === item.id;
              const isRemoving = removingId === item.id;
              const isLocal = localPlaylistIds.has(item.id);
              return (
                <View key={item.id} style={styles.itemWrap}>
                  <ServerCard
                    isActive={isActive}
                    disabled={!!activatingId || !!removingId}
                    autoFocus={index === 0}
                    onPress={() => handleSelect(item)}
                  >
                    <ThemedText style={styles.itemName}>{item.name}</ThemedText>
                    {isActive && <ThemedText style={styles.activeBadge}>Ativa</ThemedText>}
                    {(isActivating || isRemoving) && (
                      <ActivityIndicator color="#fff" style={styles.itemSpinner} />
                    )}
                  </ServerCard>
                  {isLocal && (
                    <Pressable
                      style={styles.removeBadge}
                      disabled={!!activatingId || !!removingId}
                      onPress={() => setPendingRemove(item)}
                    >
                      <ThemedText style={styles.removeBadgeText}>✕</ThemedText>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.separator} />

          <View style={styles.macPanel}>
            <ThemedText style={styles.macLabel}>Endereço MAC</ThemedText>
            <ThemedText style={styles.macValue}>{macAddress}</ThemedText>
            <ThemedText style={styles.macHint}>
              Use este endereço para vincular listas a este dispositivo no painel.
            </ThemedText>

            <ThemedText style={styles.macLabel}>Data de Expiração</ThemedText>
            <ThemedText style={styles.expirationValue}>{expirationDate || 'Não informada'}</ThemedText>
            <ThemedText style={styles.macHint}>
              Renove sua assinatura em{' '}
              <ThemedText style={styles.renewLink}>webtech.pro.kchagas.com.br</ThemedText>
            </ThemedText>
          </View>
        </View>

        {!!error && (
          <View style={styles.errorBanner}>
            <ThemedText style={styles.errorBannerText}>{error}</ThemedText>
          </View>
        )}
      </SafeAreaView>

      <Modal visible={formOpen} transparent animationType="fade" onRequestClose={() => setFormOpen(false)}>
        <View style={styles.modalBackdrop}>
          <AddServerForm
            onCancel={() => setFormOpen(false)}
            onSave={async (input) => {
              await onAddServer(input);
              setFormOpen(false);
            }}
          />
        </View>
      </Modal>

      <Modal
        visible={!!pendingRemove}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingRemove(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmPanel}>
            <ThemedText style={styles.formTitle}>Excluir servidor</ThemedText>
            <ThemedText style={styles.confirmMessage}>
              Deseja realmente excluir a lista{pendingRemove ? ` "${pendingRemove.name}"` : ''}? Essa ação não
              pode ser desfeita.
            </ThemedText>
            <View style={styles.formActions}>
              <Pressable style={styles.formButtonSecondary} onPress={() => setPendingRemove(null)}>
                <ThemedText style={styles.formButtonSecondaryText}>Cancelar</ThemedText>
              </Pressable>
              <Pressable style={styles.confirmDeleteButton} onPress={handleConfirmRemove}>
                <ThemedText style={styles.formButtonPrimaryText}>Excluir</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a2e',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 110,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  headerButtonBox: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  headerButtonBoxEmphasized: {
    borderColor: '#4dd6ff',
  },
  headerButtonBoxFocused: {
    borderColor: '#4dd6ff',
    backgroundColor: '#1f24c2',
  },
  headerButtonText: {
    color: '#4dd6ff',
    fontSize: 14,
    fontWeight: '600',
  },
  headerButtonTextEmphasized: {
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    color: '#c7c7e6',
    marginBottom: 16,
  },
  errorBanner: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(120, 0, 0, 0.85)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorBannerText: {
    color: '#ffffff',
    fontSize: 12,
    textAlign: 'center',
  },
  separator: {
    alignSelf: 'stretch',
    width: 1,
    backgroundColor: 'rgba(77, 214, 255, 0.35)',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 40,
  },
  listColumn: {
    flex: 1,
  },
  list: {
    gap: 12,
    paddingBottom: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  itemWrap: {
    position: 'relative',
  },
  item: {
    width: 100,
    height: 100,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: '#170066',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1aa2ff',
    padding: 10,
  },
  itemActive: {
    borderColor: '#3ddc84',
    borderWidth: 2,
  },
  itemFocused: {
    borderColor: '#4dd6ff',
    borderWidth: 2,
    backgroundColor: '#1f24c2',
  },
  itemName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  itemSpinner: {
    marginTop: 8,
  },
  activeBadge: {
    alignSelf: 'flex-start',
    color: '#3ddc84',
    fontSize: 11,
    fontWeight: '700',
  },
  removeBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#780000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  macPanel: {
    width: 320,
    paddingHorizontal: 24,
    paddingVertical: 26,
    alignItems: 'center',
    gap: 8,
  },
  expirationValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  renewLink: {
    color: '#4dd6ff',
    fontWeight: '600',
  },
  macLabel: {
    fontSize: 10,
    color: '#9fa3d1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  macValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4dd6ff',
    letterSpacing: 1,
    textAlign: 'center',
  },
  macHint: {
    fontSize: 11,
    color: '#8888aa',
    textAlign: 'center',
    lineHeight: 15,
  },
  confirmPanel: {
    width: '100%',
    maxWidth: 380,
    gap: 14,
    backgroundColor: '#0a0a2e',
    borderWidth: 1,
    borderColor: 'rgba(77, 214, 255, 0.35)',
    borderRadius: 14,
    padding: 20,
  },
  confirmMessage: {
    fontSize: 13,
    color: '#c7c7e6',
    lineHeight: 18,
  },
  confirmDeleteButton: {
    backgroundColor: '#c22b2b',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 24,
  },
  formPanel: {
    width: '100%',
    maxWidth: 460,
    height: '100%',
    backgroundColor: '#0a0a2e',
    borderWidth: 1,
    borderColor: 'rgba(77, 214, 255, 0.35)',
    borderRadius: 14,
    padding: 20,
    justifyContent: 'space-between',
  },
  formFields: {
    gap: 10,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  fieldWrap: {
    gap: 2,
  },
  fieldLabel: {
    fontSize: 10,
    color: '#9fa3d1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'stretch',
  },
  fieldBoxFlex: {
    flex: 1,
  },
  pasteButton: {
    borderWidth: 1,
    borderColor: '#4dd6ff',
    borderRadius: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pasteButtonFocused: {
    backgroundColor: '#1f24c2',
  },
  pasteButtonText: {
    color: '#4dd6ff',
    fontSize: 12,
    fontWeight: '700',
  },
  fieldBox: {
    borderWidth: 1,
    borderColor: '#1aa2ff',
    borderRadius: 8,
    backgroundColor: '#170066',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  fieldBoxFocused: {
    borderColor: '#4dd6ff',
    backgroundColor: '#1f24c2',
  },
  fieldBoxTall: {
    minHeight: 90,
    alignItems: 'flex-start',
  },
  fieldInput: {
    color: '#fff',
    fontSize: 14,
  },
  fieldInputTall: {
    minHeight: 78,
    textAlignVertical: 'top',
  },
  formError: {
    color: '#ff8080',
    fontSize: 12,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  formButtonPrimary: {
    backgroundColor: '#4dd6ff',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formButtonDisabled: {
    opacity: 0.5,
  },
  formButtonPrimaryText: {
    color: '#0a0a2e',
    fontWeight: '700',
    fontSize: 13,
  },
  formButtonSecondary: {
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#4dd6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formButtonSecondaryText: {
    color: '#4dd6ff',
    fontWeight: '600',
    fontSize: 13,
  },
});
