import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { goBackOrHome } from '@/lib/navigation';
import { useQuery } from '@tanstack/react-query';

import { SunMoment } from '@/features/dreams/components/sun-moment';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { fetchDreams } from '@/features/dreams/api';
import { AddSignForm } from '@/features/dreams/components/add-sign-form';
import type { AddedSign } from '@/features/dreams/signs';

/** Standalone Add-a-Sign screen — where the post-session nudge lands. */
export default function AddSignScreen() {
  const { dreamId } = useLocalSearchParams<{ dreamId: string }>();
  const [saved, setSaved] = useState<AddedSign | null>(null);

  const dreamsQuery = useQuery({ queryKey: ['dreams'], queryFn: fetchDreams });
  const dream = dreamsQuery.data?.find((d) => d.id === dreamId);

  if (saved) {
    return (
      <Screen style={styles.centered}>
        <SunMoment plantState={saved.growth.newState} />
        <ThemedText type="title" style={styles.centeredText}>
          A new firefly ✨
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.centeredText}>
          The sun leaned in — real-world signs feed your plant like nothing else.
        </ThemedText>
        {saved.growth.stateAdvanced ? (
          <ThemedText type="smallBold" themeColor="accent" style={styles.centeredText}>
            ✦ A new petal — your plant just grew ✦
          </ThemedText>
        ) : null}
        <Button label="Back to the garden" onPress={() => goBackOrHome()} />
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
          onSaved={setSaved}
          onCancel={() => goBackOrHome()}
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
