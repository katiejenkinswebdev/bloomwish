/** Named breathing patterns for the visualization timer. Durations in ms. */
export interface BreathPhase {
  label: string;
  ms: number;
  /** Circle target scale at the end of this phase. */
  scale: number;
}

export interface BreathPattern {
  key: string;
  title: string;
  description: string;
  phases: BreathPhase[];
}

export const BREATH_PATTERNS: BreathPattern[] = [
  {
    key: 'calm',
    title: 'Calm',
    description: 'A soft, natural wave — no counting.',
    phases: [
      { label: 'Breathe in', ms: 4000, scale: 1.15 },
      { label: 'Breathe out', ms: 4000, scale: 0.8 },
    ],
  },
  {
    key: 'box',
    title: 'Box',
    description: 'In 4 · hold 4 · out 4 · hold 4. Steadying.',
    phases: [
      { label: 'Breathe in', ms: 4000, scale: 1.15 },
      { label: 'Hold', ms: 4000, scale: 1.15 },
      { label: 'Breathe out', ms: 4000, scale: 0.8 },
      { label: 'Hold', ms: 4000, scale: 0.8 },
    ],
  },
  {
    key: '478',
    title: '4·7·8',
    description: 'In 4 · hold 7 · out 8. Deeply settling.',
    phases: [
      { label: 'Breathe in', ms: 4000, scale: 1.15 },
      { label: 'Hold', ms: 7000, scale: 1.15 },
      { label: 'Breathe out', ms: 8000, scale: 0.8 },
    ],
  },
  {
    key: 'sleep',
    title: 'Drift',
    description: 'Long and slow, for falling asleep inside the scene.',
    phases: [
      { label: 'Breathe in', ms: 5000, scale: 1.1 },
      { label: 'Breathe out', ms: 8000, scale: 0.82 },
    ],
  },
];

export const patternByKey = (key: string): BreathPattern =>
  BREATH_PATTERNS.find((p) => p.key === key) ?? BREATH_PATTERNS[0];
