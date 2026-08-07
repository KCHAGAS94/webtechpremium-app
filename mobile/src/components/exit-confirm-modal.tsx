import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type Props = {
  onConfirm: () => void;
  onCancel: () => void;
};

/** Confirms leaving playback before actually closing the player. Starts
 * focused on "Continuar assistindo" (the safe/default choice) so an
 * accidental extra OK press on the remote doesn't exit playback. */
export function ExitConfirmModal({ onConfirm, onCancel }: Props) {
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [cancelFocused, setCancelFocused] = useState(true);

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ThemedText style={styles.message}>Deseja sair da reprodução?</ThemedText>
          <Pressable
            style={[styles.button, styles.primaryButton, confirmFocused && styles.primaryButtonFocused]}
            onPress={onConfirm}
            onFocus={() => setConfirmFocused(true)}
            onBlur={() => setConfirmFocused(false)}
          >
            <ThemedText style={styles.primaryButtonText}>Sair</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.button, cancelFocused && styles.buttonFocused]}
            onPress={onCancel}
            onFocus={() => setCancelFocused(true)}
            onBlur={() => setCancelFocused(false)}
            hasTVPreferredFocus
          >
            <ThemedText style={styles.buttonText}>Continuar assistindo</ThemedText>
          </Pressable>
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
    borderWidth: 2,
    borderColor: 'transparent',
  },
  buttonFocused: {
    borderColor: '#4dd6ff',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  primaryButton: {
    backgroundColor: '#e63946',
  },
  primaryButtonFocused: {
    borderColor: '#fff',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
