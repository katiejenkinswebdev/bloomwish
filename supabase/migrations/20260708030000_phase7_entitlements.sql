-- Phase 7: server-side entitlement state, maintained by the RevenueCat
-- webhook so Edge Functions can enforce Full Bloom gates without trusting
-- the client.

create table public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  is_full_bloom boolean not null default false,
  product_id text,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.entitlements enable row level security;

-- Users may read their own entitlement; only the service role (webhook)
-- writes.
create policy "entitlements_select_own" on public.entitlements
  for select using (auth.uid() = user_id);
