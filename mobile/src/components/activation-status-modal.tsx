import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  /** True whenever the painel doesn't confirm this MAC as active
   * (expirado !== false — covers both "never activated" and "expired"). */
  visible: boolean;
  macAddress: string;
  /** Already-formatted validity label ("Vitalício", "DD/MM/YYYY", or null). */
  expirationLabel: string | null;
  checking: boolean;
  onCheckStatus: () => void;
  /** Set right after a check finishes and the MAC is still not active, so
   * the user knows to go activate it in the painel instead of assuming the
   * button did nothing. Cleared as soon as a new check starts. */
  notActiveMessage: string | null;
};

// Sits on top of whatever screen is currently mounted (Home, Minhas listas,
// etc.) whenever the painel doesn't confirm the device as active — RN's
// Modal renders in its own native overlay layer, so it doesn't matter which
// screen is behind it. The user's only way past it is the reseller linking
// this MAC in the painel, then "Verificar status do app" to re-poll.
export function ActivationStatusModal({
  visible,
  macAddress,
  expirationLabel,
  checking,
  onCheckStatus,
  notActiveMessage,
}: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text allowFontScaling={false} style={styles.label}>
            ENDEREÇO MAC
          </Text>
          <Text allowFontScaling={false} style={styles.mac}>
            {macAddress}
          </Text>
          <Text allowFontScaling={false} style={styles.hint}>
            Use este endereço para vincular listas a este dispositivo no painel.
          </Text>

          <Text allowFontScaling={false} style={[styles.label, styles.expirationLabel]}>
            DATA DE EXPIRAÇÃO
          </Text>
          <Text allowFontScaling={false} style={styles.expirationValue}>
            {expirationLabel ?? 'Não ativado'}
          </Text>

          <Text allowFontScaling={false} style={styles.renewHint}>
            Renove sua assinatura em{'\n'}
            <Text style={styles.renewLink}>https://painel.webtechpremium.kchagas.com.br/</Text>
          </Text>

          <Pressable
            style={[styles.checkButton, focused && styles.checkButtonFocused]}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onPress={onCheckStatus}
            disabled={checking}
            hasTVPreferredFocus
          >
            {checking ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text allowFontScaling={false} style={styles.checkButtonText}>
                Verificar status do app
              </Text>
            )}
          </Pressable>

          {!!notActiveMessage && !checking && (
            <Text allowFontScaling={false} style={styles.notActiveMessage}>
              {notActiveMessage}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 0, 20, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    backgroundColor: '#0a0530',
    borderColor: '#1aa2ff',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 28,
    width: '110%',
    height: '110%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    color: '#8888aa',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  mac: {
    color: '#4dd6ff',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  hint: {
    color: '#c7c7e6',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 18,
  },
  expirationLabel: {
    marginTop: 22,
  },
  expirationValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  renewHint: {
    color: '#8888aa',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 20,
  },
  renewLink: {
    color: '#4dd6ff',
    fontWeight: '600',
  },
  checkButton: {
    marginTop: 22,
    backgroundColor: '#170066',
    borderColor: '#1aa2ff',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    minWidth: 220,
    alignItems: 'center',
  },
  checkButtonFocused: {
    borderColor: '#4dd6ff',
    borderWidth: 3,
    backgroundColor: '#1f0d8a',
  },
  checkButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  notActiveMessage: {
    color: '#ff8a8a',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});
