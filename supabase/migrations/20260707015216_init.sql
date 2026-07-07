-- Bloomwish initial schema
-- All user-owned tables use Row Level Security so a user can only ever
-- read/write their own rows. `feed_activities` is the one shared content
-- table (curated by the founder, read-only to clients).

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.dream_state as enum ('seed', 'sprout', 'growing', 'budding', 'blooming');
create type public.dream_health as enum ('thriving', 'healthy', 'wilting', 'dormant');
create type public.session_type as enum ('water', 'feed');
create type public.meditation_status as enum ('pending', 'ready', 'failed');
create type public.tone_preference as enum ('gentle', 'energizing');
create type public.experience_level as enum ('new', 'some_experience', 'experienced');
create type public.feedback_type as enum ('bug', 'idea', 'love');
create type public.reward_rarity as enum ('common', 'rare', 'legendary');

-- ---------------------------------------------------------------------------
-- user_profile
-- ---------------------------------------------------------------------------
create table public.user_profile (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  first_manifestation_category text,
  experience_level public.experience_level,
  preferred_session_length_minutes smallint,
  tone_preference public.tone_preference,
  reminder_time time,
  reminder_timezone text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profile enable row level security;

create policy "user_profile_select_own" on public.user_profile
  for select using (auth.uid() = id);
create policy "user_profile_insert_own" on public.user_profile
  for insert with check (auth.uid() = id);
create policy "user_profile_update_own" on public.user_profile
  for update using (auth.uid() = id);
create policy "user_profile_delete_own" on public.user_profile
  for delete using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- dreams
-- ---------------------------------------------------------------------------
create table public.dreams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  scene_text text,
  vividness_score smallint check (vividness_score between 0 and 100),
  state public.dream_state not null default 'seed',
  health public.dream_health not null default 'thriving',
  is_starter_dream boolean not null default false,
  planted_at timestamptz,
  harvested_at timestamptz,
  last_interacted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index dreams_user_id_idx on public.dreams (user_id);

alter table public.dreams enable row level security;

create policy "dreams_select_own" on public.dreams
  for select using (auth.uid() = user_id);
create policy "dreams_insert_own" on public.dreams
  for insert with check (auth.uid() = user_id);
create policy "dreams_update_own" on public.dreams
  for update using (auth.uid() = user_id);
create policy "dreams_delete_own" on public.dreams
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- sessions (water / feed activity completions)
-- ---------------------------------------------------------------------------
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  dream_id uuid not null references public.dreams (id) on delete cascade,
  type public.session_type not null,
  activity_id text,
  duration_seconds integer,
  health_boost smallint not null default 0,
  completed_at timestamptz not null default now()
);

create index sessions_dream_id_idx on public.sessions (dream_id);
create index sessions_user_id_idx on public.sessions (user_id);

alter table public.sessions enable row level security;

create policy "sessions_select_own" on public.sessions
  for select using (auth.uid() = user_id);
create policy "sessions_insert_own" on public.sessions
  for insert with check (auth.uid() = user_id);
create policy "sessions_update_own" on public.sessions
  for update using (auth.uid() = user_id);
create policy "sessions_delete_own" on public.sessions
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- signs ("signs it's growing" timeline)
-- ---------------------------------------------------------------------------
create table public.signs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  dream_id uuid not null references public.dreams (id) on delete cascade,
  text text,
  photo_url text,
  created_at timestamptz not null default now()
);

create index signs_dream_id_idx on public.signs (dream_id);

alter table public.signs enable row level security;

create policy "signs_select_own" on public.signs
  for select using (auth.uid() = user_id);
create policy "signs_insert_own" on public.signs
  for insert with check (auth.uid() = user_id);
create policy "signs_update_own" on public.signs
  for update using (auth.uid() = user_id);
create policy "signs_delete_own" on public.signs
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- feed_activities (shared content table, founder-curated, read-only to clients)
-- ---------------------------------------------------------------------------
create table public.feed_activities (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  description text not null,
  health_boost smallint not null default 10,
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

alter table public.feed_activities enable row level security;

create policy "feed_activities_select_active" on public.feed_activities
  for select using (is_active = true);

-- Starter library of 6-8 feed activities (section 8). Editable by the founder
-- directly in the table — no app deploy needed to tweak copy or ordering.
insert into public.feed_activities (key, title, description, health_boost, sort_order) values
  ('past_tense_writing', 'Write it in the past tense', 'Write your dream as if it already happened, in past tense.', 15, 1),
  ('tell_someone', 'Tell one person', 'Tell one person in your life about your dream.', 15, 2),
  ('voice_note', 'Record a voice note', 'Record yourself describing how it feels for your dream to be true. Only the transcript is kept.', 15, 3),
  ('gratitude_list', 'Gratitude list', 'List 5 things you are grateful for right now.', 15, 4),
  ('act_as_if', 'Act as if', 'Take one small action today as if your dream has already come true.', 15, 5),
  ('add_a_sign', 'Add a Sign', 'Log a sign that your dream is growing.', 15, 6);

-- ---------------------------------------------------------------------------
-- meditations (personalized voice meditations, Full Bloom feature)
-- ---------------------------------------------------------------------------
create table public.meditations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  dream_id uuid not null references public.dreams (id) on delete cascade,
  duration_minutes smallint not null,
  script text,
  audio_url text,
  status public.meditation_status not null default 'pending',
  is_free_gift boolean not null default false,
  generated_at timestamptz,
  created_at timestamptz not null default now()
);

create index meditations_dream_id_idx on public.meditations (dream_id);

alter table public.meditations enable row level security;

create policy "meditations_select_own" on public.meditations
  for select using (auth.uid() = user_id);
create policy "meditations_insert_own" on public.meditations
  for insert with check (auth.uid() = user_id);
create policy "meditations_update_own" on public.meditations
  for update using (auth.uid() = user_id);
create policy "meditations_delete_own" on public.meditations
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- rewards (delight-only variable rewards)
-- ---------------------------------------------------------------------------
create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  dream_id uuid references public.dreams (id) on delete cascade,
  type text not null,
  rarity public.reward_rarity not null default 'common',
  granted_at timestamptz not null default now()
);

create index rewards_user_id_idx on public.rewards (user_id);

alter table public.rewards enable row level security;

create policy "rewards_select_own" on public.rewards
  for select using (auth.uid() = user_id);
create policy "rewards_insert_own" on public.rewards
  for insert with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- trophies (harvested dreams: stone plaque + butterfly)
-- ---------------------------------------------------------------------------
create table public.trophies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  dream_id uuid not null references public.dreams (id) on delete cascade,
  dream_title text not null,
  total_sessions integer not null default 0,
  harvested_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index trophies_user_id_idx on public.trophies (user_id);

alter table public.trophies enable row level security;

create policy "trophies_select_own" on public.trophies
  for select using (auth.uid() = user_id);
create policy "trophies_insert_own" on public.trophies
  for insert with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- feedback
-- ---------------------------------------------------------------------------
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  type public.feedback_type not null,
  message text not null,
  email_followup_consent boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

create policy "feedback_select_own" on public.feedback
  for select using (auth.uid() = user_id);
create policy "feedback_insert_own" on public.feedback
  for insert with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- notification_prefs
-- ---------------------------------------------------------------------------
create table public.notification_prefs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  daily_reminder_time time,
  daily_reminder_enabled boolean not null default true,
  wilting_alerts_enabled boolean not null default true,
  delight_notifications_enabled boolean not null default true,
  expo_push_token text,
  timezone text,
  updated_at timestamptz not null default now()
);

alter table public.notification_prefs enable row level security;

create policy "notification_prefs_select_own" on public.notification_prefs
  for select using (auth.uid() = user_id);
create policy "notification_prefs_insert_own" on public.notification_prefs
  for insert with check (auth.uid() = user_id);
create policy "notification_prefs_update_own" on public.notification_prefs
  for update using (auth.uid() = user_id);
create policy "notification_prefs_delete_own" on public.notification_prefs
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.user_profile
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.dreams
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Account deletion note:
--
-- Every table above declares `references auth.users (id) on delete cascade`,
-- so deleting the auth user cascades to remove every row of their data.
-- Deletion itself is performed by the `delete-account` Edge Function using
-- the service-role Admin API (`auth.admin.deleteUser`), never by client SQL —
-- only the Admin API correctly tears down the user's sessions/identities in
-- the `auth` schema alongside the cascade.
-- ---------------------------------------------------------------------------
