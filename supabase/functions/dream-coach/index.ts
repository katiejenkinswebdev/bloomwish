// Dream coach: Claude-powered deepening questions, scene reflection, and
// vividness scoring for the dream creation flow.
//
// Actions (POST body `{ action, ... }`):
//   questions — dream text + profile → 3–5 tailored deepening questions
//   scene     — dream text + Q&A answers → second-person present-tense scene
//   score     — scene text → vividness 0–100 + missing senses + encouragement
//
// Secrets: `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`
import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const MODEL = 'claude-opus-4-8';

// Warm coach persona shared by every action. Compliance: visualization and
// wellbeing framing only — never medical/neurological claims, never outcome
// guarantees.
const COACH_SYSTEM_PROMPT = `You are the gentle, warm-hearted guide inside a visualization and mindfulness app built around a garden metaphor: each personal dream is planted as a seed and nurtured with visualization practice.

Your voice:
- Warm, encouraging, and grounded — like a wise friend and gardener, never clinical or corporate.
- You speak simply and concretely. Short sentences. Sensory language.
- You never guarantee outcomes, never promise that visualization makes things happen, and never make medical, neurological, or scientific claims. The practice is about feeling, clarity, and wellbeing.
- You always end by grounding the person in feeling — what it feels like in their body and heart when they imagine the dream alive.

House rules:
- Always second person ("you"), present tense when describing their dream as real.
- Never shame, never pressure, never use urgency.
- Keep everything safe-for-everyone: if a dream involves self-harm, harming others, or anything illegal, respond to the person with care and gently redirect toward a safe, positive framing of what they might really be longing for.`;

interface QuestionsRequest {
  action: 'questions';
  dreamText: string;
  profile?: UserProfileContext;
}

interface SceneRequest {
  action: 'scene';
  dreamText: string;
  answers: { question: string; answer: string }[];
  profile?: UserProfileContext;
  previousScene?: string;
  tweakInstruction?: string;
}

interface ScoreRequest {
  action: 'score';
  sceneText: string;
}

interface AffirmationRequest {
  action: 'affirmation';
  dreamText: string;
  sceneText?: string;
  profile?: UserProfileContext;
}

interface LetterRequest {
  action: 'letter';
  dreamText: string;
  sceneText?: string;
  profile?: UserProfileContext;
}

interface ActRequest {
  action: 'act';
  dreamText: string;
  sceneText?: string;
  profile?: UserProfileContext;
}

interface ReframeRequest {
  action: 'reframe';
  doubtText: string;
  dreamText?: string;
  profile?: UserProfileContext;
}

interface NudgeRequest {
  action: 'nudge';
  dreamText: string;
  sceneText?: string;
  profile?: UserProfileContext;
}

interface ReviewRequest {
  action: 'review';
  activityTitle: string;
  activityDescription: string;
  answer: string;
  dreamText?: string;
}

interface UserProfileContext {
  displayName?: string;
  experienceLevel?: string;
  tonePreference?: string;
  firstCategory?: string;
}

type CoachRequest =
  | QuestionsRequest
  | SceneRequest
  | ScoreRequest
  | ReviewRequest
  | AffirmationRequest
  | LetterRequest
  | ActRequest
  | ReframeRequest
  | NudgeRequest;

const QUESTIONS_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      description:
        '3 to 5 deepening questions, ordered so they are asked one at a time. Each explores a different dimension: sight, sound, touch, smell, emotion, who is there, or what changes in their life.',
      items: { type: 'string' },
    },
  },
  required: ['questions'],
  additionalProperties: false,
} as const;

const SCENE_SCHEMA = {
  type: 'object',
  properties: {
    sceneText: {
      type: 'string',
      description:
        'The dream reflected back as a rich second-person, present-tense scene ("You are standing…"), 120–250 words, weaving in the sensory and emotional details the person shared, ending by grounding them in feeling.',
    },
  },
  required: ['sceneText'],
  additionalProperties: false,
} as const;

const SCORE_SCHEMA = {
  type: 'object',
  properties: {
    score: {
      type: 'integer',
      description:
        'Vividness of the scene from 0 to 100, measuring sensory richness (sight, sound, touch, smell) and emotional depth. 70+ means vivid enough to plant.',
    },
    missing: {
      type: 'array',
      description:
        'Up to 3 specific senses or feelings that, if added, would make the scene more vivid (e.g. "what you hear around you", "the feeling in your chest"). Empty if the scene is already rich.',
      items: { type: 'string' },
    },
    encouragement: {
      type: 'string',
      description:
        'One warm sentence for the person about their scene — appreciative, never critical, never a guarantee of outcomes.',
    },
  },
  required: ['score', 'missing', 'encouragement'],
  additionalProperties: false,
} as const;

const AFFIRMATION_SCHEMA = {
  type: 'object',
  properties: {
    affirmation: {
      type: 'string',
      description:
        'One present-tense "I am / I have / I welcome" affirmation, 8–16 words, drawn from this specific dream — concrete and felt, never generic. No quotes around it.',
    },
  },
  required: ['affirmation'],
  additionalProperties: false,
} as const;

const LETTER_SCHEMA = {
  type: 'object',
  properties: {
    letterText: {
      type: 'string',
      description:
        'A warm letter (120–200 words) written by the person\'s future self — the one whose dream already came true — to the person today. First person, past tense about the dream ("I still remember when we were wishing for this"), specific to their scene details, ending with encouragement and love. Sign it "— You, a little further down the path".',
    },
  },
  required: ['letterText'],
  additionalProperties: false,
} as const;

const ACT_SCHEMA = {
  type: 'object',
  properties: {
    actionIdea: {
      type: 'string',
      description:
        'One concrete, doable-today micro-action (under 25 words) that lets this person act as if their specific dream is already real. Physical and specific, never generic self-help.',
    },
  },
  required: ['actionIdea'],
  additionalProperties: false,
} as const;

const REFRAME_SCHEMA = {
  type: 'object',
  properties: {
    reframe: {
      type: 'string',
      description:
        'The nourishment the composted doubt breaks down into: one first-person, present-tense line (10-22 words) that gently answers the doubt with something true and growing. Never dismissive of the doubt, never a guarantee.',
    },
  },
  required: ['reframe'],
  additionalProperties: false,
} as const;

const NUDGE_SCHEMA = {
  type: 'object',
  properties: {
    nudge: {
      type: 'string',
      description:
        'One tiny noticing-prompt for today (under 20 words), specific to this dream: something the arrived-self would notice, savor, or do. Fresh, warm, concrete.',
    },
  },
  required: ['nudge'],
  additionalProperties: false,
} as const;

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    passed: {
      type: 'boolean',
      description:
        'True only when the answer shows genuine, specific, embodied engagement with the practice. Vague, generic, minimal-effort, off-topic, or gibberish answers do not pass — length alone neither passes nor fails an answer.',
    },
    feedback: {
      type: 'string',
      description:
        'One or two sentences. If passed: warm, specific affirmation reflecting something real from their answer. If not passed: gentle coaching to go deeper — invite them back into the moment and the feeling in their body — never shaming, never sarcastic.',
    },
  },
  required: ['passed', 'feedback'],
  additionalProperties: false,
} as const;

function profileContext(profile?: UserProfileContext): string {
  if (!profile) return '';
  const parts: string[] = [];
  if (profile.displayName) parts.push(`Their name is ${profile.displayName}.`);
  if (profile.experienceLevel) parts.push(`Visualization experience: ${profile.experienceLevel}.`);
  if (profile.tonePreference) parts.push(`They prefer a ${profile.tonePreference} tone.`);
  if (profile.firstCategory) parts.push(`Their focus area: ${profile.firstCategory}.`);
  return parts.length ? `\n\nAbout this person: ${parts.join(' ')}` : '';
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Only signed-in users may spend API tokens.
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response('Missing Authorization header', { status: 401 });
  }
  const callerClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const {
    data: { user },
    error: userError,
  } = await callerClient.auth.getUser();
  if (userError || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = (await req.json()) as CoachRequest;

  // Local-preview fallback: with no ANTHROPIC_API_KEY configured (never true
  // in production), return canned coach responses so the flow stays testable.
  if (!Deno.env.get('ANTHROPIC_API_KEY')) {
    const demo =
      body.action === 'questions'
        ? {
            questions: [
              'When you picture this dream real, what is the first thing you see around you?',
              'What sounds are with you in that moment?',
              'Who is there with you — or is this moment yours alone?',
              'What does it feel like in your body when you realize it has happened?',
            ],
          }
        : body.action === 'scene'
          ? {
              sceneText:
                'You are standing right inside the moment you described — it has happened. [Demo scene: connect an Anthropic API key to hear the real coach.] The light is warm, and everything you told me about is here: the sights, the sounds, the people. You take a slow breath and feel it settle in your chest — the quiet, certain feeling of a wish that has bloomed. Stay here a moment. Let it be real.',
            }
          : body.action === 'affirmation'
          ? {
              affirmation:
                'I am already living the first quiet moments of this dream. [Demo — connect an Anthropic key.]',
            }
          : body.action === 'letter'
            ? {
                letterText:
                  'Dear you,\n\nI still remember when we were wishing for this — how big it felt, how far away. I want you to know: it arrived. Not all at once, but in small ordinary mornings that slowly became the life we pictured. Keep tending it the way you are. The watering matters more than you know.\n\n[Demo letter — connect an Anthropic key to receive the real one, written from your own scene.]\n\n— You, a little further down the path',
              }
            : body.action === 'act'
              ? {
                  actionIdea:
                    'Set the table tonight the way the arrived-you would — unhurried, like this is already your life. [Demo — connect an Anthropic key.]',
                }
              : body.action === 'reframe'
                ? {
                    reframe:
                      'I am allowed to grow at the pace of a garden — this doubt is just old weather passing. [Demo]',
                  }
                : body.action === 'nudge'
                  ? {
                      nudge: 'Today, notice one small thing the arrived-you would savor. [Demo]',
                    }
            : body.action === 'review'
          ? (() => {
              const words = body.answer.trim().split(/\s+/).length;
              const passed = words >= 20;
              return {
                passed,
                feedback: passed
                  ? '[Demo review] That sounds real and specific — beautifully done.'
                  : '[Demo review] Go a little deeper — what did you actually do, and what did it feel like in your body? (Demo passes at ~20 words.)',
              };
            })()
          : { score: 78, missing: [], encouragement: 'A demo score — but your dream is lovely.' };
    return new Response(JSON.stringify(demo), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Server-side daily budget (audit finding #2): every paid AI call counts
  // against a per-user ceiling, tunable in app_config without a redeploy.
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  const { data: limitsRow } = await adminClient
    .from('app_config')
    .select('value')
    .eq('key', 'ai_daily_limits')
    .maybeSingle();
  const coachLimit =
    typeof (limitsRow?.value as Record<string, unknown> | null)?.coach === 'number'
      ? ((limitsRow!.value as Record<string, number>).coach)
      : 50;
  const { data: callsToday, error: usageError } = await adminClient.rpc('increment_ai_usage', {
    p_user: user.id,
    p_kind: 'coach',
  });
  if (usageError) {
    console.error('ai_usage increment failed', usageError);
    return new Response('Usage tracking unavailable', { status: 500 });
  }
  if (typeof callsToday === 'number' && callsToday > coachLimit) {
    return new Response(
      JSON.stringify({
        error: 'daily_limit',
        message: 'The coach is resting for today — everything continues fresh tomorrow.',
      }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

  let prompt: string;
  let schema: object;

  switch (body.action) {
    case 'questions': {
      if (!body.dreamText?.trim()) {
        return new Response('dreamText is required', { status: 400 });
      }
      prompt = `Someone just described a dream they want to nurture:\n\n"${body.dreamText}"${profileContext(body.profile)}\n\nWrite 3–5 deepening questions to help them experience this dream vividly, one dimension at a time (sight, sound, touch, smell, emotion, who is there, what changes in their life). Each question should be short, warm, and specific to THEIR dream — never generic.`;
      schema = QUESTIONS_SCHEMA;
      break;
    }
    case 'scene': {
      if (!body.dreamText?.trim() || !Array.isArray(body.answers)) {
        return new Response('dreamText and answers are required', { status: 400 });
      }
      const answersBlock = body.answers
        .map((a) => `Q: ${a.question}\nA: ${a.answer}`)
        .join('\n\n');
      const tweakBlock =
        body.previousScene && body.tweakInstruction
          ? `\n\nThey previously received this scene:\n"${body.previousScene}"\n\nThey asked for this change: "${body.tweakInstruction}". Honor it while keeping what worked.`
          : '';
      prompt = `Someone described this dream:\n\n"${body.dreamText}"\n\nAnd shared these details:\n\n${answersBlock}${profileContext(body.profile)}${tweakBlock}\n\nReflect their dream back as a rich second-person, present-tense scene they can step into ("You are standing…"). Weave in their exact sensory and emotional details. 120–250 words. End by grounding them in the feeling of it being real.`;
      schema = SCENE_SCHEMA;
      break;
    }
    case 'affirmation': {
      if (!body.dreamText?.trim()) {
        return new Response('dreamText is required', { status: 400 });
      }
      prompt = `Someone's dream: "${body.dreamText}"${body.sceneText ? `\n\nTheir visualization scene: "${body.sceneText}"` : ''}${profileContext(body.profile)}\n\nWrite one affirmation for them to say aloud today: present tense, first person, 8–16 words, drawn from the specific texture of THEIR dream — never generic. It should feel true enough to say without flinching.`;
      schema = AFFIRMATION_SCHEMA;
      break;
    }
    case 'letter': {
      if (!body.dreamText?.trim()) {
        return new Response('dreamText is required', { status: 400 });
      }
      prompt = `Someone's dream: "${body.dreamText}"${body.sceneText ? `\n\nTheir visualization scene, which describes the dream as real: "${body.sceneText}"` : ''}${profileContext(body.profile)}\n\nWrite them a letter from their own future self — the version of them whose dream already came true. 120–200 words. First person. Speak of the dream in the past tense, with specific details from their scene. Warm, grounded, a little wry if it fits their tone. No promises about timing, no magic-sounding guarantees — just the felt reality of having arrived, and love for the person still walking. Sign it "— You, a little further down the path".`;
      schema = LETTER_SCHEMA;
      break;
    }
    case 'review': {
      if (!body.answer?.trim() || !body.activityTitle) {
        return new Response('activityTitle and answer are required', { status: 400 });
      }
      prompt = `Someone is doing the practice "${body.activityTitle}" (${body.activityDescription}).${body.dreamText ? `\n\nTheir dream: "${body.dreamText}"` : ''}\n\nThey wrote this about what they actually did today:\n\n"${body.answer}"\n\nAssess whether this reflects genuine, embodied engagement: something specific they really did, with real feeling in it. It does NOT need to be long — short but detailed and heartfelt passes. What does not pass: vague generalities ("I acted positive today"), going through the motions, keyboard mashing, copy-paste filler, or answers that dodge the practice entirely.\n\nIf it passes, affirm something specific and true from their words. If it doesn't, coach them warmly to try again: invite them to really go there — back into the moment, back into the feeling in their body — and describe what actually happened. Never shame them.`;
      schema = REVIEW_SCHEMA;
      break;
    }
    case 'act': {
      if (!body.dreamText?.trim()) {
        return new Response('dreamText is required', { status: 400 });
      }
      prompt = `Someone's dream: "${body.dreamText}"${body.sceneText ? `\n\nTheir visualization scene: "${body.sceneText}"` : ''}${profileContext(body.profile)}\n\nSuggest ONE concrete micro-action they can take today to act as if this specific dream is already real. It must be physical and doable within their ordinary day (no purchases required, nothing performative for others), drawn from the texture of THEIR dream. Under 25 words. Examples of the spirit: for a gallery dream, "Carry your camera today the way a working artist would." Never generic.`;
      schema = ACT_SCHEMA;
      break;
    }
    case 'reframe': {
      if (!body.doubtText?.trim()) {
        return new Response('doubtText is required', { status: 400 });
      }
      prompt = `Someone just composted this doubt about their dream:\n\n"${body.doubtText}"${body.dreamText ? `\n\nTheir dream: "${body.dreamText}"` : ''}${profileContext(body.profile)}\n\nIn this garden, doubts are never trash — they break down into nourishment. Write the single line of nourishment this doubt becomes: first person, present tense, 10-22 words. It should gently answer the doubt's real fear with something true and alive, without dismissing the feeling and without promising outcomes.`;
      schema = REFRAME_SCHEMA;
      break;
    }
    case 'nudge': {
      if (!body.dreamText?.trim()) {
        return new Response('dreamText is required', { status: 400 });
      }
      prompt = `Someone's dream: "${body.dreamText}"${body.sceneText ? `\n\nTheir visualization scene: "${body.sceneText}"` : ''}${profileContext(body.profile)}\n\nWrite today's tiny nudge for them: one noticing-prompt under 20 words, specific to this dream — something the version of them whose dream came true would notice, savor, or quietly do today. Concrete and warm, never a task list, never generic gratitude-speak.`;
      schema = NUDGE_SCHEMA;
      break;
    }
    case 'score': {
      if (!body.sceneText?.trim()) {
        return new Response('sceneText is required', { status: 400 });
      }
      prompt = `Score the vividness of this visualization scene:\n\n"${body.sceneText}"\n\nMeasure sensory richness (sight, sound, touch, smell) and emotional depth. Suggest the most impactful missing senses or feelings, if any.`;
      schema = SCORE_SCHEMA;
      break;
    }
    default:
      return new Response('Unknown action', { status: 400 });
  }

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      system: COACH_SYSTEM_PROMPT,
      output_config: { format: { type: 'json_schema', schema } },
      messages: [{ role: 'user', content: prompt }],
    });

    if (response.stop_reason === 'refusal') {
      return new Response(
        JSON.stringify({ error: 'coach_declined', message: 'Let’s try a different framing for this dream.' }),
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return new Response(JSON.stringify({ error: 'empty_response' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(textBlock.text, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('dream-coach error', err);
    return new Response(JSON.stringify({ error: 'coach_unavailable' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
