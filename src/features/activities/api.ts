import { supabase } from '@/lib/supabase/client';
import type {
  DreamHealth,
  DreamState,
  FeedActivityRow,
  SessionType,
} from '@/lib/supabase/database.types';

const DEFAULT_WATER_BOOST = 10;
const DEFAULT_DAILY_CAP = 40;
const DEFAULT_GROWTH_THRESHOLDS: Record<Exclude<DreamState, 'seed'>, number> = {
  sprout: 30,
  growing: 80,
  budding: 160,
  blooming: 280,
};

export async function fetchFeedActivities(): Promise<FeedActivityRow[]> {
  const { data, error } = await supabase
    .from('feed_activities')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}

async function configNumber(key: string, field: string, fallback: number): Promise<number> {
  const { data } = await supabase.from('app_config').select('value').eq('key', key).maybeSingle();
  const value = (data?.value as Record<string, unknown> | undefined)?.[field];
  return typeof value === 'number' ? value : fallback;
}

async function growthThresholds(): Promise<Record<Exclude<DreamState, 'seed'>, number>> {
  const { data } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'growth_thresholds')
    .maybeSingle();
  return {
    ...DEFAULT_GROWTH_THRESHOLDS,
    ...((data?.value as Partial<typeof DEFAULT_GROWTH_THRESHOLDS>) ?? {}),
  };
}

function stateForPoints(
  points: number,
  thresholds: Record<Exclude<DreamState, 'seed'>, number>
): DreamState {
  if (points >= thresholds.blooming) return 'blooming';
  if (points >= thresholds.budding) return 'budding';
  if (points >= thresholds.growing) return 'growing';
  if (points >= thresholds.sprout) return 'sprout';
  return 'seed';
}

/** One step better per completed session; dormant needs the revive ritual. */
function boostedHealth(current: DreamHealth): DreamHealth {
  if (current === 'wilting') return 'healthy';
  if (current === 'healthy') return 'thriving';
  return current;
}

const STATE_ORDER: DreamState[] = ['seed', 'sprout', 'growing', 'budding', 'blooming'];

export interface CompletedSession {
  /** Points actually granted after the anti-grinding daily cap. */
  grantedBoost: number;
  newState: DreamState;
  stateAdvanced: boolean;
}

/**
 * Log a completed water/feed session and apply its effects: health steps up,
 * activity refreshes, and cumulative points advance the growth stage. Daily
 * gains are capped (app_config `daily_health_gain_cap`) so tending stays a
 * practice, not a grind — sessions past the cap still count and still log.
 */
export async function completeSession(params: {
  dreamId: string;
  type: SessionType;
  activityId: string;
  durationSeconds: number;
  baseBoost?: number;
  reflection?: string;
}): Promise<CompletedSession> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const [waterBoost, dailyCap, thresholds] = await Promise.all([
    configNumber('water_health_boost', 'boost', DEFAULT_WATER_BOOST),
    configNumber('daily_health_gain_cap', 'cap', DEFAULT_DAILY_CAP),
    growthThresholds(),
  ]);
  const baseBoost = params.baseBoost ?? waterBoost;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { data: todaySessions, error: todayError } = await supabase
    .from('sessions')
    .select('health_boost')
    .gte('completed_at', startOfDay.toISOString());
  if (todayError) throw todayError;
  const gainedToday = (todaySessions ?? []).reduce((sum, s) => sum + s.health_boost, 0);
  const grantedBoost = Math.max(0, Math.min(baseBoost, dailyCap - gainedToday));

  const { error: insertError } = await supabase.from('sessions').insert({
    user_id: user.id,
    dream_id: params.dreamId,
    type: params.type,
    activity_id: params.activityId,
    duration_seconds: params.durationSeconds,
    health_boost: grantedBoost,
    reflection: params.reflection ?? null,
  });
  if (insertError) throw insertError;

  const { data: dream, error: dreamError } = await supabase
    .from('dreams')
    .select('health, state')
    .eq('id', params.dreamId)
    .single();
  if (dreamError) throw dreamError;

  const { data: allSessions } = await supabase
    .from('sessions')
    .select('health_boost')
    .eq('dream_id', params.dreamId);
  const totalPoints = (allSessions ?? []).reduce((sum, s) => sum + s.health_boost, 0);

  const earnedState = stateForPoints(totalPoints, thresholds);
  // Growth never regresses.
  const newState =
    STATE_ORDER.indexOf(earnedState) > STATE_ORDER.indexOf(dream.state) ? earnedState : dream.state;

  const { error: updateError } = await supabase
    .from('dreams')
    .update({
      health: boostedHealth(dream.health),
      state: newState,
      last_interacted_at: new Date().toISOString(),
    })
    .eq('id', params.dreamId);
  if (updateError) throw updateError;

  return { grantedBoost, newState, stateAdvanced: newState !== dream.state };
}
