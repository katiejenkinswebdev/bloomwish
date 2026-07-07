import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';

import { DictationButton } from '@/components/dictation-button';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useDictation } from '@/features/dictation/use-dictation';
import { fetchDeepeningQuestions } from '@/features/dreams/api';
import { useDreamDraftStore } from '@/store/dream-draft-store';

export default function DescribeDreamScreen() {
  const [dreamText, setDreamText] = useState('');

  const dictation = useDictation((finalText) => {
    setDreamText((current) => (current ? `${current} ${finalText}` : finalText));
  });

  const questionsMutation = useMutation({
    mutationFn: () => fetchDeepeningQuestions(dreamText.trim()),
    onSuccess: (result) => {
      const store = useDreamDraftStore.getState();
      store.reset();
      store.setDreamText(dreamText.trim());
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
            Describe it in your own words — speak it or type it.
          </ThemedText>

          <Card>
            <ThemedText type="smallBold">New to this? Start small.</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Practice the process on a small dream first — a great parking spot, a small sale,
              finding a dollar. Then graduate to the big ones.
            </ThemedText>
          </Card>

          <TextField
            label="Your dream"
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
            label={questionsMutation.isPending ? 'Listening to your dream…' : 'Continue'}
            loading={questionsMutation.isPending}
            disabled={dreamText.trim().length < 5 || dictation.isListening}
            onPress={() => questionsMutation.mutate()}
            style={styles.continueButton}
          />

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
});
