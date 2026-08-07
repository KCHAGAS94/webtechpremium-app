import { useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

// Same reasoning as vertical-slider.tsx's `focused` state: this was a
// drag-only touch target (plain View, not focusable), so a TV remote's D-pad
// couldn't even land on it, let alone show that it had. `focusable` below
// lets focus reach it at all; this highlight is what makes that visible.

type Props = {
  progress: number; // 0-1
  onSeek: (fraction: number) => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
};

/**
 * Horizontal drag/seek bar. Mirrors vertical-slider.tsx's PanResponder
 * approach (delta-from-gesture-start), plus a local "scrubbing" fraction so
 * dragging shows an immediate visual preview without spamming the player
 * with a `currentTime` write on every pixel of movement - only on release.
 */
export function SeekBar({ progress, onSeek, onScrubStart, onScrubEnd }: Props) {
  const [scrubFraction, setScrubFraction] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);

  const progressRef = useRef(progress);
  progressRef.current = progress;
  const trackWidthRef = useRef(0);
  const startFractionRef = useRef(progress);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startFractionRef.current = progressRef.current;
        setScrubFraction(progressRef.current);
        onScrubStart?.();
      },
      onPanResponderMove: (_evt, gestureState) => {
        if (trackWidthRef.current <= 0) return;
        const delta = gestureState.dx / trackWidthRef.current;
        const next = Math.min(1, Math.max(0, startFractionRef.current + delta));
        setScrubFraction(next);
      },
      onPanResponderRelease: () => {
        setScrubFraction((current) => {
          if (current !== null) onSeek(current);
          return null;
        });
        onScrubEnd?.();
      },
      onPanResponderTerminate: () => {
        setScrubFraction(null);
        onScrubEnd?.();
      },
    })
  ).current;

  const displayFraction = scrubFraction ?? progress;

  return (
    <View
      style={styles.track}
      onLayout={(e) => {
        trackWidthRef.current = e.nativeEvent.layout.width;
      }}
      focusable
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      {...panResponder.panHandlers}
    >
      <View style={[styles.trackBackground, focused && styles.trackBackgroundFocused]} />
      <View style={[styles.trackFill, { width: `${displayFraction * 100}%` }]} />
      <View style={[styles.thumb, { left: `${displayFraction * 100}%` }, focused && styles.thumbFocused]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flex: 1,
    height: 28,
    justifyContent: 'center',
  },
  trackBackground: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  trackBackgroundFocused: {
    height: 6,
    backgroundColor: 'rgba(77,214,255,0.35)',
  },
  trackFill: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4dd6ff',
  },
  thumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: -7,
    backgroundColor: '#fff',
  },
  thumbFocused: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginLeft: -9,
    borderWidth: 2,
    borderColor: '#4dd6ff',
  },
});
