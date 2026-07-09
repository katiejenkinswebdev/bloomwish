import { StyleSheet, View } from 'react-native';

import { Butterfly } from '@/components/butterfly';
import { PlantGlyph } from '@/components/plant-glyph';
import { Spark } from '@/components/spark';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { BrandPalette } from '@/constants/brand-palette';
import { Spacing } from '@/constants/theme';
import type { GrantedReward } from '@/features/rewards/api';

export interface DelightMomentProps {
  reward: GrantedReward | null;
  onClose: () => void;
}

/** A surprise moment of delight — cosmetic, encouraging, never required. */
export function DelightMoment({ reward, onClose }: DelightMomentProps) {
  if (!reward) return null;
  return (
    <Sheet visible={!!reward} onClose={onClose}>
      {reward ? (
        <View style={styles.content}>
          {reward.type === 'butterfly_visit' ? (
            <>
              <Butterfly size={36} />
              <ThemedText type="subtitle" style={styles.centered}>
                A butterfly visited your garden
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
                It lingered a while near your dream.
              </ThemedText>
            </>
          ) : null}

          {reward.type === 'legendary_butterfly' ? (
            <>
              <Butterfly size={40} color={BrandPalette.gold} />
              <ThemedText type="subtitle" style={styles.centered}>
                ✦ A golden butterfly ✦
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
                The rarest visitor of all chose your garden today.
              </ThemedText>
            </>
          ) : null}

          {reward.type === 'surprise_bloom' ? (
            <>
              <PlantGlyph state="blooming" health="thriving" size={80} />
              <ThemedText type="subtitle" style={styles.centered}>
                Something bloomed overnight
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
                A surprise flower opened while you were away.
              </ThemedText>
            </>
          ) : null}

          {reward.type === 'eleven_eleven' ? (
            <>
              <Spark size={32} />
              <ThemedText type="subtitle" style={styles.centered}>
                It’s 11:11 — make a wish ✨
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
                You opened your garden at exactly the right moment. Hold your dream in your mind
                for one breath.
              </ThemedText>
            </>
          ) : null}

          {reward.type === 'universe_card' ? (
            <>
              <Spark size={28} />
              <ThemedText type="subtitle" style={styles.centered}>
                A sign from the universe
              </ThemedText>
              <ThemedText style={[styles.centered, styles.cardMessage]}>
                “{reward.message}”
              </ThemedText>
            </>
          ) : null}

          <Button label="Lovely" onPress={onClose} />
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  centered: {
    textAlign: 'center',
  },
  cardMessage: {
    fontStyle: 'italic',
    paddingHorizontal: Spacing.three,
  },
});
