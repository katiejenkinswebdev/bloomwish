import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useMutation } from '@tanstack/react-query';

import { Spark } from '@/components/spark';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';

/**
 * Soft pre-prompt: explain the value before showing the OS permission dialog.
 * Declining is a first-class path — no nagging, no dark patterns.
 */
export default function NotificationPrePromptScreen() {
  const permissionMutation = useMutation({
    mutationFn: () => Notifications.requestPermissionsAsync(),
    onSettled: () => {
      // Granted or not, the journey continues the same way.
      router.push('/onboarding/starter-dream');
    },
  });

  return (
    <Screen style={styles.container}>
      <Spark size={32} />
      <ThemedText type="title" style={styles.centered}>
        A gentle nudge, never a nag
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.centered}>
        Gardens grow with steady care. If you’d like, we’ll send one soft reminder a day at the
        time you chose — and the occasional note when something delightful happens in your garden.
      </ThemedText>

      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          No pressure, no guilt, no streak-shaming. You can change this anytime in Settings.
        </ThemedText>
      </Card>

      <Button
        label="Sounds good — enable reminders"
        loading={permissionMutation.isPending}
        onPress={() => permissionMutation.mutate()}
      />
      <Button
        label="Not right now"
        variant="ghost"
        onPress={() => router.push('/onboarding/starter-dream')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    gap: Spacing.four,
    alignItems: 'stretch',
  },
  centered: {
    textAlign: 'center',
  },
});
