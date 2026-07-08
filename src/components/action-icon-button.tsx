import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export interface ActionIconButtonProps {
  label: string;
  accessibilityLabel?: string;
  backgroundColor: string;
  onPress: () => void;
  children: React.ReactNode;
}

/**
 * A circular icon action with a satisfying press: haptic tap, squeeze, and a
 * springy pop before the action fires.
 */
export function ActionIconButton({
  label,
  accessibilityLabel,
  backgroundColor,
  onPress,
  children,
}: ActionIconButtonProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (!reducedMotion) {
      // eslint-disable-next-line react-hooks/immutability -- Reanimated shared values are driven by .value assignment
      scale.value = withTiming(0.86, { duration: 90 });
    }
  };

  const handlePressOut = () => {
    if (!reducedMotion) {
      // eslint-disable-next-line react-hooks/immutability -- Reanimated shared values are driven by .value assignment
      scale.value = withSequence(
        withSpring(1.12, { damping: 9, stiffness: 320 }),
        withSpring(1, { damping: 14, stiffness: 260 })
      );
    }
  };

  const handlePress = () => {
    // Let the pop read before the next screen takes over.
    setTimeout(onPress, reducedMotion ? 0 : 140);
  };

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}>
        <Animated.View style={[styles.circle, { backgroundColor }, animatedStyle]}>
          {children}
        </Animated.View>
      </Pressable>
      <ThemedText type="small">{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  circle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
