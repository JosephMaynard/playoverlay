import { deleteLicenceKey } from 'src/main-functions/storage';
import {
  AppSettings,
  Scores,
  TeamSettingsInterface,
  Time,
  MatchState,
  Display,
  SystemInfo,
} from '../types';
import { LicenceKeyData } from '../main-functions/validateJWT';

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
      updateMatchState: (settings: MatchState) => void;
      onMatchStateUpdated: (callback: (settings: MatchState) => void) => void;
      toggleFullscreen: () => void;
      getFullscreenStatus: () => boolean;
      startPowerSaveBlocker: () => void;
      stopPowerSaveBlocker: () => void;
      getPowerSaveBlockerStatus: () => boolean;
      getVersion: () => string;
      getAppSettings: () => Promise<AppSettings | undefined>;
      getTeamSettings: () => Promise<TeamSettingsInterface | undefined>;
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
      getCustomScreens: () => Promise<CustomScreen[]>;
      setCustomScreens: (
        customScreens: CustomScreen[]
      ) => Promise<{ success: boolean; error?: string }>;
      onCustomScreensUpdated: (
        callback: (customScreens: CustomScreen[]) => void
      ) => () => void;
      getDemoMode: () => boolean;
      getSystemInfo: () => Promise<SystemInfo>;
      getEncodedSystemInfo: () => Promise<string>;
      getEncodedSystemInfoActivationWindow: () => Promise<string>;
      saveLicenceKey: (
        licenceKey: string
      ) => Promise<{ success: boolean; error?: string }>;
      saveLicenceKeyActivationWindow: (
        licenceKey: string
      ) => Promise<{ success: boolean; error?: string }>;
      deleteLicenceKey: () => void;
      getLicencedData: () => Promise<LicenceKeyData | undefined>;
      runInDemoMode: () => void;
      openActivationLinkActivationWindow: () => void;
      openActivationLink: () => void;
      openBuyNowLink: () => void;
      renewLicenceKey: () => Promise<{
        success: boolean;
        token?: string;
        error?: string;
      }>;
      deleteLicenceKey: (
        encodedSystemInfo: string
      ) => Promise<{ success: boolean; error?: string }>;
      checkForUpdates: () => Promise<{
        success: boolean;
        updates?: any;
        error?: string;
      }>;
      checkInternetConnection: () => Promise<{
        success: boolean;
        isConnected?: boolean;
        error?: string;
      }>;
      openUrlInBrowser: (url: string) => void;
      onNextMatchPhase: (callback: () => void) => () => void;
      onHomeTeamScored: (callback: () => void) => () => void;
      onAwayTeamScored: (callback: () => void) => () => void;
      enableKeyboardShortcuts: () => void;
      disableKeyboardShortcuts: () => void;
    };
  }
}
