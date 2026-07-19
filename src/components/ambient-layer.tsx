import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Spark } from '@/components/spark';
import { Motion, glowGold } from '@/constants/theme';
import { useResolvedScheme, useTheme } from '@/hooks/use-theme';

/**
 * The screen-wide ambient weather of the Day & Night Garden. Day: gold pollen
 * motes drifting upward. Night: a moon top-right and a handful of glowing
 * fireflies. Budget ≤5% visual weight; frozen entirely under Reduce Motion.
 * Render as the first child of a screen — it covers the background and never
 * intercepts touches.
 */

// Deterministic spots (fractions of screen) so ambience doesn't jump between renders.
const FIREFLY_SPOTS = [
  { x: 0.14, y: 0.16, size: 6 },
  { x: 0.78, y: 0.12, size: 5 },
  { x: 0.6, y: 0.3, size: 4 },
  { x: 0.22, y: 0.48, size: 5 },
  { x: 0.84, y: 0.58, size: 4 },
  { x: 0.32, y: 0.74, size: 4 },
] as const;

const MOTE_SPOTS = [
  { x: 0.2, y: 0.28, delay: 0 },
  { x: 0.72, y: 0.2, delay: 3200 },
  { x: 0.48, y: 0.5, delay: 6100 },
  { x: 0.86, y: 0.42, delay: 1700 },
  { x: 0.12, y: 0.66, delay: 4600 },
] as const;

function NightFirefly({ index, spot }: { index: number; spot: (typeof FIREFLY_SPOTS)[number] }) {
  const reducedMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const drift = useSharedValue(0);

  const period = Motion.fireflyMin + (index % 4) * ((Motion.fireflyMax - Motion.fireflyMin) / 3);

  useEffect(() => {
    if (reducedMotion) return;
    drift.value = withDelay(
      index * 700,
      withRepeat(withTiming(1, { duration: period, easing: Easing.inOut(Easing.sin) }), -1, true)
    );
  }, [drift, index, period, reducedMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.3 + drift.value * 0.65,
    transform: [
      { translateX: drift.value * (index % 2 === 0 ? 10 : -10) },
      { translateY: drift.value * -12 },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        { left: spot.x * width, top: spot.y * height },
        glowGold(16, 0.5),
        style,
      ]}>
      <Spark size={spot.size + 4} />
    </Animated.View>
  );
}

function PollenMote({ spot }: { spot: (typeof MOTE_SPOTS)[number] }) {
  const reducedMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const rise = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    rise.value = withDelay(
      spot.delay,
      withRepeat(withTiming(1, { duration: 11000, easing: Easing.linear }), -1, false)
    );
  }, [rise, reducedMotion, spot.delay]);

  const style = useAnimatedStyle(() => ({
    // Fade in, drift up ~60px, fade out — the canvas `mote` keyframes.
    opacity: rise.value < 0.2 ? rise.value * 3.5 : 0.7 - (rise.value - 0.2) * 0.7,
    transform: [{ translateX: rise.value * 14 }, { translateY: rise.value * -60 }],
  }));

  return (
    <Animated.View
      style={[styles.particle, styles.mote, { left: spot.x * width, top: spot.y * height }, style]}
    />
  );
}

function Moon() {
  const theme = useTheme();
  return (
    <View style={styles.moonWrapper}>
      <View style={styles.moonDisc} />
      <View style={[styles.moonShade, { backgroundColor: theme.background }]} />
    </View>
  );
}

export function AmbientLayer() {
  const scheme = useResolvedScheme();

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}>
      {scheme === 'night' ? (
        <>
          <Moon />
          {FIREFLY_SPOTS.map((spot, i) => (
            <NightFirefly key={i} index={i} spot={spot} />
          ))}
        </>
      ) : (
        MOTE_SPOTS.map((spot, i) => <PollenMote key={i} spot={spot} />)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
  },
  mote: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E9B44C',
  },
  moonWrapper: {
    position: 'absolute',
    top: 64,
    right: 36,
    width: 38,
    height: 38,
  },
  moonDisc: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FBF3E7',
    opacity: 0.9,
  },
  moonShade: {
    position: 'absolute',
    top: -4,
    right: 6,
    width: 38,
    height: 38,
    borderRadius: 19,
  },
});
