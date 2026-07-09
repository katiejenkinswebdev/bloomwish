// "Export my data": returns everything the signed-in user owns as one JSON
// document. Reads go through the caller's own JWT, so RLS guarantees users
// can only ever export themselves.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const TABLES = [
  'user_profile',
  'dreams',
  'sessions',
  'signs',
  'meditations',
  'trophies',
  'rewards',
  'feedback',
  'notification_prefs',
] as const;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Missing Authorization header', { status: 401 });

  const callerClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const {
    data: { user },
    error: userError,
  } = await callerClient.auth.getUser();
  if (userError || !user) return new Response('Unauthorized', { status: 401 });

  const exported: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email },
  };

  for (const table of TABLES) {
    const { data, error } = await callerClient.from(table).select('*');
    if (error) {
      console.error(`export failed on ${table}`, error);
      return new Response(`Export failed on ${table}`, { status: 500 });
    }
    // Meditations: audio files stay in storage; the script text is the data.
    exported[table] = data;
  }

  return new Response(JSON.stringify(exported, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="bloomwish-export.json"',
    },
  });
});
