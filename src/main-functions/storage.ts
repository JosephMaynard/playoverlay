import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import Store from 'electron-store';
import { AppSettings, CustomScreen, LiveMatch } from '../types';
import { defaultMatchSettings } from '../constants';
import {
  appSettingsSchema,
  matchSetingsSchema,
  MatchSettings,
} from '../zodSchemas';

// Builds made before the source-available release encrypted config.json with a
// build-time key. When LEGACY_STORE_KEY is provided at build time, an
// encrypted config found on disk is decrypted once and rewritten as plain
// JSON so existing users keep their settings. Builds without the key (the
// default) skip this; electron-store THROWS on an unreadable config (it does
// not reset to defaults), so an unparseable config.json is moved aside to
// config.json.bak — preserving the user's data for a keyed rescue — and the
// app starts with a fresh store instead of crash-looping before app.ready.
function createStorage(): Store {
  if (__LEGACY_STORE_KEY__) {
    try {
      const configPath = path.join(app.getPath('userData'), 'config.json');
      if (fs.existsSync(configPath)) {
        const firstCharacter = fs
          .readFileSync(configPath, 'utf8')
          .trimStart()[0];
        if (firstCharacter !== '{') {
          const encrypted = new Store({ encryptionKey: __LEGACY_STORE_KEY__ });
          const data = { ...encrypted.store };
          fs.unlinkSync(configPath);
          const plain = new Store();
          plain.store = data;
          console.log('Migrated legacy encrypted config to plain JSON');
          return plain;
        }
      }
    } catch (error) {
      console.error('Legacy config migration failed:', error);
    }
  }
  try {
    return new Store();
  } catch (error) {
    console.error(
      'config.json is unreadable; moving it aside and starting fresh:',
      error
    );
    try {
      const configPath = path.join(app.getPath('userData'), 'config.json');
      if (fs.existsSync(configPath)) {
        fs.renameSync(configPath, `${configPath}.bak`);
      }
    } catch (renameError) {
      console.error('Failed to move aside unreadable config.json:', renameError);
    }
    // If the rename succeeded config.json is gone and this is a clean start;
    // if it failed, clearInvalidConfig lets the store reset rather than
    // throwing again and crash-looping the app.
    return new Store({ clearInvalidConfig: true });
  }
}

const storage = createStorage();

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
    // Validate before anything (e.g. globalShortcut.register) consumes the
    // stored data; individually corrupt fields degrade to their defaults,
    // and a wholly corrupt value behaves like no stored settings at all.
    const verified = appSettingsSchema.safeParse(appSettings);
    if (verified.success) {
      return verified.data;
    }
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
