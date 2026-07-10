import { StyleSheet, View } from 'react-native';

import { Spark } from '@/components/spark';
import { BrandPalette } from '@/constants/brand-palette';
import type { DreamHealth, DreamState } from '@/lib/supabase/database.types';

export interface PlantGlyphProps {
  state: DreamState;
  health: DreamHealth;
  size?: number;
  /** The dream's own petal color (see bloom-color.ts). Defaults to the signature pink. */
  bloomColor?: string;
}

/**
 * Shape-drawn plant for each growth state with health overlays. Placeholder
 * for richer Lottie plants in the polish pass — but intentionally on-brand:
 * deep green stems, sage leaves, dusty-pink blooms, gold spark when thriving.
 * TODO(phase 8): swap for animated Lottie plants.
 */
export function PlantGlyph({ state, health, size = 96, bloomColor: bloomProp }: PlantGlyphProps) {
  const wilting = health === 'wilting';
  const dormant = health === 'dormant';

  const stemColor = dormant ? '#8C8577' : BrandPalette.deepGreen;
  const leafColor = dormant ? '#A39B8B' : BrandPalette.sage;
  const bloomColor = dormant ? '#B8A9A0' : (bloomProp ?? BrandPalette.dustyPink);

  const stemHeight =
    state === 'seed' ? 0 : state === 'sprout' ? size * 0.28 : state === 'growing' ? size * 0.46 : size * 0.56;

  const showFirstLeaves = state !== 'seed';
  const showSecondLeaves = state === 'growing' || state === 'budding' || state === 'blooming';
  const showBud = state === 'budding';
  const showBloom = state === 'blooming';

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, opacity: dormant ? 0.55 : 1 },
        wilting && styles.wiltTilt,
      ]}
      accessibilityLabel={`Plant, ${state}, ${health}`}>
      <View style={styles.plantArea}>
        {showBloom ? (
          <View style={styles.bloom}>
            {[0, 60, 120, 180, 240, 300].map((angle) => (
              <View
                key={angle}
                style={[
                  styles.petal,
                  {
                    width: size * 0.14,
                    height: size * 0.24,
                    borderRadius: size * 0.07,
                    backgroundColor: bloomColor,
                    transform: [{ rotate: `${angle}deg` }, { translateY: -size * 0.09 }],
                  },
                ]}
              />
            ))}
            <View
              style={{
                width: size * 0.12,
                height: size * 0.12,
                borderRadius: size * 0.06,
                backgroundColor: BrandPalette.gold,
              }}
            />
          </View>
        ) : null}

        {showBud ? (
          <View
            style={{
              width: size * 0.16,
              height: size * 0.22,
              borderRadius: size * 0.08,
              backgroundColor: bloomColor,
              marginBottom: -2,
            }}
          />
        ) : null}

        {stemHeight > 0 ? (
          <View style={styles.stemWrapper}>
            <View
              style={{
                width: Math.max(3, size * 0.045),
                height: stemHeight,
                borderRadius: size * 0.03,
                backgroundColor: stemColor,
              }}
            />
            {showFirstLeaves ? (
              <>
                <View
                  style={[
                    styles.leaf,
                    {
                      width: size * 0.22,
                      height: size * 0.11,
                      borderRadius: size * 0.06,
                      backgroundColor: leafColor,
                      bottom: stemHeight * 0.25,
                      left: -size * 0.18,
                      transform: [{ rotate: wilting ? '-58deg' : '-32deg' }],
                    },
                  ]}
                />
                <View
                  style={[
                    styles.leaf,
                    {
                      width: size * 0.22,
                      height: size * 0.11,
                      borderRadius: size * 0.06,
                      backgroundColor: stemColor,
                      bottom: stemHeight * 0.4,
                      right: -size * 0.18,
                      transform: [{ rotate: wilting ? '54deg' : '28deg' }],
                    },
                  ]}
                />
              </>
            ) : null}
            {showSecondLeaves ? (
              <>
                <View
                  style={[
                    styles.leaf,
                    {
                      width: size * 0.18,
                      height: size * 0.09,
                      borderRadius: size * 0.05,
                      backgroundColor: stemColor,
                      bottom: stemHeight * 0.62,
                      left: -size * 0.14,
                      transform: [{ rotate: wilting ? '-62deg' : '-36deg' }],
                    },
                  ]}
                />
                <View
                  style={[
                    styles.leaf,
                    {
                      width: size * 0.18,
                      height: size * 0.09,
                      borderRadius: size * 0.05,
                      backgroundColor: leafColor,
                      bottom: stemHeight * 0.78,
                      right: -size * 0.14,
                      transform: [{ rotate: wilting ? '58deg' : '30deg' }],
                    },
                  ]}
                />
              </>
            ) : null}
          </View>
        ) : (
          <View
            style={{
              width: size * 0.2,
              height: size * 0.26,
              borderRadius: size * 0.1,
              backgroundColor: BrandPalette.warmBrown,
              marginBottom: -size * 0.06,
              transform: [{ rotate: '8deg' }],
            }}
          />
        )}
      </View>

      <View
        style={{
          width: size * 0.6,
          height: size * 0.14,
          borderRadius: size * 0.07,
          backgroundColor: dormant ? '#9C8E7B' : BrandPalette.warmBrown,
          opacity: 0.85,
        }}
      />

      {health === 'thriving' ? (
        <Spark size={size * 0.16} style={[styles.thrivingSpark, { top: size * 0.06 }]} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  wiltTilt: {
    transform: [{ rotate: '-7deg' }],
  },
  plantArea: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  stemWrapper: {
    alignItems: 'center',
  },
  leaf: {
    position: 'absolute',
  },
  bloom: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -4,
  },
  petal: {
    position: 'absolute',
  },
  thrivingSpark: {
    position: 'absolute',
    right: 4,
  },
});
