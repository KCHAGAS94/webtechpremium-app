import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/i18n/language-context';

type Props = {
  onConfirm: () => void;
  onCancel: () => void;
};

/** Confirms removing a favorite (Live TV category or channel) before actually
 * removing it. Starts focused on "Cancelar" so an accidental extra OK press
 * on the remote doesn't undo a favorite by mistake. */
export function UnfavoriteConfirmModal({ onConfirm, onCancel }: Props) {
  const { t } = useTranslation();
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [cancelFocused, setCancelFocused] = useState(true);

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ThemedText style={styles.message}>{t('unfavorite_confirm_message')}</ThemedText>
          <Pressable
            style={[styles.button, styles.primaryButton, confirmFocused && styles.primaryButtonFocused]}
            onPress={onConfirm}
            onFocus={() => setConfirmFocused(true)}
            onBlur={() => setConfirmFocused(false)}
          >
            <ThemedText style={styles.primaryButtonText}>{t('unfavorite_confirm_confirm')}</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.button, cancelFocused && styles.buttonFocused]}
            onPress={onCancel}
            onFocus={() => setCancelFocused(true)}
            onBlur={() => setCancelFocused(false)}
            hasTVPreferredFocus
          >
            <ThemedText style={styles.buttonText}>{t('unfavorite_confirm_cancel')}</ThemedText>
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
