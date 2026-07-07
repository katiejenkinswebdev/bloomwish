import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';

/**
 * TODO(phase 6): show harvested dreams as blooming keepsakes — stone
 * plaques, butterflies, harvest dates.
 */
export default function GreenhouseScreen() {
  return (
    <Screen style={styles.container}>
      <ThemedText type="title">Greenhouse</ThemedText>
      <ThemedText themeColor="textSecondary">
        Dreams you&apos;ve harvested will be kept here as blooming keepsakes.
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    gap: Spacing.two,
  },
});
