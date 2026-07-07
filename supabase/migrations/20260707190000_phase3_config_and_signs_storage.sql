-- Phase 3: remote-config values and Sign photo storage.

-- ---------------------------------------------------------------------------
-- app_config: founder-editable key/value config (health decay thresholds,
-- reward probabilities later). Read-only to clients.
-- ---------------------------------------------------------------------------
create table public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;

create policy "app_config_select_authenticated" on public.app_config
  for select to authenticated using (true);

insert into public.app_config (key, value) values
  ('health_decay', '{"wilting_after_days": 3, "dormant_after_days": 10}'),
  ('sign_health_boost', '{"boost": 5}'),
  ('daily_health_gain_cap', '{"cap": 40}');

-- ---------------------------------------------------------------------------
-- sign-photos bucket: private; users read/write only their own folder
-- (paths are namespaced as <user_id>/<filename>).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('sign-photos', 'sign-photos', false);

create policy "sign_photos_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'sign-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "sign_photos_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'sign-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "sign_photos_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'sign-photos' and (storage.foldername(name))[1] = auth.uid()::text);
