import { MaterialIcons } from '@expo/vector-icons';
import { Platform, StyleSheet, UIManager, type StyleProp, type ViewStyle } from 'react-native';
import { CastButton as GoogleCastButton, CastContext } from 'react-native-google-cast';

import { PlayerControlButton } from '@/components/player-control-button';

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
 * The native MediaRouteButton (rendered below, invisible) IS a real
 * focusable Android view, but it isn't an RN Pressable — RN's bridge never
 * wires up JS onFocus/onBlur for it, so a TV remote could move D-pad focus
 * onto it with zero visual feedback, making the icon look dead/unreachable.
 * Instead we render our own PlayerControlButton (same focus-ring chrome as
 * the rest of the fullscreen player's controls) and open the Cast dialog
 * from it programmatically via `CastContext.showCastDialog()` — which, per
 * the library's docs, requires a CastButton to be mounted somewhere on
 * screen (it can be hidden) for it to work at all.
 */
export function CastButton({ style }: Props) {
  // Casting mirrors playback to a nearby screen — on a TV device the app is
  // already the thing playing on the big screen, so there's nowhere useful
  // to cast to.
  if (Platform.isTV) return null;
  if (!CAST_BUTTON_SUPPORTED) return null;
  return (
    <>
      <GoogleCastButton style={styles.hiddenNativeButton} tintColor="transparent" />
      <PlayerControlButton
        onPress={() => CastContext.showCastDialog()}
        hitSlop={12}
        style={[styles.container, style]}
        focusedStyle={styles.containerFocused}
      >
        <MaterialIcons name="cast" size={20} color="#fff" />
      </PlayerControlButton>
    </>
  );
}

const styles = StyleSheet.create({
  hiddenNativeButton: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  container: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    overflow: 'hidden',
  },
  containerFocused: {
    borderWidth: 2,
    borderColor: '#4dd6ff',
  },
});
