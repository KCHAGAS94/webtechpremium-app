import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type Props = {
  value: string;
  /** Caret position within `value` — owned by the caller so it can render the
   * `|` marker directly inside the real search field instead of a separate
   * preview inside this component. */
  cursor: number;
  onChangeText: (value: string) => void;
  onCursorChange: (cursor: number) => void;
  onClose: () => void;
};

// Grid layout (not a system-keyboard lookalike) so every key is a big enough
// D-pad focus target to move between with a TV remote's arrows — a phone
// soft keyboard's tiny keys are effectively unusable without touch.
const LETTER_ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

const SYMBOL_ROWS = [
  ['!', '@', '#', '$', '%', '¨', '&', '*', '(', ')'],
  ['-', '_', '=', '+', '[', ']', '{', '}', '\\', '|'],
  [';', ':', "'", '"', ',', '.', '?', '/', '~'],
  ['<', '>', '^', '`'],
];

/** On-screen QWERTY grid keyboard for devices without a physical/touch keyboard (e.g. Android TV remotes). */
export function OnScreenKeyboard({ value, cursor, onChangeText, onCursorChange, onClose }: Props) {
  const [mode, setMode] = useState<'letters' | 'symbols'>('letters');
  // Which key currently has D-pad focus, so we can render a visible ring —
  // Pressable gives no focus styling for free like a web button does.
  const [focusedKey, setFocusedKey] = useState<string | null>('1');
  // For people with bigger fingers who keep mis-tapping neighboring keys —
  // toggled per session, not persisted, since it's a quick in-the-moment fix.
  const [largeKeys, setLargeKeys] = useState(false);
  const rows = mode === 'letters' ? LETTER_ROWS : SYMBOL_ROWS;
  const keyStyle = largeKeys ? [styles.key, styles.keyLarge] : styles.key;

  // A physical/USB/Bluetooth keyboard sends key events to whatever native
  // view currently has focus — the on-screen keys above are just touch
  // targets and never receive them. This 1x1 TextInput stays focused for as
  // long as the modal is open purely to catch that hardware input; its
  // software keyboard is disabled so it doesn't fight with the on-screen
  // grid, and both end up driving the same `value`/`cursor` state.
  //
  // On Android TV this backfired: focusing it stole native focus away from
  // whichever key had it (the remote's D-pad "just" moved a text cursor
  // inside this invisible field instead of navigating between keys), so the
  // last-focused key stayed visually highlighted forever — a TV remote is
  // never a "physical keyboard" in the sense this exists for, so it's opt-in
  // to non-TV platforms only.
  const hiddenInputRef = useRef<TextInput>(null);
  useEffect(() => {
    if (Platform.isTV) return;
    const timer = setTimeout(() => hiddenInputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  // `hasTVPreferredFocus` must only apply on the very first mount — if left
  // recomputed as `char === '1'` on every render, Android TV's focus engine
  // re-claims focus onto the '1' key on any re-render (e.g. after each
  // keystroke), snapping the highlight back to '1' even though the user has
  // since moved the D-pad to another key.
  const initialFocusRef = useRef(true);
  useEffect(() => {
    initialFocusRef.current = false;
  }, []);

  const handleKey = (char: string) => {
    onChangeText(value.slice(0, cursor) + char + value.slice(cursor));
    onCursorChange(cursor + 1);
  };
  const handleBackspace = () => {
    if (cursor === 0) return;
    onChangeText(value.slice(0, cursor - 1) + value.slice(cursor));
    onCursorChange(cursor - 1);
  };
  const handleClear = () => {
    onChangeText('');
    onCursorChange(0);
  };
  const handleSpace = () => handleKey(' ');
  const handleToggleMode = () => setMode((prev) => (prev === 'letters' ? 'symbols' : 'letters'));
  const handleMoveLeft = () => onCursorChange(Math.max(0, cursor - 1));
  const handleMoveRight = () => onCursorChange(Math.min(value.length, cursor + 1));

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      {/* Transparent backdrop keeps the real search box and the filtered list
          above the panel fully visible while typing, instead of the whole
          screen dimming under the modal. Tapping it (outside the panel)
          closes the keyboard, same as "Concluído" — the panel's own
          Pressable children intercept their own touches first. */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* No-op onPress stops the tap from bubbling to the backdrop above —
            without this, tapping empty padding inside the panel (not on a
            key) would also close the keyboard. */}
        <Pressable style={styles.panel} onPress={() => {}}>
          <TextInput
            ref={hiddenInputRef}
            value={value}
            selection={{ start: cursor, end: cursor }}
            onChangeText={onChangeText}
            onSelectionChange={(e) => onCursorChange(e.nativeEvent.selection.start)}
            showSoftInputOnFocus={false}
            style={styles.hiddenInput}
          />
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map((char) => (
                <Pressable
                  key={char}
                  style={[keyStyle, focusedKey === char && styles.keyFocused]}
                  hasTVPreferredFocus={initialFocusRef.current && char === '1'}
                  onFocus={() => setFocusedKey(char)}
                  onPress={() => handleKey(char)}
                >
                  <ThemedText style={[styles.keyText, largeKeys && styles.keyTextLarge]}>{char}</ThemedText>
                </Pressable>
              ))}
            </View>
          ))}

          <View style={styles.row}>
            <Pressable
              style={[keyStyle, styles.wideKey, focusedKey === 'done' && styles.keyFocused]}
              onFocus={() => setFocusedKey('done')}
              onPress={onClose}
            >
              <ThemedText style={[styles.keyText, largeKeys && styles.keyTextLarge]}>Concluído</ThemedText>
            </Pressable>
            <Pressable
              style={[keyStyle, styles.wideKey, focusedKey === 'clear' && styles.keyFocused]}
              onFocus={() => setFocusedKey('clear')}
              onPress={handleClear}
            >
              <ThemedText style={[styles.keyText, largeKeys && styles.keyTextLarge]}>Limpar</ThemedText>
            </Pressable>
            <Pressable
              style={[keyStyle, styles.wideKey, focusedKey === 'mode' && styles.keyFocused]}
              onFocus={() => setFocusedKey('mode')}
              onPress={handleToggleMode}
            >
              <ThemedText style={[styles.keyText, largeKeys && styles.keyTextLarge]}>
                {mode === 'letters' ? '#+=' : 'ABC'}
              </ThemedText>
            </Pressable>
            <Pressable
              style={[keyStyle, focusedKey === 'left' && styles.keyFocused]}
              onFocus={() => setFocusedKey('left')}
              onPress={handleMoveLeft}
            >
              <ThemedText style={[styles.keyText, largeKeys && styles.keyTextLarge]}>◀</ThemedText>
            </Pressable>
            <Pressable
              style={[keyStyle, styles.spaceKey, focusedKey === 'space' && styles.keyFocused]}
              onFocus={() => setFocusedKey('space')}
              onPress={handleSpace}
            >
              <ThemedText style={[styles.keyText, largeKeys && styles.keyTextLarge]}>Espaço</ThemedText>
            </Pressable>
            <Pressable
              style={[keyStyle, focusedKey === 'right' && styles.keyFocused]}
              onFocus={() => setFocusedKey('right')}
              onPress={handleMoveRight}
            >
              <ThemedText style={[styles.keyText, largeKeys && styles.keyTextLarge]}>▶</ThemedText>
            </Pressable>
            <Pressable
              style={[keyStyle, styles.wideKey, focusedKey === 'backspace' && styles.keyFocused]}
              onFocus={() => setFocusedKey('backspace')}
              onPress={handleBackspace}
            >
              <ThemedText style={[styles.keyText, largeKeys && styles.keyTextLarge]}>⌫</ThemedText>
            </Pressable>
            <Pressable
              style={[keyStyle, styles.wideKey, focusedKey === 'largeKeys' && styles.keyFocused]}
              onFocus={() => setFocusedKey('largeKeys')}
              onPress={() => setLargeKeys((v) => !v)}
            >
              <ThemedText style={[styles.keyText, largeKeys && styles.keyTextLarge]}>
                {largeKeys ? 'A-' : 'A+'}
              </ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  panel: {
    backgroundColor: '#111132',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a66',
    marginLeft: 0,
    marginRight: 0,
    marginBottom: 0,
    padding: 6,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 4,
  },
  key: {
    flex: 1,
    height: 32,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e1e50',
  },
  keyLarge: {
    height: 52,
  },
  keyFocused: {
    backgroundColor: '#3a3a8f',
    borderWidth: 2,
    borderColor: '#5ac8fa',
  },
  wideKey: {
    flex: 1.6,
  },
  spaceKey: {
    flex: 4,
  },
  keyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  keyTextLarge: {
    fontSize: 16,
  },
});
