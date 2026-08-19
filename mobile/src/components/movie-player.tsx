import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useEvent } from 'expo';
import { VideoView, type VideoPlayer } from 'expo-video';
import * as Brightness from 'expo-brightness';
import * as NavigationBar from 'expo-navigation-bar';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CastButton } from '@/components/cast-button';
import { ExitConfirmModal } from '@/components/exit-confirm-modal';
import { PlayerControlButton } from '@/components/player-control-button';
import { SeekBar } from '@/components/seek-bar';
import { SubtitleOverlay } from '@/components/subtitle-overlay';
import { ThemedText } from '@/components/themed-text';
import { VerticalSlider } from '@/components/vertical-slider';
import { useCastStream } from '@/utils/cast-stream';
import { fetchSubtitleCues } from '@/utils/subdl-api';
import type { SubtitleCue } from '@/utils/srt-parser';
import { loadSubtitleSettings, type SubtitleSettings } from '@/utils/subtitle-settings-storage';

const DEFAULT_SUBTITLE_STYLE: SubtitleSettings = {
  enabled: false,
  fontSize: 12,
  textColor: '#ffffff',
  backgroundEnabled: true,
  backgroundColor: '#000000',
};

const AUTO_HIDE_MS = 4000;
const SKIP_SECONDS = 10;
const SKIP_MINUTE_SECONDS = 60;
const MAX_PLAYBACK_RETRIES = 2;
const PLAYBACK_RETRY_DELAY_MS = 1500;

type Props = {
  player: VideoPlayer;
  title: string;
  /** Raw stream URL — handed to the Chromecast receiver as-is when the user
   * casts (see cast-stream.ts); expo-video never sees this directly. */
  streamUrl: string;
  year?: string | null;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClose: () => void;
  /** Query used to search OpenSubtitles — defaults to `title`, but for
   * series episodes `title` is "Show - S01E02" (display-only), which never
   * matches a real subtitle; pass the plain show name here instead. */
  subtitleSearchTitle?: string;
  /** Season/episode of the episode being played — required alongside
   * subtitleSearchTitle for SubDL to search as a TV episode instead of a
   * movie. Omit for actual movies. */
  subtitleSeason?: number;
  subtitleEpisode?: number;
};

function formatTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

// Reused for all four skip buttons (±10s, ±1min) — `label` is what tells
// otherwise-identical ⏪/⏩ icons apart, since holding a button down isn't a
// thing on a D-pad (every skip amount needs its own button, not a
// press-and-hold gesture like a touch scrubber would use).
function SkipButton({
  seconds,
  icon,
  label,
  onPress,
  onFocus,
}: {
  seconds: number;
  icon: string;
  label: string;
  onPress: (seconds: number) => void;
  onFocus?: () => void;
}) {
  return (
    <PlayerControlButton
      onPress={() => onPress(seconds)}
      style={styles.controlButton}
      focusedStyle={styles.controlButtonFocused}
      onFocus={onFocus}
    >
      <ThemedText style={styles.controlIcon}>{icon}</ThemedText>
      <ThemedText style={styles.controlLabel}>{label}</ThemedText>
    </PlayerControlButton>
  );
}

/**
 * Fullscreen VOD player for Movies (and future Series) — kept separate from
 * FullscreenPlayer (which stays Live TV-only) because VOD needs its own
 * top-bar tools (info, subtitles/audio, resize) that don't apply to a live
 * stream, and it always shows seek/skip controls instead of branching on
 * `isLive`.
 */
export function MoviePlayer({
  player,
  title,
  streamUrl,
  year,
  isFavorite,
  onToggleFavorite,
  onClose,
  subtitleSearchTitle,
  subtitleSeason,
  subtitleEpisode,
}: Props) {
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [brightness, setBrightness] = useState(1);
  const [confirmingExit, setConfirmingExit] = useState(false);
  const [subtitleCues, setSubtitleCues] = useState<SubtitleCue[]>([]);
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleSettings>(DEFAULT_SUBTITLE_STYLE);
  const [subtitlesOn, setSubtitlesOn] = useState(false);
  const [subtitlesLoading, setSubtitlesLoading] = useState(false);
  // Explicit feedback for the 💬 button — without it, a "no subtitle found"
  // result looks identical to the button silently doing nothing.
  const [subtitleToast, setSubtitleToast] = useState<string | null>(null);
  const subtitleToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  useKeepAwake();

  useEffect(() => {
    NavigationBar.setPositionAsync('absolute');
    NavigationBar.setBehaviorAsync('overlay-swipe');
    NavigationBar.setVisibilityAsync('hidden');
    return () => {
      NavigationBar.setVisibilityAsync('visible');
      NavigationBar.setPositionAsync('relative');
    };
  }, []);

  const showSubtitleToast = useCallback((message: string) => {
    setSubtitleToast(message);
    if (subtitleToastTimerRef.current) clearTimeout(subtitleToastTimerRef.current);
    subtitleToastTimerRef.current = setTimeout(() => setSubtitleToast(null), 3000);
  }, []);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const { volume } = useEvent(player, 'volumeChange', { volume: player.volume });
  const { currentTime } = useEvent(player, 'timeUpdate', {
    currentTime: player.currentTime,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
    bufferedPosition: player.bufferedPosition,
  });
  const { status, error } = useEvent(player, 'statusChange', { status: player.status, error: undefined });
  const { availableSubtitleTracks } = useEvent(player, 'availableSubtitleTracksChange', {
    availableSubtitleTracks: player.availableSubtitleTracks,
    oldAvailableSubtitleTracks: undefined,
  });
  const duration = player.duration;

  // Some of this provider's catalog entries fail with a transient error the
  // first time (a 404 while the CDN's signed redirect token is still being
  // generated, a momentary edge-cache miss, ...) but play fine a moment
  // later — as opposed to genuinely dead/removed content, where every retry
  // fails the same way. Silently retrying a couple of times before showing
  // the error screen fixes the former without meaningfully delaying the
  // latter (a real dead link just takes a few extra seconds to report as
  // broken instead of failing instantly).
  const retryCountRef = useRef(0);
  const [retrying, setRetrying] = useState(false);
  useEffect(() => {
    if (status !== 'error') {
      retryCountRef.current = 0;
      setRetrying(false);
      return;
    }
    if (retryCountRef.current >= MAX_PLAYBACK_RETRIES) {
      setRetrying(false);
      return;
    }
    retryCountRef.current += 1;
    setRetrying(true);
    const resumeFrom = player.currentTime;
    const timer = setTimeout(() => {
      player
        .replaceAsync({ uri: streamUrl, headers: { 'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18' } })
        .then(() => {
          if (resumeFrom > 0) player.currentTime = resumeFrom;
          player.play();
        })
        .catch(() => {});
    }, PLAYBACK_RETRY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [status, player, streamUrl]);

  useCastStream({ url: streamUrl, title, isLive: false, player });

  // Only loaded for style (font size/color) here — "habilitar legendas"
  // itself is applied explicitly below, once, via the same code path the
  // 💬 button uses, so both give the same feedback instead of the initial
  // auto-enable silently skipping the toast/fetch-retry logic.
  //
  // The saved font size/color only apply while "habilitar legendas" itself
  // is on in Configurações — turning that off but still switching subtitles
  // on for this one playback (the 💬 button) falls back to the plain
  // default look instead of a stale custom style the user just told the
  // app they don't want active.
  useEffect(() => {
    let cancelled = false;
    loadSubtitleSettings().then((settings) => {
      if (!cancelled) setSubtitleStyle(settings.enabled ? settings : DEFAULT_SUBTITLE_STYLE);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Turns subtitles on: prefers our own fetched SubDL cues, rendered through
  // SubtitleOverlay, so the size/color/background the user picked in
  // Configurações actually shows up — expo-video's native subtitleTrack
  // rendering (used below as a fallback) is a fixed OS-drawn style that
  // can't be customized at all (confirmed against the SDK docs), so leaning
  // on it first silently ignored every subtitle setting whenever the stream
  // happened to carry an embedded track. Only falls back to that native
  // track when SubDL has nothing for this title. Always reports what
  // happened via a toast — re-running this on every toggle-on (not gated to
  // "once per playback") is what lets a failed attempt be retried by just
  // toggling again.
  const activateSubtitles = useCallback(async () => {
    if (subtitleCues.length > 0) {
      showSubtitleToast('Legenda ativada');
      return;
    }
    setSubtitlesLoading(true);
    const { cues, connectionError } = await fetchSubtitleCues({
      title: subtitleSearchTitle ?? title,
      year,
      season: subtitleSeason,
      episode: subtitleEpisode,
    });
    setSubtitlesLoading(false);
    if (cues.length > 0) {
      setSubtitleCues(cues);
      showSubtitleToast('Legenda encontrada');
      return;
    }
    if (availableSubtitleTracks.length > 0) {
      if (!player.subtitleTrack) player.subtitleTrack = availableSubtitleTracks[0];
      showSubtitleToast('Legenda ativada (estilo padrão do player — não encontramos uma legenda para aplicar seu estilo)');
      return;
    }
    showSubtitleToast(
      connectionError ? 'Erro de conexão ao buscar legenda' : 'Legenda não encontrada para este título'
    );
  }, [
    availableSubtitleTracks,
    player,
    subtitleCues.length,
    subtitleSearchTitle,
    subtitleSeason,
    subtitleEpisode,
    title,
    year,
    showSubtitleToast,
  ]);

  // "habilitar legendas" in Configurações auto-activates once per playback,
  // through the same `activateSubtitles` the button uses.
  const autoActivatedRef = useRef(false);
  useEffect(() => {
    if (autoActivatedRef.current) return;
    loadSubtitleSettings().then((settings) => {
      if (!settings.enabled || autoActivatedRef.current) return;
      autoActivatedRef.current = true;
      setSubtitlesOn(true);
      activateSubtitles();
    });
    // Deliberately runs once (empty deps) — `activateSubtitles` closing over
    // stale initial values here is fine, since at mount time there's nothing
    // to be stale over yet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleSubtitles = useCallback(() => {
    if (subtitlesOn) {
      setSubtitlesOn(false);
      if (player.subtitleTrack) player.subtitleTrack = null;
      showSubtitleToast('Legenda desativada');
      return;
    }
    setSubtitlesOn(true);
    activateSubtitles();
  }, [subtitlesOn, player, activateSubtitles, showSubtitleToast]);

  useEffect(() => {
    return () => {
      if (subtitleToastTimerRef.current) clearTimeout(subtitleToastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    player.timeUpdateEventInterval = 1;
    return () => {
      // The player can already be torn down natively by the time this runs
      // (e.g. it errored out right before unmount), in which case writing to
      // it throws "shared object already released" instead of no-op'ing.
      try {
        player.timeUpdateEventInterval = 0;
      } catch {}
    };
  }, [player]);

  useEffect(() => {
    let cancelled = false;
    Brightness.getBrightnessAsync().then((current) => {
      if (!cancelled) setBrightness(current);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    hideTimer.current = setTimeout(() => setControlsVisible(false), AUTO_HIDE_MS);
  }, [clearHideTimer]);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    if (isScrubbing) {
      clearHideTimer();
    } else {
      scheduleHide();
    }
    return clearHideTimer;
  }, [isScrubbing, clearHideTimer, scheduleHide]);

  const handleTapVideo = useCallback(() => {
    if (controlsVisible) {
      clearHideTimer();
      setControlsVisible(false);
    } else {
      showControls();
    }
  }, [controlsVisible, clearHideTimer, showControls]);

  const handleTogglePlayPause = useCallback(() => {
    if (player.playing) player.pause();
    else player.play();
    showControls();
  }, [player, showControls]);

  const handleSkip = useCallback(
    (seconds: number) => {
      player.seekBy(seconds);
      showControls();
    },
    [player, showControls]
  );

  const handleSeek = useCallback(
    (fraction: number) => {
      if (duration > 0) player.currentTime = fraction * duration;
    },
    [player, duration]
  );

  const handleVolumeChange = useCallback(
    (next: number) => {
      player.volume = next;
    },
    [player]
  );

  const handleBrightnessChange = useCallback((next: number) => {
    setBrightness(next);
    Brightness.setBrightnessAsync(next).catch(() => {});
  }, []);

  const handleScrubStart = useCallback(() => setIsScrubbing(true), []);
  const handleScrubEnd = useCallback(() => setIsScrubbing(false), []);

  const handleRequestExit = useCallback(() => setConfirmingExit(true), []);
  const handleCancelExit = useCallback(() => setConfirmingExit(false), []);

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <Modal
      visible
      animationType="fade"
      onRequestClose={handleRequestExit}
      statusBarTranslucent
      navigationBarTranslucent
      onShow={() => {
        NavigationBar.setPositionAsync('absolute');
        NavigationBar.setBehaviorAsync('overlay-swipe');
        NavigationBar.setVisibilityAsync('hidden');
      }}
    >
      <StatusBar hidden />
      <View style={styles.container}>
        {(status !== 'error' || retrying) && (
          // focusable only while controls are hidden: while they're visible,
          // a focusable fullscreen view here would grab the TV remote's
          // default D-pad focus and block navigation to the actual control
          // buttons. While hidden there's nothing else on screen to focus at
          // all, so nothing previously caught a remote press — hasTVPreferredFocus
          // here means OK (and any D-pad move, since it's the only focusable
          // view) always lands back on this catcher and reopens the controls.
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleTapVideo}
            focusable={Platform.isTV ? !controlsVisible : undefined}
            hasTVPreferredFocus={Platform.isTV ? !controlsVisible : undefined}
          >
            <VideoView style={StyleSheet.absoluteFill} player={player} nativeControls={false} contentFit="contain" />
          </Pressable>
        )}

        {(status === 'loading' || retrying) && (
          <View style={styles.statusOverlay} pointerEvents="none">
            <ActivityIndicator color="#4dd6ff" size="large" />
          </View>
        )}

        {status === 'error' && !retrying && (
          <View style={styles.statusOverlay}>
            <ThemedText style={styles.errorText}>
              Não foi possível carregar o filme{error?.message ? `: ${error.message}` : '.'}
            </ThemedText>
            <PlayerControlButton
              onPress={onClose}
              style={styles.errorBackButton}
              focusedStyle={styles.errorBackButtonFocused}
              autoFocus
              onFocus={showControls}
            >
              <ThemedText style={styles.errorBackButtonText}>Voltar</ThemedText>
            </PlayerControlButton>
          </View>
        )}

        {subtitleToast && (
          <View style={styles.toast} pointerEvents="none">
            <ThemedText style={styles.toastText}>{subtitleToast}</ThemedText>
          </View>
        )}

        {subtitlesOn && subtitleCues.length > 0 && (
          <SubtitleOverlay
            cues={subtitleCues}
            currentTime={currentTime}
            fontSize={subtitleStyle.fontSize}
            textColor={subtitleStyle.textColor}
            backgroundColor={subtitleStyle.backgroundEnabled ? subtitleStyle.backgroundColor : null}
          />
        )}

        {controlsVisible && (
          <View style={styles.overlay} pointerEvents="box-none">
            <View style={[styles.topBar, { paddingTop: insets.top + 16 }]}>
              <PlayerControlButton
                style={styles.topBarLeft}
                focusedStyle={styles.iconButtonFocused}
                onPress={handleRequestExit}
                hitSlop={12}
                onFocus={showControls}
              >
                <View style={styles.iconButton}>
                  <ThemedText style={styles.backIcon}>‹</ThemedText>
                </View>
                <View style={styles.titleGroup}>
                  <ThemedText style={styles.title} numberOfLines={1}>
                    {title}
                    {year ? ` (${year})` : ''}
                  </ThemedText>
                </View>
              </PlayerControlButton>

              <View style={styles.topBarRight}>
                <PlayerControlButton
                  onPress={handleToggleSubtitles}
                  hitSlop={4}
                  style={styles.iconButton}
                  focusedStyle={styles.iconButtonFocused}
                  onFocus={showControls}
                >
                  {subtitlesLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <ThemedText style={[styles.toolIcon, subtitlesOn && styles.toolIconActive]}>💬</ThemedText>
                  )}
                </PlayerControlButton>
                <CastButton />
                <PlayerControlButton
                  onPress={onToggleFavorite}
                  hitSlop={4}
                  style={styles.iconButton}
                  focusedStyle={styles.iconButtonFocused}
                  onFocus={showControls}
                >
                  <ThemedText style={[styles.toolIcon, isFavorite && styles.toolIconActive]}>
                    {isFavorite ? '♥' : '♡'}
                  </ThemedText>
                </PlayerControlButton>
              </View>
            </View>

            <View style={styles.middleRow} pointerEvents="box-none">
              {!Platform.isTV && (
                <VerticalSlider
                  icon="☀"
                  value={brightness}
                  onChange={handleBrightnessChange}
                  onInteractionStart={handleScrubStart}
                  onInteractionEnd={handleScrubEnd}
                  accessibilityLabel="Brilho"
                />
              )}

              <View style={styles.centerControls}>
                <SkipButton
                  seconds={-SKIP_MINUTE_SECONDS}
                  icon="⏪"
                  label="1min"
                  onPress={handleSkip}
                  onFocus={showControls}
                />
                <SkipButton
                  seconds={-SKIP_SECONDS}
                  icon="⏪"
                  label="10s"
                  onPress={handleSkip}
                  onFocus={showControls}
                />
                <PlayerControlButton
                  onPress={handleTogglePlayPause}
                  style={styles.playButton}
                  focusedStyle={styles.playButtonFocused}
                  autoFocus
                  onFocus={showControls}
                >
                  <ThemedText style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</ThemedText>
                </PlayerControlButton>
                <SkipButton
                  seconds={SKIP_SECONDS}
                  icon="⏩"
                  label="10s"
                  onPress={handleSkip}
                  onFocus={showControls}
                />
                <SkipButton
                  seconds={SKIP_MINUTE_SECONDS}
                  icon="⏩"
                  label="1min"
                  onPress={handleSkip}
                  onFocus={showControls}
                />
              </View>

              {!Platform.isTV && (
                <VerticalSlider
                  icon="🔊"
                  value={volume}
                  onChange={handleVolumeChange}
                  onInteractionStart={handleScrubStart}
                  onInteractionEnd={handleScrubEnd}
                  accessibilityLabel="Volume"
                />
              )}
            </View>

            <View style={styles.bottomBar}>
              <ThemedText style={styles.time}>{formatTime(currentTime)}</ThemedText>
              <SeekBar
                progress={progress}
                onSeek={handleSeek}
                onScrubStart={handleScrubStart}
                onScrubEnd={handleScrubEnd}
              />
              <ThemedText style={styles.time}>{formatTime(duration)}</ThemedText>
            </View>
          </View>
        )}
      </View>

      {confirmingExit && <ExitConfirmModal onConfirm={onClose} onCancel={handleCancelExit} />}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'space-between',
  },
  statusOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  errorText: {
    fontSize: 15,
    color: '#fff',
    textAlign: 'center',
  },
  toast: {
    position: 'absolute',
    top: 70,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  toastText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  errorBackButton: {
    borderWidth: 1,
    borderColor: '#4dd6ff',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  errorBackButtonFocused: {
    borderWidth: 2,
    borderColor: '#4dd6ff',
    backgroundColor: '#132a4d',
  },
  errorBackButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4dd6ff',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 40,
    paddingTop: 16,
  },
  topBarLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleGroup: {
    flex: 1,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  iconButtonFocused: {
    borderWidth: 2,
    borderColor: '#4dd6ff',
    borderRadius: 18,
  },
  backIcon: {
    fontSize: 24,
    color: '#fff',
    marginTop: -2,
  },
  toolIcon: {
    fontSize: 17,
    color: '#fff',
  },
  toolIconActive: {
    color: '#4dd6ff',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: Platform.isTV ? 'center' : 'space-between',
    paddingHorizontal: 56,
  },
  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonFocused: {
    borderWidth: 2,
    borderColor: '#4dd6ff',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  controlIcon: {
    fontSize: 20,
    color: '#fff',
    lineHeight: 22,
  },
  controlLabel: {
    fontSize: 9,
    color: '#fff',
    lineHeight: 11,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  playButtonFocused: {
    borderWidth: 2,
    borderColor: '#4dd6ff',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  playIcon: {
    fontSize: 28,
    color: '#fff',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  time: {
    fontSize: 12,
    color: '#fff',
    minWidth: 44,
  },
});
