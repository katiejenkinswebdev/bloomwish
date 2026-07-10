-- Security hardening (audit findings #1 and #2).
--
-- 1) Anon lockdown. The 20260708200000 grants migration gave the `anon`
--    role full DML on every table (and on all FUTURE tables via default
--    privileges) while relying on RLS as the only gate. The app never
--    queries public tables anonymously — sign-in/sign-up go through the
--    auth endpoints — so anon needs zero table access. Revoking it means a
--    future table that forgets `enable row level security` is exposed only
--    to signed-in users, not to anyone on the internet with the anon key.
--
--    RULE FOR EVERY FUTURE TABLE: `alter table ... enable row level
--    security;` in the same migration that creates it. No exceptions.
revoke all on all tables in schema public from anon;
alter default privileges in schema public
  revoke select, insert, update, delete on tables from anon;

-- 2) Server-side daily budget for AI calls (cost-abuse guard). Edge
--    Functions increment a per-user, per-day counter before spending money
--    on Anthropic/ElevenLabs; limits are founder-tunable in app_config
--    without a redeploy.
create table public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default current_date,
  kind text not null,
  calls integer not null default 0,
  primary key (user_id, day, kind)
);

-- RLS on, no policies: only the service role (which bypasses RLS) may touch
-- usage counters. Clients can neither read nor forge them.
alter table public.ai_usage enable row level security;

-- Atomic increment-and-read so concurrent requests can't skip the ceiling.
create or replace function public.increment_ai_usage(p_user uuid, p_kind text)
returns integer
language sql
security definer
set search_path = public
as $$
  insert into public.ai_usage (user_id, day, kind, calls)
  values (p_user, current_date, p_kind, 1)
  on conflict (user_id, day, kind)
  do update set calls = ai_usage.calls + 1
  returning calls;
$$;

revoke execute on function public.increment_ai_usage(uuid, text) from public, anon, authenticated;
grant execute on function public.increment_ai_usage(uuid, text) to service_role;

-- Founder-tunable ceilings. Sizing: a heavy legitimate day is roughly
-- 6 coach calls creating a dream + a handful of affirmations/nudges/
-- reframes across dreams (~20-30); 50 leaves headroom while stopping
-- loops. Meditations are far costlier (ElevenLabs audio): 10/day covers
-- every real pattern.
insert into public.app_config (key, value) values
  ('ai_daily_limits', '{"coach": 50, "meditation": 10}')
on conflict (key) do nothing;
