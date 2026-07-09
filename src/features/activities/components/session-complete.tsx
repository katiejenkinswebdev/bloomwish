import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { maybeGrantReward, type GrantedReward } from '@/features/rewards/api';
import { DelightMoment } from '@/features/rewards/components/delight-moment';
import { useIsFullBloom } from '@/features/purchases/entitlements';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { PlantGlyph } from '@/components/plant-glyph';
import { Spark } from '@/components/spark';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Branding } from '@/config/branding';
import { Spacing } from '@/constants/theme';
import type { DreamState } from '@/lib/supabase/database.types';

// Horizontal spread of the rain, centered over the plant (px from box center).
const DROPLET_OFFSETS = [-30, -12, 6, 24, 40];
const PLANT_BOX_WIDTH = 140;
const DROPLET_WIDTH = 8;

function Droplet({ index }: { index: number }) {
  const reducedMotion = useReducedMotion();
  const fall = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    fall.value = withDelay(
      index * 260,
      // Gentle rain for as long as the moment is on screen.
      withRepeat(withTiming(1, { duration: 1100, easing: Easing.in(Easing.quad) }), -1, false)
    );
  }, [fall, index, reducedMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 0 : fall.value < 0.05 ? 0 : 1 - fall.value * 0.7,
    transform: [{ translateY: fall.value * 110 }],
  }));

  const left =
    PLANT_BOX_WIDTH / 2 - DROPLET_WIDTH / 2 + DROPLET_OFFSETS[index % DROPLET_OFFSETS.length];

  return <Animated.View style={[styles.droplet, { left }, style]} pointerEvents="none" />;
}

function NourishMote({ index }: { index: number }) {
  const reducedMotion = useReducedMotion();
  const rise = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    rise.value = withDelay(
      index * 320,
      // Golden nourishment drifting up through the plant while the moment is on screen.
      withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }), -1, false)
    );
  }, [rise, index, reducedMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 0 : rise.value < 0.06 ? 0 : 1 - rise.value * 0.85,
    transform: [{ translateY: rise.value * -120 }, { scale: 0.7 + rise.value * 0.5 }],
  }));

  const left =
    PLANT_BOX_WIDTH / 2 - 6 + DROPLET_OFFSETS[index % DROPLET_OFFSETS.length];

  return (
    <Animated.View style={[styles.mote, { left }, style]} pointerEvents="none">
      <Spark size={12} />
    </Animated.View>
  );
}

export interface SessionCompleteProps {
  plantState: DreamState;
  stateAdvanced: boolean;
  onDone: () => void;
  onLogSign?: () => void;
  dreamId?: string;
  /** Points granted after the daily cap — 0 means the garden is full for today. */
  grantedBoost?: number;
  /** Water rains down; feed sends golden nourishment up through the plant. */
  variant?: 'water' | 'feed';
}

/**
 * The shared session-completion moment: watering droplets on the plant, the
 * affirmation, and — occasionally — a gentle nudge to log a Sign.
 */
export function SessionComplete({
  plantState,
  stateAdvanced,
  onDone,
  onLogSign,
  dreamId,
  grantedBoost,
  variant = 'water',
}: SessionCompleteProps) {
  const isFullBloom = useIsFullBloom();
  const [reward, setReward] = useState<GrantedReward | null>(null);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    maybeGrantReward('session_complete', { includeLegendary: isFullBloom, dreamId })
      .then(setReward)
      .catch(() => {});
    // Roll exactly once per completion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Gentle, occasional — not every time (spec: "prompt gently … occasionally").
  const [nudgeRoll] = useState(() => Math.random());
  const showSignNudge = !!onLogSign && nudgeRoll < 0.35;

  return (
    <View style={styles.container}>
      <View style={styles.plantArea}>
        <View style={styles.plantBox}>
          {[0, 1, 2, 3, 4].map((i) =>
            variant === 'feed' ? <NourishMote key={i} index={i} /> : <Droplet key={i} index={i} />
          )}
          <PlantGlyph state={plantState} health="thriving" size={120} />
        </View>
      </View>

      {stateAdvanced ? (
        <ThemedText type="smallBold" themeColor="accent" style={styles.centered}>
          ✦ Your plant just grew ✦
        </ThemedText>
      ) : null}

      {grantedBoost === 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
          Your garden has soaked up all it can hold today — it will grow from tomorrow’s
          tending. Every session still counts for you.
        </ThemedText>
      ) : null}

      <ThemedText type="subtitle" style={styles.centered}>
        {Branding.affirmation}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.centered}>
        {Branding.sayItAloudPrompt}
      </ThemedText>

      {showSignNudge ? (
        <Button label="Noticed any signs lately?" variant="secondary" onPress={onLogSign} />
      ) : null}

      <Button label="Done" onPress={onDone} />

      <DelightMoment reward={reward} onClose={() => setReward(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.four,
  },
  plantArea: {
    alignItems: 'center',
  },
  plantBox: {
    width: PLANT_BOX_WIDTH,
    height: 180,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  mote: {
    position: 'absolute',
    bottom: 24,
  },
  droplet: {
    position: 'absolute',
    top: 0,
    width: 8,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#7FB7D9',
  },
  centered: {
    textAlign: 'center',
  },
});
