import { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { PlantGlyph } from '@/components/plant-glyph';
import { Spark } from '@/components/spark';
import { ThemedText } from '@/components/themed-text';
import { Branding } from '@/config/branding';
import { bloomColorFor } from '@/features/dreams/bloom-color';
import { BrandPalette } from '@/constants/brand-palette';
import { Spacing, glowGold } from '@/constants/theme';
import type { TrophyRow } from '@/lib/supabase/database.types';

export interface HarvestShareCardProps {
  trophy: TrophyRow;
  /** Snapshot taken before the dream left the active list. */
  plantedAt: string | null;
}

function season(d: Date): string {
  const m = d.getMonth();
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

/**
 * Share the bloom (4a): a story-first 9:16 keepsake on the night garden —
 * moon, fireflies, gold "days in the making", the bloomed plant, journey
 * numbers, spark wordmark. Fixed palette so it captures identically in both
 * themes. User-triggered sharing only — the app never posts anywhere itself.
 */
export const HarvestShareCard = forwardRef<View, HarvestShareCardProps>(
  function HarvestShareCard({ trophy, plantedAt }, ref) {
    const harvested = new Date(trophy.harvested_at);
    const planted = plantedAt ? new Date(plantedAt) : null;
    const daysTended = planted
      ? Math.max(1, Math.round((harvested.getTime() - planted.getTime()) / 86400000))
      : null;

    return (
      <View ref={ref} collapsable={false} style={styles.wrap}>
        <View style={styles.card}>
          {/* Soft vertical shift toward #302840 stands in for the gradient. */}
          <View style={styles.gradientBottom} pointerEvents="none" />

          <View style={styles.sky} pointerEvents="none">
            <View style={styles.moonDisc} />
            <View style={styles.moonShade} />
            <View style={[styles.firefly, { top: 36, left: 24 }, glowGold(10, 0.6)]} />
            <View style={[styles.firefly, { top: 84, right: 30 }, glowGold(10, 0.6)]} />
            <View style={[styles.firefly, { top: 150, left: 44, opacity: 0.6 }]} />
          </View>

          <ThemedText type="micro" style={styles.kicker}>
            {daysTended ? `${daysTended} days in the making` : 'It came true'}
          </ThemedText>

          <ThemedText type="cardTitle" style={styles.title} numberOfLines={3}>
            {trophy.dream_title} bloomed.
          </ThemedText>

          <PlantGlyph
            state="blooming"
            health="thriving"
            bloomColor={bloomColorFor(trophy.dream_id)}
            size={110}
          />

          <ThemedText type="small" style={styles.meta}>
            Tended {trophy.total_sessions} time{trophy.total_sessions === 1 ? '' : 's'}
            {planted ? `\nplanted in ${season(planted)}, harvested in ${season(harvested)}` : ''}
          </ThemedText>

          <View style={styles.spacer} />
          <View style={styles.wordmark}>
            <Spark size={11} />
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
  wrap: {
    alignItems: 'center',
  },
  // Story-first 9:16 proportions.
  card: {
    width: 250,
    height: 444,
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: '#241C29',
    borderRadius: 20,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.three,
    overflow: 'hidden',
  },
  gradientBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 200,
    backgroundColor: '#302840',
    opacity: 0.55,
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,
  },
  sky: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  moonDisc: {
    position: 'absolute',
    top: 20,
    right: 24,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FBF3E7',
    opacity: 0.9,
  },
  moonShade: {
    position: 'absolute',
    top: 17,
    right: 28,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#241C29',
  },
  firefly: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: BrandPalette.gold,
  },
  kicker: {
    color: BrandPalette.gold,
    marginTop: Spacing.two,
    textAlign: 'center',
  },
  title: {
    color: '#FBF3E7',
    fontSize: 24,
    lineHeight: 30,
    textAlign: 'center',
    maxWidth: 200,
  },
  meta: {
    color: '#C7B9CC',
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 16,
    marginTop: Spacing.two,
  },
  spacer: {
    flex: 1,
  },
  wordmark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginBottom: Spacing.one,
  },
  wordmarkText: {
    color: '#FBF3E7',
    fontSize: 11,
    letterSpacing: 0.6,
  },
});
