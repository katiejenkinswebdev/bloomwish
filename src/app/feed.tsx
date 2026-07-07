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
import { SessionComplete } from '@/features/activities/components/session-complete';
import { useDictation } from '@/features/dictation/use-dictation';
import { TextField } from '@/components/ui/text-field';
import { useTheme } from '@/hooks/use-theme';
import type { FeedActivityRow } from '@/lib/supabase/database.types';

/** Activities where writing/speaking the reflection IS the practice. */
const REFLECTION_ACTIVITIES = new Set(['past_tense_writing', 'voice_note', 'gratitude_list']);

export default function FeedScreen() {
  const { dreamId } = useLocalSearchParams<{ dreamId: string }>();
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [activity, setActivity] = useState<FeedActivityRow | null>(null);
  const [reflection, setReflection] = useState('');
  const [result, setResult] = useState<CompletedSession | null>(null);
  const [startedAt] = useState(() => Date.now());

  const dictation = useDictation((finalText) => {
    setReflection((current) => (current ? `${current} ${finalText}` : finalText));
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

  if (activity) {
    const needsReflection = REFLECTION_ACTIVITIES.has(activity.key);
    return (
      <Screen padded={false}>
        <ScrollView contentContainerStyle={styles.detail} keyboardShouldPersistTaps="handled">
          <ThemedText type="title">{activity.title}</ThemedText>
          <ThemedText themeColor="textSecondary">{activity.description}</ThemedText>

          {needsReflection ? (
            <>
              <TextField
                label={activity.key === 'gratitude_list' ? 'Your five things' : 'Write it here'}
                value={
                  dictation.isListening && dictation.transcript
                    ? dictation.transcript
                    : reflection
                }
                onChangeText={setReflection}
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

          {completeMutation.error ? (
            <ThemedText themeColor="danger">
              Couldn’t save your session. Please try again.
            </ThemedText>
          ) : null}

          <Button
            label="I did this"
            loading={completeMutation.isPending}
            disabled={
              dictation.isListening || (needsReflection && reflection.trim().length < 3)
            }
            onPress={() => completeMutation.mutate()}
            style={styles.completeButton}
          />
          <Button
            label="Back"
            variant="ghost"
            onPress={() => {
              setActivity(null);
              setReflection('');
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
});
