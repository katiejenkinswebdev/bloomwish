import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { goBackOrHome } from '@/lib/navigation';
import { useQuery } from '@tanstack/react-query';

import { PlantGlyph } from '@/components/plant-glyph';
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
  const { dreamId: dreamIdParam } = useLocalSearchParams<{ dreamId?: string }>();
  const [pickedDreamId, setPickedDreamId] = useState<string | null>(null);
  const [saved, setSaved] = useState<AddedSign | null>(null);

  const dreamId = dreamIdParam ?? pickedDreamId ?? undefined;
  const dreamsQuery = useQuery({ queryKey: ['dreams'], queryFn: fetchDreams });
  const dreams = dreamsQuery.data ?? [];
  const dream = dreams.find((d) => d.id === dreamId);

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

  if (!dreamId) {
    return (
      <Screen padded={false}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title">Signs it’s growing</ThemedText>
          <ThemedText themeColor="textSecondary">Which dream sent you a sign?</ThemedText>
          {dreams.map((candidate) => (
            <Pressable
              key={candidate.id}
              accessibilityRole="button"
              onPress={() => setPickedDreamId(candidate.id)}
              style={({ pressed }) => [styles.dreamOption, { opacity: pressed ? 0.8 : 1 }]}>
              <PlantGlyph state={candidate.state} health={candidate.health} size={48} />
              <ThemedText type="small" style={styles.dreamOptionTitle} numberOfLines={2}>
                {candidate.title}
              </ThemedText>
            </Pressable>
          ))}
          <Button label="Cancel" variant="ghost" onPress={() => goBackOrHome()} />
        </ScrollView>
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
          dreamId={dreamId}
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
  dreamOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  dreamOptionTitle: {
    flex: 1,
  },
});
