import * as Crypto from 'expo-crypto';

import { supabase } from '@/lib/supabase/client';
import type { DreamHealth, SessionRow, SignRow } from '@/lib/supabase/database.types';

export async function fetchSigns(dreamId: string): Promise<SignRow[]> {
  const { data, error } = await supabase
    .from('signs')
    .select('*')
    .eq('dream_id', dreamId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchSessions(dreamId: string): Promise<SessionRow[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('dream_id', dreamId)
    .order('completed_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return data;
}

/** One step better; dormant stays dormant — reviving is its own ritual. */
function boostedHealth(current: DreamHealth): DreamHealth {
  if (current === 'wilting') return 'healthy';
  if (current === 'healthy') return 'thriving';
  return current;
}

export async function addSign(params: {
  dreamId: string;
  text: string;
  photoUri?: string;
}): Promise<SignRow> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  let photoUrl: string | null = null;
  if (params.photoUri) {
    const path = `${user.id}/${Crypto.randomUUID()}.jpg`;
    const response = await fetch(params.photoUri);
    const blob = await response.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('sign-photos')
      .upload(path, blob, { contentType: 'image/jpeg' });
    if (uploadError) throw uploadError;
    photoUrl = path;
  }

  const { data: sign, error } = await supabase
    .from('signs')
    .insert({
      user_id: user.id,
      dream_id: params.dreamId,
      text: params.text,
      photo_url: photoUrl,
    })
    .select()
    .single();
  if (error) throw error;

  // A sign is evidence the dream is growing — small health boost.
  const { data: dream } = await supabase
    .from('dreams')
    .select('health')
    .eq('id', params.dreamId)
    .single();
  if (dream) {
    await supabase
      .from('dreams')
      .update({
        health: boostedHealth(dream.health),
        last_interacted_at: new Date().toISOString(),
      })
      .eq('id', params.dreamId);
  }

  return sign;
}

/**
 * Revive a dormant dream after the 2-minute re-commitment session:
 * dormancy lifts and the plant returns to healthy.
 */
export async function reviveDream(dreamId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { error: sessionError } = await supabase.from('sessions').insert({
    user_id: user.id,
    dream_id: dreamId,
    type: 'water',
    activity_id: 'revive',
    duration_seconds: 120,
    health_boost: 0,
  });
  if (sessionError) throw sessionError;

  const { error } = await supabase
    .from('dreams')
    .update({ health: 'healthy', last_interacted_at: new Date().toISOString() })
    .eq('id', dreamId);
  if (error) throw error;
}

/** Sign counts per dream for the whole garden (drives fireflies). */
export async function fetchSignCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from('signs').select('dream_id');
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of data) {
    counts[row.dream_id] = (counts[row.dream_id] ?? 0) + 1;
  }
  return counts;
}

/** Signed URL for a private sign photo (paths are stored, not public URLs). */
export async function signPhotoUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('sign-photos').createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
