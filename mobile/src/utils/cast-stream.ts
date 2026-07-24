import { useEffect, useRef } from 'react';
import type { VideoPlayer } from 'expo-video';
import { MediaStreamType, useCastState, useRemoteMediaClient, CastState } from 'react-native-google-cast';

type Options = {
  /** Direct stream URL — same one handed to expo-video locally. */
  url: string | null | undefined;
  /** MIME type for the receiver. HLS streams (live TV) must say so explicitly;
   * VOD files can pass `undefined` and let the receiver sniff it from the URL. */
  contentType?: string;
  title: string;
  isLive: boolean;
  player: VideoPlayer;
};

/**
 * "Espelhamento de tela" for the player screens: sends the current stream to
 * whatever Chromecast device the user picks via `CastButton`, instead of
 * mirroring the phone/box's actual display (Chromecast has no such API for a
 * third-party app — it can only hand the receiver a media URL to fetch
 * itself). While a cast session is connected, local playback is paused so
 * the same audio doesn't play from both places at once; it resumes local
 * playback automatically when the cast session ends.
 */
export function useCastStream({ url, contentType, title, isLive, player }: Options) {
  const client = useRemoteMediaClient();
  const castState = useCastState();
  const isCasting = !!client;

  // Only reload media on the receiver when the session first connects or the
  // stream itself changes — not on every render, which would restart
  // playback on the TV every time this component re-renders.
  const loadedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!client || !url) return;
    if (loadedUrlRef.current === url) return;
    loadedUrlRef.current = url;

    const wasPlaying = player.playing;
    player.pause();

    client
      .loadMedia({
        autoplay: true,
        mediaInfo: {
          contentUrl: url,
          contentType,
          streamType: isLive ? MediaStreamType.LIVE : MediaStreamType.BUFFERED,
          metadata: {
            type: 'generic',
            title,
          },
        },
      })
      .catch(() => {
        // Load failed (e.g. receiver couldn't reach the stream) — fall back
        // to local playback instead of leaving both screens paused/black.
        loadedUrlRef.current = null;
        if (wasPlaying) player.play();
      });
  }, [client, url, contentType, isLive, title, player]);

  // Session ended (client went from present to null): resume local playback
  // where the receiver left off isn't tracked here, so this just un-pauses —
  // good enough for live TV, and VOD keeps its last local position anyway
  // since `player.pause()` above never touched `currentTime`.
  const wasCastingRef = useRef(false);
  useEffect(() => {
    if (isCasting) {
      wasCastingRef.current = true;
      return;
    }
    if (wasCastingRef.current) {
      wasCastingRef.current = false;
      loadedUrlRef.current = null;
      player.play();
    }
  }, [isCasting, player]);

  return { isCasting, castState: castState ?? CastState.NO_DEVICES_AVAILABLE };
}
