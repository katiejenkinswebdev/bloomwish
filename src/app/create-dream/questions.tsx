import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';

import { DictationButton } from '@/components/dictation-button';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useDictation } from '@/features/dictation/use-dictation';
import { generateScene, scoreScene } from '@/features/dreams/api';
import { useDreamDraftStore } from '@/store/dream-draft-store';

export default function DeepeningQuestionsScreen() {
  const questions = useDreamDraftStore((s) => s.questions);
  const answers = useDreamDraftStore((s) => s.answers);
  const [answerText, setAnswerText] = useState('');

  const currentIndex = answers.length;
  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;

  const dictation = useDictation((finalText) => {
    setAnswerText((current) => (current ? `${current} ${finalText}` : finalText));
  });

  const sceneMutation = useMutation({
    mutationFn: async () => {
      const { dreamText, answers: allAnswers } = useDreamDraftStore.getState();
      const scene = await generateScene(dreamText, allAnswers);
      const score = await scoreScene(scene.sceneText);
      return { scene, score };
    },
    onSuccess: ({ scene, score }) => {
      const store = useDreamDraftStore.getState();
      store.setScene(scene.sceneText);
      store.setScore(score.score);
      router.push('/create-dream/scene');
    },
  });

  const handleNext = () => {
    useDreamDraftStore.getState().addAnswer({
      question: currentQuestion,
      answer: answerText.trim(),
    });
    setAnswerText('');
    if (isLastQuestion) {
      sceneMutation.mutate();
    }
  };

  if (!questions.length) {
    // Deep-linked here without a draft in progress — restart the flow.
    router.replace('/create-dream');
    return null;
  }

  if (sceneMutation.isPending || (!currentQuestion && !sceneMutation.error)) {
    return (
      <Screen style={styles.centered}>
        <ThemedText type="subtitle">Weaving your dream together…</ThemedText>
        <ThemedText themeColor="textSecondary">This takes a few breaths.</ThemedText>
      </Screen>
    );
  }

  if (sceneMutation.error) {
    return (
      <Screen style={styles.centered}>
        <ThemedText type="subtitle">The garden is quiet right now</ThemedText>
        <ThemedText themeColor="textSecondary">
          {sceneMutation.error.message || 'Something went wrong. Please try again.'}
        </ThemedText>
        <Button label="Try again" onPress={() => sceneMutation.mutate()} style={styles.retry} />
        <Button label="Back" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="small" themeColor="textSecondary">
            {currentIndex + 1} of {questions.length}
          </ThemedText>
          <ThemedText type="subtitle">{currentQuestion}</ThemedText>

          <TextField
            label="Your answer"
            value={dictation.isListening && dictation.transcript ? dictation.transcript : answerText}
            onChangeText={setAnswerText}
            multiline
            numberOfLines={4}
            style={styles.answerInput}
            editable={!dictation.isListening}
            errorText={dictation.error ?? undefined}
          />

          <DictationButton
            isListening={dictation.isListening}
            onPress={() => (dictation.isListening ? dictation.stop() : dictation.start())}
          />

          <Button
            label={isLastQuestion ? 'See your dream' : 'Next'}
            disabled={answerText.trim().length < 2 || dictation.isListening}
            onPress={handleNext}
            style={styles.nextButton}
          />
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
  },
  centered: {
    justifyContent: 'center',
    gap: Spacing.two,
  },
  answerInput: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: Spacing.three,
  },
  nextButton: {
    marginTop: Spacing.two,
  },
  retry: {
    marginTop: Spacing.three,
  },
});
