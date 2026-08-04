import { StyleSheet, UIManager, View, type StyleProp, type ViewStyle } from 'react-native';
import { CastButton as GoogleCastButton } from 'react-native-google-cast';

type Props = {
  style?: StyleProp<ViewStyle>;
};

// react-native-google-cast's native view isn't available everywhere — it's
// unusable in Expo Go (no custom native code), and some Android TV boxes
// ship without Google Play Services/the Cast framework at all. Either case
// leaves RNGoogleCastButton unregistered with the native UIManager, which
// throws "View config not found" the moment the bridge tries to *create*
// the view — that happens async on the native side, after JS render has
// already committed, so a React error boundary around it never catches it
// and it crashes the whole player instead of just the cast icon.
// UIManager.hasViewManagerConfig lets us check the same thing synchronously,
// in JS, before ever mounting the native view, so an unsupported
// device/runtime just skips the icon instead of hitting the bridge at all.
const CAST_BUTTON_SUPPORTED = UIManager.hasViewManagerConfig('RNGoogleCastButton');

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
  if (!CAST_BUTTON_SUPPORTED) return null;
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
