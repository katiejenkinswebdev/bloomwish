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

const DROP_COUNT = 14;

// Deterministic pseudo-random spread so render stays pure.
const drops = Array.from({ length: DROP_COUNT }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%` as const,
  delay: (i * 173) % 1400,
  duration: 1100 + ((i * 97) % 500),
}));

function Drop({
  left,
  delay,
  duration,
  snow,
}: {
  left: `${number}%`;
  delay: number;
  duration: number;
  snow: boolean;
}) {
  const fall = useSharedValue(0);

  useEffect(() => {
    fall.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: 0.35 * (1 - fall.value * 0.6),
    transform: [{ translateY: -40 + fall.value * 520 }],
  }));

  return (
    <Animated.View
      style={[snow ? styles.flake : styles.drop, { left }, style]}
      pointerEvents="none"
    />
  );
}

/**
 * A gentle rain (or snow) falling over the garden when the weather mirror is
 * on and it's really precipitating outside. Purely decorative — never blocks
 * touches, and stays still under reduced motion.
 */
export function RainOverlay({ snow = false }: { snow?: boolean }) {
  const reducedMotion = useReducedMotion();
  if (reducedMotion) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {drops.map((d, i) => (
        <Drop key={i} left={d.left} delay={d.delay} duration={d.duration} snow={snow} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  drop: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: 14,
    borderRadius: 1,
    backgroundColor: '#7FA8C9',
  },
  flake: {
    position: 'absolute',
    top: 0,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E8EEF4',
  },
});
