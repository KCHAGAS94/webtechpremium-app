import { useState } from 'react';
import { FlatList, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

// Same fixed-preset-per-device-class approach as App.tsx's Home layout.
const IS_TV = Platform.isTV;

type CategoryOption = {
  id: string;
  title: string;
};

type Props = {
  visible: boolean;
  categories: CategoryOption[];
  initiallyHidden: Set<string>;
  onSave: (hidden: Set<string>) => void;
  onCancel: () => void;
};

// Same D-pad focus-highlight pattern as settings-screen.tsx's SettingsCard.
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

function FocusableActionButton({
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
      style={[styles.actionButton, focused && styles.actionButtonFocused]}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      hasTVPreferredFocus={hasTVPreferredFocus}
    >
      {children}
    </Pressable>
  );
}

/** "Selecione as categorias que deseja ocultar" — per-section (live/movies/series). */
export function HideCategoriesModal({ visible, categories, initiallyHidden, onSave, onCancel }: Props) {
  const [selected, setSelected] = useState<Set<string>>(initiallyHidden);

  // Reset local selection to the persisted set whenever the modal is (re)opened,
  // instead of carrying over an in-progress edit from a previous open/cancel.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setSelected(initiallyHidden);
  }

  const allSelected = categories.length > 0 && categories.every((c) => selected.has(c.id));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(categories.map((c) => c.id)));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.box, !IS_TV && mobileStyles.box]}>
          <View style={styles.header}>
            <Text allowFontScaling={false} style={styles.headerTitle}>
              selecione as categorias que deseja ocultar
            </Text>
          </View>

          <View style={styles.body}>
            <View style={[styles.sideActions, !IS_TV && mobileStyles.sideActions]}>
              <FocusableActionButton onPress={() => onSave(selected)}>
                <Text allowFontScaling={false} style={styles.actionButtonText}>SIM</Text>
              </FocusableActionButton>
              <FocusableActionButton onPress={toggleAll}>
                <Text allowFontScaling={false} style={styles.actionButtonText}>
                  {allSelected ? 'DESMARCAR\nTUDO' : 'SELECIONAR\nTUDO'}
                </Text>
              </FocusableActionButton>
              <FocusableActionButton onPress={onCancel}>
                <Text allowFontScaling={false} style={styles.actionButtonText}>CANCELAR</Text>
              </FocusableActionButton>
            </View>

            <FlatList
              data={categories}
              keyExtractor={(item) => item.id}
              style={[styles.list, !IS_TV && mobileStyles.list]}
              renderItem={({ item, index }) => (
                <FocusableRow onPress={() => toggle(item.id)} hasTVPreferredFocus={index === 0}>
                  <Text allowFontScaling={false} style={styles.rowLabel} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={[styles.checkbox, selected.has(item.id) && styles.checkboxChecked]}>
                    {selected.has(item.id) && <Text style={styles.checkboxMark}>✓</Text>}
                  </View>
                </FocusableRow>
              )}
            />
          </View>
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
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    flexDirection: 'row',
  },
  sideActions: {
    width: 160,
    padding: 16,
    gap: 12,
    borderRightWidth: 1,
    borderRightColor: 'rgba(26, 162, 255, 0.25)',
  },
  list: {
    // Fixed height instead of flex:1 + maxHeight: `body`'s own height is
    // otherwise ambiguous (neither `box` nor `body` has an explicit height,
    // just box's maxHeight:'75%'), which left `sideActions`' three flex:1
    // buttons fighting over an undefined cross-axis size — the last one
    // (CANCELAR) could end up squeezed to ~0 height. A fixed height here
    // gives `body` (and, via stretch, `sideActions`) an unambiguous size to
    // lay out against.
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
  },
  rowFocused: {
    backgroundColor: '#1f24c2',
  },
  rowLabel: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    paddingRight: 12,
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
  actionButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
    lineHeight: 18,
  },
});

// Fixed mobile preset, same approach as App.tsx's mobileStyles — a smaller
// box/list so the whole modal (header + 3 side buttons + list) reliably
// fits phone screen heights in landscape, which are shorter than a TV's.
const mobileStyles = StyleSheet.create({
  box: {
    width: 360,
  },
  sideActions: {
    width: 120,
    padding: 10,
    gap: 8,
  },
  list: {
    height: 220,
  },
});
