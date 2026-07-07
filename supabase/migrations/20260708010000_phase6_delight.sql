-- Phase 6: harvest celebration content and delight-system config.

-- ---------------------------------------------------------------------------
-- universe_cards: founder-editable "sign from the universe" messages shown as
-- occasional variable rewards. Read-only to clients.
-- ---------------------------------------------------------------------------
create table public.universe_cards (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.universe_cards enable row level security;

create policy "universe_cards_select_active" on public.universe_cards
  for select to authenticated using (is_active = true);

insert into public.universe_cards (message) values
  ('The garden hears you. Keep tending.'),
  ('Something is quietly taking root beneath the surface.'),
  ('You showed up today. That is how everything blooms.'),
  ('The smallest seeds grow the tallest wonders.'),
  ('What you water grows. What you love flourishes.'),
  ('A dream tended daily cannot help but reach for the light.'),
  ('The universe loves a gardener with patience.'),
  ('Roots first, then wings.'),
  ('Every bloom you''ve ever seen began as a quiet wish.'),
  ('Trust the season you''re in.');

-- ---------------------------------------------------------------------------
-- Delight probabilities — cosmetic and encouraging only, never gated
-- progress. Founder-tunable without an app release.
-- ---------------------------------------------------------------------------
insert into public.app_config (key, value) values
  ('reward_probabilities', '{
    "session_complete": {"butterfly_visit": 0.06, "universe_card": 0.10, "legendary_butterfly": 0.01},
    "app_open": {"surprise_bloom": 0.05, "universe_card": 0.04}
  }');
