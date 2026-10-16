import { create } from 'zustand';

import { MatchSettings } from '../zodSchemas';
import { defaultMatchSettings } from '../constants';

interface MatchSettingsStore {
  matchSettings: MatchSettings;
  setMatchSettings: (matchSettingsUpdates: Partial<MatchSettings>) => void;
  // Replace the whole settings object. setMatchSettings merges, which is
  // right for an input edit but wrong for restoring a fixture: an optional
  // field the restored fixture omits (a logo, venue, kick-off time) would
  // otherwise survive from whatever was loaded before.
  replaceMatchSettings: (matchSettings: MatchSettings) => void;
}

export const useMatchSettingsStore = create<MatchSettingsStore>((set) => ({
  matchSettings: { ...defaultMatchSettings },
  setMatchSettings: (matchSettingsUpdates: Partial<MatchSettings>) =>
    set((state) => {
      const matchSettings = { ...state.matchSettings, ...matchSettingsUpdates };
      window?.electronAPI?.updateMatchSettings(matchSettings);
      return {
        ...state,
        matchSettings,
      };
    }),
  replaceMatchSettings: (matchSettings: MatchSettings) =>
    set((state) => {
      window?.electronAPI?.updateMatchSettings(matchSettings);
      return {
        ...state,
        matchSettings,
      };
    }),
}));
