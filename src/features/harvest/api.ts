import { track } from '@/features/analytics/analytics';
import { supabase } from '@/lib/supabase/client';
import type { TrophyRow } from '@/lib/supabase/database.types';

/**
 * Harvest a dream that came true in real life: stamp the harvest date and
 * award the trophy — a stone plaque engraved with the dream and date, and a
 * butterfly that flies in the garden forever.
 */
export async function harvestDream(dreamId: string): Promise<TrophyRow> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data: dream, error: dreamError } = await supabase
    .from('dreams')
    .select('title, harvested_at')
    .eq('id', dreamId)
    .single();
  if (dreamError) throw dreamError;
  if (dream.harvested_at) throw new Error('Already harvested');

  const { count } = await supabase
    .from('sessions')
    .select('id', { count: 'exact', head: true })
    .eq('dream_id', dreamId);

  const harvestedAt = new Date().toISOString();

  const { error: updateError } = await supabase
    .from('dreams')
    .update({ harvested_at: harvestedAt, state: 'blooming', health: 'thriving' })
    .eq('id', dreamId);
  if (updateError) throw updateError;

  const { data: trophy, error: trophyError } = await supabase
    .from('trophies')
    .insert({
      user_id: user.id,
      dream_id: dreamId,
      dream_title: dream.title,
      total_sessions: count ?? 0,
      harvested_at: harvestedAt,
    })
    .select()
    .single();
  if (trophyError) throw trophyError;
  track('harvest', { total_sessions: trophy.total_sessions });
  return trophy;
}

export async function fetchTrophies(): Promise<TrophyRow[]> {
  const { data, error } = await supabase
    .from('trophies')
    .select('*')
    .order('harvested_at', { ascending: false });
  if (error) throw error;
  return data;
}

export interface HarvestedDream {
  trophy: TrophyRow;
  sceneText: string | null;
}

export async function fetchHarvestedDreams(): Promise<HarvestedDream[]> {
  const [trophies, dreamsResult] = await Promise.all([
    fetchTrophies(),
    supabase.from('dreams').select('id, scene_text').not('harvested_at', 'is', null),
  ]);
  if (dreamsResult.error) throw dreamsResult.error;
  const sceneById = new Map(dreamsResult.data.map((d) => [d.id, d.scene_text]));
  return trophies.map((trophy) => ({
    trophy,
    sceneText: sceneById.get(trophy.dream_id) ?? null,
  }));
}
