import { supabase } from '@/lib/supabase/client';
import { queryClient } from '@/lib/query-client';
import { fetchProfile, profileQueryKey } from '@/features/profile/api';
import type { DreamRow, UserProfileRow } from '@/lib/supabase/database.types';

export interface CoachQuestions {
  questions: string[];
}

export interface CoachScene {
  sceneText: string;
}

export interface CoachScore {
  score: number;
  missing: string[];
  encouragement: string;
}

export interface QAPair {
  question: string;
  answer: string;
}

async function invokeCoach<T>(body: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke('dream-coach', { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.message ?? 'The coach is unavailable right now.');
  return data as T;
}

/** Quiz answers shape the coach's questions and scene — see dream-coach fn. */
async function coachProfileContext() {
  const profile = await queryClient.ensureQueryData<UserProfileRow | null>({
    queryKey: profileQueryKey,
    queryFn: fetchProfile,
  });
  if (!profile) return undefined;
  return {
    displayName: profile.display_name ?? undefined,
    experienceLevel: profile.experience_level ?? undefined,
    tonePreference: profile.tone_preference ?? undefined,
    firstCategory: profile.first_manifestation_category ?? undefined,
  };
}

export const fetchDeepeningQuestions = async (dreamText: string) =>
  invokeCoach<CoachQuestions>({
    action: 'questions',
    dreamText,
    profile: await coachProfileContext(),
  });

export const generateScene = async (
  dreamText: string,
  answers: QAPair[],
  tweak?: { previousScene: string; tweakInstruction: string }
) =>
  invokeCoach<CoachScene>({
    action: 'scene',
    dreamText,
    answers,
    profile: await coachProfileContext(),
    ...tweak,
  });

export const scoreScene = (sceneText: string) =>
  invokeCoach<CoachScore>({ action: 'score', sceneText });

export interface CoachAffirmation {
  affirmation: string;
}

export interface CoachLetter {
  letterText: string;
}

/** One personal, present-tense affirmation drawn from the dream. */
export const fetchAffirmation = async (dreamText: string, sceneText?: string) =>
  invokeCoach<CoachAffirmation>({
    action: 'affirmation',
    dreamText,
    sceneText,
    profile: await coachProfileContext(),
  });

/** A letter from the user's future self, written from their own scene. */
export const fetchFutureLetter = async (dreamText: string, sceneText?: string) =>
  invokeCoach<CoachLetter>({
    action: 'letter',
    dreamText,
    sceneText,
    profile: await coachProfileContext(),
  });

export interface CoachReview {
  passed: boolean;
  feedback: string;
}

/** Coach reviews a practice reflection for genuine, embodied engagement. */
export const reviewReflection = (params: {
  activityTitle: string;
  activityDescription: string;
  answer: string;
  dreamText?: string;
}) => invokeCoach<CoachReview>({ action: 'review', ...params });

export async function fetchDreams(): Promise<DreamRow[]> {
  const { data, error } = await supabase
    .from('dreams')
    .select('*')
    .is('harvested_at', null)
    .order('planted_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function plantDream(params: {
  title: string;
  /** The full original wish, kept for coach context. */
  wishText: string;
  sceneText: string;
  vividnessScore: number;
  /** Optional note, sealed until harvest day. */
  capsuleText?: string;
}): Promise<DreamRow> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { count } = await supabase
    .from('dreams')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const { data, error } = await supabase
    .from('dreams')
    .insert({
      user_id: user.id,
      title: params.title,
      scene_text: params.sceneText || null,
      wish_text: params.wishText,
      vividness_score: params.vividnessScore,
      capsule_text: params.capsuleText ?? null,
      state: 'seed',
      health: 'thriving',
      is_starter_dream: (count ?? 0) === 0,
      planted_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export interface CoachActIdea {
  actionIdea: string;
}

/** A concrete act-as-if micro-action for this specific dream, fresh daily. */
export async function fetchActIdea(dreamText: string, sceneText?: string): Promise<CoachActIdea> {
  return invokeCoach<CoachActIdea>({
    action: 'act',
    dreamText,
    sceneText,
    profile: await coachProfileContext(),
  });
}

export interface CoachReframe {
  reframe: string;
}

/** What a composted doubt breaks down into. */
export async function fetchDoubtReframe(
  doubtText: string,
  dreamText?: string
): Promise<CoachReframe> {
  return invokeCoach<CoachReframe>({
    action: 'reframe',
    doubtText,
    dreamText,
    profile: await coachProfileContext(),
  });
}

export interface CoachNudge {
  nudge: string;
}

/** Today's tiny noticing-prompt for this dream. */
export async function fetchDailyNudge(
  dreamText: string,
  sceneText?: string
): Promise<CoachNudge> {
  return invokeCoach<CoachNudge>({
    action: 'nudge',
    dreamText,
    sceneText,
    profile: await coachProfileContext(),
  });
}

export interface CoachShortTitle {
  shortTitle: string;
}

/** A 2-5 word name for the wish — labels the plant in the garden. */
export async function fetchShortTitle(dreamText: string): Promise<CoachShortTitle> {
  return invokeCoach<CoachShortTitle>({ action: 'title', dreamText });
}

/** Deepen-later: attach a freshly imagined scene to an already-planted dream. */
export async function updateDreamScene(params: {
  dreamId: string;
  sceneText: string;
  vividnessScore: number;
}): Promise<void> {
  const { error } = await supabase
    .from('dreams')
    .update({
      scene_text: params.sceneText,
      vividness_score: params.vividnessScore,
      last_interacted_at: new Date().toISOString(),
    })
    .eq('id', params.dreamId);
  if (error) throw error;
}

/**
 * Release a dream with thanks. Its energy feeds the surviving garden (a
 * small one-time boost per remaining dream), then the dream and everything
 * under it is gone for good. Only ever user-initiated — the app never
 * suggests releasing.
 */
export async function releaseDream(params: { dreamId: string }): Promise<{ survivors: number }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data: survivors } = await supabase
    .from('dreams')
    .select('id')
    .neq('id', params.dreamId)
    .is('harvested_at', null);

  if (survivors?.length) {
    await supabase.from('sessions').insert(
      survivors.map((d) => ({
        user_id: user.id,
        dream_id: d.id,
        type: 'feed' as const,
        activity_id: 'release_gift',
        health_boost: 5,
      }))
    );
    await supabase
      .from('dreams')
      .update({ last_interacted_at: new Date().toISOString() })
      .in(
        'id',
        survivors.map((d) => d.id)
      );
  }

  const { error } = await supabase.from('dreams').delete().eq('id', params.dreamId);
  if (error) throw error;
  return { survivors: survivors?.length ?? 0 };
}
