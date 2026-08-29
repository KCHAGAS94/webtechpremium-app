import { useState } from 'react';
import { FlatList, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

// Same fixed-preset-per-device-class approach as App.tsx's mobileStyles.
const IS_TV = Platform.isTV;

export type WatchHistoryRow = {
  id: string;
  title: string;
  subtitle: string;
};

type Props = {
  visible: boolean;
  title: string;
  entries: WatchHistoryRow[];
  onClearAll: () => void;
  onClearSelected: (ids: string[]) => void;
  onClose: () => void;
};

// Same D-pad focus-highlight pattern as hide-categories-modal.tsx's FocusableRow.
function FocusableRow({
  onPress,
  children,
  hasTVPreferredFocus,
}: {
  onPress: () => void;
  children: React.ReactNode;
  hasTVPreferredFocus?: boolean;
}) {
  const [focused, setFocused] = useState(!!hasTVPreferredFocus);
  return (
    <Pressable
      style={[styles.row, focused && styles.rowFocused]}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      hasTVPreferredFocus={hasTVPreferredFocus}
    >
      {children}
    </Pressable>
  );
}

function CloseButton({ onPress, hasTVPreferredFocus }: { onPress: () => void; hasTVPreferredFocus?: boolean }) {
  const [focused, setFocused] = useState(!!hasTVPreferredFocus);
  return (
    <Pressable
      style={[styles.closeButton, focused && styles.closeButtonFocused]}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      hasTVPreferredFocus={hasTVPreferredFocus}
    >
      <Text allowFontScaling={false} style={styles.closeButtonText}>✕</Text>
    </Pressable>
  );
}

function FocusableActionButton({
  onPress,
  children,
  disabled,
  hasTVPreferredFocus,
}: {
  onPress: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  hasTVPreferredFocus?: boolean;
}) {
  const [focused, setFocused] = useState(!!hasTVPreferredFocus);
  return (
    <Pressable
      style={[styles.actionButton, focused && styles.actionButtonFocused, disabled && styles.actionButtonDisabled]}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      disabled={disabled}
      hasTVPreferredFocus={hasTVPreferredFocus}
    >
      {children}
    </Pressable>
  );
}

/** Shows a section's watch history (title + when) — checkboxes let someone clear just one entry instead of everything. */
export function WatchHistoryModal({ visible, title, entries, onClearAll, onClearSelected, onClose }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Reset selection whenever the modal is (re)opened, instead of carrying
  // over checks from a previous open (e.g. after entries were reloaded).
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setSelected(new Set());
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClearSelected = () => {
    if (selected.size === 0) return;
    onClearSelected(Array.from(selected));
    setSelected(new Set());
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.box, !IS_TV && mobileStyles.box]}>
          <View style={styles.header}>
            <Text allowFontScaling={false} style={styles.headerTitle}>
              {title}
            </Text>
            <CloseButton onPress={onClose} hasTVPreferredFocus />
          </View>

          {entries.length === 0 ? (
            <View style={styles.empty}>
              <Text allowFontScaling={false} style={styles.emptyText}>
                Nenhum histórico ainda.
              </Text>
            </View>
          ) : (
            <View style={styles.body}>
              <View style={[styles.sideActions, !IS_TV && mobileStyles.sideActions]}>
                <FocusableActionButton onPress={handleClearSelected} disabled={selected.size === 0}>
                  <Text allowFontScaling={false} style={styles.actionButtonText}>
                    {'LIMPAR\nSELECIONADOS'}{selected.size > 0 ? ` (${selected.size})` : ''}
                  </Text>
                </FocusableActionButton>
                <FocusableActionButton onPress={onClearAll}>
                  <Text allowFontScaling={false} style={styles.actionButtonText}>LIMPAR TUDO</Text>
                </FocusableActionButton>
              </View>

              <FlatList
                data={entries}
                keyExtractor={(item) => item.id}
                style={[styles.list, !IS_TV && mobileStyles.list]}
                renderItem={({ item }) => (
                  <FocusableRow onPress={() => toggle(item.id)}>
                    <View style={styles.rowText}>
                      <Text allowFontScaling={false} style={styles.rowTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text allowFontScaling={false} style={styles.rowSubtitle}>
                        {item.subtitle}
                      </Text>
                    </View>
                    <View style={[styles.checkbox, selected.has(item.id) && styles.checkboxChecked]}>
                      {selected.has(item.id) && <Text style={styles.checkboxMark}>✓</Text>}
                    </View>
                  </FocusableRow>
                )}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    backgroundColor: '#12004f',
    borderColor: '#1aa2ff',
    borderWidth: 1,
    borderRadius: 10,
    width: 460,
    maxHeight: '75%',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#170066',
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 12,
    top: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#1aa2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonFocused: {
    borderColor: '#3ddc84',
    backgroundColor: '#1f24c2',
    transform: [{ scale: 1.08 }],
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  body: {
    flexDirection: 'column',
  },
  sideActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26, 162, 255, 0.25)',
  },
  empty: {
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#c7c7e6',
    fontSize: 13,
  },
  // Fixed height instead of flex:1 + maxHeight (same fix as
  // hide-categories-modal.tsx's `list`): without it, `body`'s own height was
  // ambiguous whenever the entry list had little content, which let
  // `sideActions`' flex:1 buttons balloon past their intended size.
  list: {
    height: 360,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(26, 162, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  rowFocused: {
    backgroundColor: '#1f24c2',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: '#ffffff',
    fontSize: 13,
  },
  rowSubtitle: {
    color: '#9fa3d1',
    fontSize: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1aa2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#1aa2ff',
  },
  checkboxMark: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  actionButton: {
    flex: 1,
    width: '100%',
    backgroundColor: '#170066',
    borderColor: '#1aa2ff',
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  actionButtonFocused: {
    borderColor: '#3ddc84',
    backgroundColor: '#1f24c2',
    transform: [{ scale: 1.04 }],
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
    lineHeight: 18,
  },
});

// Fixed mobile preset, same values as hide-categories-modal.tsx's — a
// smaller box/list so the whole modal reliably fits phone screen heights.
const mobileStyles = StyleSheet.create({
  box: {
    width: 760,
    minHeight: 320,
  },
  sideActions: {
    padding: 10,
    gap: 8,
  },
  list: {
    height: 220,
  },
});
