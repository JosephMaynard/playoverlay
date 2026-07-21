import {
  AppSettings,
  CustomScreen,
  LiveMatch,
  Scores,
  Time,
  MatchState,
  Display,
  RemoteControlStatus,
} from '../types';
import { MatchSettings, UpdateStatus } from '../zodSchemas';
import { ExportDiagnosticsResult } from '../main-functions/diagnostics';

declare global {
  interface Window {
    electronAPI: {
      updateScores: (scores: Scores) => void;
      onScoreUpdated: (callback: (scores: Scores) => void) => () => void;
      updateTime: (time: Time) => void;
      onTimeUpdated: (callback: (time: Time) => void) => () => void;
      updateMatchSettings: (settings: MatchSettings) => void;
      onMatchSettingsUpdated: (
        callback: (settings: MatchSettings) => void
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
      getFullscreenStatus: () => Promise<boolean>;
      getVersion: () => string;
      getAppSettings: () => Promise<AppSettings | undefined>;
      getBrowserSourceStatus: () => Promise<{
        running: boolean;
        port: number;
        error?: string;
      }>;
      getMatchSettings: () => Promise<MatchSettings | undefined>;
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
      resolveLiveMatch: () => void;
      openUrlInBrowser: (url: string) => void;
      onNextMatchPhase: (callback: () => void) => () => void;
      onHomeTeamScored: (callback: () => void) => () => void;
      onAwayTeamScored: (callback: () => void) => () => void;
      onHomeTeamUnscored: (callback: () => void) => () => void;
      onAwayTeamUnscored: (callback: () => void) => () => void;
      onToggleClock: (callback: () => void) => () => void;
      onSetDisplayScreen: (callback: (screen: string) => void) => () => void;
      getRemoteControlStatus: () => Promise<RemoteControlStatus>;
      onRemoteControlStatus: (
        callback: (status: RemoteControlStatus) => void
      ) => () => void;
      enableKeyboardShortcuts: () => void;
      disableKeyboardShortcuts: () => void;
      displayReady: () => void;
      logMatchEvent: (action: string, source?: string) => void;
      exportDiagnostics: () => Promise<ExportDiagnosticsResult>;
    };
  }
}
