// Forwards new feedback rows to Slack the moment they land.
//
// Setup:
//   1. Slack: create an app at api.slack.com/apps → Incoming Webhooks → add
//      one for your #bloomwish-feedback channel; copy the webhook URL.
//   2. Deploy without JWT verification (the DB webhook can't send one):
//        npx supabase functions deploy notify-feedback --no-verify-jwt
//   3. Secrets:
//        npx supabase secrets set SLACK_FEEDBACK_WEBHOOK_URL=https://hooks.slack.com/services/...
//        npx supabase secrets set FEEDBACK_WEBHOOK_SECRET=<random string>
//   4. Supabase dashboard → Database → Webhooks → Create:
//        table `feedback`, event INSERT, type HTTP request → this function's
//        URL, with an `Authorization` header set to the same secret.
interface FeedbackWebhookPayload {
  type: 'INSERT';
  record: {
    id: string;
    user_id: string | null;
    type: 'bug' | 'idea' | 'love';
    message: string;
    email_followup_consent: boolean;
    created_at: string;
  };
}

const EMOJI: Record<string, string> = { bug: '🐛', idea: '💡', love: '💚' };

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const secret = Deno.env.get('FEEDBACK_WEBHOOK_SECRET');
  if (!secret || req.headers.get('Authorization') !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const slackUrl = Deno.env.get('SLACK_FEEDBACK_WEBHOOK_URL');
  if (!slackUrl) return new Response('SLACK_FEEDBACK_WEBHOOK_URL not configured', { status: 500 });

  const payload = (await req.json().catch(() => null)) as FeedbackWebhookPayload | null;
  const record = payload?.record;
  if (payload?.type !== 'INSERT' || !record?.message) {
    return new Response('Bad payload', { status: 400 });
  }

  const text = [
    `${EMOJI[record.type] ?? '📝'} *New ${record.type} feedback*`,
    `>${record.message.replace(/\n/g, '\n>')}`,
    record.email_followup_consent
      ? `✉️ Follow-up OK — user \`${record.user_id ?? 'anonymous'}\``
      : `🤫 No follow-up requested`,
  ].join('\n');

  const slackResponse = await fetch(slackUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!slackResponse.ok) {
    console.error('slack post failed', slackResponse.status, await slackResponse.text());
    return new Response('Slack delivery failed', { status: 502 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
