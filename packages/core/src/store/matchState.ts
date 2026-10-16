import { create } from 'zustand';
import { MatchState } from '../types';
import { defaultMatchState } from '../constants';

interface MatchStateStore {
  matchState: MatchState;
  setMatchState: (matchStateUpdates: Partial<MatchState>) => void;
}

export const useMatchStateStore = create<MatchStateStore>((set) => ({
  matchState: { ...defaultMatchState },
  setMatchState: (matchStateUpdates: Partial<MatchState>) =>
    set((state) => {
      const matchState = {
        ...state.matchState,
        ...matchStateUpdates,
      };
      window?.electronAPI?.updateMatchState(matchState);
      return { ...state, matchState };
    }),
}));
