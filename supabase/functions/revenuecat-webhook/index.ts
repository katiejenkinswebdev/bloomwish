// RevenueCat → entitlements sync.
//
// RevenueCat POSTs subscription lifecycle events here; we upsert the user's
// Full Bloom entitlement so server-side gates (e.g. generate-meditation)
// never trust the client.
//
// Setup:
//   1. Deploy WITHOUT Supabase JWT verification (RevenueCat can't send one):
//        npx supabase functions deploy revenuecat-webhook --no-verify-jwt
//   2. supabase secrets set REVENUECAT_WEBHOOK_SECRET=<random string>
//   3. In the RevenueCat dashboard, add a webhook to this function's URL with
//      Authorization header set to that same secret.
//
// The app calls Purchases.logIn(<supabase user id>), so RevenueCat's
// app_user_id is our auth.users id.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const FULL_BLOOM_ENTITLEMENT_ID = 'full_bloom';

interface RevenueCatEvent {
  type: string;
  app_user_id: string;
  product_id?: string;
  entitlement_ids?: string[];
  expiration_at_ms?: number | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const secret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  if (!secret || req.headers.get('Authorization') !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const event = payload?.event as RevenueCatEvent | undefined;
  if (!event?.app_user_id) return new Response('Bad payload', { status: 400 });

  // Anonymous RevenueCat ids ($RCAnonymousID:...) can't map to a user row;
  // the app logs in with the Supabase uid before purchase, so these are rare
  // (e.g. events fired before login). Acknowledge and skip.
  if (!UUID_RE.test(event.app_user_id)) {
    return new Response(JSON.stringify({ skipped: 'anonymous_app_user_id' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const grantsFullBloom = (event.entitlement_ids ?? []).includes(FULL_BLOOM_ENTITLEMENT_ID);
  const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms) : null;

  // Active when the entitlement is present and not already expired (lifetime
  // purchases have no expiration).
  const REVOKING_EVENTS = new Set(['EXPIRATION', 'CANCELLATION_COMPLETED', 'REFUND']);
  const isActive =
    grantsFullBloom &&
    !REVOKING_EVENTS.has(event.type) &&
    (!expiresAt || expiresAt.getTime() > Date.now());

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { error } = await adminClient.from('entitlements').upsert({
    user_id: event.app_user_id,
    is_full_bloom: isActive,
    product_id: event.product_id ?? null,
    expires_at: expiresAt?.toISOString() ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error('entitlements upsert failed', error);
    return new Response(error.message, { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
