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
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Branding } from '@/config/branding';
import { Spacing } from '@/constants/theme';
import type { DreamState } from '@/lib/supabase/database.types';

function Droplet({ index }: { index: number }) {
  const reducedMotion = useReducedMotion();
  const fall = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    fall.value = withDelay(
      index * 300,
      withRepeat(withTiming(1, { duration: 1100, easing: Easing.in(Easing.quad) }), 3, false)
    );
  }, [fall, index, reducedMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 0 : fall.value < 0.05 ? 0 : 1 - fall.value * 0.7,
    transform: [{ translateY: fall.value * 90 }],
  }));

  return (
    <Animated.View
      style={[styles.droplet, { left: 30 + ((index * 37) % 60) }, style]}
      pointerEvents="none"
    />
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
          {[0, 1, 2, 3].map((i) => (
            <Droplet key={i} index={i} />
          ))}
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
          tending. Every session still counts for you. 🌙
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
    width: 140,
    height: 180,
    alignItems: 'center',
    justifyContent: 'flex-end',
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
