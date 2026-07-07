import type { AudioSource } from 'expo-audio';

export interface GuidedTrack {
  key: string;
  title: string;
  minutes: number;
  description: string;
  /** Bundled audio. Placeholder silence until the founder records — see assets/audio/README.md. */
  source: AudioSource;
  freeTier: boolean;
}

export const AMBIENT_LOOP: AudioSource = require('@/assets/audio/ambient-garden.wav');

export const GUIDED_TRACKS: GuidedTrack[] = [
  {
    key: 'morning_light',
    title: 'Morning Light',
    minutes: 3,
    description: 'A gentle start — your dream in soft morning light.',
    source: require('@/assets/audio/track-morning-light.wav'),
    freeTier: true,
  },
  {
    key: 'deep_roots',
    title: 'Deep Roots',
    minutes: 5,
    description: 'Grounding breath, roots into the earth.',
    source: require('@/assets/audio/track-deep-roots.wav'),
    freeTier: true,
  },
  {
    key: 'golden_hour',
    title: 'Golden Hour',
    minutes: 10,
    description: 'Walk your dream in golden-hour light, all senses on.',
    source: require('@/assets/audio/track-golden-hour.wav'),
    freeTier: false,
  },
  {
    key: 'night_garden',
    title: 'Night Garden',
    minutes: 15,
    description: 'The garden at night — release the dream to grow while you rest.',
    source: require('@/assets/audio/track-night-garden.wav'),
    freeTier: false,
  },
];
