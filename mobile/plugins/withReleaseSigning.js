const { withAppBuildGradle } = require('@expo/config-plugins');

// android/ is wiped and regenerated on every `expo prebuild` (see
// .gitignore), so any signingConfig hand-edited into build.gradle is lost
// the next time prebuild runs — which is exactly what happened once already:
// a real release keystore had been dropped in as android/app/debug.keystore
// (reusing the template's `signingConfigs.debug`) to get gradlew
// bundleRelease signing correctly without touching build.gradle, and a
// `prebuild --clean` silently replaced it with Expo's stock debug keystore,
// producing an .aab Google Play rejected as signed with the wrong key.
//
// This plugin makes the release signing config part of prebuild's own
// output instead: the real keystore lives outside android/ (in
// mobile/credentials/, gitignored, see .gitignore) so it survives every
// regeneration, and its passwords come from mobile/.env.local (also
// gitignored, loaded by the Expo CLI, never the EXPO_PUBLIC_ vars that get
// inlined into the JS bundle) — never hardcoded here since this file is
// committed to git.
const REQUIRED_ENV_VARS = ['MYAPP_RELEASE_STORE_PASSWORD', 'MYAPP_RELEASE_KEY_PASSWORD', 'MYAPP_RELEASE_KEY_ALIAS'];

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);
    if (missing.length > 0) {
      throw new Error(
        `withReleaseSigning: missing ${missing.join(', ')} in mobile/.env.local — release builds would silently ` +
          'sign with the debug keystore again otherwise. See plugins/withReleaseSigning.js.'
      );
    }

    let contents = config.modResults.contents;

    if (!contents.includes('signingConfigs.release')) {
      contents = contents.replace(
        /signingConfigs\s*\{/,
        `signingConfigs {
        release {
            storeFile file('../../credentials/release.keystore')
            storePassword '${process.env.MYAPP_RELEASE_STORE_PASSWORD}'
            keyAlias '${process.env.MYAPP_RELEASE_KEY_ALIAS}'
            keyPassword '${process.env.MYAPP_RELEASE_KEY_PASSWORD}'
        }`
      );
      contents = contents.replace(
        /release\s*\{\s*\/\/ Caution![\s\S]*?signingConfig signingConfigs\.debug/,
        (match) => match.replace('signingConfigs.debug', 'signingConfigs.release')
      );
    }

    config.modResults.contents = contents;
    return config;
  });
};
