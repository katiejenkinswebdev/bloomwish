import { create } from 'zustand';

import type { QAPair } from '@/features/dreams/api';

/**
 * In-progress dream creation state, shared across the create-dream screens
 * (describe → questions → scene → planting). Reset when the flow completes
 * or is abandoned.
 */
interface DreamDraftState {
  /** Set when deepening an existing fast-planted dream instead of creating. */
  deepenDreamId: string | null;
  dreamText: string;
  questions: string[];
  answers: QAPair[];
  sceneText: string;
  vividnessScore: number | null;
  /** Answer text handed to the questions screen when stepping back to edit. */
  editingAnswerText: string;

  setDreamText: (text: string) => void;
  setQuestions: (questions: string[]) => void;
  addAnswer: (pair: QAPair) => void;
  /** Step back one question: removes the last answer and stages it for editing. */
  popAnswerForEditing: () => void;
  consumeEditingAnswerText: () => string;
  setScene: (sceneText: string) => void;
  setScore: (score: number) => void;
  setDeepenDreamId: (dreamId: string | null) => void;
  reset: () => void;
}

const initialState = {
  deepenDreamId: null as string | null,
  dreamText: '',
  questions: [] as string[],
  answers: [] as QAPair[],
  sceneText: '',
  vividnessScore: null as number | null,
  editingAnswerText: '',
};

export const useDreamDraftStore = create<DreamDraftState>((set, get) => ({
  ...initialState,
  setDreamText: (dreamText) => set({ dreamText }),
  setDeepenDreamId: (deepenDreamId: string | null) => set({ deepenDreamId }),
  setQuestions: (questions) => set({ questions, answers: [] }),
  addAnswer: (pair) => set((s) => ({ answers: [...s.answers, pair] })),
  popAnswerForEditing: () =>
    set((s) => {
      const last = s.answers[s.answers.length - 1];
      if (!last) return s;
      return { answers: s.answers.slice(0, -1), editingAnswerText: last.answer };
    }),
  consumeEditingAnswerText: () => {
    const text = get().editingAnswerText;
    if (text) set({ editingAnswerText: '' });
    return text;
  },
  setScene: (sceneText) => set({ sceneText }),
  setScore: (vividnessScore) => set({ vividnessScore }),
  reset: () => set(initialState),
}));
