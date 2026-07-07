-- Phase 5: storage for rendered personalized meditations and the ambient
-- mixing bed.

-- Rendered meditations: private; the Edge Function writes with the service
-- role, users read only their own folder (<user_id>/...).
insert into storage.buckets (id, name, public)
values ('meditations', 'meditations', false);

create policy "meditations_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'meditations' and (storage.foldername(name))[1] = auth.uid()::text);

-- Founder-uploaded mixing assets (ambient bed). No client policies — only the
-- service role (which bypasses RLS) reads it. Upload `ambient-bed.wav`
-- (16 kHz mono PCM WAV) via the dashboard; mixing degrades gracefully to
-- voice-only when absent.
insert into storage.buckets (id, name, public)
values ('meditation-assets', 'meditation-assets', false);
