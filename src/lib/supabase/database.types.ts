/**
 * Hand-written to match supabase/migrations/20260707015216_init.sql.
 * Once the Supabase project is live, regenerate with:
 *   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
 */

export type DreamState = 'seed' | 'sprout' | 'growing' | 'budding' | 'blooming';
export type DreamHealth = 'thriving' | 'healthy' | 'wilting' | 'dormant';
export type SessionType = 'water' | 'feed';
export type MeditationStatus = 'pending' | 'ready' | 'failed';
export type TonePreference = 'gentle' | 'energizing';
export type ExperienceLevel = 'new' | 'some_experience' | 'experienced';
export type FeedbackType = 'bug' | 'idea' | 'love';
export type RewardRarity = 'common' | 'rare' | 'legendary';

/** Shapes a row type into the Table structure postgrest-js expects. */
type Table<Row, RequiredOnInsert extends keyof Row = never> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, RequiredOnInsert>;
  Update: Partial<Row>;
  Relationships: [];
};

export type UserProfileRow = {
  id: string;
  display_name: string | null;
  first_manifestation_category: string | null;
  experience_level: ExperienceLevel | null;
  preferred_session_length_minutes: number | null;
  tone_preference: TonePreference | null;
  reminder_time: string | null;
  reminder_timezone: string | null;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type DreamRow = {
  id: string;
  user_id: string;
  title: string;
  /** The user's full original wish; title is the short coach-written summary. */
  wish_text: string | null;
  scene_text: string | null;
  vividness_score: number | null;
  state: DreamState;
  health: DreamHealth;
  is_starter_dream: boolean;
  capsule_text: string | null;
  planted_at: string | null;
  harvested_at: string | null;
  last_interacted_at: string;
  created_at: string;
  updated_at: string;
}

export type SessionRow = {
  id: string;
  user_id: string;
  dream_id: string;
  type: SessionType;
  activity_id: string | null;
  duration_seconds: number | null;
  health_boost: number;
  reflection: string | null;
  completed_at: string;
}

export type SignRow = {
  id: string;
  user_id: string;
  dream_id: string;
  text: string | null;
  photo_url: string | null;
  created_at: string;
}

export type FeedActivityRow = {
  id: string;
  key: string;
  title: string;
  description: string;
  health_boost: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export type MeditationRow = {
  id: string;
  user_id: string;
  dream_id: string;
  duration_minutes: number;
  script: string | null;
  audio_url: string | null;
  status: MeditationStatus;
  is_free_gift: boolean;
  generated_at: string | null;
  created_at: string;
}

export type RewardRow = {
  id: string;
  user_id: string;
  dream_id: string | null;
  type: string;
  rarity: RewardRarity;
  granted_at: string;
}

export type TrophyRow = {
  id: string;
  user_id: string;
  dream_id: string;
  dream_title: string;
  total_sessions: number;
  harvested_at: string;
  created_at: string;
}

export type FeedbackRow = {
  id: string;
  user_id: string | null;
  type: FeedbackType;
  message: string;
  email_followup_consent: boolean;
  created_at: string;
}

export type UniverseCardRow = {
  id: string;
  message: string;
  is_active: boolean;
  created_at: string;
};

export type AppConfigRow = {
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
};

export type NotificationPrefsRow = {
  user_id: string;
  daily_reminder_time: string | null;
  daily_reminder_enabled: boolean;
  wilting_alerts_enabled: boolean;
  delight_notifications_enabled: boolean;
  expo_push_token: string | null;
  timezone: string | null;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      user_profile: Table<UserProfileRow, 'id'>;
      dreams: Table<DreamRow, 'user_id' | 'title'>;
      sessions: Table<SessionRow, 'user_id' | 'dream_id' | 'type'>;
      signs: Table<SignRow, 'user_id' | 'dream_id'>;
      feed_activities: Table<FeedActivityRow>;
      meditations: Table<MeditationRow, 'user_id' | 'dream_id' | 'duration_minutes'>;
      rewards: Table<RewardRow, 'user_id' | 'type'>;
      trophies: Table<TrophyRow, 'user_id' | 'dream_id' | 'dream_title'>;
      feedback: Table<FeedbackRow, 'type' | 'message'>;
      notification_prefs: Table<NotificationPrefsRow, 'user_id'>;
      app_config: Table<AppConfigRow, 'key' | 'value'>;
      universe_cards: Table<UniverseCardRow, 'message'>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
