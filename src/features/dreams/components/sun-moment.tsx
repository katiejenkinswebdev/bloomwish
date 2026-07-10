import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { PlantGlyph } from '@/components/plant-glyph';
import { Spark } from '@/components/spark';
import { BrandPalette } from '@/constants/brand-palette';
import type { DreamState } from '@/lib/supabase/database.types';

/**
 * The sun leans toward the plant — shown when a real-world Sign is logged.
 * A warm gold sun pulses behind the plant with drifting sparks.
 */
export function SunMoment({
  plantState,
  bloomColor,
}: {
  plantState: DreamState;
  bloomColor?: string;
}) {
  const reducedMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    pulse.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [pulse, reducedMotion]);

  const sunStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + (reducedMotion ? 0.2 : pulse.value * 0.4),
    transform: [{ scale: reducedMotion ? 1 : 0.95 + pulse.value * 0.12 }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.sun, sunStyle]} />
      <Spark size={18} style={[styles.ray, { top: 8, left: '22%' }]} />
      <Spark size={12} style={[styles.ray, { top: 34, right: '20%' }]} />
      <Spark size={10} style={[styles.ray, { bottom: 46, left: '16%' }]} />
      <PlantGlyph state={plantState} health="thriving" bloomColor={bloomColor} size={110} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    width: 220,
    height: 200,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  sun: {
    position: 'absolute',
    top: 0,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: BrandPalette.gold,
  },
  ray: {
    position: 'absolute',
  },
});
