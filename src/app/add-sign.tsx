import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { Spark } from '@/components/spark';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { fetchDreams } from '@/features/dreams/api';
import { AddSignForm } from '@/features/dreams/components/add-sign-form';

/** Standalone Add-a-Sign screen — where the post-session nudge lands. */
export default function AddSignScreen() {
  const { dreamId } = useLocalSearchParams<{ dreamId: string }>();
  const [saved, setSaved] = useState(false);

  const dreamsQuery = useQuery({ queryKey: ['dreams'], queryFn: fetchDreams });
  const dream = dreamsQuery.data?.find((d) => d.id === dreamId);

  if (saved) {
    return (
      <Screen style={styles.centered}>
        <Spark size={32} style={styles.spark} />
        <ThemedText type="title" style={styles.centeredText}>
          A new firefly ✨
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.centeredText}>
          Your sign is logged — watch it glow around your plant.
        </ThemedText>
        <Button label="Back to the garden" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText type="title">Signs it’s growing</ThemedText>
        {dream ? (
          <ThemedText themeColor="textSecondary">{dream.title}</ThemedText>
        ) : null}
        <AddSignForm
          dreamId={dreamId!}
          onSaved={() => setSaved(true)}
          onCancel={() => router.back()}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'stretch',
    gap: Spacing.three,
  },
  centeredText: {
    textAlign: 'center',
  },
  spark: {
    alignSelf: 'center',
  },
});
