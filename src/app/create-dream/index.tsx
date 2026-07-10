import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';

import { DictationButton } from '@/components/dictation-button';
import { SeedIcon } from '@/components/icons';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useDictation } from '@/features/dictation/use-dictation';
import { fetchDeepeningQuestions } from '@/features/dreams/api';
import { useDreamDraftStore } from '@/store/dream-draft-store';
import { useTheme } from '@/hooks/use-theme';

/** Starter seeds — small, believable dreams that make great first practice. */
const SEED_PACKETS = [
  'A kind stranger at just the right moment',
  'The call back I’ve been hoping for',
  'One truly peaceful Sunday',
  'An unexpected little windfall',
  'A compliment that lands deep',
  'The perfect parking spot',
];

export default function DescribeDreamScreen() {
  const theme = useTheme();
  // Deepen mode arrives with the wish already in the store.
  const [deepenDreamId] = useState(() => useDreamDraftStore.getState().deepenDreamId);
  const [dreamText, setDreamText] = useState(() => useDreamDraftStore.getState().dreamText);

  const dictation = useDictation((finalText) => {
    setDreamText((current) => (current ? `${current} ${finalText}` : finalText));
  });

  const questionsMutation = useMutation({
    mutationFn: () => fetchDeepeningQuestions(dreamText.trim()),
    onSuccess: (result) => {
      const store = useDreamDraftStore.getState();
      store.reset();
      store.setDreamText(dreamText.trim());
      store.setDeepenDreamId(deepenDreamId);
      store.setQuestions(result.questions);
      router.push('/create-dream/questions');
    },
  });

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="title">What do you dream of?</ThemedText>
          <ThemedText themeColor="textSecondary">
            Speak it or type it.
          </ThemedText>

          <Card>
            <ThemedText type="smallBold">New to this? Start small.</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Tear open a seed packet:
            </ThemedText>
            <View style={styles.packetRow}>
              {SEED_PACKETS.map((seed) => (
                <Pressable
                  key={seed}
                  accessibilityRole="button"
                  onPress={() => setDreamText(`I dream of ${seed.charAt(0).toLowerCase()}${seed.slice(1)}.`)}
                  style={({ pressed }) => [
                    styles.packet,
                    { borderColor: theme.primary, opacity: pressed ? 0.7 : 1 },
                  ]}>
                  <SeedIcon size={15} />
                  <ThemedText type="small">{seed}</ThemedText>
                </Pressable>
              ))}
            </View>
          </Card>

          <TextField
            value={dictation.isListening && dictation.transcript ? dictation.transcript : dreamText}
            onChangeText={setDreamText}
            multiline
            numberOfLines={5}
            style={styles.dreamInput}
            placeholder="I dream of…"
            editable={!dictation.isListening}
            errorText={dictation.error ?? undefined}
          />

          <DictationButton
            isListening={dictation.isListening}
            onPress={() => (dictation.isListening ? dictation.stop() : dictation.start())}
          />

          {questionsMutation.error ? (
            <ThemedText themeColor="danger">
              {questionsMutation.error.message || 'Something went wrong. Please try again.'}
            </ThemedText>
          ) : null}

          <Button
            label={
              questionsMutation.isPending
                ? 'Listening to your dream…'
                : deepenDreamId
                  ? 'Make it vivid'
                  : 'Continue'
            }
            loading={questionsMutation.isPending}
            disabled={dreamText.trim().length < 5 || dictation.isListening}
            onPress={() => questionsMutation.mutate()}
            style={styles.continueButton}
          />

          {!deepenDreamId ? (
            <Button
              label="Plant it now — deepen later"
              variant="secondary"
              disabled={dreamText.trim().length < 5 || dictation.isListening}
              onPress={() => {
                const store = useDreamDraftStore.getState();
                store.reset();
                store.setDreamText(dreamText.trim());
                router.push('/create-dream/planting');
              }}
            />
          ) : null}

          <Button label="Not now" variant="ghost" onPress={() => router.back()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    gap: Spacing.three,
    paddingVertical: Spacing.four,
    alignItems: 'stretch',
  },
  dreamInput: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: Spacing.three,
  },
  continueButton: {
    marginTop: Spacing.two,
  },
  packetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  packet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
});
