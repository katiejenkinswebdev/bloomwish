import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { goBackOrHome } from '@/lib/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { DictationButton } from '@/components/dictation-button';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { completeSession, fetchFeedActivities, type CompletedSession } from '@/features/activities/api';
import { fetchDreams, reviewReflection, type CoachReview } from '@/features/dreams/api';
import { SessionComplete } from '@/features/activities/components/session-complete';
import { useDictation } from '@/features/dictation/use-dictation';
import { TextField } from '@/components/ui/text-field';
import { useTheme } from '@/hooks/use-theme';
import type { FeedActivityRow } from '@/lib/supabase/database.types';

/** Activities where writing/speaking the reflection IS the practice. */
const REFLECTION_ACTIVITIES = new Set([
  'past_tense_writing',
  'voice_note',
  'gratitude_list',
  'act_as_if',
]);

/** Activities where the coach reviews the reflection before it counts. */
const REVIEWED_ACTIVITIES = new Set(['act_as_if']);

export default function FeedScreen() {
  const { dreamId } = useLocalSearchParams<{ dreamId: string }>();
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [activity, setActivity] = useState<FeedActivityRow | null>(null);
  const [reflection, setReflection] = useState('');
  const [review, setReview] = useState<CoachReview | null>(null);
  const [result, setResult] = useState<CompletedSession | null>(null);
  const [startedAt] = useState(() => Date.now());

  const dictation = useDictation((finalText) => {
    setReview(null);
    setReflection((current) => (current ? `${current} ${finalText}` : finalText));
  });

  const dreamsQuery = useQuery({ queryKey: ['dreams'], queryFn: fetchDreams });

  const reviewMutation = useMutation({
    mutationFn: () =>
      reviewReflection({
        activityTitle: activity!.title,
        activityDescription: activity!.description,
        answer: reflection.trim(),
        dreamText: dreamsQuery.data?.find((d) => d.id === dreamId)?.title,
      }),
    onSuccess: setReview,
  });

  const activitiesQuery = useQuery({
    queryKey: ['feed_activities'],
    queryFn: fetchFeedActivities,
  });

  const completeMutation = useMutation({
    mutationFn: () =>
      completeSession({
        dreamId: dreamId!,
        type: 'feed',
        activityId: activity!.key,
        durationSeconds: Math.round((Date.now() - startedAt) / 1000),
        baseBoost: activity!.health_boost,
        reflection: reflection.trim() || undefined,
      }),
    onSuccess: (session) => {
      setResult(session);
      queryClient.invalidateQueries({ queryKey: ['dreams'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', dreamId] });
    },
  });

  if (result) {
    return (
      <Screen>
        <SessionComplete
          variant="feed"
          plantState={result.newState}
          stateAdvanced={result.stateAdvanced}
          grantedBoost={result.grantedBoost}
          dreamId={dreamId}
          onDone={() => goBackOrHome()}
          onLogSign={() => {
            goBackOrHome();
            router.push({ pathname: '/add-sign', params: { dreamId: dreamId! } });
          }}
        />
      </Screen>
    );
  }

  const updateReflection = (text: string) => {
    if (review) setReview(null);
    if (reviewMutation.isError) reviewMutation.reset();
    setReflection(text);
  };

  if (activity) {
    const needsReflection = REFLECTION_ACTIVITIES.has(activity.key);
    const needsReview = REVIEWED_ACTIVITIES.has(activity.key);
    const reviewPassed = !needsReview || review?.passed === true;
    return (
      <Screen padded={false}>
        <ScrollView contentContainerStyle={styles.detail} keyboardShouldPersistTaps="handled">
          <ThemedText type="title">{activity.title}</ThemedText>
          <ThemedText themeColor="textSecondary">{activity.description}</ThemedText>

          {needsReflection ? (
            <>
              <TextField
                label={
                  activity.key === 'gratitude_list'
                    ? 'Your five things'
                    : activity.key === 'act_as_if'
                      ? 'What did you actually do today?'
                      : 'Write it here'
                }
                placeholder={
                  activity.key === 'act_as_if'
                    ? 'Be specific — what did you do, and what did it feel like in your body?'
                    : undefined
                }
                value={
                  dictation.isListening && dictation.transcript
                    ? dictation.transcript
                    : reflection
                }
                onChangeText={updateReflection}
                multiline
                numberOfLines={6}
                style={styles.reflectionInput}
                editable={!dictation.isListening}
                errorText={dictation.error ?? undefined}
              />
              <DictationButton
                isListening={dictation.isListening}
                onPress={() => (dictation.isListening ? dictation.stop() : dictation.start())}
              />
            </>
          ) : null}

          {review ? (
            <ThemedText
              type="small"
              themeColor={review.passed ? 'primary' : 'textSecondary'}
              style={styles.reviewFeedback}>
              {review.feedback}
            </ThemedText>
          ) : null}

          {reviewMutation.error ? (
            <ThemedText themeColor="danger">
              The coach couldn’t read your answer just now. Please try again.
            </ThemedText>
          ) : null}

          {completeMutation.error ? (
            <ThemedText themeColor="danger">
              Couldn’t save your session. Please try again.
            </ThemedText>
          ) : null}

          {needsReview && !review?.passed ? (
            <Button
              label={review ? 'Try again — share it with the coach' : 'Share with the coach'}
              loading={reviewMutation.isPending}
              disabled={dictation.isListening || reflection.trim().length < 3}
              onPress={() => reviewMutation.mutate()}
              style={styles.completeButton}
            />
          ) : null}

          <Button
            label="I did this"
            loading={completeMutation.isPending}
            disabled={
              dictation.isListening ||
              (needsReflection && reflection.trim().length < 3) ||
              !reviewPassed
            }
            onPress={() => completeMutation.mutate()}
            style={needsReview ? undefined : styles.completeButton}
          />
          <Button
            label="Back"
            variant="ghost"
            onPress={() => {
              setActivity(null);
              setReflection('');
              setReview(null);
              reviewMutation.reset();
            }}
          />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.list}>
        <ThemedText type="title">Feed your dream</ThemedText>
        <ThemedText themeColor="textSecondary">
          Deeper nourishment — pick one that calls to you today.
        </ThemedText>

        {(activitiesQuery.data ?? []).map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            onPress={() => setActivity(item)}
            style={({ pressed }) => [
              styles.activityCard,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}>
            <ThemedText type="smallBold">{item.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {item.description}
            </ThemedText>
          </Pressable>
        ))}

        {activitiesQuery.isLoading ? (
          <ThemedText themeColor="textSecondary">Gathering nourishment…</ThemedText>
        ) : null}

        <Button label="Not now" variant="ghost" onPress={() => goBackOrHome()} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  activityCard: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  detail: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  reflectionInput: {
    minHeight: 140,
    textAlignVertical: 'top',
    paddingTop: Spacing.three,
  },
  completeButton: {
    marginTop: Spacing.two,
  },
  reviewFeedback: {
    fontStyle: 'italic',
  },
});
