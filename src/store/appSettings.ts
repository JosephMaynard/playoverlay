import { defaultAppSettings } from '../constants';
import { AppSettings } from '../types';
import { create } from 'zustand';

interface AppSettingsStore {
  appSettings: AppSettings;
  setAppSettings: (appSettingsUppdates: Partial<AppSettings>) => void;
}

export const useAppSettingsStore = create<AppSettingsStore>((set) => ({
  appSettings: { ...defaultAppSettings },
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
}));
