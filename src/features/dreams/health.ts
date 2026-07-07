import { supabase } from '@/lib/supabase/client';
import type { DreamHealth, DreamRow } from '@/lib/supabase/database.types';

export interface HealthDecayConfig {
  wilting_after_days: number;
  dormant_after_days: number;
}

/** Fallbacks when app_config hasn't loaded (offline, cold start). */
export const DEFAULT_HEALTH_DECAY: HealthDecayConfig = {
  wilting_after_days: 3,
  dormant_after_days: 10,
};

export async function fetchHealthDecayConfig(): Promise<HealthDecayConfig> {
  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'health_decay')
    .maybeSingle();
  if (error || !data) return DEFAULT_HEALTH_DECAY;
  return { ...DEFAULT_HEALTH_DECAY, ...(data.value as Partial<HealthDecayConfig>) };
}

export const healthConfigQueryKey = ['app_config', 'health_decay'] as const;

/**
 * Effective health right now, derived from inactivity. Decay only worsens
 * health — a dream marked thriving that sat 4 days shows wilting; one already
 * dormant stays dormant regardless of the clock. Never "dead": dormant is the
 * floor and is always revivable.
 */
export function deriveHealth(
  dream: Pick<DreamRow, 'health' | 'last_interacted_at' | 'harvested_at'>,
  config: HealthDecayConfig = DEFAULT_HEALTH_DECAY,
  now: Date = new Date()
): DreamHealth {
  if (dream.harvested_at) return dream.health;

  const lastInteracted = new Date(dream.last_interacted_at);
  const idleDays = (now.getTime() - lastInteracted.getTime()) / (1000 * 60 * 60 * 24);

  let decayed: DreamHealth;
  if (idleDays >= config.dormant_after_days) decayed = 'dormant';
  else if (idleDays >= config.wilting_after_days) decayed = 'wilting';
  else return dream.health;

  const order: DreamHealth[] = ['thriving', 'healthy', 'wilting', 'dormant'];
  return order.indexOf(decayed) > order.indexOf(dream.health) ? decayed : dream.health;
}
