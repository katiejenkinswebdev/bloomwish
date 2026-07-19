import { useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';

import { AuroraBackdrop } from '@/components/aurora';
import { Spark } from '@/components/spark';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useScreenReaderEnabled } from '@/hooks/use-screen-reader';

/**
 * The taste of the magic, before we've asked for anything: thirty seconds
 * inside the feeling the whole app exists to reach. People commit to
 * feelings they've already had — not ones we promise.
 */

const STEPS = [
  'Think of one small wish.\nAnything at all.',
  'Close your eyes halfway.\nOne slow breath.',
  'Now feel it as already true —\njust for this breath.',
];

export default function TasteScreen() {
  const reducedMotion = useReducedMotion();
  const screenReader = useScreenReaderEnabled();
  const [step, setStep] = useState(0);
  const finished = step >= STEPS.length;

  // Screen readers hear each step and advance by tap only (WCAG 2.2.2).
  useEffect(() => {
    if (screenReader && !finished) {
      AccessibilityInfo.announceForAccessibility(STEPS[step].replace('\n', ' '));
    }
  }, [screenReader, step, finished]);

  useEffect(() => {
    if (finished || screenReader) return;
    const t = setTimeout(() => setStep((n) => n + 1), 6500);
    return () => clearTimeout(t);
  }, [step, finished, screenReader]);

  const advance = () => {
    if (finished) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setStep((n) => n + 1);
  };

  const continueOn = () => router.push('/onboarding/quiz');

  return (
    <Pressable style={styles.fill} onPress={advance} accessibilityLabel="A taste of the practice — tap to continue">
      <AuroraBackdrop>
        <View style={styles.content} pointerEvents="box-none">
          {!finished ? (
            <Animated.View
              key={step}
              entering={reducedMotion ? undefined : FadeIn.duration(900)}
              exiting={reducedMotion ? undefined : FadeOut.duration(400)}
              style={styles.centerBlock}>
              <ThemedText type="title" style={styles.bigLine}>
                {STEPS[step]}
              </ThemedText>
              <ThemedText type="small" style={styles.whisper}>
                tap when you’re ready
              </ThemedText>
            </Animated.View>
          ) : (
            <Animated.View
              entering={reducedMotion ? undefined : FadeIn.duration(900)}
              style={styles.centerBlock}>
              <Spark size={24} />
              <ThemedText type="title" style={styles.bigLine}>
                That feeling is the{'\n'}whole practice.
              </ThemedText>
              <ThemedText type="small" style={styles.whisper}>
                Let’s grow it into something real.
              </ThemedText>
              <Button label="Continue" onPress={continueOn} />
            </Animated.View>
          )}
        </View>

        <View style={styles.footer} pointerEvents="box-none">
          <Button label="Skip" variant="ghost" onPress={continueOn} />
        </View>
      </AuroraBackdrop>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
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
    fontSize: 26,
    lineHeight: 36,
  },
  whisper: {
    color: '#C7B9CC',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  footer: {
    paddingBottom: Spacing.five,
    paddingHorizontal: Spacing.four,
  },
});
