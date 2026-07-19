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
import { Spacing, glowGold } from '@/constants/theme';
import { track } from '@/features/analytics/analytics';
import { fetchShortTitle, plantDream } from '@/features/dreams/api';
import { useDreamDraftStore } from '@/store/dream-draft-store';

const SEED_DROP_DISTANCE = 260;

export default function PlantingCeremonyScreen() {
  const reducedMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<'capsule' | 'ready' | 'ceremony'>('capsule');
  const [capsuleText, setCapsuleText] = useState('');
  const [ceremonyDone, setCeremonyDone] = useState(false);

  const seedY = useSharedValue(-SEED_DROP_DISTANCE);
  const seedOpacity = useSharedValue(0);
  const affirmationOpacity = useSharedValue(0);

  const plantMutation = useMutation({
    mutationFn: async () => {
      const { dreamText, sceneText, vividnessScore } = useDreamDraftStore.getState();
      // The coach names the wish in 2-5 words; fall back to truncation so
      // planting never fails because of the AI.
      const title = await fetchShortTitle(dreamText)
        .then((r) => r.shortTitle.trim() || dreamText)
        .catch(() => (dreamText.length > 60 ? `${dreamText.slice(0, 57)}…` : dreamText));
      return plantDream({
        title,
        wishText: dreamText,
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
          Sealed until harvest day. Only future-you will read it.
        </ThemedText>
        <Card>
          <TextField
            placeholder="Dear future me — if you’re reading this, it happened…"
            value={capsuleText}
            onChangeText={setCapsuleText}
            multiline
          />
        </Card>
        <Button label="Seal it in" onPress={() => setPhase('ready')} />
        <Button
          label="Plant without a note"
          variant="ghost"
          onPress={() => {
            setCapsuleText('');
            setPhase('ready');
          }}
        />
      </Screen>
    );
  }

  // ── Ready (3e): the breath before the ceremony ────────────────────────────
  if (phase === 'ready') {
    const wish = useDreamDraftStore.getState().dreamText;
    return (
      <Screen style={styles.container}>
        <View style={styles.readyBlock}>
          <ThemedText type="micro" themeColor="textSecondary" style={styles.affirmation}>
            {wish.length > 40 ? `${wish.slice(0, 37)}…` : wish}
          </ThemedText>
          <ThemedText type="heading" style={styles.affirmation}>
            Ready to plant{'\n'}your seed?
          </ThemedText>
        </View>

        <View style={styles.readyScene}>
          <View style={[styles.readySeed, glowGold(18, 0.5)]} />
          <View style={styles.mound} />
          <View style={styles.saucer} />
        </View>

        <ThemedText themeColor="textSecondary" style={[styles.affirmation, styles.quote]}>
          “{Branding.affirmation}”
        </ThemedText>

        <Button label="Plant the seed" onPress={() => setPhase('ceremony')} />
        <Button label="Not yet" variant="ghost" onPress={() => router.back()} />
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
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: BrandPalette.warmBrown,
  },
  readyBlock: {
    gap: Spacing.two,
  },
  readyScene: {
    alignItems: 'center',
    gap: Spacing.four,
  },
  readySeed: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: BrandPalette.warmBrown,
  },
  mound: {
    width: 120,
    height: 44,
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: BrandPalette.warmBrown,
  },
  saucer: {
    width: 160,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(185, 138, 94, 0.35)',
    marginTop: -Spacing.four + 4,
  },
  quote: {
    fontStyle: 'italic',
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
