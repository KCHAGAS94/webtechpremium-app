import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { CastButton as GoogleCastButton } from 'react-native-google-cast';

type Props = {
  style?: StyleProp<ViewStyle>;
};

/**
 * Wraps react-native-google-cast's native cast icon (Android's
 * MediaRouteButton) with the app's icon-button chrome so it sits next to the
 * favorite heart looking like the rest of the player controls. The native
 * button is already focusable and handles D-pad/keyboard OK itself — no
 * onFocus/onBlur wiring needed like the custom Pressable-based buttons.
 * Tapping it opens the system Cast device picker; once connected, the
 * screens that render this button start sending the stream to the selected
 * device (see `useCastStream` in cast-stream.ts).
 */
export function CastButton({ style }: Props) {
  return (
    <View style={[styles.container, style]}>
      <GoogleCastButton style={styles.button} tintColor="#fff" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    overflow: 'hidden',
  },
  button: {
    width: 24,
    height: 24,
  },
});
