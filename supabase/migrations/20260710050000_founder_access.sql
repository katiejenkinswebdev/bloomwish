-- Founder access: emails listed here bypass the free-tier dream-slot cap in
-- the app (client-side gate only — server-side Full Bloom gates like
-- meditation still follow entitlements). Edit the list in the table anytime.
insert into public.app_config (key, value) values
  ('founder', '{"emails": ["kind2karma@gmail.com", "me@test.local", "preview@bloomwish.test"]}')
on conflict (key) do update set value = excluded.value;
