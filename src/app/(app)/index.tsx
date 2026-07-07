import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';

/**
 * TODO(phase 3): replace with the real animated garden — plant states,
 * health decay, plant detail sheet, Signs, revive flow.
 */
export default function GardenScreen() {
  return (
    <Screen style={styles.container}>
      <ThemedText type="title">Your garden</ThemedText>
      <ThemedText themeColor="textSecondary">
        Your dreams will take root here once you plant your first one.
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
