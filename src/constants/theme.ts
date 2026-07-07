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
    textSecondary: '#7A6B7F',
    primary: BrandPalette.deepGreen,
    primarySoft: BrandPalette.sage,
    accent: BrandPalette.gold,
    danger: '#C1554A',
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
export const MaxContentWidth = 800;
