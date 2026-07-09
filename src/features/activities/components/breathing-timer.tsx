import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { BrandPalette } from '@/constants/brand-palette';
import { Spacing } from '@/constants/theme';
import { patternByKey } from '@/features/activities/breath-patterns';

export interface BreathingTimerProps {
  secondsLeft: number;
  patternKey: string;
  paused?: boolean;
  /** Dim styling for the bedtime (SATS) mode. */
  dimmed?: boolean;
}

/**
 * The full-screen breathing visual: a circle that follows the chosen
 * pattern's phases (with a phase label) around the countdown.
 */
export function BreathingTimer({ secondsLeft, patternKey, paused, dimmed }: BreathingTimerProps) {
  const reducedMotion = useReducedMotion();
  const pattern = patternByKey(patternKey);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const scale = useSharedValue(0.8);
  const phase = pattern.phases[phaseIndex % pattern.phases.length];

  // Drive phases on a timer chain; each phase animates the circle to its
  // target scale over its duration.
  useEffect(() => {
    if (paused) return;
    if (!reducedMotion) {
      scale.value = withTiming(phase.scale, {
        duration: phase.ms,
        easing: Easing.inOut(Easing.sin),
      });
    }
    const next = setTimeout(
      () => setPhaseIndex((i) => (i + 1) % pattern.phases.length),
      phase.ms
    );
    return () => clearTimeout(next);
  }, [phaseIndex, paused, pattern, phase, reducedMotion, scale]);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reducedMotion ? 1 : scale.value }],
  }));

  const minutes = Math.floor(Math.max(0, secondsLeft) / 60);
  const seconds = Math.max(0, secondsLeft) % 60;

  return (
    <View style={styles.area}>
      <Animated.View
        style={[
          styles.circle,
          { backgroundColor: dimmed ? '#3B3050' : BrandPalette.sage, opacity: dimmed ? 0.5 : 0.75 },
          circleStyle,
        ]}
      />
      <ThemedText type="title" style={dimmed ? styles.dimText : undefined}>
        {`${minutes}:${String(seconds).padStart(2, '0')}`}
      </ThemedText>
      <ThemedText
        type="small"
        themeColor={dimmed ? undefined : 'textSecondary'}
        style={[styles.phaseLabel, dimmed ? styles.dimText : undefined]}>
        {paused ? 'Paused' : phase.label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  area: {
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
  },
  phaseLabel: {
    marginTop: Spacing.two,
  },
  dimText: {
    color: '#C7B9CC',
  },
});
