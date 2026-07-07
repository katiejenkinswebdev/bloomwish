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

export interface Database {
  public: {
    Tables: {
      user_profile: {
        Row: {
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
        };
        Insert: Partial<Database['public']['Tables']['user_profile']['Row']> & { id: string };
        Update: Partial<Database['public']['Tables']['user_profile']['Row']>;
      };
      dreams: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          scene_text: string | null;
          vividness_score: number | null;
          state: DreamState;
          health: DreamHealth;
          is_starter_dream: boolean;
          planted_at: string | null;
          harvested_at: string | null;
          last_interacted_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['dreams']['Row']> & {
          user_id: string;
          title: string;
        };
        Update: Partial<Database['public']['Tables']['dreams']['Row']>;
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          dream_id: string;
          type: SessionType;
          activity_id: string | null;
          duration_seconds: number | null;
          health_boost: number;
          completed_at: string;
        };
        Insert: Partial<Database['public']['Tables']['sessions']['Row']> & {
          user_id: string;
          dream_id: string;
          type: SessionType;
        };
        Update: Partial<Database['public']['Tables']['sessions']['Row']>;
      };
      signs: {
        Row: {
          id: string;
          user_id: string;
          dream_id: string;
          text: string | null;
          photo_url: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['signs']['Row']> & {
          user_id: string;
          dream_id: string;
        };
        Update: Partial<Database['public']['Tables']['signs']['Row']>;
      };
      feed_activities: {
        Row: {
          id: string;
          key: string;
          title: string;
          description: string;
          health_boost: number;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['feed_activities']['Row']>;
        Update: Partial<Database['public']['Tables']['feed_activities']['Row']>;
      };
      meditations: {
        Row: {
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
        };
        Insert: Partial<Database['public']['Tables']['meditations']['Row']> & {
          user_id: string;
          dream_id: string;
          duration_minutes: number;
        };
        Update: Partial<Database['public']['Tables']['meditations']['Row']>;
      };
      rewards: {
        Row: {
          id: string;
          user_id: string;
          dream_id: string | null;
          type: string;
          rarity: RewardRarity;
          granted_at: string;
        };
        Insert: Partial<Database['public']['Tables']['rewards']['Row']> & {
          user_id: string;
          type: string;
        };
        Update: Partial<Database['public']['Tables']['rewards']['Row']>;
      };
      trophies: {
        Row: {
          id: string;
          user_id: string;
          dream_id: string;
          dream_title: string;
          total_sessions: number;
          harvested_at: string;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['trophies']['Row']> & {
          user_id: string;
          dream_id: string;
          dream_title: string;
        };
        Update: Partial<Database['public']['Tables']['trophies']['Row']>;
      };
      feedback: {
        Row: {
          id: string;
          user_id: string | null;
          type: FeedbackType;
          message: string;
          email_followup_consent: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['feedback']['Row']> & {
          type: FeedbackType;
          message: string;
        };
        Update: Partial<Database['public']['Tables']['feedback']['Row']>;
      };
      notification_prefs: {
        Row: {
          user_id: string;
          daily_reminder_time: string | null;
          daily_reminder_enabled: boolean;
          wilting_alerts_enabled: boolean;
          delight_notifications_enabled: boolean;
          expo_push_token: string | null;
          timezone: string | null;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['notification_prefs']['Row']> & {
          user_id: string;
        };
        Update: Partial<Database['public']['Tables']['notification_prefs']['Row']>;
      };
    };
  };
}
