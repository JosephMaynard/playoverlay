import { Scores, Settings, Time } from '../types';

declare global {
  interface Window {
    electronAPI: {
      updateScores: (scores: Scores) => void;
      onScoreUpdated: (callback: (scores: Scores) => void) => void;
      updateTime: (time: Time) => void;
      onTimeUpdated: (callback: (time: Time) => void) => void;
      updateSettings: (settings: Settings) => void;
      onSettingsUpdated: (callback: (settings: Settings) => void) => void;
      toggleFullscreen: () => void;
      getFullscreenStatus: () => boolean;
      startPowerSaveBlocker: () => void;
      stopPowerSaveBlocker: () => void;
      getPowerSaveBlockerStatus: () => boolean;
      getVersion: () => string;
    };
  }
}
