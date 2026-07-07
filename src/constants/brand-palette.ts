/**
 * Bloomwish brand palette — "The Wishing Seed" identity.
 * The gold spark (`gold`) is the system-wide motif: Signs fireflies, harvest
 * celebrations, loading states, the vividness glow, and the Full Bloom badge
 * all draw from this single color. Keep it the one consistent spark color.
 */
export const BrandPalette = {
  deepGreen: '#3E7C59',
  sage: '#8FBC94',
  gold: '#E9B44C',
  dustyPink: '#E4A7B0',
  cream: '#FBF3E7',
  plum: '#46344E',
  warmBrown: '#B98A5E',
} as const;

export type BrandColorName = keyof typeof BrandPalette;
