import { create } from 'zustand';

import type { QAPair } from '@/features/dreams/api';

/**
 * In-progress dream creation state, shared across the create-dream screens
 * (describe → questions → scene → planting). Reset when the flow completes
 * or is abandoned.
 */
interface DreamDraftState {
  dreamText: string;
  questions: string[];
  answers: QAPair[];
  sceneText: string;
  vividnessScore: number | null;

  setDreamText: (text: string) => void;
  setQuestions: (questions: string[]) => void;
  addAnswer: (pair: QAPair) => void;
  setScene: (sceneText: string) => void;
  setScore: (score: number) => void;
  reset: () => void;
}

const initialState = {
  dreamText: '',
  questions: [] as string[],
  answers: [] as QAPair[],
  sceneText: '',
  vividnessScore: null as number | null,
};

export const useDreamDraftStore = create<DreamDraftState>((set) => ({
  ...initialState,
  setDreamText: (dreamText) => set({ dreamText }),
  setQuestions: (questions) => set({ questions, answers: [] }),
  addAnswer: (pair) => set((s) => ({ answers: [...s.answers, pair] })),
  setScene: (sceneText) => set({ sceneText }),
  setScore: (vividnessScore) => set({ vividnessScore }),
  reset: () => set(initialState),
}));
