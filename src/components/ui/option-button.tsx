import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface OptionButtonProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

/**
 * A selectable option row — quiz answers, preference choices. Redesign (3c):
 * no borders, tone is the signal — backgroundElement → backgroundSelected
 * with a 10px primary dot when chosen.
 */
export function OptionButton({ label, selected, onPress }: OptionButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        {
          backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <ThemedText type="small" style={styles.label}>
        {label}
      </ThemedText>
      {selected ? <View style={[styles.dot, { backgroundColor: theme.primary }]} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three + 2,
    paddingHorizontal: Spacing.three + 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: 600,
    lineHeight: 21,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
