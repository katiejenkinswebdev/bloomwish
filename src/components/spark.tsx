import { StyleSheet, View, type ViewProps } from 'react-native';

import { BrandPalette } from '@/constants/brand-palette';

export type SparkProps = ViewProps & {
  size?: number;
  color?: string;
};

/**
 * The system-wide four-point gold spark motif from the Wishing Seed identity.
 * Used for Signs fireflies, harvest celebrations, loading states, the
 * vividness glow, and the Full Bloom badge — always this one shape.
 *
 * Drawn with two crossed diamonds (no SVG dependency); reads as a four-point
 * star at any size.
 */
export function Spark({ size = 16, color = BrandPalette.gold, style, ...rest }: SparkProps) {
  const armLength = size / 2;
  const armThickness = Math.max(2, size / 5);

  return (
    <View style={[{ width: size, height: size }, styles.container, style]} {...rest}>
      <View
        style={[
          styles.arm,
          {
            width: armThickness,
            height: size,
            borderRadius: armThickness / 2,
            backgroundColor: color,
          },
        ]}
      />
      <View
        style={[
          styles.arm,
          {
            width: size,
            height: armThickness,
            borderRadius: armThickness / 2,
            backgroundColor: color,
          },
        ]}
      />
      <View
        style={[
          styles.core,
          {
            width: armLength,
            height: armLength,
            borderRadius: armLength / 2,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  arm: {
    position: 'absolute',
  },
  core: {
    position: 'absolute',
  },
});
