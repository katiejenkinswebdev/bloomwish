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
        {/* The glass gable — an A-frame roof with a spark at the peak. */}
        <View style={styles.roof} pointerEvents="none">
          <View style={[styles.glass, styles.glassLeft]} />
          <View style={[styles.glass, styles.glassRight]} />
          <View style={[styles.beam, styles.beamLeft]} />
          <View style={[styles.beam, styles.beamRight]} />
          <View style={[styles.mullion, styles.mullionLeft]} />
          <View style={[styles.mullion, styles.mullionCenter]} />
          <View style={[styles.mullion, styles.mullionRight]} />
          <View style={styles.eave} />
          <Spark size={16} style={styles.finial} />
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
    height: 72,
    marginHorizontal: -Spacing.four,
    marginBottom: -Spacing.two,
    overflow: 'hidden',
  },
  glass: {
    position: 'absolute',
    top: 30,
    width: '60%',
    height: 46,
    backgroundColor: 'rgba(143, 188, 148, 0.14)',
  },
  glassLeft: {
    left: '-4%',
    transform: [{ rotate: '-12deg' }],
  },
  glassRight: {
    right: '-4%',
    transform: [{ rotate: '12deg' }],
  },
  beam: {
    position: 'absolute',
    top: 34,
    width: '56%',
    height: 6,
    borderRadius: 3,
    backgroundColor: BrandPalette.deepGreen,
    opacity: 0.75,
  },
  beamLeft: {
    left: '-3%',
    transform: [{ rotate: '-12deg' }],
  },
  beamRight: {
    right: '-3%',
    transform: [{ rotate: '12deg' }],
  },
  mullion: {
    position: 'absolute',
    bottom: 0,
    width: 3,
    height: 22,
    borderRadius: 1.5,
    backgroundColor: 'rgba(143, 188, 148, 0.45)',
  },
  mullionLeft: {
    left: '18%',
  },
  mullionCenter: {
    left: '50%',
    height: 30,
  },
  mullionRight: {
    right: '18%',
  },
  eave: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(143, 188, 148, 0.5)',
  },
  finial: {
    position: 'absolute',
    top: 4,
    alignSelf: 'center',
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
