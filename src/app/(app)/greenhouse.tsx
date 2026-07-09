import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { Butterfly } from '@/components/butterfly';
import { PlantGlyph } from '@/components/plant-glyph';
import { Spark } from '@/components/spark';
import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { fetchHarvestedDreams } from '@/features/harvest/api';

export default function GreenhouseScreen() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const harvestedQuery = useQuery({
    queryKey: ['harvested-dreams'],
    queryFn: fetchHarvestedDreams,
  });
  const harvested = harvestedQuery.data ?? [];

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText type="title">Greenhouse</ThemedText>
          <Spark size={20} />
        </View>
        <ThemedText themeColor="textSecondary">
          Every dream that came true, kept in bloom forever.
        </ThemedText>

        {harvested.length === 0 ? (
          <View style={styles.empty}>
            <ThemedText themeColor="textSecondary" style={styles.centered}>
              {harvestedQuery.isLoading
                ? 'Opening the greenhouse…'
                : 'When a dream comes true out in the world, harvest it — it will live here as a keepsake.'}
            </ThemedText>
          </View>
        ) : (
          harvested.map(({ trophy, sceneText }, index) => {
            const date = new Date(trophy.harvested_at).toLocaleDateString(undefined, {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            });
            const expanded = expandedId === trophy.id;
            return (
              <Pressable
                key={trophy.id}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                onPress={() => setExpandedId(expanded ? null : trophy.id)}
                style={styles.keepsake}>
                <View style={styles.keepsakeTop}>
                  <PlantGlyph state="blooming" health="thriving" size={72} />
                  <Butterfly size={20} index={index} />
                </View>
                <View style={styles.plaque}>
                  <ThemedText type="smallBold" style={styles.plaqueText}>
                    {trophy.dream_title}
                  </ThemedText>
                  <ThemedText type="small" style={styles.plaqueText}>
                    Came true {date} · tended {trophy.total_sessions} time
                    {trophy.total_sessions === 1 ? '' : 's'}
                  </ThemedText>
                </View>
                {expanded && sceneText ? (
                  <ThemedText type="small" themeColor="textSecondary" style={styles.scene}>
                    {sceneText}
                  </ThemedText>
                ) : null}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.three,
  },
  empty: {
    paddingTop: Spacing.six,
  },
  centered: {
    textAlign: 'center',
  },
  keepsake: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  keepsakeTop: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.three,
  },
  plaque: {
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#8B8680',
    borderRadius: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderWidth: 2,
    borderColor: '#6F6A64',
  },
  plaqueText: {
    color: '#F5F2EC',
    textAlign: 'center',
  },
  scene: {
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
  },
});
