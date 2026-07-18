import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type Props = {
  title: string;
  onResume: () => void;
  onRestart: () => void;
};

/** Asks whether to pick up from the saved position or start over, before playback begins. */
export function ResumeWatchModal({ title, onResume, onRestart }: Props) {
  return (
    <Modal visible animationType="fade" transparent onRequestClose={onResume}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ThemedText style={styles.title} numberOfLines={2}>
            {title}
          </ThemedText>
          <ThemedText style={styles.message}>Você parou de assistir no meio. O que deseja fazer?</ThemedText>
          <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={onResume}>
            <ThemedText style={styles.primaryButtonText}>Continuar de onde parou</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={onRestart}>
            <ThemedText style={styles.buttonText}>Começar do início</ThemedText>
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
    backgroundColor: '#000',
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
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  message: {
    fontSize: 14,
    color: '#c9c9c9',
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
    backgroundColor: '#4dd6ff',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#00202b',
  },
});
