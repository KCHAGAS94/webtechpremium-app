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
  /** Called when D-pad/remote navigation moves focus onto this button, so
   * the overlay's auto-hide countdown can restart — otherwise controls can
   * disappear mid-navigation while the user is still moving toward a
   * button (e.g. slowly arrowing over to the favorite heart). */
  onFocus?: () => void;
  children: React.ReactNode;
};

/**
 * Player control buttons were plain TouchableOpacity, which is tappable but
 * gives no visual feedback when a TV remote or physical keyboard moves focus
 * onto it — from the outside it looked like D-pad navigation just didn't
 * work inside the fullscreen player. This wraps Pressable's focus events
 * with a highlighted ring so the current selection is always visible.
 */
export function PlayerControlButton({ onPress, style, focusedStyle, autoFocus, hitSlop, onFocus, children }: Props) {
  const [focused, setFocused] = useState(!!autoFocus);
  return (
    <Pressable
      style={[style, focused && (focusedStyle ?? styles.defaultFocused)]}
      onFocus={() => {
        setFocused(true);
        onFocus?.();
      }}
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
