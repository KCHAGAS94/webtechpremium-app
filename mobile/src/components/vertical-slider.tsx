import { useRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

const TRACK_HEIGHT = 110;

type Props = {
  value: number; // 0-1
  onChange: (value: number) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  icon: string;
  accessibilityLabel: string;
};

/**
 * Vertical drag slider (volume/brightness). Uses PanResponder (built into
 * React Native, no extra native dependency) and tracks movement as a delta
 * from the value at gesture-start, so it never needs to measure the track's
 * absolute position on screen.
 */
export function VerticalSlider({
  value,
  onChange,
  onInteractionStart,
  onInteractionEnd,
  icon,
  accessibilityLabel,
}: Props) {
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const startValueRef = useRef(value);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startValueRef.current = valueRef.current;
        onInteractionStart?.();
      },
      onPanResponderMove: (_evt, gestureState) => {
        const delta = -gestureState.dy / TRACK_HEIGHT;
        const next = Math.min(1, Math.max(0, startValueRef.current + delta));
        onChangeRef.current(next);
      },
      onPanResponderRelease: () => onInteractionEnd?.(),
      onPanResponderTerminate: () => onInteractionEnd?.(),
    })
  ).current;

  return (
    <View style={styles.container}>
      <ThemedText style={styles.icon}>{icon}</ThemedText>
      <View style={styles.track} accessibilityLabel={accessibilityLabel} {...panResponder.panHandlers}>
        <View style={styles.trackBackground} />
        <View style={[styles.trackFill, { height: `${value * 100}%` }]} />
        <View style={[styles.thumb, { bottom: `${value * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 15,
    color: '#fff',
  },
  track: {
    width: 36,
    height: TRACK_HEIGHT,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  trackBackground: {
    position: 'absolute',
    width: 4,
    height: '100%',
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  trackFill: {
    position: 'absolute',
    bottom: 0,
    width: 4,
    borderRadius: 2,
    backgroundColor: '#4dd6ff',
  },
  thumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#fff',
  },
});
