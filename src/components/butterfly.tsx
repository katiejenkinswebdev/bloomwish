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

import { BrandPalette } from '@/constants/brand-palette';

export interface ButterflyProps {
  size?: number;
  /** Gold for legendary/trophy butterflies, dusty pink for visits. */
  color?: string;
  /** Stagger offset so a kaleidoscope of butterflies doesn't flap in sync. */
  index?: number;
  drift?: boolean;
}

/** A softly fluttering butterfly — trophies earn one forever. */
export function Butterfly({
  size = 22,
  color = BrandPalette.dustyPink,
  index = 0,
  drift = true,
}: ButterflyProps) {
  const reducedMotion = useReducedMotion();
  const flap = useSharedValue(0);
  const float = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    flap.value = withDelay(
      index * 240,
      withRepeat(withTiming(1, { duration: 260, easing: Easing.inOut(Easing.quad) }), -1, true)
    );
    if (drift) {
      float.value = withDelay(
        index * 400,
        withRepeat(
          withTiming(1, { duration: 2600 + (index % 4) * 500, easing: Easing.inOut(Easing.sin) }),
          -1,
          true
        )
      );
    }
  }, [flap, float, index, drift, reducedMotion]);

  const leftWing = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${(reducedMotion ? 0.5 : flap.value) * 60}deg` }],
  }));
  const rightWing = useAnimatedStyle(() => ({
    transform: [{ rotateY: `-${(reducedMotion ? 0.5 : flap.value) * 60}deg` }],
  }));
  const body = useAnimatedStyle(() => ({
    transform: [
      { translateY: reducedMotion ? 0 : float.value * -8 },
      { translateX: reducedMotion ? 0 : float.value * 5 },
    ],
  }));

  const wing = {
    width: size * 0.45,
    height: size * 0.7,
    borderRadius: size * 0.3,
    backgroundColor: color,
  };

  return (
    <Animated.View style={[styles.container, { width: size, height: size }, body]}>
      <Animated.View style={[wing, leftWing]} />
      <View
        style={{
          width: size * 0.12,
          height: size * 0.7,
          borderRadius: size * 0.06,
          backgroundColor: BrandPalette.plum,
        }}
      />
      <Animated.View style={[wing, rightWing]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
