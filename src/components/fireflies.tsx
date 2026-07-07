import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
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
import { ThemedText } from '@/components/themed-text';

/** Visual cap; beyond this a counter shows instead of more sparks. */
const MAX_VISIBLE_FIREFLIES = 12;

function Firefly({ index, areaSize }: { index: number; areaSize: number }) {
  const reducedMotion = useReducedMotion();
  const drift = useSharedValue(0);

  // Deterministic pseudo-random placement per index so fireflies don't jump
  // between renders.
  const angle = (index * 137.5 * Math.PI) / 180;
  const radius = areaSize * (0.32 + (index % 4) * 0.09);
  const x = areaSize / 2 + Math.cos(angle) * radius;
  const y = areaSize / 2 + Math.sin(angle) * radius * 0.7;

  useEffect(() => {
    if (reducedMotion) return;
    drift.value = withDelay(
      index * 180,
      withRepeat(
        withTiming(1, { duration: 1600 + (index % 5) * 350, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      )
    );
  }, [drift, index, reducedMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.45 + drift.value * 0.55,
    transform: [{ translateY: drift.value * -6 }],
  }));

  return (
    <Animated.View style={[styles.firefly, { left: x, top: y }, style]}>
      <Spark size={8} />
    </Animated.View>
  );
}

export interface FirefliesProps {
  /** Number of Signs logged on this dream. */
  count: number;
  areaSize?: number;
}

/**
 * One glowing firefly per logged Sign, orbiting the plant permanently —
 * capped visually, with a counter beyond the cap.
 */
export function Fireflies({ count, areaSize = 120 }: FirefliesProps) {
  if (count <= 0) return null;
  const visible = Math.min(count, MAX_VISIBLE_FIREFLIES);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.container]}>
      {Array.from({ length: visible }, (_, i) => (
        <Firefly key={i} index={i} areaSize={areaSize} />
      ))}
      {count > MAX_VISIBLE_FIREFLIES ? (
        <ThemedText type="small" themeColor="accent" style={styles.counter}>
          ✦ {count}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'visible',
  },
  firefly: {
    position: 'absolute',
  },
  counter: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
});
