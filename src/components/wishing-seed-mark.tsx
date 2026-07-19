import { StyleSheet, View } from 'react-native';

import { Spark } from '@/components/spark';
import { BrandPalette } from '@/constants/brand-palette';

/**
 * The Wishing Seed logo mark (3a): a young sprout with two leaves reaching
 * toward a golden four-point spark, with a smaller secondary spark nearby.
 * Shape-drawn placeholder for the final asset — proportions from the mocks.
 */
export function WishingSeedMark({ size = 120 }: { size?: number }) {
  const s = size / 120; // scale factor against the 120×140 reference art

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: 120 * s, height: 140 * s }}>
      <Spark size={32 * s} style={{ position: 'absolute', top: 0, left: 44 * s }} />
      <Spark size={14 * s} style={{ position: 'absolute', top: 26 * s, left: 84 * s }} />
      <View
        style={[
          styles.leaf,
          {
            left: 24 * s,
            bottom: 48 * s,
            width: 34 * s,
            height: 20 * s,
            borderTopLeftRadius: 20 * s,
            borderBottomRightRadius: 20 * s,
            transform: [{ rotate: '-30deg' }],
          },
        ]}
      />
      <View
        style={[
          styles.leaf,
          {
            right: 24 * s,
            bottom: 48 * s,
            width: 34 * s,
            height: 20 * s,
            borderTopRightRadius: 20 * s,
            borderBottomLeftRadius: 20 * s,
            transform: [{ rotate: '30deg' }],
          },
        ]}
      />
      <View
        style={[
          styles.stem,
          { left: 57 * s, width: 6 * s, height: 64 * s, borderRadius: 3 * s },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  leaf: {
    position: 'absolute',
    backgroundColor: BrandPalette.sage,
    borderTopRightRadius: 2,
    borderBottomLeftRadius: 2,
  },
  stem: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: BrandPalette.deepGreen,
  },
});
