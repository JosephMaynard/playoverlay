import {
  AppSettings,
  LiveMatch,
  Scores,
  TeamSettingsInterface,
  Time,
  MatchState,
  Display,
} from '../types';
import { MatchSettings, UpdateStatus } from '../zodSchemas';

declare global {
  interface Window {
    electronAPI: {
      updateScores: (scores: Scores) => void;
      onScoreUpdated: (callback: (scores: Scores) => void) => () => void;
      updateTime: (time: Time) => void;
      onTimeUpdated: (callback: (time: Time) => void) => () => void;
      updateMatchSettings: (settings: TeamSettingsInterface) => void;
      onMatchSettingsUpdated: (
        callback: (settings: TeamSettingsInterface) => void
      ) => () => void;
      updateAppSettings: (settings: AppSettings) => void;
      onAppSettingsUpdated: (
        callback: (settings: AppSettings) => void
      ) => () => void;
      updateMatchState: (settings: MatchState) => void;
      onMatchStateUpdated: (
        callback: (settings: MatchState) => void
      ) => () => void;
      toggleFullscreen: () => void;
      getFullscreenStatus: () => boolean;
      startPowerSaveBlocker: () => void;
      stopPowerSaveBlocker: () => void;
      getPowerSaveBlockerStatus: () => boolean;
      getVersion: () => string;
      getAppSettings: () => Promise<AppSettings | undefined>;
      getBrowserSourceStatus: () => Promise<{
        running: boolean;
        port: number;
        error?: string;
      }>;
      getMatchSettings: () => Promise<TeamSettingsInterface | undefined>;
      moveWindowToScreen: (screenId: number) => Promise<void>;
      onDisplayChange: (callback: (displays: Display[]) => void) => () => void;
      getScreenInfo: () => void;
      onScreenInfo: (callback: (displays: Display[]) => void) => () => void;
      resetWindows: () => void;
      lockWindows: () => void;
      unlockWindows: () => void;
      getLockStatus: () => void;
      onLockStatus: (callback: (lockStatus: boolean) => void) => () => void;
      uploadImage: (file: File, title: string) => Promise<string | null>;
      deleteImage: (filePath: string) => Promise<boolean>;
      uploadLogo: (
        file: File
      ) => Promise<{ filePath: string; url: string } | null>;
      getCustomScreens: () => Promise<CustomScreen[]>;
      setCustomScreens: (
        customScreens: CustomScreen[]
      ) => Promise<{ success: boolean; error?: string }>;
      getSavedMatchSettings: () => Promise<MatchSettings[]>;
      setSavedMatchSettings: (
        matchSettings: MatchSettings[]
      ) => Promise<{ success: boolean; error?: string }>;
      onCustomScreensUpdated: (
        callback: (customScreens: CustomScreen[]) => void
      ) => () => void;
      checkForUpdates: () => Promise<{
        success: boolean;
        updates?: UpdateStatus;
        error?: string;
      }>;
      getLiveMatch: () => Promise<LiveMatch | undefined>;
      openUrlInBrowser: (url: string) => void;
      onNextMatchPhase: (callback: () => void) => () => void;
      onHomeTeamScored: (callback: () => void) => () => void;
      onAwayTeamScored: (callback: () => void) => () => void;
      enableKeyboardShortcuts: () => void;
      disableKeyboardShortcuts: () => void;
      displayReady: () => void;
    };
  }
}
