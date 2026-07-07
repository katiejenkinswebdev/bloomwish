import { FlatList, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { Spark } from '@/components/spark';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { fetchDreams } from '@/features/dreams/api';

/**
 * TODO(phase 3): replace the list with the real animated garden — plant
 * states, health decay, plant detail sheet, Signs, revive flow.
 */
export default function GardenScreen() {
  const dreamsQuery = useQuery({ queryKey: ['dreams'], queryFn: fetchDreams });
  const dreams = dreamsQuery.data ?? [];

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="title">Your garden</ThemedText>
        <Spark size={20} />
      </View>

      {dreams.length === 0 ? (
        <View style={styles.empty}>
          <ThemedText themeColor="textSecondary" style={styles.emptyText}>
            {dreamsQuery.isLoading
              ? 'Tending the soil…'
              : 'Your dreams will take root here once you plant your first one.'}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={dreams}
          keyExtractor={(dream) => dream.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card>
              <ThemedText type="smallBold">{item.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {item.state} · {item.health}
              </ThemedText>
            </Card>
          )}
        />
      )}

      <Button
        label="Plant a dream"
        onPress={() => router.push('/create-dream')}
        style={styles.plantButton}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.three,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  list: {
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  plantButton: {
    marginBottom: Spacing.five,
  },
});
