import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { OnScreenKeyboard } from '@/components/on-screen-keyboard';

type Props = {
  visible: boolean;
  onConfirm: (password: string) => boolean;
  onCancel: () => void;
};

// Generic "type the parental password to continue" gate — reused by whatever
// settings action currently requires it (ocultar categorias, limpar
// históricos). `onConfirm` returns whether the password matched; a wrong
// guess just shows an inline error and lets the user try again. Typing uses
// the same on-screen grid keyboard as search, since this is a TV app driven
// by remote control rather than touch/physical keyboard.
export function PasswordPromptModal({ visible, onConfirm, onCancel }: Props) {
  const [password, setPassword] = useState('');
  const [cursor, setCursor] = useState(0);
  const [error, setError] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      setPassword('');
      setCursor(0);
      setError(false);
      setKeyboardOpen(true);
    }
  }, [visible]);

  const close = () => {
    setKeyboardOpen(false);
    onCancel();
  };

  const handleConfirm = () => {
    const ok = onConfirm(password);
    if (!ok) setError(true);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text allowFontScaling={false} style={styles.title}>Senha do Controle dos Pais</Text>

          <TouchableOpacity
            style={styles.input}
            onPress={() => setKeyboardOpen(true)}
            activeOpacity={0.75}
          >
            <Text allowFontScaling={false} style={styles.inputText}>
              {'•'.repeat(password.length) || ' '}
            </Text>
          </TouchableOpacity>

          {error && (
            <Text allowFontScaling={false} style={styles.errorText}>
              Senha incorreta
            </Text>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.button} onPress={handleConfirm} activeOpacity={0.75}>
              <Text allowFontScaling={false} style={styles.buttonText}>CONFIRMAR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={close} activeOpacity={0.75}>
              <Text allowFontScaling={false} style={styles.buttonText}>CANCELAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {keyboardOpen && (
        <OnScreenKeyboard
          value={password}
          cursor={cursor}
          onChangeText={(text) => {
            setPassword(text);
            setError(false);
          }}
          onCursorChange={setCursor}
          onClose={() => setKeyboardOpen(false)}
        />
      )}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    width: 280,
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  input: {
    backgroundColor: '#170066',
    borderColor: '#1aa2ff',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 34,
    justifyContent: 'center',
  },
  inputText: {
    color: '#ffffff',
    fontSize: 16,
    letterSpacing: 2,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 12,
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 14,
  },
  button: {
    backgroundColor: '#170066',
    borderColor: '#1aa2ff',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
