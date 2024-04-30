import {
  AppSettings,
  Scores,
  TeamSettingsInterface,
  Time,
  MatchSettings,
} from '../types';

declare global {
  interface Window {
    electronAPI: {
      updateScores: (scores: Scores) => void;
      onScoreUpdated: (callback: (scores: Scores) => void) => void;
      updateTime: (time: Time) => void;
      onTimeUpdated: (callback: (time: Time) => void) => void;
      updateTeamSettings: (settings: TeamSettingsInterface) => void;
      onTeamSettingsUpdated: (
        callback: (settings: TeamSettingsInterface) => void
      ) => void;
      updateAppSettings: (settings: AppSettings) => void;
      onAppSettingsUpdated: (callback: (settings: AppSettings) => void) => void;
      updateMatchSettings: (settings: MatchSettings) => void;
      onMatchSettingsUpdated: (
        callback: (settings: MatchSettings) => void
      ) => void;
      toggleFullscreen: () => void;
      getFullscreenStatus: () => boolean;
      startPowerSaveBlocker: () => void;
      stopPowerSaveBlocker: () => void;
      getPowerSaveBlockerStatus: () => boolean;
      getVersion: () => string;
      getAppSettings: () => Promise<AppSettings | undefined>;
      getTeamSettings: () => Promise<TeamSettingsInterface | undefined>;
    };
  }
}
