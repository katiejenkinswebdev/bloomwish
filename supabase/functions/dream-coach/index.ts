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

interface UserProfileContext {
  displayName?: string;
  experienceLevel?: string;
  tonePreference?: string;
  firstCategory?: string;
}

type CoachRequest = QuestionsRequest | SceneRequest | ScoreRequest;

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
          : { score: 78, missing: [], encouragement: 'A demo score — but your dream is lovely.' };
    return new Response(JSON.stringify(demo), {
      headers: { 'Content-Type': 'application/json' },
    });
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
