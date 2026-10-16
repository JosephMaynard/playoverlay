import { defaultAppSettings } from '../constants';
import { AppSettings } from '../types';
import { create } from 'zustand';

interface AppSettingsStore {
  appSettings: AppSettings;
  // False until the persisted settings have been loaded from disk. Used to
  // hold back the first-run language picker so it doesn't flash on every
  // launch for a returning user whose language only arrives async over IPC.
  settingsLoaded: boolean;
  setAppSettings: (appSettingsUppdates: Partial<AppSettings>) => void;
  markSettingsLoaded: () => void;
}

export const useAppSettingsStore = create<AppSettingsStore>((set) => ({
  appSettings: { ...defaultAppSettings },
  settingsLoaded: false,
  setAppSettings: (appSettingsUppdates: Partial<AppSettings>) =>
    set((state) => {
      const appSettings = {
        ...state.appSettings,
        ...appSettingsUppdates,
      };
      window?.electronAPI?.updateAppSettings(appSettings);
      return {
        ...state,
        appSettings,
      };
    }),
  markSettingsLoaded: () => set((state) => ({ ...state, settingsLoaded: true })),
}));
