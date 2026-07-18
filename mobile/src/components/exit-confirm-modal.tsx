import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type Props = {
  onConfirm: () => void;
  onCancel: () => void;
};

/** Confirms leaving playback before actually closing the player. */
export function ExitConfirmModal({ onConfirm, onCancel }: Props) {
  return (
    <Modal visible animationType="fade" transparent onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ThemedText style={styles.message}>Deseja sair da reprodução?</ThemedText>
          <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={onConfirm}>
            <ThemedText style={styles.primaryButtonText}>Sair</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={onCancel}>
            <ThemedText style={styles.buttonText}>Continuar assistindo</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 14,
    padding: 20,
    gap: 12,
    backgroundColor: '#1c1c1e',
  },
  message: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  primaryButton: {
    backgroundColor: '#e63946',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
