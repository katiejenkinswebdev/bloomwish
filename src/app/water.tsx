import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAudioPlayer } from 'expo-audio';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { goBackOrHome } from '@/lib/navigation';
import { Spark } from '@/components/spark';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { FreeTierLimits } from '@/config/branding';
import { Spacing } from '@/constants/theme';
import { completeSession, type CompletedSession } from '@/features/activities/api';
import { BREATH_PATTERNS } from '@/features/activities/breath-patterns';
import { BreathingTimer } from '@/features/activities/components/breathing-timer';
import { SessionComplete } from '@/features/activities/components/session-complete';
import { AMBIENT_LOOP, GUIDED_TRACKS, type GuidedTrack } from '@/features/activities/tracks';
import { fetchAffirmation, fetchDreams } from '@/features/dreams/api';
import { useIsFullBloom } from '@/features/purchases/entitlements';
import { useTheme } from '@/hooks/use-theme';

const DURATIONS = [
  { label: '15s', seconds: 15 },
  { label: '30s', seconds: 30 },
  { label: '1m', seconds: 60 },
  { label: '3m', seconds: 180 },
  { label: '5m', seconds: 300 },
  { label: '10m', seconds: 600 },
  { label: '15m', seconds: 900 },
];

const DRIFT_DURATIONS = [
  { label: '5m', seconds: 300 },
  { label: '10m', seconds: 600 },
  { label: '15m', seconds: 900 },
];

type Mode = 'breathe' | 'listen' | 'speak' | 'write' | 'drift';
type Phase = 'mode' | 'setup' | 'timer' | 'complete';

const MODES: { key: Mode; emoji: string; title: string; blurb: string }[] = [
  { key: 'breathe', emoji: '🫧', title: 'Breathe', blurb: 'A quiet timer with a breathing pattern.' },
  { key: 'listen', emoji: '🎧', title: 'Listen', blurb: 'A guided meditation track.' },
  { key: 'speak', emoji: '🌤', title: 'Speak', blurb: 'Today’s affirmation, said aloud.' },
  { key: 'write', emoji: '✍️', title: 'Write', blurb: 'The 369 practice — write it into being.' },
  { key: 'drift', emoji: '🌙', title: 'Drift', blurb: 'Fall asleep inside your dream.' },
];

/** 369: the writing count follows the time of day. */
function scriptingTarget(): { count: number; period: string } {
  const hour = new Date().getHours();
  if (hour < 12) return { count: 3, period: 'morning' };
  if (hour < 17) return { count: 6, period: 'midday' };
  return { count: 9, period: 'evening' };
}

export default function WaterScreen() {
  const { dreamId } = useLocalSearchParams<{ dreamId: string }>();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const isFullBloom = useIsFullBloom();

  const [mode, setMode] = useState<Mode | null>(null);
  const [phase, setPhase] = useState<Phase>('mode');
  const [durationSeconds, setDurationSeconds] = useState(180);
  const [patternKey, setPatternKey] = useState('calm');
  const [track, setTrack] = useState<GuidedTrack | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [result, setResult] = useState<CompletedSession | null>(null);
  const [scriptEntry, setScriptEntry] = useState('');
  const [scriptCount, setScriptCount] = useState(0);
  const [scriptTarget, setScriptTarget] = useState({ count: 3, period: 'morning' });
  const [startedAt, setStartedAt] = useState(0);

  const dreamsQuery = useQuery({ queryKey: ['dreams'], queryFn: fetchDreams });
  const dream = dreamsQuery.data?.find((d) => d.id === dreamId);

  const player = useAudioPlayer(track ? track.source : AMBIENT_LOOP);

  const affirmationQuery = useQuery({
    queryKey: ['affirmation', dreamId],
    queryFn: () => fetchAffirmation(dream?.title ?? '', dream?.scene_text ?? undefined),
    enabled: mode === 'speak' && !!dream,
    staleTime: 1000 * 60 * 60 * 12, // one affirmation per day-ish
  });

  const completeMutation = useMutation({
    mutationFn: (params: { activityId: string; durationSeconds: number }) =>
      completeSession({
        dreamId: dreamId!,
        type: 'water',
        activityId: params.activityId,
        durationSeconds: params.durationSeconds,
      }),
    onSuccess: (session) => {
      setResult(session);
      queryClient.invalidateQueries({ queryKey: ['dreams'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', dreamId] });
      setPhase('complete');
    },
  });

  // Countdown for timer-based modes.
  useEffect(() => {
    if (phase !== 'timer' || isPaused) return;
    if (secondsLeft <= 0) {
      player.pause();
      const activityId =
        mode === 'listen' && track
          ? `track:${track.key}`
          : mode === 'drift'
            ? 'sats'
            : `timer:${patternKey}`;
      completeMutation.mutate({ activityId, durationSeconds });
      return;
    }
    const interval = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isPaused, secondsLeft]);

  const startTimer = () => {
    setSecondsLeft(durationSeconds);
    setIsPaused(false);
    // eslint-disable-next-line react-hooks/immutability -- expo-audio's player is configured by property assignment
    player.loop = !track;
    player.volume = mode === 'drift' ? 0.5 : 1;
    player.play();
    setPhase('timer');
  };

  const chooseMode = (next: Mode) => {
    setMode(next);
    if (next === 'drift') {
      setPatternKey('sleep');
      setDurationSeconds(300);
    } else if (next === 'breathe') {
      setPatternKey('calm');
      setDurationSeconds(180);
    } else if (next === 'write') {
      setScriptCount(0);
      setScriptEntry('');
      // eslint-disable-next-line react-hooks/purity -- event handler, not render: the 369 count follows the current time of day
      setScriptTarget(scriptingTarget());
      // eslint-disable-next-line react-hooks/purity -- event handler, not render: stamping the practice start time
      setStartedAt(Date.now());
    }
    setPhase('setup');
  };

  const gateDuration = (seconds: number): boolean => {
    if (seconds > FreeTierLimits.maxTimerMinutes * 60 && !isFullBloom) {
      router.push('/paywall');
      return false;
    }
    return true;
  };

  // ── Complete ──────────────────────────────────────────────────────────────
  if (phase === 'complete' && result) {
    if (mode === 'drift') {
      // No haptics, no celebration — they may be asleep.
      return (
        <Screen style={[styles.centered, styles.driftScreen]}>
          <ThemedText type="subtitle" style={[styles.centeredText, styles.driftText]}>
            Sleep well 🌙
          </ThemedText>
          <ThemedText type="small" style={[styles.centeredText, styles.driftText]}>
            Your dream will keep growing while you rest.
          </ThemedText>
          <Button label="Close" variant="ghost" onPress={() => goBackOrHome()} />
        </Screen>
      );
    }
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

  // ── Timer (breathe / listen / drift) ─────────────────────────────────────
  if (phase === 'timer') {
    const dimmed = mode === 'drift';
    return (
      <Screen style={[styles.centered, dimmed && styles.driftScreen]}>
        <ThemedText
          type="small"
          themeColor={dimmed ? undefined : 'textSecondary'}
          style={[styles.centeredText, dimmed && styles.driftText]}>
          {track ? track.title : (dream?.title ?? 'Your dream')}
        </ThemedText>
        <BreathingTimer
          secondsLeft={secondsLeft}
          patternKey={patternKey}
          paused={isPaused}
          dimmed={dimmed}
        />
        {dimmed && dream?.scene_text ? (
          <ThemedText type="small" style={[styles.driftScene, styles.driftText]} numberOfLines={6}>
            {dream.scene_text}
          </ThemedText>
        ) : null}
        {!dimmed ? (
          <Button
            label={isPaused ? 'Resume' : 'Pause'}
            variant="secondary"
            onPress={() => {
              if (isPaused) player.play();
              else player.pause();
              setIsPaused(!isPaused);
            }}
          />
        ) : null}
        <Button
          label="End early"
          variant="ghost"
          onPress={() => {
            player.pause();
            goBackOrHome();
          }}
        />
      </Screen>
    );
  }

  // ── Setup per mode ────────────────────────────────────────────────────────
  if (phase === 'setup' && mode === 'breathe') {
    return (
      <Screen padded={false}>
        <ScrollView contentContainerStyle={styles.setup}>
          <ThemedText type="title">Breathe</ThemedText>
          <ThemedText type="smallBold">How long?</ThemedText>
          <View style={styles.chipRow}>
            {DURATIONS.map((option) => {
              const locked = option.seconds > FreeTierLimits.maxTimerMinutes * 60 && !isFullBloom;
              const selected = durationSeconds === option.seconds;
              return (
                <Pressable
                  key={option.seconds}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => gateDuration(option.seconds) && setDurationSeconds(option.seconds)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? theme.primarySoft : theme.backgroundElement,
                      borderColor: selected ? theme.primary : theme.border,
                    },
                  ]}>
                  <ThemedText type="small">
                    {option.label}
                    {locked ? ' ✦' : ''}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <ThemedText type="smallBold">Breathing pattern</ThemedText>
          {BREATH_PATTERNS.filter((p) => p.key !== 'sleep').map((pattern) => (
            <Pressable
              key={pattern.key}
              accessibilityRole="button"
              accessibilityState={{ selected: patternKey === pattern.key }}
              onPress={() => setPatternKey(pattern.key)}
              style={[
                styles.optionCard,
                {
                  backgroundColor:
                    patternKey === pattern.key ? theme.primarySoft : theme.backgroundElement,
                  borderColor: patternKey === pattern.key ? theme.primary : theme.border,
                },
              ]}>
              <ThemedText type="smallBold">{pattern.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {pattern.description}
              </ThemedText>
            </Pressable>
          ))}

          <Button label="Begin" onPress={startTimer} style={styles.begin} />
          <Button label="Back" variant="ghost" onPress={() => setPhase('mode')} />
        </ScrollView>
      </Screen>
    );
  }

  if (phase === 'setup' && mode === 'listen') {
    return (
      <Screen padded={false}>
        <ScrollView contentContainerStyle={styles.setup}>
          <ThemedText type="title">Listen</ThemedText>
          <ThemedText themeColor="textSecondary">Let a voice guide you.</ThemedText>
          {GUIDED_TRACKS.map((candidate) => {
            const locked = !candidate.freeTier && !isFullBloom;
            const selected = track?.key === candidate.key;
            return (
              <Pressable
                key={candidate.key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  if (locked) {
                    router.push('/paywall');
                    return;
                  }
                  setTrack(candidate);
                  setDurationSeconds(candidate.minutes * 60);
                }}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: selected ? theme.primarySoft : theme.backgroundElement,
                    borderColor: selected ? theme.primary : theme.border,
                  },
                ]}>
                <View style={styles.trackHeader}>
                  <ThemedText type="smallBold">
                    {candidate.title} · {candidate.minutes}m
                  </ThemedText>
                  {locked ? (
                    <ThemedText type="small" themeColor="accent">
                      ✦ Full Bloom
                    </ThemedText>
                  ) : null}
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {candidate.description}
                </ThemedText>
              </Pressable>
            );
          })}
          <Button label="Begin" disabled={!track} onPress={startTimer} style={styles.begin} />
          <Button label="Back" variant="ghost" onPress={() => setPhase('mode')} />
        </ScrollView>
      </Screen>
    );
  }

  if (phase === 'setup' && mode === 'speak') {
    return (
      <Screen style={styles.centered}>
        <Spark size={28} style={styles.centerSelf} />
        <ThemedText type="title" style={styles.centeredText}>
          Today’s affirmation
        </ThemedText>
        {affirmationQuery.isLoading ? (
          <ThemedText themeColor="textSecondary" style={styles.centeredText}>
            Listening for it…
          </ThemedText>
        ) : affirmationQuery.error ? (
          <>
            <ThemedText themeColor="danger" style={styles.centeredText}>
              Couldn’t reach the coach. Please try again.
            </ThemedText>
            <Button label="Try again" onPress={() => affirmationQuery.refetch()} />
          </>
        ) : (
          <>
            <Card>
              <ThemedText type="subtitle" style={styles.affirmation}>
                “{affirmationQuery.data?.affirmation}”
              </ThemedText>
            </Card>
            <ThemedText type="small" themeColor="textSecondary" style={styles.centeredText}>
              Say it out loud — slowly, like you mean it. Twice if it felt good.
            </ThemedText>
            <Button
              label="I said it — let it be ✨"
              loading={completeMutation.isPending}
              onPress={() =>
                completeMutation.mutate({ activityId: 'affirmation', durationSeconds: 30 })
              }
            />
          </>
        )}
        <Button label="Back" variant="ghost" onPress={() => setPhase('mode')} />
      </Screen>
    );
  }

  if (phase === 'setup' && mode === 'write') {
    const target = scriptTarget;
    const done = scriptCount >= target.count;
    return (
      <Screen padded={false}>
        <ScrollView contentContainerStyle={styles.setup} keyboardShouldPersistTaps="handled">
          <ThemedText type="title">Write it into being</ThemedText>
          <ThemedText themeColor="textSecondary">
            The 369 practice: this {target.period}, write your dream {target.count} times. Slowly.
            Feel each word.
          </ThemedText>
          <Card>
            <ThemedText type="smallBold">{dream?.title ?? 'Your dream'}</ThemedText>
          </Card>
          <ThemedText type="smallBold">
            {Math.min(scriptCount + 1, target.count)} of {target.count}
          </ThemedText>
          <TextField
            label="Write it in your own hand"
            placeholder="Type your dream as one flowing sentence…"
            value={scriptEntry}
            onChangeText={setScriptEntry}
            multiline
          />
          {!done ? (
            <Button
              label={scriptCount + 1 === target.count ? 'Last one — write it' : 'Written — next'}
              disabled={scriptEntry.trim().length < 5}
              onPress={() => {
                setScriptCount((c) => c + 1);
                setScriptEntry('');
              }}
            />
          ) : (
            <Button
              label="Let it be ✨"
              loading={completeMutation.isPending}
              onPress={() =>
                completeMutation.mutate({
                  activityId: `369:${target.period}`,
                  durationSeconds: Math.round((Date.now() - startedAt) / 1000),
                })
              }
            />
          )}
          <Button label="Back" variant="ghost" onPress={() => setPhase('mode')} />
        </ScrollView>
      </Screen>
    );
  }

  if (phase === 'setup' && mode === 'drift') {
    return (
      <Screen style={[styles.centered, styles.driftScreen]}>
        <ThemedText type="title" style={[styles.centeredText, styles.driftText]}>
          Drift 🌙
        </ThemedText>
        <ThemedText type="small" style={[styles.centeredText, styles.driftText]}>
          Fall asleep inside your dream. Long slow breaths, your scene beneath you, no chime at the
          end.
        </ThemedText>
        <View style={styles.chipRow}>
          {DRIFT_DURATIONS.map((option) => {
            const locked = option.seconds > FreeTierLimits.maxTimerMinutes * 60 && !isFullBloom;
            const selected = durationSeconds === option.seconds;
            return (
              <Pressable
                key={option.seconds}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => gateDuration(option.seconds) && setDurationSeconds(option.seconds)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? '#3B3050' : '#302840',
                    borderColor: selected ? '#8FBC94' : '#463A54',
                  },
                ]}>
                <ThemedText type="small" style={styles.driftText}>
                  {option.label}
                  {locked ? ' ✦' : ''}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
        <Button label="Begin drifting" onPress={startTimer} />
        <Button label="Back" variant="ghost" onPress={() => setPhase('mode')} />
      </Screen>
    );
  }

  // ── Mode picker ───────────────────────────────────────────────────────────
  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.setup}>
        <ThemedText type="title">Water your dream</ThemedText>
        <ThemedText themeColor="textSecondary">
          {dream?.title ?? 'A few quiet moments of seeing it, feeling it, living it.'}
        </ThemedText>
        {MODES.map((candidate) => (
          <Pressable
            key={candidate.key}
            accessibilityRole="button"
            onPress={() => chooseMode(candidate.key)}
            style={({ pressed }) => [
              styles.modeCard,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}>
            <ThemedText style={styles.modeEmoji}>{candidate.emoji}</ThemedText>
            <View style={styles.modeBody}>
              <ThemedText type="smallBold">{candidate.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {candidate.blurb}
              </ThemedText>
            </View>
          </Pressable>
        ))}
        <Button label="Not now" variant="ghost" onPress={() => goBackOrHome()} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  setup: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  centered: {
    justifyContent: 'center',
    gap: Spacing.four,
  },
  centeredText: {
    textAlign: 'center',
  },
  centerSelf: {
    alignSelf: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    justifyContent: 'center',
  },
  chip: {
    borderWidth: 1,
    borderRadius: Spacing.four,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  optionCard: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  trackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  modeEmoji: {
    fontSize: 28,
  },
  modeBody: {
    flex: 1,
    gap: 2,
  },
  begin: {
    marginTop: Spacing.two,
  },
  affirmation: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
  driftScreen: {
    backgroundColor: '#241C29',
  },
  driftText: {
    color: '#C7B9CC',
  },
  driftScene: {
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
  },
});
