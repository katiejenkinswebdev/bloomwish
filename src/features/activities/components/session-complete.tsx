import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
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
}: SessionCompleteProps) {
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  // Gentle, occasional — not every time (spec: "prompt gently … occasionally").
  const [nudgeRoll] = useState(() => Math.random());
  const showSignNudge = !!onLogSign && nudgeRoll < 0.35;

  return (
    <View style={styles.container}>
      <View style={styles.plantArea}>
        {[0, 1, 2, 3].map((i) => (
          <Droplet key={i} index={i} />
        ))}
        <PlantGlyph state={plantState} health="thriving" size={120} />
      </View>

      {stateAdvanced ? (
        <ThemedText type="smallBold" themeColor="accent" style={styles.centered}>
          ✦ Your plant just grew ✦
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
    height: 180,
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
