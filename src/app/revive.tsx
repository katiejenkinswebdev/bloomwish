import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

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

import { AnimatedPlant } from '@/components/animated-plant';
import { bloomColorFor } from '@/features/dreams/bloom-color';
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

  // The no-shame doorway (3k) comes before the two quiet minutes.
  const [phase, setPhase] = useState<'intro' | 'ritual'>('intro');
  const [secondsLeft, setSecondsLeft] = useState(REVIVE_SECONDS);
  const isComplete = phase === 'ritual' && secondsLeft <= 0;

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
    if (phase !== 'ritual' || isComplete) return;
    const interval = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(interval);
  }, [phase, isComplete]);

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

  // ── Intro (3k): resting, not gone — never shame ──────────────────────────
  if (phase === 'intro') {
    return (
      <Screen style={[styles.container, styles.nightScreen]}>
        <View style={styles.wiltedPlant}>
          <AnimatedPlant
            state={dream?.state ?? 'growing'}
            health="wilting"
            bloomColor={dream ? bloomColorFor(dream.id) : undefined}
            size={130}
          />
        </View>
        <ThemedText type="heading" style={[styles.centered, styles.nightText]}>
          {dream?.title ?? 'Your dream'} is resting,{'\n'}not gone.
        </ThemedText>
        <ThemedText style={[styles.centered, styles.nightSubtle, styles.italic]}>
          Dreams go quiet sometimes. A little water brings the color back — whenever you&apos;re
          ready.
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          onPress={() => setPhase('ritual')}
          style={({ pressed }) => [styles.sageButton, { opacity: pressed ? 0.85 : 1 }]}>
          <ThemedText type="smallBold" style={styles.sageButtonLabel}>
            Begin the revive ritual
          </ThemedText>
        </Pressable>
        <View style={styles.introLinks}>
          <ThemedText
            type="smallBold"
            style={styles.nightSubtle}
            onPress={() =>
              dreamId
                ? router.replace({ pathname: '/release', params: { dreamId } })
                : goBackOrHome()
            }>
            Release with gratitude
          </ThemedText>
          <ThemedText type="smallBold" style={styles.nightSubtle} onPress={() => goBackOrHome()}>
            Let it rest
          </ThemedText>
        </View>
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
  nightScreen: {
    backgroundColor: '#241C29',
  },
  nightText: {
    color: '#FBF3E7',
  },
  nightSubtle: {
    color: '#C7B9CC',
    textAlign: 'center',
  },
  italic: {
    fontStyle: 'italic',
  },
  wiltedPlant: {
    alignSelf: 'center',
    opacity: 0.75,
  },
  sageButton: {
    minHeight: 52,
    borderRadius: Spacing.three,
    backgroundColor: BrandPalette.sage,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  sageButtonLabel: {
    color: '#241C29',
  },
  introLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.four,
  },
});
