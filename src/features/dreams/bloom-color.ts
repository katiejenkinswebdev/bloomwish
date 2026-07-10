import { BrandPalette } from '@/constants/brand-palette';

/**
 * Each dream blooms in its own color — discovered at budding, never chosen,
 * never changing. A curated brand-adjacent palette; assignment is a stable
 * hash of the dream id. Color carries no meaning (state and health always
 * speak through shape and labels), it's pure identity.
 */
export const BLOOM_COLORS = [
  BrandPalette.dustyPink, // the signature
  '#E9C46A', // soft gold
  '#C3A6D9', // pale lilac
  '#F2B58F', // warm peach
  '#A9C5E8', // powder blue
] as const;

export function bloomColorFor(dreamId: string): string {
  let h = 0;
  for (let i = 0; i < dreamId.length; i++) h = (h * 31 + dreamId.charCodeAt(i)) >>> 0;
  return BLOOM_COLORS[h % BLOOM_COLORS.length];
}
