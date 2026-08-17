const { withAndroidManifest } = require('@expo/config-plugins');

// Without the leanback intent-filter/feature, Android TV launchers (including
// no-name boxes like AWA) sideload the APK fine but never list it on the
// home screen's app row — only "real" TV apps declare LEANBACK_LAUNCHER.
module.exports = function withAndroidTvLauncher(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    manifest['uses-feature'] = manifest['uses-feature'] || [];
    const hasLeanback = manifest['uses-feature'].some(
      (f) => f.$?.['android:name'] === 'android.software.leanback'
    );
    if (!hasLeanback) {
      manifest['uses-feature'].push({
        $: { 'android:name': 'android.software.leanback', 'android:required': 'false' },
      });
    }
    const hasTouchscreen = manifest['uses-feature'].some(
      (f) => f.$?.['android:name'] === 'android.hardware.touchscreen'
    );
    if (!hasTouchscreen) {
      manifest['uses-feature'].push({
        $: { 'android:name': 'android.hardware.touchscreen', 'android:required': 'false' },
      });
    }

    const application = manifest.application[0];
    const mainActivity = application.activity.find(
      (a) => a.$['android:name'] === '.MainActivity'
    );
    const launcherFilter = mainActivity['intent-filter'].find((f) =>
      f.action?.some((a) => a.$['android:name'] === 'android.intent.action.MAIN')
    );
    const hasLeanbackCategory = launcherFilter.category.some(
      (c) => c.$['android:name'] === 'android.intent.category.LEANBACK_LAUNCHER'
    );
    if (!hasLeanbackCategory) {
      launcherFilter.category.push({
        $: { 'android:name': 'android.intent.category.LEANBACK_LAUNCHER' },
      });
    }

    return config;
  });
};
