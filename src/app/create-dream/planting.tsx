import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Spark } from '@/components/spark';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Branding } from '@/config/branding';
import { BrandPalette } from '@/constants/brand-palette';
import { Spacing } from '@/constants/theme';
import { track } from '@/features/analytics/analytics';
import { plantDream } from '@/features/dreams/api';
import { useDreamDraftStore } from '@/store/dream-draft-store';

const SEED_DROP_DISTANCE = 260;

export default function PlantingCeremonyScreen() {
  const reducedMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<'capsule' | 'ceremony'>('capsule');
  const [capsuleText, setCapsuleText] = useState('');
  const [ceremonyDone, setCeremonyDone] = useState(false);

  const seedY = useSharedValue(-SEED_DROP_DISTANCE);
  const seedOpacity = useSharedValue(0);
  const affirmationOpacity = useSharedValue(0);

  const plantMutation = useMutation({
    mutationFn: async () => {
      const { dreamText, sceneText, vividnessScore } = useDreamDraftStore.getState();
      const title = dreamText.length > 60 ? `${dreamText.slice(0, 57)}…` : dreamText;
      return plantDream({
        title,
        sceneText,
        vividnessScore: vividnessScore ?? 0,
        capsuleText: capsuleText.trim() || undefined,
      });
    },
    onSuccess: (dream) => {
      queryClient.invalidateQueries({ queryKey: ['dreams'] });
      track('dream_planted', { starter: dream.is_starter_dream });
    },
  });

  useEffect(() => {
    if (phase !== 'ceremony') return;
    plantMutation.mutate();

    const finishCeremony = () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCeremonyDone(true);
    };

    if (reducedMotion) {
      seedOpacity.value = 1;
      seedY.value = 0;
      affirmationOpacity.value = 1;
      finishCeremony();
      return;
    }

    seedOpacity.value = withTiming(1, { duration: 400 });
    seedY.value = withSequence(
      withTiming(0, { duration: 1400, easing: Easing.bounce }),
      withTiming(0, { duration: 100 }, (finished) => {
        if (finished) runOnJS(finishCeremony)();
      })
    );
    affirmationOpacity.value = withDelay(1800, withTiming(1, { duration: 800 }));
    // Run the ceremony exactly once, when the capsule step hands over.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const seedStyle = useAnimatedStyle(() => ({
    opacity: seedOpacity.value,
    transform: [{ translateY: seedY.value }],
  }));

  const affirmationStyle = useAnimatedStyle(() => ({
    opacity: affirmationOpacity.value,
  }));

  const handleEnterGarden = () => {
    useDreamDraftStore.getState().reset();
    router.dismissAll();
    // On web dismissAll only pops the nested create-dream stack; make sure we
    // actually land on the garden before presenting the paywall.
    router.navigate('/');
    // The emotional peak: show the Full Bloom paywall once, always dismissable.
    router.push('/paywall');
  };

  if (phase === 'capsule') {
    return (
      <Screen style={styles.container}>
        <ThemedText type="title" style={styles.affirmation}>
          Tuck a note inside
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.affirmation}>
          A time capsule, sealed until the day you harvest this dream. Only future-you will read
          it.
        </ThemedText>
        <Card>
          <TextField
            label="For harvest day (optional)"
            placeholder="Dear future me — if you’re reading this, it happened…"
            value={capsuleText}
            onChangeText={setCapsuleText}
            multiline
          />
        </Card>
        <Button label="Plant my dream" onPress={() => setPhase('ceremony')} />
        <Button
          label="Plant without a note"
          variant="ghost"
          onPress={() => {
            setCapsuleText('');
            setPhase('ceremony');
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen style={styles.container}>
      <View style={styles.ceremonyArea}>
        <Animated.View style={[styles.seed, seedStyle]} />
        <View style={styles.soil} />
        <Spark size={28} style={styles.spark} />
      </View>

      <Animated.View style={[styles.affirmationBlock, affirmationStyle]}>
        <ThemedText type="subtitle" style={styles.affirmation}>
          {Branding.affirmation}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.sayAloud}>
          {Branding.sayItAloudPrompt}
        </ThemedText>
      </Animated.View>

      {plantMutation.error ? (
        <>
          <ThemedText themeColor="danger" style={styles.error}>
            Your dream couldn’t be saved just now.
          </ThemedText>
          <Button label="Try again" onPress={() => plantMutation.mutate()} />
        </>
      ) : (
        <Button
          label="Enter your garden"
          disabled={!ceremonyDone || plantMutation.isPending}
          loading={plantMutation.isPending && ceremonyDone}
          onPress={handleEnterGarden}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    gap: Spacing.five,
  },
  ceremonyArea: {
    height: 320,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  seed: {
    width: 36,
    height: 46,
    borderRadius: 18,
    backgroundColor: BrandPalette.warmBrown,
    marginBottom: -20,
    zIndex: 1,
  },
  soil: {
    width: 160,
    height: 44,
    borderRadius: 22,
    backgroundColor: BrandPalette.deepGreen,
    opacity: 0.9,
  },
  spark: {
    position: 'absolute',
    top: 40,
    right: '28%',
  },
  affirmationBlock: {
    gap: Spacing.two,
  },
  affirmation: {
    textAlign: 'center',
  },
  sayAloud: {
    textAlign: 'center',
  },
  error: {
    textAlign: 'center',
  },
});
