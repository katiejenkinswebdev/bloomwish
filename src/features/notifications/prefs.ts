import { supabase } from '@/lib/supabase/client';
import type { NotificationPrefsRow } from '@/lib/supabase/database.types';

export const notificationPrefsQueryKey = ['notification_prefs'] as const;

export const DEFAULT_NOTIFICATION_PREFS = {
  daily_reminder_enabled: true,
  wilting_alerts_enabled: true,
  delight_notifications_enabled: true,
} as const;

export async function fetchNotificationPrefs(): Promise<NotificationPrefsRow | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('notification_prefs')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertNotificationPrefs(
  patch: Partial<Omit<NotificationPrefsRow, 'user_id' | 'updated_at'>>
): Promise<NotificationPrefsRow> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('notification_prefs')
    .upsert({ user_id: user.id, ...patch, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}
