import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { VividnessSeed } from '@/components/vividness-seed';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { generateScene, scoreScene, type CoachScore } from '@/features/dreams/api';
import { useDreamDraftStore } from '@/store/dream-draft-store';

const VIVID_ENOUGH = 70;

export default function SceneScreen() {
  const sceneText = useDreamDraftStore((s) => s.sceneText);
  const score = useDreamDraftStore((s) => s.vividnessScore) ?? 0;
  const [tweakInstruction, setTweakInstruction] = useState('');
  const [scoreDetails, setScoreDetails] = useState<CoachScore | null>(null);

  const regenerateMutation = useMutation({
    mutationFn: async (instruction: string) => {
      const { dreamText, answers } = useDreamDraftStore.getState();
      const scene = await generateScene(dreamText, answers, {
        previousScene: sceneText,
        tweakInstruction: instruction,
      });
      const newScore = await scoreScene(scene.sceneText);
      return { scene, newScore };
    },
    onSuccess: ({ scene, newScore }) => {
      const store = useDreamDraftStore.getState();
      store.setScene(scene.sceneText);
      store.setScore(newScore.score);
      setScoreDetails(newScore);
      setTweakInstruction('');
    },
  });

  // Refreshed or deep-linked without a scene — restart the flow. Navigation
  // must happen after render, never during it.
  useEffect(() => {
    if (!sceneText) router.replace('/create-dream');
  }, [sceneText]);
  if (!sceneText) return null;

  const needsMoreVividness = score < VIVID_ENOUGH;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <VividnessSeed score={score} />

        <ThemedText type="subtitle" style={styles.heading}>
          Your dream, alive
        </ThemedText>

        <Card>
          <ThemedText style={styles.scene}>{sceneText}</ThemedText>
        </Card>

        {scoreDetails?.encouragement ? (
          <ThemedText themeColor="primary" style={styles.encouragement}>
            {scoreDetails.encouragement}
          </ThemedText>
        ) : null}

        {needsMoreVividness ? (
          <Card>
            <ThemedText type="smallBold">Let’s make it glow brighter</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Your seed’s glow grows with sensory detail.
              {scoreDetails?.missing?.length
                ? ` Try adding: ${scoreDetails.missing.join(' · ')}`
                : ' Try adding what you see, hear, or feel in your body.'}
            </ThemedText>
          </Card>
        ) : null}

        <TextField
          label="Want to change anything?"
          value={tweakInstruction}
          onChangeText={setTweakInstruction}
          placeholder="e.g. add the smell of rain, make it sunset"
          multiline
        />

        {regenerateMutation.error ? (
          <ThemedText themeColor="danger">
            {regenerateMutation.error.message || 'Something went wrong. Please try again.'}
          </ThemedText>
        ) : null}

        <Button
          label="Re-imagine it"
          variant="secondary"
          loading={regenerateMutation.isPending}
          disabled={tweakInstruction.trim().length < 3}
          onPress={() => regenerateMutation.mutate(tweakInstruction.trim())}
        />

        <Button
          label="It feels right — plant it"
          disabled={regenerateMutation.isPending}
          onPress={() => router.push('/create-dream/planting')}
        />

        <Button
          label="Edit my answers"
          variant="ghost"
          disabled={regenerateMutation.isPending}
          onPress={() => {
            useDreamDraftStore.getState().popAnswerForEditing();
            router.back();
          }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.three,
    padding: Spacing.four,
    alignItems: 'stretch',
  },
  heading: {
    textAlign: 'center',
  },
  scene: {
    fontStyle: 'italic',
  },
  encouragement: {
    textAlign: 'center',
  },
});
