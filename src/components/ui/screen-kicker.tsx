import { StyleSheet, View, type ViewProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export type ScreenKickerProps = ViewProps & {
  /** Micro label above the title, e.g. "Water" or "Listen · new meditation". */
  kicker: string;
  /** Display title (34/40). Use \n for the designed two-line break. */
  title: string;
  /** Optional italic affirmation line under the title. */
  subtitle?: string;
};

/** The common screen header of the Day & Night Garden shell. */
export function ScreenKicker({ kicker, title, subtitle, style, ...rest }: ScreenKickerProps) {
  return (
    <View style={[styles.wrap, style]} {...rest}>
      <ThemedText type="micro" themeColor="textSecondary">
        {kicker}
      </ThemedText>
      <ThemedText type="display">{title}</ThemedText>
      {subtitle ? (
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          {subtitle}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two - 2,
    paddingTop: Spacing.three,
  },
  subtitle: {
    fontStyle: 'italic',
  },
});
