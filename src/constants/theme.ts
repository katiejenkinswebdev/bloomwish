/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

import { BrandPalette } from '@/constants/brand-palette';

export const Colors = {
  light: {
    text: BrandPalette.plum,
    background: BrandPalette.cream,
    backgroundElement: '#F3E9DA',
    backgroundSelected: '#EADCC6',
    // Measured for WCAG AA (>=4.5:1) on both cream and card surfaces.
    textSecondary: '#685A6D',
    primary: BrandPalette.deepGreen,
    primarySoft: BrandPalette.sage,
    accent: '#83641A',
    danger: '#AC4237',
    border: '#E6D8C4',
  },
  dark: {
    text: BrandPalette.cream,
    background: '#241C29',
    backgroundElement: '#302840',
    backgroundSelected: '#3B3050',
    textSecondary: '#C7B9CC',
    primary: BrandPalette.sage,
    primarySoft: BrandPalette.deepGreen,
    accent: BrandPalette.gold,
    danger: '#E08B7D',
    border: '#463A54',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
/** Content column cap: phone-sized on tablets/desktop web, no-op on phones. */
export const MaxContentWidth = 480;

/** Horizontal screen padding in the Day & Night Garden shell. */
export const ScreenPadding = 28;

/**
 * Ambient motion periods (ms) from the redesign. Night runs ~1.5× slower than
 * day. All ambient loops must respect Reduce Motion (freeze the loop, keep
 * functional transitions).
 */
export const Motion = {
  swayDay: 4500,
  swayNight: 6500,
  glowPulse: 3000,
  fireflyMin: 5000,
  fireflyMax: 9000,
  breathe: 8000,
  themeCrossfade: 1200,
} as const;

/**
 * The single sanctioned shadow in the design system: the gold glow of the
 * spark motif (bloom centers, fireflies, sun moments, the drift orb).
 * Gold-only, motif-only — never use shadows for elevation.
 */
export function glowGold(radius = 22, opacity = 0.45) {
  return Platform.select({
    web: {
      boxShadow: `0 0 ${radius}px ${Math.round(radius / 4)}px rgba(233, 180, 76, ${opacity})`,
    },
    default: {
      shadowColor: BrandPalette.gold,
      shadowOpacity: opacity,
      shadowRadius: radius / 2,
      shadowOffset: { width: 0, height: 0 },
    },
  }) as object;
}
