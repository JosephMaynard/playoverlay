import { create } from 'zustand';

import { TeamSettingsInterface } from '../zodSchemas';
import { defaultTeamSettings } from '../constants';

interface TeamSettingsInterfaceStore {
  teamSettings: TeamSettingsInterface;
  setTeamSettings: (scoreUpdates: Partial<TeamSettingsInterface>) => void;
}

export const useTeamSettingsStore = create<TeamSettingsInterfaceStore>(
  (set) => ({
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
  })
);
