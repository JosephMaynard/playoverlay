import Store from 'electron-store';
import { AppSettings, CustomScreen, LiveMatch } from '../types';
import { defaultMatchSettings } from '../constants';
import { matchSetingsSchema, MatchSettings } from '../zodSchemas';

const storage = new Store();

export const MAIN_WINDOW = 'MAIN_WINDOW';
export const DISPLAY_WINDOW = 'DISPLAY_WINDOW';

const APP_SETTINGS = 'APP_SETTINGS';
const MATCH_SETTINGS = 'MATCH_SETTINGS';
const SAVED_MATCH_SETTINGS = 'SAVED_MATCH_SETTINGS';
const TEAM_SETTINGS = 'TEAM_SETTINGS'; // Legacy now renamed to MATCH_SETTINGS
const CUSTOM_SCREENS = 'CUSTOM_SCREENS';
const LIVE_MATCH = 'LIVE_MATCH';

export type WindowName = typeof MAIN_WINDOW | typeof DISPLAY_WINDOW;

export type WindowSize = [number, number];

const defaultBounds: WindowSize = [800, 600];

export function getWindowSize(windowName: WindowName) {
  const key = `${windowName}_SIZE`;
  const size = storage.get(key) as WindowSize | undefined;
  if (size) {
    return size;
  } else {
    storage.set(key, defaultBounds);
    return defaultBounds;
  }
}

export function setWindowSize(windowName: WindowName, size: number[]) {
  const key = `${windowName}_SIZE`;
  storage.set(key, size);
}

export function getWindowPosition(windowName: WindowName) {
  const key = `${windowName}_POSITION`;
  const size = storage.get(key) as WindowSize | undefined;
  if (size) {
    return size;
  }
}

export function setWindowPosition(windowName: WindowName, position: number[]) {
  const key = `${windowName}_POSITION`;
  storage.set(key, position);
}

export function setAppSettings(appSettings: AppSettings) {
  storage.set(APP_SETTINGS, appSettings);
}

export function getAppSettings() {
  const appSettings = storage.get(APP_SETTINGS);
  if (appSettings) {
    return appSettings;
  }
}

export function setMatchSettings(matchSettings: MatchSettings) {
  storage.set(MATCH_SETTINGS, matchSettings);
}

function getVerifiedMatchSettings(): MatchSettings {
  const matchSettings = storage.get(MATCH_SETTINGS, defaultMatchSettings);

  // Handle Legacy TEAM_SETTINGS
  const legacyMatchSetting = storage.get(TEAM_SETTINGS);
  const verifiedMatchSettings = legacyMatchSetting
    ? matchSetingsSchema.safeParse(legacyMatchSetting)
    : matchSetingsSchema.safeParse(matchSettings);

  if (legacyMatchSetting) {
    storage.delete(TEAM_SETTINGS);
  }

  if (verifiedMatchSettings.success === true) {
    // Always include spread defaultMatchSettings to cover datashape updates
    return { ...defaultMatchSettings, ...verifiedMatchSettings.data };
  }

  // Fallback to default data if data corrupted
  return defaultMatchSettings;
}

export function getMatchSettings() {
  return getVerifiedMatchSettings();
}

export function getCustomScreens() {
  const customScreens = storage.get(CUSTOM_SCREENS);
  if (customScreens) {
    return customScreens;
  } else {
    return [];
  }
}

export function setCustomScreens(customScreens: CustomScreen[]) {
  storage.set(CUSTOM_SCREENS, customScreens);
}

export function getSavedMatchSettings() {
  const savedMatchSettings = storage.get(SAVED_MATCH_SETTINGS);
  if (savedMatchSettings) {
    return savedMatchSettings;
  } else {
    return [];
  }
}

export function setSavedMatchSettings(savedMatchSettings: MatchSettings[]) {
  storage.set(SAVED_MATCH_SETTINGS, savedMatchSettings);
}

export function setLiveMatch(liveMatch: LiveMatch) {
  storage.set(LIVE_MATCH, liveMatch);
}

export function getLiveMatch() {
  return storage.get(LIVE_MATCH) as LiveMatch | undefined;
}
