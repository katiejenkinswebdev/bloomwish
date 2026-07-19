import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Small leading glyph (the gold spark on the founder-voice chip). */
  icon?: React.ReactNode;
  disabled?: boolean;
}

/**
 * The chip selector of the meditation builder (4d): selected chips sit on
 * backgroundSelected at weight 700; unselected on backgroundElement at 600
 * in textSecondary. No borders — tone is the signal.
 */
export function Chip({ label, selected, onPress, icon, disabled }: ChipProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}>
      {icon ? <View>{icon}</View> : null}
      <ThemedText
        type="small"
        style={{
          fontWeight: selected ? 700 : 600,
          color: selected ? theme.text : theme.textSecondary,
        }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/** Wrapping row of chips under a micro label. */
export function ChipGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <ThemedText type="micro" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: Spacing.three,
    paddingVertical: 10,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  group: {
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
