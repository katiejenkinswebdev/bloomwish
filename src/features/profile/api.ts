import { supabase } from '@/lib/supabase/client';
import type { UserProfileRow } from '@/lib/supabase/database.types';

export async function fetchProfile(): Promise<UserProfileRow | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_profile')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertProfile(
  patch: Partial<Omit<UserProfileRow, 'id' | 'created_at' | 'updated_at'>>
): Promise<UserProfileRow> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('user_profile')
    .upsert({ id: user.id, ...patch })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export const profileQueryKey = ['user_profile'] as const;
