import { create } from 'zustand';

import { Penalty, Scores } from '../types';

interface ScoresStore {
  scores: Scores;
  setHomeTeam: (homeTeam: number) => void;
  setAwayTeam: (awayTeam: number) => void;
  setPenalties: (penalties: Penalty[]) => void;
  updateScores: (scoreUpdates: Partial<Scores>) => void;
}

export const useScoresStore = create<ScoresStore>((set) => ({
  scores: {
    homeTeam: 0,
    awayTeam: 0,
    penalties: [],
  },
  setHomeTeam: (homeTeam: number) =>
    set((state) => ({ ...state, scores: { ...state.scores, homeTeam } })),
  setAwayTeam: (awayTeam: number) =>
    set((state) => ({ ...state, scores: { ...state.scores, awayTeam } })),
  setPenalties: (penalties: Penalty[]) =>
    set((state) => ({ ...state, scores: { ...state.scores, penalties } })),
  updateScores: (scoreUpdates: Partial<Scores>) =>
    set((state) => ({
      ...state,
      scores: { ...state.scores, ...scoreUpdates },
    })),
}));
