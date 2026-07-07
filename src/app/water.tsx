import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAudioPlayer } from 'expo-audio';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { BrandPalette } from '@/constants/brand-palette';
import { FreeTierLimits } from '@/config/branding';
import { Spacing } from '@/constants/theme';
import { completeSession, type CompletedSession } from '@/features/activities/api';
import { SessionComplete } from '@/features/activities/components/session-complete';
import { AMBIENT_LOOP, GUIDED_TRACKS, type GuidedTrack } from '@/features/activities/tracks';
import { fetchDreams } from '@/features/dreams/api';
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

type Phase = 'setup' | 'timer' | 'complete';

export default function WaterScreen() {
  const { dreamId } = useLocalSearchParams<{ dreamId: string }>();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const isFullBloom = useIsFullBloom();
  const reducedMotion = useReducedMotion();

  const [phase, setPhase] = useState<Phase>('setup');
  const [durationSeconds, setDurationSeconds] = useState(180);
  const [track, setTrack] = useState<GuidedTrack | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [result, setResult] = useState<CompletedSession | null>(null);

  const dreamsQuery = useQuery({ queryKey: ['dreams'], queryFn: fetchDreams });
  const dream = dreamsQuery.data?.find((d) => d.id === dreamId);

  const player = useAudioPlayer(track ? track.source : AMBIENT_LOOP);

  const completeMutation = useMutation({
    mutationFn: () =>
      completeSession({
        dreamId: dreamId!,
        type: 'water',
        activityId: track ? `track:${track.key}` : 'timer',
        durationSeconds,
      }),
    onSuccess: (session) => {
      setResult(session);
      queryClient.invalidateQueries({ queryKey: ['dreams'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', dreamId] });
      setPhase('complete');
    },
  });

  // Countdown.
  useEffect(() => {
    if (phase !== 'timer' || isPaused) return;
    if (secondsLeft <= 0) {
      player.pause();
      completeMutation.mutate();
      return;
    }
    const interval = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isPaused, secondsLeft]);

  const breath = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion || phase !== 'timer') return;
    breath.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [breath, reducedMotion, phase]);

  const breathStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reducedMotion ? 1 : 0.8 + breath.value * 0.35 }],
    opacity: 0.45 + breath.value * 0.4,
  }));

  const startTimer = () => {
    setSecondsLeft(durationSeconds);
    setIsPaused(false);
    // eslint-disable-next-line react-hooks/immutability -- expo-audio's player is configured by property assignment; the ambient loop must repeat, guided tracks must not
    player.loop = !track;
    player.play();
    setPhase('timer');
  };

  const togglePause = () => {
    if (isPaused) player.play();
    else player.pause();
    setIsPaused(!isPaused);
  };

  const endEarly = () => {
    player.pause();
    router.back();
  };

  const chooseTrack = (candidate: GuidedTrack) => {
    if (!candidate.freeTier && !isFullBloom) {
      router.push('/paywall');
      return;
    }
    setTrack(candidate);
    setDurationSeconds(candidate.minutes * 60);
  };

  const chooseDuration = (seconds: number) => {
    if (seconds > FreeTierLimits.maxTimerMinutes * 60 && !isFullBloom) {
      router.push('/paywall');
      return;
    }
    setTrack(null);
    setDurationSeconds(seconds);
  };

  if (phase === 'complete' && result) {
    return (
      <Screen>
        <SessionComplete
          plantState={result.newState}
          stateAdvanced={result.stateAdvanced}
          dreamId={dreamId}
          onDone={() => router.back()}
          onLogSign={() => router.back()}
        />
      </Screen>
    );
  }

  if (phase === 'timer') {
    const minutes = Math.floor(Math.max(0, secondsLeft) / 60);
    const seconds = Math.max(0, secondsLeft) % 60;
    return (
      <Screen style={styles.timerContainer}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
          {track ? track.title : 'Visualizing'} · {dream?.title ?? 'your dream'}
        </ThemedText>
        <View style={styles.breathArea}>
          <Animated.View style={[styles.breathCircle, breathStyle]} />
          <ThemedText type="title">{`${minutes}:${String(seconds).padStart(2, '0')}`}</ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
          Breathe with the circle. See it. Feel it.
        </ThemedText>
        <Button label={isPaused ? 'Resume' : 'Pause'} variant="secondary" onPress={togglePause} />
        <Button label="End early" variant="ghost" onPress={endEarly} />
      </Screen>
    );
  }

  const showSitWalkChoice = durationSeconds >= 600;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.setup}>
        <ThemedText type="title">Water your dream</ThemedText>
        <ThemedText themeColor="textSecondary">
          A few quiet moments of seeing it, feeling it, living it.
        </ThemedText>

        <ThemedText type="smallBold">How long?</ThemedText>
        <View style={styles.durationRow}>
          {DURATIONS.map((option) => {
            const locked = option.seconds > FreeTierLimits.maxTimerMinutes * 60 && !isFullBloom;
            const selected = !track && durationSeconds === option.seconds;
            return (
              <Pressable
                key={option.seconds}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => chooseDuration(option.seconds)}
                style={[
                  styles.durationChip,
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

        {showSitWalkChoice ? (
          <Card>
            <ThemedText type="smallBold">Sit or walk?</ThemedText>
            <View style={styles.sitWalkRow}>
              <Button label="Seated" variant="secondary" onPress={() => {}} />
              <Button label="Walking — coming soon" variant="ghost" disabled onPress={() => {}} />
            </View>
          </Card>
        ) : null}

        <ThemedText type="smallBold">Or let a voice guide you</ThemedText>
        {GUIDED_TRACKS.map((candidate) => {
          const locked = !candidate.freeTier && !isFullBloom;
          const selected = track?.key === candidate.key;
          return (
            <Pressable
              key={candidate.key}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => chooseTrack(candidate)}
              style={[
                styles.trackCard,
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

        <Button label="Begin" onPress={startTimer} style={styles.begin} />
        <Button label="Not now" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  setup: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  durationChip: {
    borderWidth: 1,
    borderRadius: Spacing.four,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  sitWalkRow: {
    gap: Spacing.two,
  },
  trackCard: {
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
  begin: {
    marginTop: Spacing.two,
  },
  timerContainer: {
    justifyContent: 'center',
    gap: Spacing.four,
  },
  breathArea: {
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breathCircle: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: BrandPalette.sage,
  },
  centered: {
    textAlign: 'center',
  },
});
