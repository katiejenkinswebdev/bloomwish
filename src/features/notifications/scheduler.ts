import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import type { HealthDecayConfig } from '@/features/dreams/health';
import { DEFAULT_HEALTH_DECAY } from '@/features/dreams/health';
import type { DreamRow, UserProfileRow } from '@/lib/supabase/database.types';

/**
 * All notification copy lives here so its tone can be audited in one place.
 * House rules: gentle invitations, never shame, never urgency.
 */
const COPY = {
  daily: {
    title: 'Your garden misses you 🌱',
    body: 'A quiet minute of tending is all it takes.',
  },
  wilting: (dreamTitle: string) => ({
    title: `${dreamTitle} could use a little water 🌱`,
    body: 'No rush — your dream will wait for you.',
  }),
  delight: [
    { title: 'A butterfly visited your garden 🦋', body: 'It lingered a while near your dreams.' },
    { title: 'Something is stirring in your garden ✨', body: 'Come see when you have a moment.' },
  ],
};

const WILT_PREFIX = 'wilt-';
const DELIGHT_PREFIX = 'delight-';
const DAILY_ID = 'daily-reminder';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function ensureReady(): Promise<boolean> {
  const permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Garden reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: undefined,
    });
  }
  return true;
}

async function cancelByPrefix(prefix: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(prefix))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

/** Daily reminder at the user's chosen time. Idempotent. */
async function syncDailyReminder(profile: UserProfileRow | null): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_ID).catch(() => {});
  if (!profile?.reminder_time) return;
  const [hour, minute] = profile.reminder_time.split(':').map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return;
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_ID,
    content: COPY.daily,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

/**
 * Wilting alerts: one per dream at the moment it would tip into wilting, at
 * most one per calendar day (the earliest dream wins), looking a week ahead.
 * Rescheduled from scratch on every sync so activity pushes alerts out.
 */
async function syncWiltingAlerts(dreams: DreamRow[], config: HealthDecayConfig): Promise<void> {
  await cancelByPrefix(WILT_PREFIX);

  const now = Date.now();
  const horizon = now + 7 * 24 * 60 * 60 * 1000;
  const byDay = new Map<string, { date: Date; title: string }>();

  for (const dream of dreams) {
    if (dream.harvested_at) continue;
    const wiltAt = new Date(
      new Date(dream.last_interacted_at).getTime() +
        config.wilting_after_days * 24 * 60 * 60 * 1000
    );
    if (wiltAt.getTime() <= now || wiltAt.getTime() > horizon) continue;
    const dayKey = wiltAt.toISOString().slice(0, 10);
    const existing = byDay.get(dayKey);
    if (!existing || wiltAt < existing.date) {
      byDay.set(dayKey, { date: wiltAt, title: dream.title });
    }
  }

  await Promise.all(
    [...byDay.entries()].map(([dayKey, { date, title }]) =>
      Notifications.scheduleNotificationAsync({
        identifier: `${WILT_PREFIX}${dayKey}`,
        content: COPY.wilting(title),
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
      })
    )
  );
}

/**
 * Delight notifications: at most two per week, at pleasant mid-day-ish times
 * on random days ahead. Only tops up what's missing — never stacks.
 */
async function syncDelightNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const existing = scheduled.filter((n) => n.identifier.startsWith(DELIGHT_PREFIX)).length;
  const needed = 2 - existing;

  for (let i = 0; i < needed; i++) {
    const daysAhead = 2 + Math.floor(Math.random() * 5) + i * 2;
    const date = new Date();
    date.setDate(date.getDate() + daysAhead);
    date.setHours(11 + Math.floor(Math.random() * 6), Math.floor(Math.random() * 60), 0, 0);
    const message = COPY.delight[Math.floor(Math.random() * COPY.delight.length)];
    await Notifications.scheduleNotificationAsync({
      identifier: `${DELIGHT_PREFIX}${date.getTime()}`,
      content: message,
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
    });
  }
}

/**
 * Reconcile all local notifications with current state. Call whenever the
 * garden loads — cheap, idempotent, and no-op without permission.
 */
export async function syncNotifications(params: {
  profile: UserProfileRow | null;
  dreams: DreamRow[];
  decayConfig?: HealthDecayConfig;
}): Promise<void> {
  try {
    if (!(await ensureReady())) return;
    await Promise.all([
      syncDailyReminder(params.profile),
      syncWiltingAlerts(params.dreams, params.decayConfig ?? DEFAULT_HEALTH_DECAY),
      syncDelightNotifications(),
    ]);
  } catch (err) {
    console.warn('notification sync failed', err);
  }
}
