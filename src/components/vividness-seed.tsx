import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { PlantGlyph } from '@/components/plant-glyph';
import { Spark } from '@/components/spark';
import { BrandPalette } from '@/constants/brand-palette';
import type { DreamHealth, DreamState } from '@/lib/supabase/database.types';

export interface VividnessSeedProps {
  /** 0–100. Drives the glow's size and warmth — shown as a glow, never a cold number. */
  score: number;
  size?: number;
  /** When set, the glow surrounds the dream's actual plant instead of the seed. */
  plant?: { state: DreamState; health: DreamHealth; bloomColor?: string };
}

/**
 * The dream seed with the vividness glow: a soft gold halo that grows with
 * the scene's sensory and emotional depth, crowned by the Wishing Seed spark.
 */
export function VividnessSeed({ score, size = 120, plant }: VividnessSeedProps) {
  const reducedMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    pulse.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [pulse, reducedMotion]);

  const intensity = Math.max(0, Math.min(100, score)) / 100;
  const glowSize = size * (0.7 + intensity * 0.9);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + intensity * 0.45 + (reducedMotion ? 0 : pulse.value * 0.15),
    transform: [{ scale: reducedMotion ? 1 : 1 + pulse.value * 0.06 }],
  }));

  const seedWidth = size * 0.34;
  const seedHeight = size * 0.44;

  return (
    <View style={[styles.container, { width: size * 1.8, height: size * 1.8 }]}>
      <Animated.View
        style={[
          glowStyle,
          styles.glow,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            backgroundColor: BrandPalette.gold,
          },
        ]}
      />
      {plant ? (
        <PlantGlyph
          state={plant.state}
          health={plant.health}
          bloomColor={plant.bloomColor}
          size={size * 1.1}
        />
      ) : (
        <>
          <View
            style={{
              width: seedWidth,
              height: seedHeight,
              borderRadius: seedWidth / 2,
              backgroundColor: BrandPalette.warmBrown,
              transform: [{ rotate: '8deg' }],
            }}
          />
          <Spark
            size={size * 0.22}
            style={[styles.spark, { top: size * 0.28, right: size * 0.42 }]}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
  },
  spark: {
    position: 'absolute',
  },
});
