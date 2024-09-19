import { create } from 'zustand';

import { TeamSettingsInterface } from '../zodSchemas';
import { defaultTeamSettings } from '../constants';

interface TeamSettingsStore {
  teamSettings: TeamSettingsInterface;
  setTeamSettings: (scoreUpdates: Partial<TeamSettingsInterface>) => void;
}

export const useTeamSettingsStore = create<TeamSettingsStore>((set) => ({
  teamSettings: { ...defaultTeamSettings },
  setTeamSettings: (teamSettingsUpdates: Partial<TeamSettingsInterface>) =>
    set((state) => {
      const teamSettings = { ...state.teamSettings, ...teamSettingsUpdates };
      window?.electronAPI?.updateTeamSettings(teamSettings);
      return {
        ...state,
        teamSettings,
      };
    }),
}));
