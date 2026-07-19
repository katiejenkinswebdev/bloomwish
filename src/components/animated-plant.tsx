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

import { PlantGlyph, type PlantGlyphProps } from '@/components/plant-glyph';
import { Motion, glowGold } from '@/constants/theme';
import { useResolvedScheme } from '@/hooks/use-theme';

/**
 * The living plant of the Day & Night Garden: the shape-drawn glyph breathing
 * on a slow sway (pivoting at the soil line, night ~1.5× slower) with the
 * gold spark glow pulsing behind a thriving bloom.
 *
 * Interim step toward the full Lottie plant (leaf-level sway, perk, unfurl) —
 * same props as PlantGlyph so screens can swap freely.
 */
export function AnimatedPlant({ state, health, size = 96, bloomColor }: PlantGlyphProps) {
  const reducedMotion = useReducedMotion();
  const scheme = useResolvedScheme();
  const sway = useSharedValue(0);
  const glow = useSharedValue(0);

  const swayPeriod = scheme === 'night' ? Motion.swayNight : Motion.swayDay;
  const stillPlant = reducedMotion || health === 'dormant';

  useEffect(() => {
    if (stillPlant) {
      sway.value = 0;
      glow.value = 0;
      return;
    }
    sway.value = withRepeat(
      withTiming(1, { duration: swayPeriod, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    glow.value = withRepeat(
      withTiming(1, { duration: Motion.glowPulse, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [glow, stillPlant, sway, swayPeriod]);

  const swayStyle = useAnimatedStyle(() => {
    const angle = (sway.value - 0.5) * 5; // ±2.5° around the resting pose
    return {
      transform: [
        // Pivot at the soil line, not the glyph center.
        { translateY: size / 2 },
        { rotate: `${angle}deg` },
        { translateY: -size / 2 },
      ],
    };
  });

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + glow.value * 0.45,
  }));

  const showGlow = state === 'blooming' && health === 'thriving' && !reducedMotion;

  return (
    <View style={{ width: size, height: size }}>
      {showGlow ? (
        <Animated.View
          style={[
            styles.bloomGlow,
            {
              width: size * 0.3,
              height: size * 0.3,
              borderRadius: size * 0.15,
              top: size * 0.02,
              left: size * 0.35,
            },
            glowGold(Math.max(14, size * 0.2), 0.5),
            glowStyle,
          ]}
        />
      ) : null}
      <Animated.View style={stillPlant ? undefined : swayStyle}>
        <PlantGlyph state={state} health={health} size={size} bloomColor={bloomColor} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  bloomGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(233, 180, 76, 0.28)',
  },
});
