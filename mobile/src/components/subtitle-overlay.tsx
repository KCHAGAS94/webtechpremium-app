import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { SubtitleCue } from '@/utils/srt-parser';

type Props = {
  cues: SubtitleCue[];
  currentTime: number;
  fontSize: number;
  textColor: string;
  backgroundColor: string | null;
};

// Purely presentational: finds whichever cue covers `currentTime` and draws
// it above the bottom bar. Sits outside the `controlsVisible` gate in the
// player so captions don't disappear when the transport controls auto-hide.
export function SubtitleOverlay({ cues, currentTime, fontSize, textColor, backgroundColor }: Props) {
  const activeCue = cues.find((cue) => currentTime >= cue.start && currentTime <= cue.end);
  if (!activeCue) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <Text
        style={[
          styles.text,
          { fontSize, color: textColor },
          backgroundColor ? { backgroundColor } : null,
        ]}
      >
        {activeCue.text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 70,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  text: {
    textAlign: 'center',
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: 'hidden',
  },
});
