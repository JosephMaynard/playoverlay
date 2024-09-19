import { create } from 'zustand';

import { Scores } from '../types';

interface ScoresStore {
  scores: Scores;
  setScores: (scoreUpdates: Partial<Scores>) => void;
}

export const useScoresStore = create<ScoresStore>((set) => ({
  scores: {
    homeTeam: 0,
    awayTeam: 0,
    penalties: [],
  },
  setScores: (scoreUpdates: Partial<Scores>) =>
    set((state) => {
      const scores = { ...state.scores, ...scoreUpdates };
      window?.electronAPI?.updateScores(scores);
      return {
        ...state,
        scores,
      };
    }),
}));
