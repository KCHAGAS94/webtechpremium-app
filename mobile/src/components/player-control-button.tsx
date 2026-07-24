import { useState } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  focusedStyle?: StyleProp<ViewStyle>;
  /** Grabs D-pad focus as soon as this button mounts — see FocusableCard in
   * App.tsx for the same pattern used elsewhere in the app. */
  autoFocus?: boolean;
  hitSlop?: number;
  children: React.ReactNode;
};

/**
 * Player control buttons were plain TouchableOpacity, which is tappable but
 * gives no visual feedback when a TV remote or physical keyboard moves focus
 * onto it — from the outside it looked like D-pad navigation just didn't
 * work inside the fullscreen player. This wraps Pressable's focus events
 * with a highlighted ring so the current selection is always visible.
 */
export function PlayerControlButton({ onPress, style, focusedStyle, autoFocus, hitSlop, children }: Props) {
  const [focused, setFocused] = useState(!!autoFocus);
  return (
    <Pressable
      style={[style, focused && (focusedStyle ?? styles.defaultFocused)]}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      hasTVPreferredFocus={autoFocus}
      hitSlop={hitSlop}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  defaultFocused: {
    borderWidth: 2,
    borderColor: '#4dd6ff',
  },
});
