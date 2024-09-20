import { create } from 'zustand';
import { MatchSettings } from '../types';
import { defaultMatchSettings } from '../constants';

interface MatchSettingsStore {
  matchSettings: MatchSettings;
  setMatchSettings: (matchSettingsUpdates: Partial<MatchSettings>) => void;
}

export const useMatchSettingsStore = create<MatchSettingsStore>((set) => ({
  matchSettings: { ...defaultMatchSettings },
  setMatchSettings: (matchSettingsUpdates: Partial<MatchSettings>) =>
    set((state) => {
      const matchSettings = {
        ...state.matchSettings,
        ...matchSettingsUpdates,
      };
      window?.electronAPI?.updateMatchSettings(matchSettings);
      return { ...state, matchSettings };
    }),
}));
