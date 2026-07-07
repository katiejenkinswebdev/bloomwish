/**
 * Single source of truth for all user-facing naming, tagline, and tier copy.
 * Renaming the app (pending trademark clearance) is a one-line change here —
 * never hardcode the app name, tagline, or tier names anywhere else.
 */

export const Branding = {
  appName: 'Bloomwish',
  appNameLowercase: 'bloomwish',
  tagline: 'plant a wish, grow a dream',
  affirmation: 'Let it be! And so it is.',
  sayItAloudPrompt: 'Say it aloud',

  scheme: 'bloomwish',
  bundleId: 'com.bloomwish.app',
  package: 'com.bloomwish.app',

  supportEmail: 'support@bloomwish.app',
  privacyPolicyUrl: 'https://bloomwish.app/privacy',
  termsUrl: 'https://bloomwish.app/terms',

  logo: {
    name: 'The Wishing Seed',
    description:
      'A young sprout with two leaves growing upward toward a golden four-point spark, with a smaller secondary spark nearby.',
  },
} as const;

export type TierId = 'seedling' | 'full_bloom';

export interface TierDefinition {
  id: TierId;
  name: string;
  description: string;
}

export const Tiers: Record<TierId, TierDefinition> = {
  seedling: {
    id: 'seedling',
    name: 'Seedling',
    description: 'The free tier — a genuinely useful garden experience.',
  },
  full_bloom: {
    id: 'full_bloom',
    name: 'Full Bloom',
    description: 'The premium tier — unlimited dreams and personalized voice meditations.',
  },
};

/**
 * RevenueCat entitlement identifier for the paid tier.
 * Configure this to match the entitlement created in the RevenueCat dashboard.
 */
export const FULL_BLOOM_ENTITLEMENT_ID = 'full_bloom';

export type OfferingId = 'monthly' | 'annual' | 'founding_lifetime';

export interface OfferingDefinition {
  id: OfferingId;
  revenueCatPackageId: string;
  label: string;
  billingNote: string;
  isDefaultHighlighted?: boolean;
  isLimitedTime?: boolean;
}

/**
 * Display-only pricing metadata. Actual prices/currency are always sourced live
 * from RevenueCat/store products at purchase time — never hardcode a price the
 * user could see before the real purchase sheet.
 */
export const Offerings: OfferingDefinition[] = [
  {
    id: 'monthly',
    revenueCatPackageId: 'monthly',
    label: 'Monthly',
    billingNote: 'Billed monthly. Cancel anytime.',
  },
  {
    id: 'annual',
    revenueCatPackageId: 'annual',
    label: 'Annual',
    billingNote: '7-day free trial, then billed yearly. Cancel anytime.',
    isDefaultHighlighted: true,
  },
  {
    id: 'founding_lifetime',
    revenueCatPackageId: 'founding_lifetime',
    label: 'Founding Member',
    billingNote: 'One-time payment. Available for a limited, honestly-stated window at launch.',
    isLimitedTime: true,
  },
];

/**
 * TODO: set the real, honest end date for the Founding Member lifetime offer
 * before launch. Must always be a true date — never fake urgency.
 */
export const FOUNDING_OFFER_END_DATE: string | null = null;

export const FreeTierLimits = {
  activeDreamSlots: 1,
  maxTimerMinutes: 5,
  guidedTrackCount: 2,
  personalizedMeditationsOnStarterDream: 1,
} as const;
