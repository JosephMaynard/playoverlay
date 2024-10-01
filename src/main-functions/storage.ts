import Store from 'electron-store';
import isDemoMode from './isDemoMode';
import { AppSettings, CustomScreen } from '../types';
import { defaultMatchSettings } from '../constants';
import { matchSetingsSchema, MatchSettings } from '../zodSchemas';

// @ts-ignore
const API_AUTH_KEY = import.meta.env.VITE_API_AUTH_KEY;

const storage = new Store({
  encryptionKey: API_AUTH_KEY,
});

export const MAIN_WINDOW = 'MAIN_WINDOW';
export const DISPLAY_WINDOW = 'DISPLAY_WINDOW';

const APP_SETTINGS = 'APP_SETTINGS';
const MATCH_SETTINGS = 'MATCH_SETTINGS';
const SAVED_MATCH_SETTINGS = 'SAVED_MATCH_SETTINGS';
const TEAM_SETTINGS = 'TEAM_SETTINGS'; // Legacy now renamed to MATCH_SETTINGS
const LICENCE_KEY = 'LICENCE_KEY';
const RENEWAL_JWT = 'RENEWAL_JWT';
const CUSTOM_SCREENS = 'CUSTOM_SCREENS';
const LOGOS = 'LOGOS';

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
  let matchSettings = getVerifiedMatchSettings();
  if (matchSettings) {
    if (isDemoMode() === true) {
      matchSettings = {
        ...matchSettings,
        awayTeamNameAbbreviated: 'DEMO',
        awayTeamNameFull: 'PlayOverlay Demo',
        awayTeamBackgroundColour: '#0000CC',
        awayTeamTextColour: '#FFFFFF',
      };
    }
    return matchSettings;
  }
}

export function removeDemoModeMatchSettings() {
  let matchSettings = getVerifiedMatchSettings();
  setMatchSettings({
    ...matchSettings,
    awayTeamNameFull: 'Away Team',
    awayTeamNameAbbreviated: 'AWA',
    awayTeamTextColour: '#ffffff',
    awayTeamBackgroundColour: '#0000cc',
  });
}

export function getLicenceKey() {
  const licenceKey = storage.get(LICENCE_KEY);
  if (licenceKey) {
    return licenceKey;
  }
}

export function setLicenceKey(licenceKey: string) {
  storage.set(LICENCE_KEY, licenceKey);
}

export function getRenewalJWT() {
  const RenewalJWT = storage.get(RENEWAL_JWT);
  if (RenewalJWT) {
    return RenewalJWT;
  }
}

export function setRenewalJWT(RenewalJWT: string) {
  storage.set(RENEWAL_JWT, RenewalJWT);
}

export function deleteLicenceKey() {
  storage.delete(LICENCE_KEY);
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
