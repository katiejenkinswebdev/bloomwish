import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { goBackOrHome } from '@/lib/navigation';
import * as Haptics from 'expo-haptics';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Branding } from '@/config/branding';
import { BrandPalette } from '@/constants/brand-palette';
import { Spacing } from '@/constants/theme';
import { fetchDreams } from '@/features/dreams/api';
import { reviveDream } from '@/features/dreams/signs';

const REVIVE_SECONDS = 120;

/**
 * The re-commitment ritual: two quiet minutes with the dream's scene,
 * breathing with it. Completing it lifts dormancy — dreams never die here.
 */
export default function ReviveScreen() {
  const { dreamId } = useLocalSearchParams<{ dreamId: string }>();
  const queryClient = useQueryClient();
  const reducedMotion = useReducedMotion();

  const [secondsLeft, setSecondsLeft] = useState(REVIVE_SECONDS);
  const isComplete = secondsLeft <= 0;

  const dreamsQuery = useQuery({ queryKey: ['dreams'], queryFn: fetchDreams });
  const dream = dreamsQuery.data?.find((d) => d.id === dreamId);

  const reviveMutation = useMutation({
    mutationFn: () => reviveDream(dreamId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dreams'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', dreamId] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  useEffect(() => {
    if (isComplete) return;
    const interval = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(interval);
  }, [isComplete]);

  useEffect(() => {
    if (isComplete && dreamId && !reviveMutation.isPending && reviveMutation.isIdle) {
      reviveMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete, dreamId]);

  const breath = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) return;
    breath.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [breath, reducedMotion]);

  const breathStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reducedMotion ? 1 : 0.8 + breath.value * 0.35 }],
    opacity: 0.5 + breath.value * 0.4,
  }));

  const minutes = Math.floor(Math.max(0, secondsLeft) / 60);
  const seconds = Math.max(0, secondsLeft) % 60;

  if (isComplete) {
    return (
      <Screen style={styles.container}>
        <ThemedText type="title" style={styles.centered}>
          Welcome back
        </ThemedText>
        <ThemedText type="subtitle" style={styles.centered}>
          {Branding.affirmation}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.centered}>
          {Branding.sayItAloudPrompt}
        </ThemedText>
        {reviveMutation.error ? (
          <>
            <ThemedText themeColor="danger" style={styles.centered}>
              Couldn’t save the revival — let’s try once more.
            </ThemedText>
            <Button label="Try again" onPress={() => reviveMutation.mutate()} />
          </>
        ) : (
          <Button
            label="Return to your garden"
            loading={reviveMutation.isPending}
            onPress={() => goBackOrHome()}
          />
        )}
      </Screen>
    );
  }

  return (
    <Screen style={styles.container}>
      <ThemedText type="subtitle" style={styles.centered}>
        Re-committing to your dream
      </ThemedText>

      <View style={styles.breathArea}>
        <Animated.View style={[styles.breathCircle, breathStyle]} />
        <ThemedText type="title">{`${minutes}:${String(seconds).padStart(2, '0')}`}</ThemedText>
      </View>

      {dream?.scene_text ? (
        <Card>
          <ThemedText type="small" style={styles.scene}>
            {dream.scene_text}
          </ThemedText>
        </Card>
      ) : null}

      <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
        Breathe with the circle. Let the dream feel real again.
      </ThemedText>

      <Button label="Not now" variant="ghost" onPress={() => goBackOrHome()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    gap: Spacing.four,
  },
  centered: {
    textAlign: 'center',
  },
  breathArea: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breathCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: BrandPalette.sage,
  },
  scene: {
    fontStyle: 'italic',
  },
});
