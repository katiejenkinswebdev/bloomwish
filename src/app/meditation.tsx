import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
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

import { AmbientLayer } from '@/components/ambient-layer';
import { AnimatedPlant } from '@/components/animated-plant';
import { bloomColorFor } from '@/features/dreams/bloom-color';
import { Spark } from '@/components/spark';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { Screen } from '@/components/ui/screen';
import { ScreenKicker } from '@/components/ui/screen-kicker';
import { Branding } from '@/config/branding';
import { BrandPalette } from '@/constants/brand-palette';
import { ScreenPadding, Spacing, glowGold } from '@/constants/theme';
import { completeSession, type CompletedSession } from '@/features/activities/api';
import { SessionComplete } from '@/features/activities/components/session-complete';
import { fetchDreams } from '@/features/dreams/api';
import {
  fetchMeditation,
  MeditationGateError,
  MEDITATION_MINUTES,
  requestMeditation,
  type MeditationMinutes,
} from '@/features/meditations/api';
import { getPlayableMeditationUri } from '@/features/meditations/audio-cache';
import { useIsFullBloom } from '@/features/purchases/entitlements';
import type { DreamRow } from '@/lib/supabase/database.types';

// The meditation's five movements. Scripts follow this arc, so equal fifths
// of the runtime are an honest approximation until chapters carry timestamps.
const CHAPTERS = ['Arrive', 'Scene', 'Body', 'Warm', 'Seal'] as const;

// Night-surface palette for the player (4e is always a night ritual).
const NIGHT = {
  background: '#241C29',
  surface: '#302840',
  track: '#3B3050',
  text: '#FBF3E7',
  textSecondary: '#C7B9CC',
  sage: '#8FBC94',
} as const;

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
        <AnimatedPlant
          state={dream?.state ?? 'sprout'}
          health="thriving"
          bloomColor={dream ? bloomColorFor(dream.id) : undefined}
          size={120}
        />
      </Animated.View>
      <ThemedText type="heading" style={styles.centered}>
        Composing your meditation…
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
        Your own words, in {Branding.voiceName}&apos;s voice. This takes a minute or two.
      </ThemedText>
    </View>
  );
}

/**
 * The plant IS the player (4e): the stem fills as the session plays, the gold
 * spark rides the fill line, leaves appear at chapter marks, and the bloom
 * opens fully at Seal. Chapter names jump; ±15s nudges.
 */
function PlantPlayer({
  audioUrl,
  dream,
  minutes,
  onFinished,
  onClose,
}: {
  audioUrl: string;
  dream?: DreamRow;
  minutes: number;
  onFinished: () => void;
  onClose: () => void;
}) {
  const player = useAudioPlayer({ uri: audioUrl });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (status.didJustFinish) onFinished();
  }, [status.didJustFinish, onFinished]);

  const duration = status.duration || minutes * 60;
  const progress = duration > 0 ? Math.min(1, (status.currentTime ?? 0) / duration) : 0;
  const chapterIndex = Math.min(CHAPTERS.length - 1, Math.floor(progress * CHAPTERS.length));
  const bloomColor = dream ? bloomColorFor(dream.id) : BrandPalette.dustyPink;

  const STEM_HEIGHT = 240;
  const fillHeight = Math.max(4, progress * STEM_HEIGHT);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const seekBy = (delta: number) => {
    player.seekTo(Math.max(0, Math.min(duration, (status.currentTime ?? 0) + delta)));
  };
  const seekToChapter = (index: number) => {
    player.seekTo((index / CHAPTERS.length) * duration);
  };

  return (
    <View style={styles.playerFill}>
      <View style={styles.playerHeader}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={12}>
          <ThemedText type="emphasis" style={{ color: NIGHT.textSecondary }}>
            ✕
          </ThemedText>
        </Pressable>
        <View style={styles.playerHeaderCenter}>
          <ThemedText type="micro" style={{ color: NIGHT.textSecondary }}>
            Now listening
          </ThemedText>
          <ThemedText type="smallBold" style={{ color: NIGHT.text }}>
            {dream?.title ?? 'Your dream'} · {minutes} min
          </ThemedText>
        </View>
        <View style={styles.playerHeaderSpacer} />
      </View>

      <View style={styles.plantStage}>
        {/* Bloom: dim until the final chapter, fully open at Seal. */}
        <View style={{ opacity: chapterIndex >= CHAPTERS.length - 1 ? 1 : 0.45 }}>
          <View style={styles.bloomRow}>
            {[0, 60, 120, 180, 240, 300].map((angle) => (
              <View
                key={angle}
                style={[
                  styles.petal,
                  {
                    backgroundColor: bloomColor,
                    transform: [{ rotate: `${angle}deg` }, { translateY: -11 }],
                  },
                ]}
              />
            ))}
            <View style={styles.bloomCore} />
          </View>
        </View>

        <View style={styles.stemArea}>
          <View style={[styles.stemTrack, { height: STEM_HEIGHT }]} />
          <View style={[styles.stemFill, { height: fillHeight }]} />
          <View style={[styles.sparkHandle, { bottom: fillHeight - 11 }, glowGold(18, 0.55)]} />
          {/* Leaves unfurl as chapters pass. */}
          <View
            style={[styles.leafLeft, { opacity: chapterIndex >= 1 ? 1 : 0.3, bottom: 40 }]}
          />
          <View
            style={[styles.leafRight, { opacity: chapterIndex >= 1 ? 1 : 0.3, bottom: 40 }]}
          />
          <View
            style={[styles.leafLeft, styles.leafSmall, { opacity: chapterIndex >= 3 ? 1 : 0.3, bottom: 120 }]}
          />
          <View
            style={[styles.leafRight, styles.leafSmall, { opacity: chapterIndex >= 3 ? 1 : 0.3, bottom: 120 }]}
          />
          <View style={styles.soil} />
        </View>
      </View>

      <View style={styles.chapterRow}>
        {CHAPTERS.map((chapter, index) => (
          <Pressable
            key={chapter}
            accessibilityRole="button"
            accessibilityLabel={`Jump to ${chapter}`}
            onPress={() => seekToChapter(index)}
            hitSlop={8}
            style={styles.chapterItem}>
            <ThemedText
              type="smallBold"
              style={{
                fontSize: 12,
                color:
                  index < chapterIndex
                    ? NIGHT.sage
                    : index === chapterIndex
                      ? BrandPalette.gold
                      : NIGHT.textSecondary,
              }}>
              {chapter}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <View style={styles.controls}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back 15 seconds" onPress={() => seekBy(-15)} hitSlop={10}>
          <ThemedText type="smallBold" style={{ color: NIGHT.textSecondary }}>
            −15s
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={status.playing ? 'Pause' : 'Play'}
          onPress={() => (status.playing ? player.pause() : player.play())}
          style={styles.playButton}>
          {status.playing ? (
            <View style={styles.pauseBars}>
              <View style={styles.pauseBar} />
              <View style={styles.pauseBar} />
            </View>
          ) : (
            <View style={styles.playTriangle} />
          )}
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Forward 15 seconds" onPress={() => seekBy(15)} hitSlop={10}>
          <ThemedText type="smallBold" style={{ color: NIGHT.textSecondary }}>
            +15s
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.timeRow}>
        <ThemedText type="small" style={{ color: NIGHT.textSecondary, fontSize: 12 }}>
          {formatTime(status.currentTime ?? 0)}
        </ThemedText>
        <ThemedText type="small" style={{ color: NIGHT.textSecondary, fontSize: 12 }}>
          Grows as it plays
        </ThemedText>
        <ThemedText type="small" style={{ color: NIGHT.textSecondary, fontSize: 12 }}>
          {formatTime(duration)}
        </ThemedText>
      </View>
    </View>
  );
}

export default function MeditationScreen() {
  const { dreamId: dreamIdParam } = useLocalSearchParams<{ dreamId: string }>();
  const queryClient = useQueryClient();
  const isFullBloom = useIsFullBloom();

  const [pickedDreamId, setPickedDreamId] = useState<string | null>(null);
  const [minutes, setMinutes] = useState<MeditationMinutes>(5);
  const [meditationId, setMeditationId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [result, setResult] = useState<CompletedSession | null>(null);

  const dreamsQuery = useQuery({ queryKey: ['dreams'], queryFn: fetchDreams });
  const dreams = dreamsQuery.data ?? [];
  const dreamId = pickedDreamId ?? dreamIdParam ?? dreams[0]?.id;
  const dream = dreams.find((d) => d.id === dreamId);

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
      // Downloads once on native (then plays the local file forever);
      // streams a signed URL on web.
      getPlayableMeditationUri(meditation).then(setAudioUrl).catch(console.error);
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
      <Screen padded={false} style={styles.nightScreen}>
        <PlantPlayer
          audioUrl={audioUrl}
          dream={dream}
          minutes={minutes}
          onFinished={() => {
            if (finishMutation.isIdle) finishMutation.mutate();
          }}
          onClose={() => goBackOrHome()}
        />
        {isDemo ? (
          <ThemedText type="small" style={styles.demoNote}>
            Preview build: this plays a gentle placeholder tone. With the voice keys connected,
            you&apos;ll hear your own dream narrated in {Branding.voiceName}&apos;s voice.
          </ThemedText>
        ) : null}
      </Screen>
    );
  }

  if (meditationId) {
    if (meditation?.status === 'failed') {
      return (
        <Screen style={styles.container}>
          <ThemedText type="heading" style={styles.centered}>
            The garden hit a snag
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centered}>
            Your meditation couldn&apos;t be composed just now. Please try again in a little while.
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

  // ── Builder (4d) ──────────────────────────────────────────────────────────
  return (
    <Screen padded={false}>
      <AmbientLayer />
      <ScrollView contentContainerStyle={styles.builder} showsVerticalScrollIndicator={false}>
        <ScreenKicker kicker="Listen · new meditation" title={'Made for\nyour dream'} />

        {dreams.length > 1 ? (
          <ChipGroup label="Dream">
            {dreams.map((d) => (
              <Chip
                key={d.id}
                label={d.title}
                selected={d.id === dreamId}
                onPress={() => setPickedDreamId(d.id)}
              />
            ))}
          </ChipGroup>
        ) : null}

        <ChipGroup label="Length">
          {MEDITATION_MINUTES.map((option) => (
            <Chip
              key={option}
              label={`${option} min`}
              selected={minutes === option}
              onPress={() => setMinutes(option)}
            />
          ))}
        </ChipGroup>

        <ChipGroup label="Voice">
          <Chip
            label={Branding.voiceName}
            selected
            onPress={() => {}}
            icon={<Spark size={9} />}
          />
        </ChipGroup>

        <Card>
          <ThemedText type="micro" themeColor="accent">
            Your script draws on
          </ThemedText>
          <ThemedText type="small">
            {dream?.scene_text
              ? 'The scene you shaped, your capsule notes, and the signs you’ve logged.'
              : 'Your wish in your own words, and the signs you’ve logged.'}
          </ThemedText>
        </Card>

        {!isFullBloom ? (
          <Card>
            <ThemedText type="smallBold">Our gift to you</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Your starter dream comes with one personalized meditation, free — choose the length
              that feels right.
            </ThemedText>
          </Card>
        ) : null}

        {giftUsed ? (
          <Card>
            <ThemedText type="small" themeColor="textSecondary">
              Your free meditation has already been planted on a dream. Full Bloom unlocks
              unlimited personalized meditations for every dream.
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
          label="Compose my meditation"
          loading={requestMutation.isPending}
          disabled={!dreamId}
          onPress={() => requestMutation.mutate()}
          style={styles.compose}
        />
        <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
          Takes a minute or two{isFullBloom ? '' : ' · Full Bloom'}
        </ThemedText>
        <Button label="Not now" variant="ghost" onPress={() => goBackOrHome()} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    gap: Spacing.four,
  },
  builder: {
    paddingHorizontal: ScreenPadding,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  centered: {
    textAlign: 'center',
  },
  growingArea: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  compose: {
    marginTop: Spacing.two,
  },
  // ── Player (night surface) ────────────────────────────────────────────────
  nightScreen: {
    backgroundColor: NIGHT.background,
  },
  playerFill: {
    flex: 1,
    paddingHorizontal: ScreenPadding,
    paddingBottom: Spacing.five,
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.three,
  },
  playerHeaderCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  playerHeaderSpacer: {
    width: 20,
  },
  plantStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: Spacing.three,
  },
  bloomRow: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -6,
  },
  petal: {
    position: 'absolute',
    width: 15,
    height: 26,
    borderRadius: 8,
  },
  bloomCore: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: BrandPalette.gold,
  },
  stemArea: {
    width: 160,
    height: 260,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  stemTrack: {
    position: 'absolute',
    bottom: 20,
    width: 6,
    borderRadius: 3,
    backgroundColor: NIGHT.track,
  },
  stemFill: {
    position: 'absolute',
    bottom: 20,
    width: 6,
    borderRadius: 3,
    backgroundColor: BrandPalette.deepGreen,
  },
  sparkHandle: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: BrandPalette.gold,
    marginBottom: 20,
  },
  leafLeft: {
    position: 'absolute',
    left: 34,
    width: 26,
    height: 15,
    borderTopLeftRadius: 14,
    borderBottomRightRadius: 14,
    borderTopRightRadius: 2,
    borderBottomLeftRadius: 2,
    backgroundColor: BrandPalette.sage,
    transform: [{ rotate: '-28deg' }],
  },
  leafRight: {
    position: 'absolute',
    right: 34,
    width: 26,
    height: 15,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 14,
    borderTopLeftRadius: 2,
    borderBottomRightRadius: 2,
    backgroundColor: BrandPalette.sage,
    transform: [{ rotate: '28deg' }],
  },
  leafSmall: {
    width: 22,
    height: 13,
  },
  soil: {
    width: 60,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(185, 138, 94, 0.4)',
  },
  chapterRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  chapterItem: {
    paddingVertical: 4,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 36,
    paddingVertical: Spacing.three,
  },
  playButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: NIGHT.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseBars: {
    flexDirection: 'row',
    gap: 7,
  },
  pauseBar: {
    width: 7,
    height: 24,
    borderRadius: 3,
    backgroundColor: NIGHT.background,
  },
  playTriangle: {
    width: 0,
    height: 0,
    marginLeft: 5,
    borderTopWidth: 12,
    borderBottomWidth: 12,
    borderLeftWidth: 18,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: NIGHT.background,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 280,
    alignSelf: 'center',
  },
  demoNote: {
    color: NIGHT.textSecondary,
    paddingHorizontal: ScreenPadding,
    paddingBottom: Spacing.four,
    textAlign: 'center',
  },
});
