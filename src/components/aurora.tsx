import { useEffect } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
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

/**
 * The dusk-sky backdrop of the immersion world: slow-drifting aurora orbs
 * and a softly breathing glow. Shared by the immersion ritual and the
 * onboarding taste of it.
 */

/** One slow-drifting aurora orb of the night backdrop. */
export function AuroraOrb({
  size,
  color,
  opacity,
  top,
  left,
  duration,
  delay,
}: {
  size: number;
  color: string;
  opacity: number;
  top: number;
  left: number;
  duration: number;
  delay: number;
}) {
  const reducedMotion = useReducedMotion();
  const drift = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    drift.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: drift.value * 44 }, { translateX: drift.value * -26 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity,
          top,
          left,
        },
        style,
      ]}
    />
  );
}

/** The breathing glow behind the words. */
export function BreathGlow() {
  const reducedMotion = useReducedMotion();
  const breath = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    breath.value = withRepeat(
      withTiming(1, { duration: 5600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.92 + breath.value * 0.16 }],
    opacity: 0.1 + breath.value * 0.08,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.glow, style]}
    />
  );
}


/** Full-bleed night screen wrapper with the standard three orbs. */
export function AuroraBackdrop({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.screen, style]} {...rest}>
      <AuroraOrb size={340} color={BrandPalette.deepGreen} opacity={0.28} top={-80} left={-90} duration={11000} delay={0} />
      <AuroraOrb size={300} color={BrandPalette.dustyPink} opacity={0.16} top={220} left={180} duration={14000} delay={900} />
      <AuroraOrb size={240} color={BrandPalette.gold} opacity={0.1} top={480} left={-60} duration={12500} delay={1700} />
      <BreathGlow />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#1F1830',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    alignSelf: 'center',
    top: '30%',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: BrandPalette.sage,
  },
});
