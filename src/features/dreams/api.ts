import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';

type DreamRow = Database['public']['Tables']['dreams']['Row'];

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

export const fetchDeepeningQuestions = (dreamText: string) =>
  invokeCoach<CoachQuestions>({ action: 'questions', dreamText });

export const generateScene = (
  dreamText: string,
  answers: QAPair[],
  tweak?: { previousScene: string; tweakInstruction: string }
) => invokeCoach<CoachScene>({ action: 'scene', dreamText, answers, ...tweak });

export const scoreScene = (sceneText: string) =>
  invokeCoach<CoachScore>({ action: 'score', sceneText });

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
  sceneText: string;
  vividnessScore: number;
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
      scene_text: params.sceneText,
      vividness_score: params.vividnessScore,
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
