const { withAndroidManifest } = require('@expo/config-plugins');

// Playlists downloaded by loadPlaylist (src/utils/playlist-loader.ts) can be
// tens of MB of raw M3U text. React Native's networking bridge reads the
// whole HTTP response into a native byte[] before JS ever sees it, and that
// single allocation is what OOM-kills the app on stock Android TV heap
// limits (~192-256MB) — largeHeap raises the process heap ceiling so that
// allocation has room to succeed.
module.exports = function withLargeHeap(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application[0];
    application.$['android:largeHeap'] = 'true';
    return config;
  });
};
