export interface SeasonalTouch {
  key: string;
  /** Small decorative glyph shown beside the garden title. */
  glyph: string;
  greeting: string;
}

/**
 * Subtle seasonal + holiday accents for the garden. Cosmetic only.
 * Northern-hemisphere seasons for MVP.
 */
export function seasonalTouch(now: Date = new Date()): SeasonalTouch {
  const month = now.getMonth();
  const day = now.getDate();

  if (month === 9 && day >= 24) {
    return { key: 'halloween', glyph: '🎃', greeting: 'The garden wears its autumn mask.' };
  }
  if (month === 11 && day >= 18) {
    return { key: 'midwinter', glyph: '❄️', greeting: 'The garden rests under winter lights.' };
  }
  if (month === 1 && day === 14) {
    return { key: 'valentines', glyph: '💐', greeting: 'The garden is blushing today.' };
  }

  if (month >= 2 && month <= 4) {
    return { key: 'spring', glyph: '🌸', greeting: 'Spring air in the garden.' };
  }
  if (month >= 5 && month <= 7) {
    return { key: 'summer', glyph: '☀️', greeting: 'Long summer light in the garden.' };
  }
  if (month >= 8 && month <= 10) {
    return { key: 'autumn', glyph: '🍂', greeting: 'Golden autumn in the garden.' };
  }
  return { key: 'winter', glyph: '❄️', greeting: 'A quiet winter garden.' };
}
