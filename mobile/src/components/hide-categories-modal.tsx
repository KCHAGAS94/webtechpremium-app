import { useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
        <View style={styles.box}>
          <View style={styles.header}>
            <Text allowFontScaling={false} style={styles.headerTitle}>
              selecione as categorias que deseja ocultar
            </Text>
          </View>

          <FlatList
            data={categories}
            keyExtractor={(item) => item.id}
            style={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.row} onPress={() => toggle(item.id)} activeOpacity={0.75}>
                <Text allowFontScaling={false} style={styles.rowLabel} numberOfLines={1}>
                  {item.title}
                </Text>
                <View style={[styles.checkbox, selected.has(item.id) && styles.checkboxChecked]}>
                  {selected.has(item.id) && <Text style={styles.checkboxMark}>✓</Text>}
                </View>
              </TouchableOpacity>
            )}
          />

          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionButton} onPress={() => onSave(selected)} activeOpacity={0.75}>
              <Text allowFontScaling={false} style={styles.actionButtonText}>SIM</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={toggleAll} activeOpacity={0.75}>
              <Text allowFontScaling={false} style={styles.actionButtonText}>
                {allSelected ? 'DESMARCAR TUDO' : 'SELECIONAR TUDO'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={onCancel} activeOpacity={0.75}>
              <Text allowFontScaling={false} style={styles.actionButtonText}>CANCELAR</Text>
            </TouchableOpacity>
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
    width: 420,
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
  list: {
    maxHeight: 360,
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
  actions: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(26, 162, 255, 0.25)',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#170066',
    borderColor: '#1aa2ff',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
});
