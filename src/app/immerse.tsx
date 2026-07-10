import { useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeIn, FadeInDown, FadeOut, useReducedMotion } from 'react-native-reanimated';

import { goBackOrHome } from '@/lib/navigation';
import { AuroraOrb, BreathGlow } from '@/components/aurora';
import { Spark } from '@/components/spark';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Branding } from '@/config/branding';
import { BrandPalette } from '@/constants/brand-palette';
import { Spacing } from '@/constants/theme';
import { completeSession, type CompletedSession } from '@/features/activities/api';
import { fetchDreams } from '@/features/dreams/api';
import { sceneLines } from '@/features/dreams/scene-lines';
import { useScreenReaderEnabled } from '@/hooks/use-screen-reader';

/**
 * The immersion ritual — the heart of the app. ~90 seconds that walk you
 * back inside the felt state of your dream: arrive, live the scene line by
 * line, find it in your body, let it warm there, seal it. Quiet, cinematic,
 * repeatable daily.
 */

type Phase = 'arrive' | 'scene' | 'body' | 'warm' | 'seal' | 'done';

/** A different doorway in, each day of the week. */
const OPENINGS = [
  'Half-close your eyes.\nOne slow breath.',
  'Let your shoulders drop.\nBreathe out longer than in.',
  'Soften your jaw.\nArrive here fully.',
  'Feel your feet.\nNow leave the room behind.',
  'One deep breath in.\nLet the day dissolve.',
  'Unclench your hands.\nOpen them upward.',
  'Close your eyes halfway.\nThe dream is already here.',
];

const BODY_SPOTS = ['My chest', 'My stomach', 'My throat', 'My hands', 'Everywhere'];

export default function ImmerseScreen() {
  const { dreamId } = useLocalSearchParams<{ dreamId: string }>();
  const queryClient = useQueryClient();
  const reducedMotion = useReducedMotion();
  const screenReader = useScreenReaderEnabled();

  const [phase, setPhase] = useState<Phase>('arrive');
  const [lineIndex, setLineIndex] = useState(0);
  const [bodySpot, setBodySpot] = useState<string | null>(null);
  const [result, setResult] = useState<CompletedSession | null>(null);
  const [startedAt] = useState(() => Date.now());
  const [opening] = useState(() => OPENINGS[new Date().getDay()]);

  const dreamsQuery = useQuery({ queryKey: ['dreams'], queryFn: fetchDreams });
  const dream = dreamsQuery.data?.find((d) => d.id === dreamId);
  const lines = dream ? sceneLines(dream.scene_text, dream.title) : [];

  const completeMutation = useMutation({
    mutationFn: (felt: string) =>
      completeSession({
        dreamId: dreamId!,
        type: 'water',
        activityId: 'immersion',
        durationSeconds: Math.round((Date.now() - startedAt) / 1000),
        reflection: `Felt it in: ${felt.toLowerCase()}`,
      }),
    onSuccess: (session) => {
      setResult(session);
      queryClient.invalidateQueries({ queryKey: ['dreams'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', dreamId] });
      setPhase('done');
    },
  });

  const advance = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (phase === 'arrive') {
      setPhase('scene');
    } else if (phase === 'scene') {
      if (lineIndex + 1 < lines.length) setLineIndex(lineIndex + 1);
      else setPhase('body');
    }
  };

  // Announce each line so screen-reader users hear the ritual unfold.
  useEffect(() => {
    if (!screenReader) return;
    if (phase === 'scene' && lines[lineIndex]) {
      AccessibilityInfo.announceForAccessibility(lines[lineIndex]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenReader, phase, lineIndex]);

  // The ritual's quiet clock: each phase flows onward on its own, and a tap
  // anywhere moves at the reader's pace instead. With a screen reader on,
  // arrive/scene never auto-advance (WCAG 2.2.2) — the reader taps through.
  useEffect(() => {
    if (screenReader && (phase === 'arrive' || phase === 'scene')) return;
    if (phase === 'arrive') {
      const t = setTimeout(() => setPhase('scene'), 7000);
      return () => clearTimeout(t);
    }
    if (phase === 'scene') {
      const t = setTimeout(() => advance(), 6500);
      return () => clearTimeout(t);
    }
    if (phase === 'warm') {
      const t = setTimeout(() => setPhase('seal'), 8000);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, lineIndex, screenReader]);

  const chooseBodySpot = (spot: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setBodySpot(spot);
    setPhase('warm');
  };

  const seal = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    completeMutation.mutate(bodySpot ?? 'everywhere');
  };

  const tappable = phase === 'arrive' || phase === 'scene';

  return (
    <Pressable
      style={styles.screen}
      onPress={tappable ? advance : undefined}
      accessibilityLabel="Immersion — tap to continue at your own pace">
      <AuroraOrb size={340} color={BrandPalette.deepGreen} opacity={0.28} top={-80} left={-90} duration={11000} delay={0} />
      <AuroraOrb size={300} color={BrandPalette.dustyPink} opacity={0.16} top={220} left={180} duration={14000} delay={900} />
      <AuroraOrb size={240} color={BrandPalette.gold} opacity={0.1} top={480} left={-60} duration={12500} delay={1700} />
      <BreathGlow />

      <View style={styles.content} pointerEvents="box-none">
        {phase === 'arrive' ? (
          <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(1200)} style={styles.centerBlock}>
            <Spark size={22} />
            <ThemedText type="title" style={styles.bigLine}>
              {opening}
            </ThemedText>
            <ThemedText type="small" style={styles.whisper}>
              tap when you’re ready
            </ThemedText>
          </Animated.View>
        ) : null}

        {phase === 'scene' ? (
          <Animated.View
            key={lineIndex}
            entering={reducedMotion ? undefined : FadeInDown.duration(900)}
            exiting={reducedMotion ? undefined : FadeOut.duration(400)}
            style={styles.centerBlock}>
            <ThemedText type="title" style={styles.bigLine}>
              {lines[lineIndex]}
            </ThemedText>
            <ThemedText type="small" style={styles.whisper}>
              {lineIndex + 1} of {lines.length} · you are there now
            </ThemedText>
          </Animated.View>
        ) : null}

        {phase === 'body' ? (
          <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(900)} style={styles.centerBlock}>
            <ThemedText type="title" style={styles.bigLine}>
              Where do you feel it{'\n'}right now?
            </ThemedText>
            <View style={styles.bodyChips}>
              {BODY_SPOTS.map((spot) => (
                <Pressable
                  key={spot}
                  accessibilityRole="button"
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  onPress={() => chooseBodySpot(spot)}
                  style={({ pressed }) => [styles.bodyChip, { opacity: pressed ? 0.7 : 1 }]}>
                  <ThemedText type="small" style={styles.bodyChipText}>
                    {spot}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        ) : null}

        {phase === 'warm' ? (
          <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(1200)} style={styles.centerBlock}>
            <ThemedText type="title" style={styles.bigLine}>
              Let it warm there.
            </ThemedText>
            <ThemedText style={styles.softLine}>
              {bodySpot === 'Everywhere' ? 'All of you knows this feeling now.' : `Keep it glowing in ${bodySpot?.toLowerCase()}. This is the frequency.`}
            </ThemedText>
          </Animated.View>
        ) : null}

        {phase === 'seal' ? (
          <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(900)} style={styles.centerBlock}>
            <ThemedText type="title" style={styles.bigLine}>
              {Branding.affirmation}
            </ThemedText>
            <Button
              label={completeMutation.isPending ? 'Sealing…' : 'And so it is'}
              loading={completeMutation.isPending}
              onPress={seal}
            />
            {completeMutation.error ? (
              <ThemedText type="small" style={styles.whisper}>
                Couldn’t save just now — tap again.
              </ThemedText>
            ) : null}
          </Animated.View>
        ) : null}

        {phase === 'done' && result ? (
          <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(900)} style={styles.centerBlock}>
            <Spark size={26} />
            <ThemedText type="title" style={styles.bigLine}>
              Your dream drank deeply.
            </ThemedText>
            <ThemedText type="small" style={styles.whisper}>
              {result.grantedBoost > 0
                ? 'The feeling compounds — come back to it tomorrow.'
                : 'Fully watered for today — the feeling is yours to keep.'}
            </ThemedText>
            <Button label="Return to the garden" variant="secondary" onPress={() => goBackOrHome()} />
          </Animated.View>
        ) : null}
      </View>

      {phase !== 'done' ? (
        <View style={styles.footer} pointerEvents="box-none">
          <Button label="Step out" variant="ghost" onPress={() => goBackOrHome()} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#1F1830',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    alignSelf: 'center',
    top: '30%',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: BrandPalette.sage,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
  },
  centerBlock: {
    alignItems: 'center',
    gap: Spacing.four,
  },
  bigLine: {
    color: '#EDE6F2',
    textAlign: 'center',
    lineHeight: 34,
  },
  softLine: {
    color: '#C7B9CC',
    textAlign: 'center',
  },
  whisper: {
    color: '#8E7F99',
    textAlign: 'center',
  },
  bodyChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  bodyChip: {
    borderWidth: 1,
    borderColor: 'rgba(237, 230, 242, 0.35)',
    backgroundColor: 'rgba(237, 230, 242, 0.08)',
    borderRadius: 999,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  bodyChipText: {
    color: '#EDE6F2',
  },
  footer: {
    paddingBottom: Spacing.five,
    paddingHorizontal: Spacing.four,
  },
});
