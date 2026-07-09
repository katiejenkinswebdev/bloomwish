import { supabase } from '@/lib/supabase/client';
import type { RewardRarity } from '@/lib/supabase/database.types';

export type RewardTrigger = 'session_complete' | 'app_open';
export type RewardType =
  | 'butterfly_visit'
  | 'legendary_butterfly'
  | 'surprise_bloom'
  | 'universe_card'
  | 'eleven_eleven';

export interface GrantedReward {
  type: RewardType;
  rarity: RewardRarity;
  /** Present for universe_card rewards. */
  message?: string;
}

const RARITY: Record<RewardType, RewardRarity> = {
  universe_card: 'common',
  butterfly_visit: 'rare',
  surprise_bloom: 'rare',
  legendary_butterfly: 'legendary',
  eleven_eleven: 'rare',
};

const DEFAULT_PROBABILITIES: Record<RewardTrigger, Partial<Record<RewardType, number>>> = {
  session_complete: { butterfly_visit: 0.06, universe_card: 0.1, legendary_butterfly: 0.01 },
  app_open: { surprise_bloom: 0.05, universe_card: 0.04 },
};

/**
 * Roll for a delight moment. Cosmetic and encouraging only — never gates
 * progress. Probabilities are founder-tunable in app_config. Legendary
 * rarities are a Full Bloom perk (pass `includeLegendary` from entitlements).
 */
export async function maybeGrantReward(
  trigger: RewardTrigger,
  options: { includeLegendary: boolean; dreamId?: string }
): Promise<GrantedReward | null> {
  const { data: configRow } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'reward_probabilities')
    .maybeSingle();
  const probabilities = {
    ...DEFAULT_PROBABILITIES[trigger],
    ...((configRow?.value as Record<RewardTrigger, Partial<Record<RewardType, number>>> | null)?.[
      trigger
    ] ?? {}),
  };

  // Independent roll per reward type; first hit wins (legendary checked first
  // so its small chance isn't shadowed).
  const orderedTypes: RewardType[] = [
    'legendary_butterfly',
    'butterfly_visit',
    'surprise_bloom',
    'universe_card',
  ];
  let granted: RewardType | null = null;
  for (const type of orderedTypes) {
    const p = probabilities[type] ?? 0;
    if (p <= 0) continue;
    if (type === 'legendary_butterfly' && !options.includeLegendary) continue;
    if (Math.random() < p) {
      granted = type;
      break;
    }
  }
  if (!granted) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let message: string | undefined;
  if (granted === 'universe_card') {
    const { data: cards } = await supabase.from('universe_cards').select('message');
    if (cards?.length) {
      message = cards[Math.floor(Math.random() * cards.length)].message;
    } else {
      message = 'The garden hears you. Keep tending.';
    }
  }

  await supabase.from('rewards').insert({
    user_id: user.id,
    dream_id: options.dreamId ?? null,
    type: granted,
    rarity: RARITY[granted],
  });

  return { type: granted, rarity: RARITY[granted], message };
}

/**
 * The 11:11 moment — granted when the app is opened at exactly 11:11, once
 * per day. Not a roll: noticing the synchronicity IS the reward.
 */
export async function grantElevenEleven(): Promise<GrantedReward | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  await supabase.from('rewards').insert({
    user_id: user.id,
    dream_id: null,
    type: 'eleven_eleven',
    rarity: RARITY.eleven_eleven,
  });

  return { type: 'eleven_eleven', rarity: RARITY.eleven_eleven };
}
