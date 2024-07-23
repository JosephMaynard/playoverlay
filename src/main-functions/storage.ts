import Store from 'electron-store';
import isDemoMode from './isDemoMode';
import { AppSettings, TeamSettingsInterface, CustomScreen } from '../types';

// @ts-ignore
const API_AUTH_KEY = import.meta.env.VITE_API_AUTH_KEY;

const storage = new Store({
  encryptionKey: API_AUTH_KEY,
});

export const MAIN_WINDOW = 'MAIN_WINDOW';
export const DISPLAY_WINDOW = 'DISPLAY_WINDOW';

const APP_SETTINGS = 'APP_SETTINGS';
const TEAM_SETTINGS = 'TEAM_SETTINGS';
const LICENCE_KEY = 'LICENCE_KEY';
const RENEWAL_JWT = 'RENEWAL_JWT';
const CUSTOM_SCREENS = 'CUSTOM_SCREENS';

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

export function setTeamSettings(teamSettings: TeamSettingsInterface) {
  storage.set(TEAM_SETTINGS, teamSettings);
}

export function getTeamSettings() {
  let teamSettings = storage.get(TEAM_SETTINGS) as TeamSettingsInterface;
  if (teamSettings) {
    if (isDemoMode() === true) {
      teamSettings = {
        ...teamSettings,
        awayTeamNameAbbreviated: 'DEMO',
        awayTeamNameFull: 'PlayOverlay Demo',
        awayTeamBackgroundColour: '#0000CC',
        awayTeamTextColour: '#FFFFFF',
      };
    }
    return teamSettings;
  }
}

export function removeDemoModeTeamSettings() {
  let teamSettings = storage.get(TEAM_SETTINGS) as TeamSettingsInterface;
  setTeamSettings({
    ...teamSettings,
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
