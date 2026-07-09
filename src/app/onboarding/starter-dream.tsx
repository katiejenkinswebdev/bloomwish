import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { track } from '@/features/analytics/analytics';
import { upsertProfile, profileQueryKey } from '@/features/profile/api';

/**
 * The guided starter dream: coach the user to practice on something small
 * before graduating to big dreams. Completing this step finishes onboarding
 * and hands off to the create-dream flow.
 */
export default function StarterDreamScreen() {
  const queryClient = useQueryClient();

  const completeMutation = useMutation({
    mutationFn: () => upsertProfile({ onboarding_completed_at: new Date().toISOString() }),
    onSuccess: async (profile, _variables, _context) => {
      queryClient.setQueryData(profileQueryKey, profile);
      track('onboarding_completed');
      // The guard flips to the main app; land on the garden, then open the
      // starter dream flow on top of it.
      router.replace('/');
      router.push('/create-dream');
    },
  });

  return (
    <Screen style={styles.container}>
      <ThemedText type="title">Start with a small seed</ThemedText>
      <ThemedText themeColor="textSecondary">
        Here’s a gardener’s secret: don’t start with the redwood. Practice the process on a small
        dream first — something light, playful, easy to believe.
      </ThemedText>

      <Card>
        <ThemedText type="smallBold">Small seeds to try</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          🚗 A great parking spot right where you need it{'\n'}
          💵 Finding a dollar on the sidewalk{'\n'}
          ☕ A stranger’s unexpected kindness{'\n'}
          📞 A small sale or a happy phone call
        </ThemedText>
      </Card>

      <ThemedText type="small" themeColor="textSecondary">
        Once you’ve felt a small dream bloom, you’ll know exactly how to plant the big ones.
      </ThemedText>

      {completeMutation.error ? (
        <ThemedText themeColor="danger">Something went wrong. Please try again.</ThemedText>
      ) : null}

      <Button
        label="Plant my starter dream"
        loading={completeMutation.isPending}
        onPress={() => completeMutation.mutate()}
        style={styles.plantButton}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    gap: Spacing.three,
  },
  plantButton: {
    marginTop: Spacing.three,
  },
});
