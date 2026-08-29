const { withMainActivity } = require('@expo/config-plugins');

// Android TV remotes (e.g. the Aiwa remote bundled with cheap TV boxes) send
// KEYCODE_CHANNEL_UP/DOWN and KEYCODE_PROG_RED/GREEN/YELLOW/BLUE for their
// dedicated channel and color buttons. React Native's built-in TVEventHandler
// only surfaces D-pad/select/menu/media keys, so these never reach JS unless
// MainActivity forwards them itself — hence overriding dispatchKeyEvent here
// and re-emitting as a DeviceEventEmitter event the JS side can subscribe to
// (see src/utils/remote-keys.ts).
const IMPORTS = [
  'import android.view.KeyEvent',
  'import com.facebook.react.bridge.Arguments',
  'import com.facebook.react.modules.core.DeviceEventManagerModule',
];

const METHOD = `
  override fun dispatchKeyEvent(event: KeyEvent): Boolean {
    if (event.action == KeyEvent.ACTION_DOWN) {
      val keyName = when (event.keyCode) {
        KeyEvent.KEYCODE_CHANNEL_UP -> "CHANNEL_UP"
        KeyEvent.KEYCODE_CHANNEL_DOWN -> "CHANNEL_DOWN"
        KeyEvent.KEYCODE_PROG_RED -> "PROG_RED"
        KeyEvent.KEYCODE_PROG_GREEN -> "PROG_GREEN"
        KeyEvent.KEYCODE_PROG_YELLOW -> "PROG_YELLOW"
        KeyEvent.KEYCODE_PROG_BLUE -> "PROG_BLUE"
        else -> null
      }
      if (keyName != null) {
        // reactDelegate.currentReactContext is the arch-agnostic accessor
        // that resolves through ReactHost or ReactInstanceManager depending
        // on which one is active, so it works under both the old bridge and
        // the New Architecture (bridgeless).
        val reactContext = this.reactDelegate?.currentReactContext
        reactContext
          ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          ?.emit("RemoteKeyEvent", Arguments.createMap().apply { putString("key", keyName) })
        return true
      }
    }
    return super.dispatchKeyEvent(event)
  }
`;

module.exports = function withRemoteKeys(config) {
  return withMainActivity(config, (config) => {
    let contents = config.modResults.contents;

    const missingImports = IMPORTS.filter((line) => !contents.includes(line));
    if (missingImports.length > 0) {
      contents = contents.replace(
        /(class MainActivity : ReactActivity\(\) \{)/,
        `${missingImports.join('\n')}\n\n$1`
      );
    }

    if (!contents.includes('dispatchKeyEvent')) {
      contents = contents.replace(
        /(class MainActivity : ReactActivity\(\) \{)/,
        `$1\n${METHOD}`
      );
    }

    config.modResults.contents = contents;
    return config;
  });
};
