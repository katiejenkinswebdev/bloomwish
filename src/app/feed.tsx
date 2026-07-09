import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { goBackOrHome } from '@/lib/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { DictationButton } from '@/components/dictation-button';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { completeSession, fetchFeedActivities, type CompletedSession } from '@/features/activities/api';
import { CompostMoment } from '@/features/activities/components/compost-moment';
import { SessionComplete } from '@/features/activities/components/session-complete';
import { fetchDreams, fetchFutureLetter } from '@/features/dreams/api';
import { Card } from '@/components/ui/card';
import { useDictation } from '@/features/dictation/use-dictation';
import { TextField } from '@/components/ui/text-field';
import { useTheme } from '@/hooks/use-theme';
import type { FeedActivityRow } from '@/lib/supabase/database.types';

/** Icons for the feed practices — same visual language as the Water modes. */
const FEED_EMOJI: Record<string, string> = {
  past_tense_writing: '📖',
  tell_someone: '💬',
  voice_note: '🎙',
  gratitude_list: '🌻',
  act_as_if: '🎭',
  compost_doubts: '🍂',
  rampage: '⚡',
  future_letter: '💌',
};

/** Per-activity input coaching: a quiet label, a placeholder that points the
 * heart in the right direction. Activities listed here require the input. */
const ACTIVITY_INPUT: Record<string, { label: string; placeholder: string }> = {
  past_tense_writing: {
    label: 'Your dream, remembered',
    placeholder: 'Write it as a memory — “I still remember the day it happened…”',
  },
  tell_someone: {
    label: 'Who did you tell?',
    placeholder: 'Their name — and what it felt like to say your dream out loud to them',
  },
  voice_note: {
    label: 'Your voice note',
    placeholder: 'Speak (or write) how it feels now that your dream is real',
  },
  gratitude_list: {
    label: 'Your five things',
    placeholder: 'Five things you’re grateful for right now — tiny ones count double',
  },
  act_as_if: {
    label: 'Acting as if',
    placeholder: 'Be specific — what did you do, and what did it feel like in your body?',
  },
};

export default function FeedScreen() {
  const { dreamId } = useLocalSearchParams<{ dreamId: string }>();
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [activity, setActivity] = useState<FeedActivityRow | null>(null);
  const [reflection, setReflection] = useState('');
  const [result, setResult] = useState<CompletedSession | null>(null);
  const [startedAt] = useState(() => Date.now());
  const [isComposting, setIsComposting] = useState(false);
  const [rampageSecondsLeft, setRampageSecondsLeft] = useState<number | null>(null);

  const dictation = useDictation((finalText) => {
    setReflection((current) => (current ? `${current} ${finalText}` : finalText));
  });

  const activitiesQuery = useQuery({
    queryKey: ['feed_activities'],
    queryFn: fetchFeedActivities,
  });

  const dreamsQuery = useQuery({ queryKey: ['dreams'], queryFn: fetchDreams });
  const dream = dreamsQuery.data?.find((d) => d.id === dreamId);

  const letterQuery = useQuery({
    queryKey: ['future-letter', dreamId],
    queryFn: () => fetchFutureLetter(dream?.title ?? '', dream?.scene_text ?? undefined),
    enabled: activity?.key === 'future_letter' && !!dream,
    staleTime: Infinity,
  });

  // Rampage countdown.
  useEffect(() => {
    if (rampageSecondsLeft === null || rampageSecondsLeft <= 0) return;
    const t = setInterval(() => setRampageSecondsLeft((v) => (v ?? 1) - 1), 1000);
    return () => clearInterval(t);
  }, [rampageSecondsLeft]);

  const completeMutation = useMutation({
    // Optional override because React state set in the same tick (e.g. the
    // future letter) wouldn't be visible to this closure yet.
    mutationFn: (vars?: { reflectionText?: string }) =>
      completeSession({
        dreamId: dreamId!,
        type: 'feed',
        activityId: activity!.key,
        durationSeconds: Math.round((Date.now() - startedAt) / 1000),
        baseBoost: activity!.health_boost,
        reflection: (vars?.reflectionText ?? reflection).trim() || undefined,
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

  const resetActivity = () => {
    setActivity(null);
    setReflection('');
    setIsComposting(false);
    setRampageSecondsLeft(null);
    if (dictation.isListening) dictation.stop();
  };

  // ── A letter from your future self ────────────────────────────────────────
  if (activity?.key === 'future_letter') {
    return (
      <Screen padded={false}>
        <ScrollView contentContainerStyle={styles.detail}>
          <ThemedText type="title">{activity.title}</ThemedText>
          {letterQuery.data ? (
            <>
              <Card>
                <ThemedText type="small" style={styles.letter}>
                  {letterQuery.data.letterText}
                </ThemedText>
              </Card>
              {completeMutation.error ? (
                <ThemedText themeColor="danger">
                  Couldn’t save your session. Please try again.
                </ThemedText>
              ) : null}
              <Button
                label="Take it to heart 💌"
                loading={completeMutation.isPending}
                onPress={() =>
                  completeMutation.mutate({ reflectionText: letterQuery.data?.letterText })
                }
              />
            </>
          ) : letterQuery.error ? (
            <>
              <ThemedText themeColor="danger">
                The letter couldn’t arrive just now. Please try again.
              </ThemedText>
              <Button label="Try again" onPress={() => letterQuery.refetch()} />
            </>
          ) : (
            <ThemedText themeColor="textSecondary">
              Your future self is writing to you…
            </ThemedText>
          )}
          <Button label="Back" variant="ghost" onPress={resetActivity} />
        </ScrollView>
      </Screen>
    );
  }

  // ── Compost a doubt ────────────────────────────────────────────────────────
  if (activity?.key === 'compost_doubts') {
    if (isComposting) {
      return (
        <Screen style={styles.centered}>
          <CompostMoment doubtText={reflection} onDone={() => completeMutation.mutate(undefined)} />
          {completeMutation.error ? (
            <>
              <ThemedText themeColor="danger" style={styles.rampageClock}>
                Couldn’t save your session.
              </ThemedText>
              <Button label="Try again" onPress={() => completeMutation.mutate(undefined)} />
            </>
          ) : null}
        </Screen>
      );
    }
    return (
      <Screen padded={false}>
        <ScrollView contentContainerStyle={styles.detail} keyboardShouldPersistTaps="handled">
          <ThemedText type="title">{activity.title}</ThemedText>
          <ThemedText themeColor="textSecondary">{activity.description}</ThemedText>
          <TextField
            label="The doubt"
            placeholder="Write the worry exactly as it sounds in your head…"
            value={dictation.isListening && dictation.transcript ? dictation.transcript : reflection}
            onChangeText={setReflection}
            multiline
            editable={!dictation.isListening}
            errorText={dictation.error ?? undefined}
          />
          <DictationButton
            isListening={dictation.isListening}
            onPress={() => (dictation.isListening ? dictation.stop() : dictation.start())}
          />
          <Button
            label="Compost it 🍂"
            disabled={reflection.trim().length < 3 || dictation.isListening}
            onPress={() => setIsComposting(true)}
          />
          <Button label="Back" variant="ghost" onPress={resetActivity} />
        </ScrollView>
      </Screen>
    );
  }

  // ── Rampage of appreciation ────────────────────────────────────────────────
  if (activity?.key === 'rampage') {
    const running = rampageSecondsLeft !== null && rampageSecondsLeft > 0;
    const finished = rampageSecondsLeft === 0;
    return (
      <Screen padded={false}>
        <ScrollView contentContainerStyle={styles.detail} keyboardShouldPersistTaps="handled">
          <ThemedText type="title">{activity.title}</ThemedText>
          <ThemedText themeColor="textSecondary">{activity.description}</ThemedText>

          {rampageSecondsLeft === null ? (
            <Button
              label="Start the 60 seconds ⚡"
              onPress={() => {
                setRampageSecondsLeft(60);
                dictation.start();
              }}
            />
          ) : (
            <>
              <ThemedText type="title" style={styles.rampageClock}>
                {finished ? 'Beautiful.' : `0:${String(rampageSecondsLeft).padStart(2, '0')}`}
              </ThemedText>
              <TextField
                label="Everything you appreciate"
                placeholder="Say it or type it — don’t stop, don’t edit…"
                value={
                  dictation.isListening && dictation.transcript
                    ? dictation.transcript
                    : reflection
                }
                onChangeText={setReflection}
                multiline
                editable={!dictation.isListening}
                errorText={dictation.error ?? undefined}
              />
              {running || dictation.isListening ? (
                <DictationButton
                  isListening={dictation.isListening}
                  onPress={() => (dictation.isListening ? dictation.stop() : dictation.start())}
                />
              ) : null}
              {finished ? (
                <>
                  {dictation.isListening ? (
                    <ThemedText type="small" themeColor="textSecondary" style={styles.rampageClock}>
                      Tap the mic to finish, so every word lands.
                    </ThemedText>
                  ) : null}
                  {completeMutation.error ? (
                    <ThemedText themeColor="danger">
                      Couldn’t save your session. Please try again.
                    </ThemedText>
                  ) : null}
                  <Button
                    label="Let it be ✨"
                    loading={completeMutation.isPending}
                    disabled={dictation.isListening}
                    onPress={() => completeMutation.mutate(undefined)}
                  />
                </>
              ) : null}
            </>
          )}
          <Button label="Back" variant="ghost" onPress={resetActivity} />
        </ScrollView>
      </Screen>
    );
  }

  if (activity) {
    const inputConfig = ACTIVITY_INPUT[activity.key];
    const needsReflection = !!inputConfig;
    return (
      <Screen padded={false}>
        <ScrollView contentContainerStyle={styles.detail} keyboardShouldPersistTaps="handled">
          <ThemedText type="title">{activity.title}</ThemedText>
          <ThemedText themeColor="textSecondary">{activity.description}</ThemedText>

          {needsReflection ? (
            <>
              <TextField
                label={inputConfig.label}
                placeholder={inputConfig.placeholder}
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
            onPress={() => completeMutation.mutate(undefined)}
            style={styles.completeButton}
          />
          <Button
            label="Back"
            variant="ghost"
            onPress={resetActivity}
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
            <ThemedText style={styles.activityEmoji}>{FEED_EMOJI[item.key] ?? '🌿'}</ThemedText>
            <View style={styles.activityBody}>
              <ThemedText type="smallBold">{item.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {item.description}
              </ThemedText>
            </View>
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
    paddingBottom: Spacing.six,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  activityEmoji: {
    fontSize: 28,
  },
  activityBody: {
    flex: 1,
    gap: 2,
  },
  detail: {
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  reflectionInput: {
    minHeight: 140,
    textAlignVertical: 'top',
    paddingTop: Spacing.three,
  },
  completeButton: {
    marginTop: Spacing.two,
  },
  centered: {
    justifyContent: 'center',
  },
  letter: {
    fontStyle: 'italic',
    lineHeight: 22,
  },
  rampageClock: {
    textAlign: 'center',
  },
});
