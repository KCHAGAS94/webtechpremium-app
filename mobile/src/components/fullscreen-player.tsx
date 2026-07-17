import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useEvent } from 'expo';
import { VideoView, type VideoPlayer } from 'expo-video';
import * as Brightness from 'expo-brightness';

import { SeekBar } from '@/components/seek-bar';
import { ThemedText } from '@/components/themed-text';
import { VerticalSlider } from '@/components/vertical-slider';
import { loadSubtitleSettings } from '@/utils/subtitle-settings-storage';

const AUTO_HIDE_MS = 4000;
const SKIP_SECONDS = 10;
const LIVE_EDGE_THRESHOLD_SECONDS = 10;

type Props = {
  player: VideoPlayer;
  title: string;
  onClose: () => void;
  /** How far behind the live edge playback is, in seconds (see content-browser-screen.tsx). */
  offsetFromLive: number | null;
  onGoLive: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  /** Undefined when the current channel list has 1 or 0 entries — nothing to cycle to. */
  onNextChannel?: () => void;
  onPreviousChannel?: () => void;
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

/**
 * Fully custom fullscreen overlay (not expo-video's native `enterFullscreen`,
 * which renders OS-native chrome the JS side can't add buttons to or sync
 * auto-hide timing with). Owns play/pause, seek, and volume/brightness
 * sliders so all of them can fade out together after inactivity.
 */
export function FullscreenPlayer({
  player,
  title,
  onClose,
  offsetFromLive,
  onGoLive,
  isFavorite,
  onToggleFavorite,
  onNextChannel,
  onPreviousChannel,
}: Props) {
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [brightness, setBrightness] = useState(1);
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
  const isLive = player.isLive || !Number.isFinite(duration) || duration <= 0;

  // timeUpdate is opt-in (emits every `timeUpdateEventInterval` seconds, 0 =
  // disabled) but it's enabled by the parent (content-browser-screen), which
  // owns `player` across fullscreen open/close — enabling/disabling it here
  // too would turn it off the moment this component unmounts, breaking the
  // preview's own "voltar ao vivo" detection after the user exits fullscreen.

  // "habilitar legendas" in Configurações is global (AsyncStorage-backed) —
  // there's no manual subtitle toggle on live TV, so this is the only place
  // the setting takes effect: auto-select the first track once available.
  const autoSubtitlesAppliedRef = useRef(false);
  useEffect(() => {
    if (autoSubtitlesAppliedRef.current || availableSubtitleTracks.length === 0) return;
    loadSubtitleSettings().then((settings) => {
      if (!settings.enabled || autoSubtitlesAppliedRef.current) return;
      autoSubtitlesAppliedRef.current = true;
      player.subtitleTrack = availableSubtitleTracks[0];
    });
  }, [availableSubtitleTracks, player]);

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

  // Keep controls visible while scrubbing a slider/seek bar; resume the
  // auto-hide countdown as soon as the user lets go.
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

  const handleGoLive = useCallback(() => {
    onGoLive();
    showControls();
  }, [onGoLive, showControls]);

  const isBehindLive = isLive && !!offsetFromLive && offsetFromLive > LIVE_EDGE_THRESHOLD_SECONDS;

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <StatusBar hidden />
      <View style={styles.container}>
        {status !== 'error' && (
          <Pressable style={StyleSheet.absoluteFill} onPress={handleTapVideo}>
            <VideoView style={StyleSheet.absoluteFill} player={player} nativeControls={false} contentFit="contain" />
          </Pressable>
        )}

        {status === 'loading' && (
          <View style={styles.statusOverlay} pointerEvents="none">
            <ActivityIndicator color="#4dd6ff" size="large" />
          </View>
        )}

        {status === 'error' && (
          <View style={styles.statusOverlay}>
            <ThemedText style={styles.errorText}>
              Não foi possível carregar o canal{error?.message ? `: ${error.message}` : '.'}
            </ThemedText>
            <TouchableOpacity onPress={onClose} style={styles.errorBackButton}>
              <ThemedText style={styles.errorBackButtonText}>Voltar</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {controlsVisible && (
          <View style={styles.overlay} pointerEvents="box-none">
            <TouchableOpacity style={styles.topBar} onPress={onClose} activeOpacity={0.75}>
              <View style={styles.backButton}>
                <ThemedText style={styles.backIcon}>‹</ThemedText>
              </View>
              <ThemedText style={styles.title} numberOfLines={1}>
                {title}
              </ThemedText>
              <TouchableOpacity onPress={onToggleFavorite} hitSlop={12} style={styles.favoriteButton}>
                <ThemedText style={[styles.favoriteIcon, isFavorite && styles.favoriteIconActive]}>
                  {isFavorite ? '♥' : '♡'}
                </ThemedText>
              </TouchableOpacity>
            </TouchableOpacity>

            <View style={styles.middleRow} pointerEvents="box-none">
              <VerticalSlider
                icon="☀"
                value={brightness}
                onChange={handleBrightnessChange}
                onInteractionStart={handleScrubStart}
                onInteractionEnd={handleScrubEnd}
                accessibilityLabel="Brilho"
              />

              <View style={styles.centerControls}>
                {!isLive && (
                  <TouchableOpacity onPress={() => handleSkip(-SKIP_SECONDS)} style={styles.controlButton}>
                    <ThemedText style={styles.controlIcon}>⏪</ThemedText>
                  </TouchableOpacity>
                )}
                {onPreviousChannel && (
                  <TouchableOpacity
                    onPress={() => {
                      onPreviousChannel();
                      showControls();
                    }}
                    style={styles.controlButton}
                  >
                    <ThemedText style={styles.controlIcon}>⏮</ThemedText>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={handleTogglePlayPause} style={styles.playButton}>
                  <ThemedText style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</ThemedText>
                </TouchableOpacity>
                {onNextChannel && (
                  <TouchableOpacity
                    onPress={() => {
                      onNextChannel();
                      showControls();
                    }}
                    style={styles.controlButton}
                  >
                    <ThemedText style={styles.controlIcon}>⏭</ThemedText>
                  </TouchableOpacity>
                )}
                {!isLive && (
                  <TouchableOpacity onPress={() => handleSkip(SKIP_SECONDS)} style={styles.controlButton}>
                    <ThemedText style={styles.controlIcon}>⏩</ThemedText>
                  </TouchableOpacity>
                )}
              </View>

              <VerticalSlider
                icon="🔊"
                value={volume}
                onChange={handleVolumeChange}
                onInteractionStart={handleScrubStart}
                onInteractionEnd={handleScrubEnd}
                accessibilityLabel="Volume"
              />
            </View>

            <View style={styles.bottomBar}>
              {isLive ? (
                isBehindLive ? (
                  <TouchableOpacity style={styles.goLiveBadge} onPress={handleGoLive}>
                    <View style={styles.liveDot} />
                    <ThemedText style={styles.goLiveBadgeText}>Toque para voltar ao vivo</ThemedText>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.liveBadge}>
                    <ThemedText style={styles.liveBadgeText}>AO VIVO</ThemedText>
                  </View>
                )
              ) : (
                <>
                  <ThemedText style={styles.time}>{formatTime(currentTime)}</ThemedText>
                  <SeekBar
                    progress={progress}
                    onSeek={handleSeek}
                    onScrubStart={handleScrubStart}
                    onScrubEnd={handleScrubEnd}
                  />
                  <ThemedText style={styles.time}>{formatTime(duration)}</ThemedText>
                </>
              )}
            </View>
          </View>
        )}
      </View>
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
  errorBackButton: {
    borderWidth: 1,
    borderColor: '#4dd6ff',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  errorBackButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4dd6ff',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backIcon: {
    fontSize: 24,
    color: '#fff',
    marginTop: -2,
  },
  favoriteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  favoriteIcon: {
    fontSize: 18,
    color: '#fff',
  },
  favoriteIconActive: {
    color: '#e63946',
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
  },
  controlButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlIcon: {
    fontSize: 26,
    color: '#fff',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
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
  liveBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#e63946',
  },
  liveBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  goLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(230, 57, 70, 0.85)',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  goLiveBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
});
