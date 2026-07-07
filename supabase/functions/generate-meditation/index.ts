// Personalized voice meditation pipeline (Full Bloom feature; one free gift
// on the starter dream).
//
//   1. Claude writes a meditation script from the user's own dream scene —
//      segments of narration with intentional silences between them.
//   2. ElevenLabs renders each segment in the founder's cloned voice (raw PCM).
//   3. The segments + silences are assembled and mixed with a soft ambient bed
//      (pure-TypeScript PCM mixing — ffmpeg isn't available in the Edge
//      runtime), encoded as WAV, and cached in the `meditations` bucket.
//   4. The meditations row flips pending → ready (or failed); the client polls.
//
// Secrets:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   supabase secrets set ELEVENLABS_API_KEY=...
//   supabase secrets set ELEVENLABS_VOICE_ID=...   (founder's cloned voice)
import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const MODEL = 'claude-opus-4-8';
const SAMPLE_RATE = 16000;
const ALLOWED_MINUTES = [3, 5, 10, 15];
const AMBIENT_GAIN = 0.18;

const SCRIPT_SCHEMA = {
  type: 'object',
  properties: {
    segments: {
      type: 'array',
      description:
        'The meditation, split into spoken segments with intentional silence after each. Speech averages ~2.3 words/second; total speech plus pauses should land on the target duration.',
      items: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description:
              'One narration segment: warm, unhurried, second person, present tense. No stage directions, no headings — only the words to be spoken.',
          },
          pause_after_seconds: {
            type: 'integer',
            description: 'Seconds of silence after this segment (2–20).',
          },
        },
        required: ['text', 'pause_after_seconds'],
        additionalProperties: false,
      },
    },
  },
  required: ['segments'],
  additionalProperties: false,
} as const;

interface ScriptSegment {
  text: string;
  pause_after_seconds: number;
}

function meditationPrompt(params: {
  sceneText: string;
  minutes: number;
  displayName?: string | null;
  tonePreference?: string | null;
}): string {
  const targetSeconds = params.minutes * 60;
  const speechBudget = Math.round(targetSeconds * 0.45);
  const pauseBudget = targetSeconds - speechBudget;
  return `Write a guided visualization meditation of about ${params.minutes} minutes (${targetSeconds} seconds), narrated slowly and warmly.

It is built from this person's own dream scene — keep their exact sensory details and imagery at the heart of it:

"${params.sceneText}"

${params.displayName ? `You may occasionally address them by name: ${params.displayName}.` : 'Do not invent a name for them.'}
${params.tonePreference === 'energizing' ? 'Lean bright and energizing while staying calm.' : 'Lean gentle and soothing.'}

Structure:
- Open with settling the breath and body (about a fifth of the time).
- Then step into their dream scene in second person, present tense, slowly, sense by sense.
- Close by grounding them in the feeling of it being real, then invite them to say aloud: "Let it be! And so it is."

Timing budget: roughly ${speechBudget} seconds of speech (~${Math.round(speechBudget * 2.3)} words total) and ${pauseBudget} seconds of silence spread across the pauses between segments. Longer pauses belong in the middle of the meditation.`;
}

// ---------------------------------------------------------------------------
// PCM helpers
// ---------------------------------------------------------------------------

function wavFromPcm(pcm: Int16Array, sampleRate: number): Uint8Array {
  const dataSize = pcm.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);
  new Int16Array(buffer, 44).set(pcm);
  return new Uint8Array(buffer);
}

/** Minimal WAV reader — accepts only 16-bit mono PCM at our sample rate. */
function pcmFromWav(bytes: Uint8Array): Int16Array | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 44) return null;
  const format = view.getUint16(20, true);
  const channels = view.getUint16(22, true);
  const rate = view.getUint32(24, true);
  const bits = view.getUint16(34, true);
  if (format !== 1 || channels !== 1 || rate !== SAMPLE_RATE || bits !== 16) return null;
  // Find the data chunk (headers can carry extra chunks).
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const id = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
    const size = view.getUint32(offset + 4, true);
    if (id === 'data') {
      const start = bytes.byteOffset + offset + 8;
      return new Int16Array(bytes.buffer.slice(start, start + size));
    }
    offset += 8 + size;
  }
  return null;
}

async function renderSegment(text: string): Promise<Int16Array> {
  const voiceId = Deno.env.get('ELEVENLABS_VOICE_ID');
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=pcm_16000`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': Deno.env.get('ELEVENLABS_API_KEY')!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' }),
    }
  );
  if (!response.ok) {
    throw new Error(`ElevenLabs ${response.status}: ${await response.text()}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  return new Int16Array(bytes.buffer.slice(0, Math.floor(bytes.length / 2) * 2));
}

function assembleWithPauses(
  rendered: Int16Array[],
  segments: ScriptSegment[],
  targetSeconds: number
): Int16Array {
  const pieces: Int16Array[] = [];
  let totalSamples = 0;
  for (let i = 0; i < rendered.length; i++) {
    pieces.push(rendered[i]);
    totalSamples += rendered[i].length;
    const pauseSeconds = Math.min(30, Math.max(0, segments[i]?.pause_after_seconds ?? 3));
    const silence = new Int16Array(pauseSeconds * SAMPLE_RATE);
    pieces.push(silence);
    totalSamples += silence.length;
  }
  // Pad or trim to the promised duration so 5 minutes means 5 minutes.
  const targetSamples = targetSeconds * SAMPLE_RATE;
  if (totalSamples < targetSamples) {
    pieces.push(new Int16Array(targetSamples - totalSamples));
    totalSamples = targetSamples;
  }
  const out = new Int16Array(totalSamples);
  let cursor = 0;
  for (const piece of pieces) {
    out.set(piece, cursor);
    cursor += piece.length;
  }
  return totalSamples > targetSamples ? out.subarray(0, targetSamples) : out;
}

function mixAmbient(voice: Int16Array, ambient: Int16Array): Int16Array {
  const out = new Int16Array(voice.length);
  for (let i = 0; i < voice.length; i++) {
    const mixed = voice[i] + ambient[i % ambient.length] * AMBIENT_GAIN;
    out[i] = Math.max(-32768, Math.min(32767, Math.round(mixed)));
  }
  return out;
}

// ---------------------------------------------------------------------------

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

  const { dreamId, durationMinutes } = await req.json();
  if (!dreamId || !ALLOWED_MINUTES.includes(durationMinutes)) {
    return new Response('dreamId and durationMinutes (3|5|10|15) are required', { status: 400 });
  }

  // RLS scopes this read to the caller's own dreams.
  const { data: dream, error: dreamError } = await callerClient
    .from('dreams')
    .select('id, scene_text, is_starter_dream, updated_at')
    .eq('id', dreamId)
    .single();
  if (dreamError || !dream?.scene_text) {
    return new Response('Dream not found or has no scene yet', { status: 404 });
  }

  // Entitlement, maintained by the revenuecat-webhook function. Free tier:
  // exactly one personalized meditation, on the starter dream, as a gift.
  const { data: entitlement } = await callerClient
    .from('entitlements')
    .select('is_full_bloom, expires_at')
    .eq('user_id', user.id)
    .maybeSingle();
  const isFullBloom =
    !!entitlement?.is_full_bloom &&
    (!entitlement.expires_at || new Date(entitlement.expires_at).getTime() > Date.now());
  if (!isFullBloom) {
    if (!dream.is_starter_dream) {
      return new Response(JSON.stringify({ error: 'full_bloom_required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const { data: priorGift } = await callerClient
      .from('meditations')
      .select('id, dream_id, duration_minutes, status')
      .eq('is_free_gift', true)
      .neq('status', 'failed')
      .limit(1)
      .maybeSingle();
    if (priorGift && !(priorGift.dream_id === dreamId && priorGift.duration_minutes === durationMinutes)) {
      return new Response(JSON.stringify({ error: 'gift_already_used' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Cache: reuse a ready meditation for this dream+duration unless the scene
  // changed since it was generated.
  const { data: existing } = await callerClient
    .from('meditations')
    .select('*')
    .eq('dream_id', dreamId)
    .eq('duration_minutes', durationMinutes)
    .in('status', ['ready', 'pending'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) {
    const fresh =
      existing.status === 'pending' ||
      (existing.generated_at && existing.generated_at >= dream.updated_at);
    if (fresh) {
      return new Response(JSON.stringify({ meditationId: existing.id }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const { data: profile } = await callerClient
    .from('user_profile')
    .select('display_name, tone_preference')
    .eq('id', user.id)
    .maybeSingle();

  const { data: pendingRow, error: insertError } = await callerClient
    .from('meditations')
    .insert({
      user_id: user.id,
      dream_id: dreamId,
      duration_minutes: durationMinutes,
      status: 'pending',
      is_free_gift: !isFullBloom,
    })
    .select()
    .single();
  if (insertError) {
    return new Response(insertError.message, { status: 500 });
  }

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const generate = async () => {
    try {
      // Local-preview fallback: without AI keys (never true in production),
      // produce a canned script and silent audio so the flow stays testable.
      if (!Deno.env.get('ANTHROPIC_API_KEY') || !Deno.env.get('ELEVENLABS_API_KEY')) {
        const seconds = durationMinutes * 60;
        const silence = new Int16Array(seconds * SAMPLE_RATE);
        const path = `${user.id}/${dreamId}/${durationMinutes}m-demo-${Date.now()}.wav`;
        const { error: uploadError } = await adminClient.storage
          .from('meditations')
          .upload(path, wavFromPcm(silence, SAMPLE_RATE), { contentType: 'audio/wav' });
        if (uploadError) throw uploadError;
        await adminClient
          .from('meditations')
          .update({
            status: 'ready',
            audio_url: path,
            script:
              '[Demo meditation — connect Anthropic and ElevenLabs keys to grow the real one.]',
            generated_at: new Date().toISOString(),
          })
          .eq('id', pendingRow.id);
        return;
      }

      const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });
      const scriptResponse = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 16000,
        thinking: { type: 'adaptive' },
        system:
          'You write guided visualization meditation scripts for a warm, garden-themed wellbeing app. Never clinical, never guaranteeing outcomes, no medical claims. Slow, spacious, sensory language.',
        output_config: { format: { type: 'json_schema', schema: SCRIPT_SCHEMA } },
        messages: [
          {
            role: 'user',
            content: meditationPrompt({
              sceneText: dream.scene_text!,
              minutes: durationMinutes,
              displayName: profile?.display_name,
              tonePreference: profile?.tone_preference,
            }),
          },
        ],
      });
      if (scriptResponse.stop_reason === 'refusal') throw new Error('script_declined');
      const textBlock = scriptResponse.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') throw new Error('empty_script');
      const { segments } = JSON.parse(textBlock.text) as { segments: ScriptSegment[] };
      if (!segments?.length) throw new Error('empty_script');

      // Render sequentially — kind to ElevenLabs concurrency limits.
      const rendered: Int16Array[] = [];
      for (const segment of segments) {
        rendered.push(await renderSegment(segment.text));
      }
      let pcm = assembleWithPauses(rendered, segments, durationMinutes * 60);

      // Ambient bed is optional — voice-only when the founder hasn't uploaded it.
      const { data: ambientFile } = await adminClient.storage
        .from('meditation-assets')
        .download('ambient-bed.wav');
      if (ambientFile) {
        const ambient = pcmFromWav(new Uint8Array(await ambientFile.arrayBuffer()));
        if (ambient && ambient.length > 0) pcm = mixAmbient(pcm, ambient);
      }

      const path = `${user.id}/${dreamId}/${durationMinutes}m-${Date.now()}.wav`;
      const { error: uploadError } = await adminClient.storage
        .from('meditations')
        .upload(path, wavFromPcm(pcm, SAMPLE_RATE), { contentType: 'audio/wav' });
      if (uploadError) throw uploadError;

      const script = segments
        .map((s) => `${s.text}\n[pause ${s.pause_after_seconds}s]`)
        .join('\n\n');
      await adminClient
        .from('meditations')
        .update({
          status: 'ready',
          audio_url: path,
          script,
          generated_at: new Date().toISOString(),
        })
        .eq('id', pendingRow.id);
    } catch (err) {
      console.error('generate-meditation failed', err);
      await adminClient.from('meditations').update({ status: 'failed' }).eq('id', pendingRow.id);
    }
  };

  // Respond immediately; the client polls the meditations row.
  EdgeRuntime.waitUntil(generate());

  return new Response(JSON.stringify({ meditationId: pendingRow.id }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
