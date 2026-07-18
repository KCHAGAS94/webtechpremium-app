import { useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
        <View style={styles.box}>
          <View style={styles.header}>
            <Text allowFontScaling={false} style={styles.headerTitle}>
              {title}
            </Text>
          </View>

          {entries.length === 0 ? (
            <View style={styles.empty}>
              <Text allowFontScaling={false} style={styles.emptyText}>
                Nenhum histórico ainda.
              </Text>
            </View>
          ) : (
            <FlatList
              data={entries}
              keyExtractor={(item) => item.id}
              style={styles.list}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.row} onPress={() => toggle(item.id)} activeOpacity={0.75}>
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
                </TouchableOpacity>
              )}
            />
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, selected.size === 0 && styles.actionButtonDisabled]}
              onPress={handleClearSelected}
              disabled={selected.size === 0}
              activeOpacity={0.75}
            >
              <Text allowFontScaling={false} style={styles.actionButtonText}>
                LIMPAR SELECIONADOS{selected.size > 0 ? ` (${selected.size})` : ''}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={onClearAll} activeOpacity={0.75}>
              <Text allowFontScaling={false} style={styles.actionButtonText}>LIMPAR TUDO</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={onClose} activeOpacity={0.75}>
              <Text allowFontScaling={false} style={styles.actionButtonText}>FECHAR</Text>
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
  empty: {
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptyText: {
    color: '#c7c7e6',
    fontSize: 13,
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
    gap: 12,
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
  actionButtonDisabled: {
    opacity: 0.4,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
});
