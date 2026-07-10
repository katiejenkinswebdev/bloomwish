import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string | null;
}

/**
 * The one header pattern for top-level screens: title 16pt below the safe
 * area, subtitle 16pt below the title — matching the rhythm the modal
 * screens get from their scroll-content gap.
 */
export function ScreenHeader({ title, subtitle }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <ThemedText type="title">{title}</ThemedText>
      {subtitle ? <ThemedText themeColor="textSecondary">{subtitle}</ThemedText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
});
