import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { goBackOrHome } from '@/lib/navigation';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { PlantGlyph } from '@/components/plant-glyph';
import { Spark } from '@/components/spark';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { completeSession, type CompletedSession } from '@/features/activities/api';
import { SessionComplete } from '@/features/activities/components/session-complete';
import { fetchDreams } from '@/features/dreams/api';
import {
  fetchMeditation,
  meditationAudioUrl,
  MeditationGateError,
  MEDITATION_MINUTES,
  requestMeditation,
  type MeditationMinutes,
} from '@/features/meditations/api';
import { useIsFullBloom } from '@/features/purchases/entitlements';
import { useTheme } from '@/hooks/use-theme';
import type { DreamRow } from '@/lib/supabase/database.types';

function GrowingIndicator({ dream }: { dream?: DreamRow }) {
  const reducedMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    pulse.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [pulse, reducedMotion]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: reducedMotion ? 1 : 0.94 + pulse.value * 0.1 }],
    opacity: 0.75 + pulse.value * 0.25,
  }));

  return (
    <View style={styles.growingArea}>
      <Animated.View style={style}>
        <PlantGlyph state={dream?.state ?? 'sprout'} health="thriving" size={120} />
      </Animated.View>
      <ThemedText type="subtitle" style={styles.centered}>
        Your meditation is being grown…
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
        Your own words, in a caring voice. This takes a minute or two.
      </ThemedText>
    </View>
  );
}

function Player({
  audioUrl,
  dream,
  minutes,
  onFinished,
}: {
  audioUrl: string;
  dream?: DreamRow;
  minutes: number;
  onFinished: () => void;
}) {
  const player = useAudioPlayer({ uri: audioUrl });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (status.didJustFinish) onFinished();
  }, [status.didJustFinish, onFinished]);

  return (
    <View style={styles.playerArea}>
      <PlantGlyph state={dream?.state ?? 'sprout'} health="thriving" size={110} />
      <ThemedText type="subtitle" style={styles.centered}>
        {dream?.title ?? 'Your dream'} · {minutes} min
      </ThemedText>
      <Button
        label={status.playing ? 'Pause' : 'Play'}
        onPress={() => (status.playing ? player.pause() : player.play())}
      />
      <Button label="Close" variant="ghost" onPress={() => goBackOrHome()} />
    </View>
  );
}

export default function MeditationScreen() {
  const { dreamId } = useLocalSearchParams<{ dreamId: string }>();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const isFullBloom = useIsFullBloom();

  const [minutes, setMinutes] = useState<MeditationMinutes>(5);
  const [meditationId, setMeditationId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [result, setResult] = useState<CompletedSession | null>(null);

  const dreamsQuery = useQuery({ queryKey: ['dreams'], queryFn: fetchDreams });
  const dream = dreamsQuery.data?.find((d) => d.id === dreamId);

  const requestMutation = useMutation({
    mutationFn: () => requestMeditation(dreamId!, minutes),
    onSuccess: setMeditationId,
    onError: (error) => {
      if (error instanceof MeditationGateError && error.reason === 'full_bloom_required') {
        router.push('/paywall');
      }
    },
  });

  const meditationQuery = useQuery({
    queryKey: ['meditation', meditationId],
    queryFn: () => fetchMeditation(meditationId!),
    enabled: !!meditationId && !audioUrl,
    refetchInterval: 4000,
  });
  const meditation = meditationQuery.data;

  useEffect(() => {
    if (meditation?.status === 'ready' && meditation.audio_url && !audioUrl) {
      meditationAudioUrl(meditation.audio_url).then(setAudioUrl).catch(console.error);
    }
  }, [meditation, audioUrl]);

  const finishMutation = useMutation({
    mutationFn: () =>
      completeSession({
        dreamId: dreamId!,
        type: 'water',
        activityId: `meditation:${minutes}m`,
        durationSeconds: minutes * 60,
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

  if (audioUrl) {
    const isDemo = meditation?.script?.startsWith('[Demo');
    return (
      <Screen style={styles.container}>
        <Player
          audioUrl={audioUrl}
          dream={dream}
          minutes={minutes}
          onFinished={() => {
            if (finishMutation.isIdle) finishMutation.mutate();
          }}
        />
        {isDemo ? (
          <Card>
            <ThemedText type="small" themeColor="textSecondary">
              Preview build: this plays a gentle placeholder tone. With the voice keys connected,
              you’ll hear your own dream narrated in the founder’s voice.
            </ThemedText>
          </Card>
        ) : null}
      </Screen>
    );
  }

  if (meditationId) {
    if (meditation?.status === 'failed') {
      return (
        <Screen style={styles.container}>
          <ThemedText type="subtitle" style={styles.centered}>
            The garden hit a snag
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centered}>
            Your meditation couldn’t be grown just now. Please try again in a little while.
          </ThemedText>
          <Button
            label="Try again"
            onPress={() => {
              setMeditationId(null);
              requestMutation.reset();
            }}
          />
          <Button label="Close" variant="ghost" onPress={() => goBackOrHome()} />
        </Screen>
      );
    }
    return (
      <Screen style={styles.container}>
        <GrowingIndicator dream={dream} />
      </Screen>
    );
  }

  const giftUsed =
    requestMutation.error instanceof MeditationGateError &&
    requestMutation.error.reason === 'gift_already_used';

  return (
    <Screen style={styles.container}>
      <View style={styles.header}>
        <Spark size={28} />
        <ThemedText type="title" style={styles.centered}>
          A meditation just for this dream
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.centered}>
          Your own scene, narrated in a caring voice, woven with your senses and feelings.
        </ThemedText>
      </View>

      {!isFullBloom ? (
        <Card>
          <ThemedText type="smallBold">🎁 Our gift to you</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Your starter dream comes with one personalized meditation, free — choose the length
            that feels right.
          </ThemedText>
        </Card>
      ) : null}

      <View style={styles.durations}>
        {MEDITATION_MINUTES.map((option) => (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected: minutes === option }}
            onPress={() => setMinutes(option)}
            style={[
              styles.durationChip,
              {
                backgroundColor: minutes === option ? theme.primarySoft : theme.backgroundElement,
                borderColor: minutes === option ? theme.primary : theme.border,
              },
            ]}>
            <ThemedText type="small">{option} min</ThemedText>
          </Pressable>
        ))}
      </View>

      {giftUsed ? (
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            Your free meditation has already been planted on a dream. Full Bloom unlocks unlimited
            personalized meditations for every dream.
          </ThemedText>
          <Button label="See Full Bloom" variant="secondary" onPress={() => router.push('/paywall')} />
        </Card>
      ) : null}

      {requestMutation.error && !giftUsed && !(requestMutation.error instanceof MeditationGateError) ? (
        <ThemedText themeColor="danger" style={styles.centered}>
          Something went wrong. Please try again.
        </ThemedText>
      ) : null}

      <Button
        label="Grow my meditation"
        loading={requestMutation.isPending}
        onPress={() => requestMutation.mutate()}
      />
      <Button label="Not now" variant="ghost" onPress={() => goBackOrHome()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    gap: Spacing.four,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  centered: {
    textAlign: 'center',
  },
  durations: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  durationChip: {
    borderWidth: 1,
    borderRadius: Spacing.four,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  growingArea: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  playerArea: {
    alignItems: 'center',
    gap: Spacing.four,
  },
});
