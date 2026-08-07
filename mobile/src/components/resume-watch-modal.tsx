import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type Props = {
  title: string;
  onResume: () => void;
  onRestart: () => void;
};

/** Asks whether to pick up from the saved position or start over, before
 * playback begins. Starts focused on "Continuar de onde parou" — the option
 * that matches why this modal showed up in the first place. */
export function ResumeWatchModal({ title, onResume, onRestart }: Props) {
  const [resumeFocused, setResumeFocused] = useState(true);
  const [restartFocused, setRestartFocused] = useState(false);

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onResume}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ThemedText style={styles.title} numberOfLines={2}>
            {title}
          </ThemedText>
          <ThemedText style={styles.message}>Você parou de assistir no meio. O que deseja fazer?</ThemedText>
          <Pressable
            style={[styles.button, styles.primaryButton, resumeFocused && styles.primaryButtonFocused]}
            onPress={onResume}
            onFocus={() => setResumeFocused(true)}
            onBlur={() => setResumeFocused(false)}
            hasTVPreferredFocus
          >
            <ThemedText style={styles.primaryButtonText}>Continuar de onde parou</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.button, restartFocused && styles.buttonFocused]}
            onPress={onRestart}
            onFocus={() => setRestartFocused(true)}
            onBlur={() => setRestartFocused(false)}
          >
            <ThemedText style={styles.buttonText}>Começar do início</ThemedText>
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
    backgroundColor: '#4dd6ff',
  },
  primaryButtonFocused: {
    borderColor: '#fff',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#00202b',
  },
});
