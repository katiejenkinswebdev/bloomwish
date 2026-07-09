import { useEffect, useState } from 'react';
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
  const editingAnswerText = useDreamDraftStore((s) => s.editingAnswerText);
  const [answerText, setAnswerText] = useState('');

  // An answer staged for editing (stepping back from a later question or the
  // scene screen) pre-fills the field until the user types.
  const effectiveAnswer = answerText !== '' ? answerText : editingAnswerText;

  const updateAnswer = (text: string) => {
    if (editingAnswerText) useDreamDraftStore.getState().consumeEditingAnswerText();
    setAnswerText(text);
  };

  const currentIndex = answers.length;
  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;

  const dictation = useDictation((finalText) => {
    const staged = useDreamDraftStore.getState().consumeEditingAnswerText();
    setAnswerText((current) => {
      const base = current || staged;
      return base ? `${base} ${finalText}` : finalText;
    });
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
    const store = useDreamDraftStore.getState();
    if (editingAnswerText) store.consumeEditingAnswerText();
    store.addAnswer({
      question: currentQuestion,
      answer: effectiveAnswer.trim(),
    });
    setAnswerText('');
    if (isLastQuestion) {
      sceneMutation.mutate();
    }
  };

  const handleBack = () => {
    if (currentIndex === 0) {
      // Back to the dream description (its text is kept on that screen).
      router.back();
    } else {
      setAnswerText('');
      useDreamDraftStore.getState().popAnswerForEditing();
    }
  };

  // Deep-linked or refreshed without a draft in progress — restart the flow.
  // Navigation must happen after render, never during it.
  const hasDraft = questions.length > 0;
  useEffect(() => {
    if (!hasDraft) router.replace('/create-dream');
  }, [hasDraft]);
  if (!hasDraft) return null;

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
            value={
              dictation.isListening && dictation.transcript
                ? dictation.transcript
                : effectiveAnswer
            }
            onChangeText={updateAnswer}
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
            disabled={effectiveAnswer.trim().length < 2 || dictation.isListening}
            onPress={handleNext}
            style={styles.nextButton}
          />
          <Button
            label={currentIndex === 0 ? 'Back to my dream' : 'Edit previous answer'}
            variant="ghost"
            disabled={dictation.isListening}
            onPress={handleBack}
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
