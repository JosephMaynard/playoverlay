import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import Store from 'electron-store';
import { AppSettings, CustomScreen, LiveMatch } from '../types';
import { defaultMatchSettings } from '../constants';
import { logError } from './logger';
import {
  appSettingsSchema,
  customScreenListSchema,
  liveMatchSchema,
  matchSetingsSchema,
  matchSettingsListSchema,
  MatchSettings,
} from '../zodSchemas';
import {
  reconcileCustomScreens,
  reconcileMatchStateScreen,
  ReconcileCustomScreensResult,
} from './customScreenReconciliation';

// Builds made before the source-available release encrypted config.json with a
// build-time key. When LEGACY_STORE_KEY is provided at build time, an
// encrypted config found on disk is decrypted once and rewritten as plain
// JSON so existing users keep their settings. Builds without the key (the
// default) skip this; electron-store THROWS on an unreadable config (it does
// not reset to defaults), so an unparseable config.json is moved aside to
// config.json.bak, preserving the user's data for a keyed rescue, and the
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
      // Called from module scope (see the bottom of this file), before
      // main.ts's initLogger() has run, so this lands in logError's
      // memory-only fallback logger (console output still happens; see
      // logger.ts's LoggerOptions.logDir comment) rather than the durable
      // file. A narrow, pre-existing gap: this path only fires for a build
      // with a legacy encryption key whose config also fails migration.
      logError(`Legacy config migration failed: ${String(error)}`);
    }
  }
  try {
    return new Store();
  } catch (error) {
    // Same early-startup caveat as above: this runs before initLogger().
    logError(
      `config.json is unreadable; moving it aside and starting fresh: ${String(error)}`
    );
    try {
      const configPath = path.join(app.getPath('userData'), 'config.json');
      if (fs.existsSync(configPath)) {
        fs.renameSync(configPath, `${configPath}.bak`);
      }
    } catch (renameError) {
      logError(
        `Failed to move aside unreadable config.json: ${String(renameError)}`
      );
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

// Validated through customScreenListSchema (a corrupt individual entry is
// dropped, never enough to fail the whole list), then reconciled against the
// real filesystem: an entry whose backing image file no longer exists (the
// user deleted it, or config.json moved to a machine that never had the
// images folder) is dropped too, and the cleaned-up list is written back so
// the warning isn't repeated on every subsequent read. Returns both halves
// (not just the surviving list) so a caller that cares WHICH ones just
// vanished, e.g. the preflight check, can report on them without
// re-implementing this same read+reconcile+persist sequence.
export function getCustomScreensReconciliation(): ReconcileCustomScreensResult {
  const parsed = customScreenListSchema.parse(storage.get(CUSTOM_SCREENS));
  const { kept, dropped } = reconcileCustomScreens(parsed, fs.existsSync);

  if (dropped.length > 0) {
    logError(
      `Dropping custom screens with missing backing files: ${dropped
        .map((screen) => screen.filePath)
        .join(', ')}`
    );
    storage.set(CUSTOM_SCREENS, kept);
  }

  return { kept, dropped };
}

export function getCustomScreens(): CustomScreen[] {
  return getCustomScreensReconciliation().kept;
}

export function setCustomScreens(customScreens: CustomScreen[]) {
  storage.set(CUSTOM_SCREENS, customScreens);
}

// Validated entry by entry through matchSettingsListSchema, mirroring
// getMatchSettings' per-field degradation: one corrupt saved match (e.g.
// missing a required team name) is dropped rather than losing every other
// saved match in the list.
export function getSavedMatchSettings(): MatchSettings[] {
  return matchSettingsListSchema.parse(storage.get(SAVED_MATCH_SETTINGS));
}

export function setSavedMatchSettings(savedMatchSettings: MatchSettings[]) {
  storage.set(SAVED_MATCH_SETTINGS, savedMatchSettings);
}

export function setLiveMatch(liveMatch: LiveMatch) {
  storage.set(LIVE_MATCH, liveMatch);
}

// Validated through liveMatchSchema (an individually corrupt nested object
// degrades to that field's own safe default; a wholly unparseable value
// behaves like no snapshot at all, the same "corrupt = absent" fallback
// getAppSettings uses). Then reconciled against the current custom-screens
// list: a restored matchState still pointing at a since-deleted custom
// screen (by displayScreen/customScreenImageUrl, or a since-deleted overlay)
// falls back to the scoreBug default instead of rendering a broken image.
export function getLiveMatch(): LiveMatch | undefined {
  const raw = storage.get(LIVE_MATCH);
  if (!raw) return undefined;

  const verified = liveMatchSchema.safeParse(raw);
  if (!verified.success) return undefined;

  const liveMatch = verified.data;
  const survivingCustomScreens = getCustomScreens();
  const { kept: survivingOverlays, dropped: droppedOverlays } =
    reconcileCustomScreens(liveMatch.matchState.overlays, fs.existsSync);

  if (droppedOverlays.length > 0) {
    logError(
      `Dropping overlays with missing backing files from the restored match: ${droppedOverlays
        .map((screen) => screen.filePath)
        .join(', ')}`
    );
  }

  const reconciledMatchState = reconcileMatchStateScreen(
    { ...liveMatch.matchState, overlays: survivingOverlays },
    survivingCustomScreens
  );

  return { ...liveMatch, matchState: reconciledMatchState };
}
