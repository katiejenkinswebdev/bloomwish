import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { Butterfly } from '@/components/butterfly';
import { PlantGlyph } from '@/components/plant-glyph';
import { Spark } from '@/components/spark';
import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';
import { BrandPalette } from '@/constants/brand-palette';
import { Spacing } from '@/constants/theme';
import { fetchHarvestedDreams, type HarvestedDream } from '@/features/harvest/api';

/** Keepsakes live on shelves, two per shelf — like pots in a real glasshouse. */
function chunkPairs<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
}

export default function GreenhouseScreen() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const harvestedQuery = useQuery({
    queryKey: ['harvested-dreams'],
    queryFn: fetchHarvestedDreams,
  });
  const harvested = harvestedQuery.data ?? [];

  const renderKeepsake = ({ trophy, sceneText }: HarvestedDream, index: number) => {
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
        <View style={styles.pot} />
        <View style={styles.plaque}>
          <ThemedText type="smallBold" style={styles.plaqueText} numberOfLines={2}>
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
  };

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* The glass roof — light falling through panes. */}
        <View style={styles.roof} pointerEvents="none">
          <View style={[styles.pane, styles.paneLeft]} />
          <View style={styles.ridge} />
          <View style={[styles.pane, styles.paneRight]} />
        </View>

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
          chunkPairs(harvested).map((row, rowIndex) => (
            <View key={row[0].trophy.id} style={styles.shelfGroup}>
              <View style={styles.shelfRow}>
                {row.map((item, i) => renderKeepsake(item, rowIndex * 2 + i))}
                {row.length === 1 ? <View style={styles.keepsakeSpacer} /> : null}
              </View>
              <View style={styles.shelf} />
            </View>
          ))
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
  roof: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 26,
    marginHorizontal: -Spacing.four,
    marginBottom: -Spacing.two,
  },
  pane: {
    flex: 1,
    height: 14,
    backgroundColor: 'rgba(143, 188, 148, 0.16)',
    borderColor: 'rgba(143, 188, 148, 0.4)',
    borderTopWidth: 1,
  },
  paneLeft: {
    transform: [{ skewY: '4deg' }],
  },
  paneRight: {
    transform: [{ skewY: '-4deg' }],
  },
  ridge: {
    width: 5,
    height: 24,
    borderRadius: 2,
    backgroundColor: BrandPalette.sage,
    opacity: 0.7,
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
  shelfGroup: {
    gap: 0,
  },
  shelfRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.three,
  },
  keepsake: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  keepsakeSpacer: {
    flex: 1,
  },
  keepsakeTop: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.three,
  },
  pot: {
    width: 44,
    height: 16,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: BrandPalette.warmBrown,
    marginTop: -Spacing.two,
  },
  plaque: {
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#8B8680',
    borderRadius: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
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
    paddingHorizontal: Spacing.two,
  },
  shelf: {
    height: 8,
    borderRadius: 4,
    backgroundColor: BrandPalette.warmBrown,
    borderBottomWidth: 2,
    borderBottomColor: '#8A6844',
  },
});
