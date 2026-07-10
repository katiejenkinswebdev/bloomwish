import { StyleSheet, View, type ViewProps } from 'react-native';

import { BrandPalette } from '@/constants/brand-palette';

/**
 * The Wishing Seed icon set. Every icon is drawn from simple Views and border
 * radii — the same naive-geometry language as Spark, DropletIcon, PlantGlyph,
 * and Butterfly. No SVG dependency, tintable, crisp at tab-bar sizes.
 */

export type IconProps = ViewProps & {
  size?: number;
  color?: string;
  /** For icons with cutouts (moon, mask): the surface color behind them. */
  holeColor?: string;
};

function Box({ size = 24, style, children, ...rest }: IconProps & { children?: React.ReactNode }) {
  return (
    <View style={[{ width: size, height: size }, styles.box, style]} {...rest}>
      {children}
    </View>
  );
}

/** Garden tab — a young sprout: stem and two first leaves. */
export function SproutIcon({ size = 24, color = BrandPalette.deepGreen, ...rest }: IconProps) {
  const leaf = {
    position: 'absolute' as const,
    width: size * 0.42,
    height: size * 0.22,
    borderRadius: size * 0.12,
    backgroundColor: color,
  };
  return (
    <Box size={size} {...rest}>
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.06,
          width: Math.max(2, size * 0.1),
          height: size * 0.62,
          borderRadius: size * 0.05,
          backgroundColor: color,
        }}
      />
      <View
        style={[leaf, { bottom: size * 0.42, left: size * 0.02, transform: [{ rotate: '-34deg' }] }]}
      />
      <View
        style={[leaf, { bottom: size * 0.52, right: size * 0.02, transform: [{ rotate: '34deg' }] }]}
      />
    </Box>
  );
}

/** Greenhouse tab — a little glasshouse: gabled roof over a paned body. */
export function GreenhouseIcon({ size = 24, color = BrandPalette.deepGreen, ...rest }: IconProps) {
  const border = Math.max(2, size * 0.09);
  return (
    <Box size={size} {...rest}>
      <View
        style={{
          position: 'absolute',
          top: size * 0.04,
          width: 0,
          height: 0,
          borderLeftWidth: size * 0.42,
          borderRightWidth: size * 0.42,
          borderBottomWidth: size * 0.34,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.06,
          width: size * 0.68,
          height: size * 0.52,
          borderWidth: border,
          borderColor: color,
          borderRadius: size * 0.06,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.06,
          width: border,
          height: size * 0.52,
          backgroundColor: color,
        }}
      />
    </Box>
  );
}

/** Profile tab — the gardener: a head with a tiny leaf, over round shoulders. */
export function GardenerIcon({ size = 24, color = BrandPalette.deepGreen, ...rest }: IconProps) {
  return (
    <Box size={size} {...rest}>
      <View
        style={{
          position: 'absolute',
          top: size * 0.14,
          width: size * 0.4,
          height: size * 0.4,
          borderRadius: size * 0.2,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.0,
          right: size * 0.22,
          width: size * 0.26,
          height: size * 0.13,
          borderRadius: size * 0.07,
          backgroundColor: color,
          transform: [{ rotate: '32deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          width: size * 0.72,
          height: size * 0.34,
          borderTopLeftRadius: size * 0.36,
          borderTopRightRadius: size * 0.36,
          backgroundColor: color,
        }}
      />
    </Box>
  );
}

/** Breathe — rising bubbles. */
export function BreathIcon({ size = 24, color = '#5D9DC4', ...rest }: IconProps) {
  const ring = Math.max(2, size * 0.09);
  return (
    <Box size={size} {...rest}>
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: size * 0.08,
          width: size * 0.56,
          height: size * 0.56,
          borderRadius: size * 0.28,
          borderWidth: ring,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.18,
          right: size * 0.14,
          width: size * 0.24,
          height: size * 0.24,
          borderRadius: size * 0.12,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 0,
          right: size * 0.36,
          width: size * 0.13,
          height: size * 0.13,
          borderRadius: size * 0.07,
          backgroundColor: color,
        }}
      />
    </Box>
  );
}

/** Listen — headphones: a band with two soft pads. */
export function HeadphonesIcon({ size = 24, color = BrandPalette.plum, ...rest }: IconProps) {
  const band = Math.max(2, size * 0.1);
  return (
    <Box size={size} {...rest}>
      <View
        style={{
          position: 'absolute',
          top: size * 0.08,
          width: size * 0.74,
          height: size * 0.74,
          borderRadius: size * 0.37,
          borderWidth: band,
          borderColor: color,
          borderBottomColor: 'transparent',
          transform: [{ rotate: '0deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.06,
          left: size * 0.08,
          width: size * 0.2,
          height: size * 0.32,
          borderRadius: size * 0.09,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.06,
          right: size * 0.08,
          width: size * 0.2,
          height: size * 0.32,
          borderRadius: size * 0.09,
          backgroundColor: color,
        }}
      />
    </Box>
  );
}

/** Speak — a small sun: your words, said into the day. */
export function SunIcon({
  size = 24,
  color = BrandPalette.gold,
  holeColor = '#FBF3E7',
  ...rest
}: IconProps) {
  const ray = {
    position: 'absolute' as const,
    width: Math.max(2, size * 0.09),
    height: size,
    borderRadius: size * 0.05,
    backgroundColor: color,
  };
  return (
    <Box size={size} {...rest}>
      {['0deg', '45deg', '90deg', '135deg'].map((rotate) => (
        <View key={rotate} style={[ray, { transform: [{ rotate }] }]} />
      ))}
      <View
        style={{
          position: 'absolute',
          width: size * 0.52,
          height: size * 0.52,
          borderRadius: size * 0.26,
          backgroundColor: color,
          borderWidth: Math.max(2, size * 0.08),
          borderColor: holeColor,
        }}
      />
    </Box>
  );
}

/** Write — a pen nib on the diagonal. */
export function PenIcon({
  size = 24,
  color = BrandPalette.plum,
  holeColor = '#FBF3E7',
  ...rest
}: IconProps) {
  return (
    <Box size={size} {...rest}>
      <View
        style={{
          position: 'absolute',
          top: size * 0.04,
          right: size * 0.1,
          width: size * 0.24,
          height: size * 0.66,
          borderRadius: size * 0.1,
          backgroundColor: color,
          transform: [{ rotate: '45deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.08,
          left: size * 0.1,
          width: size * 0.2,
          height: size * 0.2,
          backgroundColor: color,
          borderRadius: size * 0.04,
          transform: [{ rotate: '45deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.13,
          left: size * 0.15,
          width: size * 0.07,
          height: size * 0.07,
          borderRadius: size * 0.04,
          backgroundColor: holeColor,
        }}
      />
    </Box>
  );
}

/** Drift — a crescent moon. */
export function MoonIcon({
  size = 24,
  color = '#C9B858',
  holeColor = '#FBF3E7',
  ...rest
}: IconProps) {
  return (
    <Box size={size} {...rest}>
      <View
        style={{
          position: 'absolute',
          width: size * 0.78,
          height: size * 0.78,
          borderRadius: size * 0.39,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.02,
          right: size * 0.0,
          width: size * 0.62,
          height: size * 0.62,
          borderRadius: size * 0.31,
          backgroundColor: holeColor,
        }}
      />
    </Box>
  );
}

/** Remembered writing — an open book. */
export function BookIcon({
  size = 24,
  color = BrandPalette.deepGreen,
  holeColor = '#FBF3E7',
  ...rest
}: IconProps) {
  const page = {
    position: 'absolute' as const,
    width: size * 0.38,
    height: size * 0.56,
    borderRadius: size * 0.08,
    backgroundColor: color,
  };
  return (
    <Box size={size} {...rest}>
      <View style={[page, { left: size * 0.08, transform: [{ rotate: '-8deg' }] }]} />
      <View style={[page, { right: size * 0.08, transform: [{ rotate: '8deg' }] }]} />
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.1,
          width: Math.max(2, size * 0.08),
          height: size * 0.6,
          borderRadius: size * 0.04,
          backgroundColor: holeColor,
          opacity: 0.9,
        }}
      />
    </Box>
  );
}

/** Tell someone — a speech bubble. */
export function SpeechBubbleIcon({ size = 24, color = '#5D9DC4', ...rest }: IconProps) {
  return (
    <Box size={size} {...rest}>
      <View
        style={{
          position: 'absolute',
          top: size * 0.08,
          width: size * 0.8,
          height: size * 0.58,
          borderRadius: size * 0.22,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.12,
          left: size * 0.24,
          width: size * 0.22,
          height: size * 0.22,
          backgroundColor: color,
          borderRadius: size * 0.04,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </Box>
  );
}

/** Voice note — a microphone capsule on its stand. */
export function MicIcon({ size = 24, color = BrandPalette.plum, ...rest }: IconProps) {
  return (
    <Box size={size} {...rest}>
      <View
        style={{
          position: 'absolute',
          top: size * 0.02,
          width: size * 0.34,
          height: size * 0.52,
          borderRadius: size * 0.17,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.14,
          width: Math.max(2, size * 0.08),
          height: size * 0.18,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.06,
          width: size * 0.4,
          height: Math.max(2, size * 0.08),
          borderRadius: size * 0.04,
          backgroundColor: color,
        }}
      />
    </Box>
  );
}

/** Gratitude — a bloom, straight from the plant glyph. */
export function FlowerIcon({ size = 24, color = BrandPalette.dustyPink, ...rest }: IconProps) {
  return (
    <Box size={size} {...rest}>
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <View
          key={angle}
          style={{
            position: 'absolute',
            width: size * 0.26,
            height: size * 0.44,
            borderRadius: size * 0.13,
            backgroundColor: color,
            transform: [{ rotate: `${angle}deg` }, { translateY: -size * 0.18 }],
          }}
        />
      ))}
      <View
        style={{
          position: 'absolute',
          width: size * 0.26,
          height: size * 0.26,
          borderRadius: size * 0.13,
          backgroundColor: BrandPalette.gold,
        }}
      />
    </Box>
  );
}

/** Act as if — a friendly theatre mask. */
export function MaskIcon({
  size = 24,
  color = BrandPalette.plum,
  holeColor = '#FBF3E7',
  ...rest
}: IconProps) {
  const eye = {
    position: 'absolute' as const,
    top: size * 0.3,
    width: size * 0.13,
    height: size * 0.13,
    borderRadius: size * 0.07,
    backgroundColor: holeColor,
  };
  return (
    <Box size={size} {...rest}>
      <View
        style={{
          position: 'absolute',
          top: size * 0.08,
          width: size * 0.7,
          height: size * 0.8,
          borderTopLeftRadius: size * 0.24,
          borderTopRightRadius: size * 0.24,
          borderBottomLeftRadius: size * 0.36,
          borderBottomRightRadius: size * 0.36,
          backgroundColor: color,
        }}
      />
      <View style={[eye, { left: size * 0.28 }]} />
      <View style={[eye, { right: size * 0.28 }]} />
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.24,
          width: size * 0.3,
          height: size * 0.15,
          borderBottomLeftRadius: size * 0.15,
          borderBottomRightRadius: size * 0.15,
          backgroundColor: holeColor,
        }}
      />
    </Box>
  );
}

/** A single leaf — feeding, composting, growing things. */
export function LeafIcon({ size = 24, color = BrandPalette.sage, ...rest }: IconProps) {
  return (
    <Box size={size} {...rest}>
      <View
        style={{
          position: 'absolute',
          width: size * 0.72,
          height: size * 0.44,
          borderTopLeftRadius: size * 0.06,
          borderTopRightRadius: size * 0.36,
          borderBottomLeftRadius: size * 0.36,
          borderBottomRightRadius: size * 0.06,
          backgroundColor: color,
          transform: [{ rotate: '-38deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.08,
          right: size * 0.16,
          width: Math.max(2, size * 0.07),
          height: size * 0.24,
          borderRadius: size * 0.04,
          backgroundColor: color,
          transform: [{ rotate: '-38deg' }],
        }}
      />
    </Box>
  );
}

/** Rampage — a bolt of appreciation. */
export function BoltIcon({ size = 24, color = BrandPalette.gold, ...rest }: IconProps) {
  const bar = {
    position: 'absolute' as const,
    width: size * 0.26,
    height: size * 0.52,
    backgroundColor: color,
  };
  return (
    <Box size={size} {...rest}>
      <View
        style={[
          bar,
          {
            top: 0,
            left: size * 0.32,
            borderTopLeftRadius: size * 0.1,
            borderTopRightRadius: size * 0.1,
            transform: [{ skewX: '-18deg' }],
          },
        ]}
      />
      <View
        style={[
          bar,
          {
            bottom: 0,
            right: size * 0.32,
            borderBottomLeftRadius: size * 0.1,
            borderBottomRightRadius: size * 0.1,
            transform: [{ skewX: '-18deg' }],
          },
        ]}
      />
    </Box>
  );
}

/** Future letter — an envelope with its flap. */
export function EnvelopeIcon({
  size = 24,
  color = BrandPalette.dustyPink,
  holeColor = '#FBF3E7',
  ...rest
}: IconProps) {
  const flap = {
    position: 'absolute' as const,
    top: size * 0.3,
    width: size * 0.46,
    height: Math.max(2, size * 0.08),
    borderRadius: size * 0.04,
    backgroundColor: holeColor,
  };
  return (
    <Box size={size} {...rest}>
      <View
        style={{
          position: 'absolute',
          top: size * 0.16,
          width: size * 0.84,
          height: size * 0.6,
          borderRadius: size * 0.1,
          backgroundColor: color,
        }}
      />
      <View style={[flap, { left: size * 0.08, transform: [{ rotate: '24deg' }] }]} />
      <View style={[flap, { right: size * 0.08, transform: [{ rotate: '-24deg' }] }]} />
    </Box>
  );
}

/** Plus — plant something new. */
export function PlusIcon({ size = 24, color = '#FFFFFF', ...rest }: IconProps) {
  const bar = Math.max(2.5, size * 0.12);
  return (
    <Box size={size} {...rest}>
      <View
        style={{
          position: 'absolute',
          width: bar,
          height: size * 0.78,
          borderRadius: bar / 2,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size * 0.78,
          height: bar,
          borderRadius: bar / 2,
          backgroundColor: color,
        }}
      />
    </Box>
  );
}

/** A seed — the beginning of everything here. */
export function SeedIcon({ size = 24, color = BrandPalette.warmBrown, ...rest }: IconProps) {
  return (
    <Box size={size} {...rest}>
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.04,
          width: size * 0.56,
          height: size * 0.68,
          borderTopLeftRadius: size * 0.1,
          borderTopRightRadius: size * 0.32,
          borderBottomLeftRadius: size * 0.32,
          borderBottomRightRadius: size * 0.32,
          backgroundColor: color,
          transform: [{ rotate: '12deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.02,
          right: size * 0.24,
          width: size * 0.22,
          height: size * 0.11,
          borderRadius: size * 0.06,
          backgroundColor: BrandPalette.sage,
          transform: [{ rotate: '-30deg' }],
        }}
      />
    </Box>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
