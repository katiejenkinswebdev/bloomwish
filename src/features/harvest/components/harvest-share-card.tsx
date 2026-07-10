import { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { PlantGlyph } from '@/components/plant-glyph';
import { Spark } from '@/components/spark';
import { ThemedText } from '@/components/themed-text';
import { Branding } from '@/config/branding';
import { bloomColorFor } from '@/features/dreams/bloom-color';
import { BrandPalette } from '@/constants/brand-palette';
import { Spacing } from '@/constants/theme';
import type { TrophyRow } from '@/lib/supabase/database.types';

export interface HarvestShareCardProps {
  trophy: TrophyRow;
  /** Snapshot taken before the dream left the active list. */
  plantedAt: string | null;
}

/**
 * The shareable bloom: a fixed-palette keepsake card (identical in light and
 * dark mode) that captures cleanly with view-shot on native and reads as a
 * screenshot-worthy moment on web. User-triggered sharing only — the app
 * never posts anywhere itself.
 */
export const HarvestShareCard = forwardRef<View, HarvestShareCardProps>(
  function HarvestShareCard({ trophy, plantedAt }, ref) {
    const harvested = new Date(trophy.harvested_at);
    const planted = plantedAt ? new Date(plantedAt) : null;
    const daysTended = planted
      ? Math.max(1, Math.round((harvested.getTime() - planted.getTime()) / 86400000))
      : null;
    const shortDate = (d: Date) =>
      d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });

    return (
      <View ref={ref} collapsable={false}>
        <View style={styles.card}>
          <View style={styles.stars} pointerEvents="none">
            <Spark size={10} style={{ position: 'absolute', top: 14, left: 24 }} />
            <Spark size={7} style={{ position: 'absolute', top: 34, right: 40 }} />
            <Spark size={8} style={{ position: 'absolute', top: 10, right: 90 }} />
          </View>

          <ThemedText type="small" style={styles.kicker}>
            IT CAME TRUE
          </ThemedText>

          <PlantGlyph
            state="blooming"
            health="thriving"
            bloomColor={bloomColorFor(trophy.dream_id)}
            size={92}
          />

          <ThemedText type="subtitle" style={styles.title} numberOfLines={3}>
            {trophy.dream_title}
          </ThemedText>

          <ThemedText type="small" style={styles.meta}>
            {daysTended
              ? `Tended ${trophy.total_sessions} time${trophy.total_sessions === 1 ? '' : 's'} over ${daysTended} day${daysTended === 1 ? '' : 's'}`
              : `Tended ${trophy.total_sessions} time${trophy.total_sessions === 1 ? '' : 's'}`}
          </ThemedText>
          <ThemedText type="small" style={styles.meta}>
            {planted
              ? `Planted ${shortDate(planted)} · Harvested ${shortDate(harvested)}, ${harvested.getFullYear()}`
              : `Harvested ${shortDate(harvested)}, ${harvested.getFullYear()}`}
          </ThemedText>

          <View style={styles.wordmark}>
            <Spark size={12} />
            <ThemedText type="smallBold" style={styles.wordmarkText}>
              {Branding.appName}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: '#241C36',
    borderRadius: Spacing.three,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
    overflow: 'hidden',
  },
  stars: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  kicker: {
    color: BrandPalette.gold,
    letterSpacing: 2,
    fontSize: 11,
  },
  title: {
    color: '#F2ECF7',
    textAlign: 'center',
  },
  meta: {
    color: '#B9A8C6',
    textAlign: 'center',
  },
  wordmark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  wordmarkText: {
    color: '#EDE6F2',
  },
});
