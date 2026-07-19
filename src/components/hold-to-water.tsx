import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { AnimatedPlant } from '@/components/animated-plant';
import { ThemedText } from '@/components/themed-text';
import { BrandPalette } from '@/constants/brand-palette';
import { Motion, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { DreamHealth, DreamState } from '@/lib/supabase/database.types';

/** Total held milliseconds to finish one watering. */
const HOLD_TO_COMPLETE_MS = 3000;
const TICK_MS = 50;
const DROPLET_PERIOD_MS = 1400;

export interface HoldToWaterProps {
  dreamTitle: string;
  plantState: DreamState;
  health: DreamHealth;
  bloomColor?: string;
  /** Fires once when the hold reaches 100%. */
  onComplete: () => void;
}

function Droplet({ index, active }: { index: number; active: boolean }) {
  const fall = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      fall.value = 0;
      return;
    }
    fall.value = 0;
    fall.value = withRepeat(
      withTiming(1, { duration: DROPLET_PERIOD_MS, easing: Easing.linear }),
      -1,
      false
    );
  }, [active, fall]);

  const style = useAnimatedStyle(() => ({
    opacity: active ? (fall.value < 0.15 ? fall.value * 6 : 0.9 - fall.value * 0.9) : 0,
    transform: [{ translateY: fall.value * 56 }],
  }));

  return (
    <Animated.View
      style={[styles.droplet, { right: 58 + (index - 1) * 8, top: 42 }, style]}
    />
  );
}

/**
 * The watering moment (4c): the payoff of every session. Press and hold —
 * droplets fall, haptics tick with the drips, the soil drinks. Release early
 * and the progress stays; the plant settles taller when the bar fills.
 */
export function HoldToWater({ dreamTitle, plantState, health, bloomColor, onComplete }: HoldToWaterProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  const buttonScale = useSharedValue(1);
  const breathe = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastHaptic = useRef(0);
  const progressRef = useRef(0);

  useEffect(() => {
    if (reducedMotion) return;
    breathe.value = withRepeat(
      withTiming(1, { duration: Motion.glowPulse, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [breathe, reducedMotion]);

  useEffect(() => {
    if (!holding || done) return;
    timer.current = setInterval(() => {
      const next = Math.min(1, progressRef.current + TICK_MS / HOLD_TO_COMPLETE_MS);
      progressRef.current = next;
      setProgress(next);
      const nowMs = Date.now();
      if (nowMs - lastHaptic.current > DROPLET_PERIOD_MS / 3) {
        lastHaptic.current = nowMs;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      if (next >= 1) {
        if (timer.current) clearInterval(timer.current);
        setDone(true);
        setHolding(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        onComplete();
      }
    }, TICK_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onComplete identity is not a re-arm signal
  }, [holding, done]);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value * (1 + breathe.value * 0.06) }],
  }));

  return (
    <View style={styles.container}>
      <ThemedText type="micro" themeColor="textSecondary" style={styles.kicker}>
        After your session
      </ThemedText>
      <ThemedText type="heading" style={styles.title}>
        Hold to water{'\n'}
        {dreamTitle}
      </ThemedText>

      <View style={styles.scene}>
        {/* Watering can, pouring while held */}
        <View style={styles.can}>
          <View style={styles.canBody} />
          <View style={styles.canSpout} />
        </View>
        {[0, 1, 2].map((i) => (
          <Droplet key={i} index={i} active={holding && !done} />
        ))}
        <View style={styles.plantSpot}>
          <AnimatedPlant state={plantState} health={health} bloomColor={bloomColor} size={140} />
          <View style={styles.pot} />
        </View>
      </View>

      <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
        <View
          style={[
            styles.fill,
            { backgroundColor: theme.primary, width: `${Math.round(progress * 100)}%` },
          ]}
        />
      </View>
      <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
        {done
          ? 'The soil drank it all in.'
          : holding
            ? 'Keep holding… the soil is drinking'
            : progress > 0
              ? 'Hold again whenever you like — nothing is lost.'
              : 'Press and hold to pour'}
      </ThemedText>

      <Animated.View style={[styles.holdWrap, buttonStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Hold to water ${dreamTitle}`}
          disabled={done}
          onPressIn={() => {
            setHolding(true);
            buttonScale.value = withSpring(0.96, { damping: 14 });
          }}
          onPressOut={() => {
            setHolding(false);
            buttonScale.value = withSpring(1, { damping: 14 });
          }}
          style={[styles.holdButton, { backgroundColor: theme.primary, opacity: done ? 0.6 : 1 }]}>
          <ThemedText type="smallBold" style={{ color: theme.background, textAlign: 'center' }}>
            {done ? 'Watered' : 'Hold\nto water'}
          </ThemedText>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  kicker: {
    textAlign: 'center',
  },
  title: {
    textAlign: 'center',
  },
  scene: {
    width: 220,
    height: 260,
  },
  can: {
    position: 'absolute',
    top: 0,
    right: 20,
    width: 64,
    height: 40,
  },
  canBody: {
    position: 'absolute',
    top: 8,
    left: 12,
    width: 44,
    height: 28,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    backgroundColor: BrandPalette.deepGreen,
  },
  canSpout: {
    position: 'absolute',
    top: 12,
    left: 0,
    width: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: BrandPalette.deepGreen,
    transform: [{ rotate: '24deg' }],
  },
  droplet: {
    position: 'absolute',
    width: 4,
    height: 8,
    borderRadius: 2,
    backgroundColor: BrandPalette.sage,
  },
  plantSpot: {
    position: 'absolute',
    bottom: 0,
    left: 40,
    alignItems: 'center',
  },
  pot: {
    width: 60,
    height: 36,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    backgroundColor: BrandPalette.warmBrown,
    marginTop: -8,
  },
  track: {
    width: 280,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  hint: {
    textAlign: 'center',
  },
  holdWrap: {
    marginTop: Spacing.two,
  },
  holdButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
