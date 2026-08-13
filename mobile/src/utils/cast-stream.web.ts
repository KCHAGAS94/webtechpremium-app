import type { VideoPlayer } from 'expo-video';

// Same reasoning as cast-button.web.tsx: react-native-google-cast's native
// module registration crashes the moment it's imported on web (no such
// platform support in the library), so this file avoids importing it at all
// and just reports "no cast device" — Metro picks this .web.ts file over
// cast-stream.ts for web builds.
type Options = {
  url: string | null | undefined;
  contentType?: string;
  title: string;
  isLive: boolean;
  player: VideoPlayer;
};

export function useCastStream(_options: Options): { isCasting: boolean; castState: string } {
  return { isCasting: false, castState: 'noDevicesAvailable' };
}
