-- Phase 4: activity sessions carry an optional reflection; growth mechanics
-- become remote-configurable.

alter table public.sessions add column reflection text;

insert into public.app_config (key, value) values
  ('water_health_boost', '{"boost": 10}'),
  -- Cumulative health-boost points at which a plant advances a growth stage.
  ('growth_thresholds', '{"sprout": 30, "growing": 80, "budding": 160, "blooming": 280}');
