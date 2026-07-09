import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { BrandPalette } from '@/constants/brand-palette';
import { Spacing } from '@/constants/theme';

export interface CompostMomentProps {
  doubtText: string;
  onDone: () => void;
}

/**
 * The doubt card sinks into the soil and breaks down — doubts become
 * nourishment here, never trash. Calls onDone when the moment lands.
 */
export function CompostMoment({ doubtText, onDone }: CompostMomentProps) {
  const reducedMotion = useReducedMotion();
  const sink = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      const t = setTimeout(onDone, 600);
      return () => clearTimeout(t);
    }
    sink.value = withDelay(
      500,
      withTiming(1, { duration: 1900, easing: Easing.in(Easing.quad) }, (finished) => {
        if (finished) runOnJS(onDone)();
      })
    );
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: 1 - sink.value * 0.9,
    transform: [
      { translateY: sink.value * 140 },
      { scale: 1 - sink.value * 0.5 },
      { rotate: `${sink.value * -5}deg` },
    ],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.doubtCard, cardStyle]}>
        <ThemedText type="small" style={styles.doubtText} numberOfLines={4}>
          {doubtText}
        </ThemedText>
      </Animated.View>
      <View style={styles.soil} />
      <ThemedText type="small" themeColor="textSecondary" style={styles.caption}>
        breaking down into nourishment…
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.four,
  },
  doubtCard: {
    backgroundColor: '#EDE0CC',
    borderRadius: Spacing.three,
    padding: Spacing.three,
    maxWidth: 280,
    zIndex: 1,
  },
  doubtText: {
    fontStyle: 'italic',
  },
  soil: {
    width: 200,
    height: 52,
    borderRadius: 26,
    backgroundColor: BrandPalette.warmBrown,
    marginTop: -Spacing.three,
  },
  caption: {
    textAlign: 'center',
  },
});
