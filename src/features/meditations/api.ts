import { supabase } from '@/lib/supabase/client';
import type { MeditationRow } from '@/lib/supabase/database.types';

export const MEDITATION_MINUTES = [3, 5, 10, 15] as const;
export type MeditationMinutes = (typeof MEDITATION_MINUTES)[number];

/**
 * Kick off (or reuse) a personalized meditation for a dream. Returns the
 * meditation row id; generation runs server-side (30–90s) and the row's
 * status flips pending → ready. Poll with `fetchMeditation`.
 */
export async function requestMeditation(
  dreamId: string,
  durationMinutes: MeditationMinutes
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('generate-meditation', {
    body: { dreamId, durationMinutes },
  });
  if (error) {
    // Edge errors carry a JSON body with our gate reasons.
    const context = (error as { context?: Response }).context;
    if (context) {
      const body = await context.json().catch(() => null);
      if (body?.error === 'full_bloom_required' || body?.error === 'gift_already_used') {
        throw new MeditationGateError(body.error);
      }
    }
    throw error;
  }
  return data.meditationId as string;
}

export class MeditationGateError extends Error {
  constructor(public reason: 'full_bloom_required' | 'gift_already_used') {
    super(reason);
  }
}

export async function fetchMeditation(meditationId: string): Promise<MeditationRow> {
  const { data, error } = await supabase
    .from('meditations')
    .select('*')
    .eq('id', meditationId)
    .single();
  if (error) throw error;
  return data;
}

/** Signed playback URL for a ready meditation (bucket is private). */
export async function meditationAudioUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('meditations').createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
