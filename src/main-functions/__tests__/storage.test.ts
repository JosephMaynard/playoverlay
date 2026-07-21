import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultMatchSettings, defaultMatchState } from '../../constants';
import { CustomScreen, LiveMatch } from '../../types';
import { MatchSettings } from '../../zodSchemas';

const temporaryDirectories: string[] = [];

// Creates a real file on disk so getCustomScreens' filesystem reconciliation
// (which checks fs.existsSync for real, it isn't mocked away) sees it as
// present. Custom screens don't otherwise touch electron-store's mocked
// userData path, so this is independent of loadStorage's temp directory.
function createTemporaryImageFile(name: string): string {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'playoverlay-storage-test-')
  );
  temporaryDirectories.push(directory);
  const filePath = path.join(directory, name);
  fs.writeFileSync(filePath, 'fake-image-bytes');
  return filePath;
}

type StoreData = Record<string, unknown>;

interface MockStoreInstance {
  store: StoreData;
  get: (key: string, defaultValue?: unknown) => unknown;
  set: (key: string, value: unknown) => void;
  delete: (key: string) => void;
}

async function loadStorage(initialStore: StoreData = {}) {
  vi.resetModules();
  const stores: MockStoreInstance[] = [];

  class MockStore implements MockStoreInstance {
    store: StoreData;

    constructor() {
      this.store = stores.length === 0 ? { ...initialStore } : {};
      stores.push(this);
    }

    get(key: string, defaultValue?: unknown) {
      return Object.prototype.hasOwnProperty.call(this.store, key)
        ? this.store[key]
        : defaultValue;
    }

    set(key: string, value: unknown) {
      this.store[key] = value;
    }

    delete(key: string) {
      delete this.store[key];
    }
  }

  vi.doMock('electron', () => ({
    app: {
      getPath: vi.fn(() => '/tmp/playoverlay-test-user-data'),
    },
  }));
  vi.doMock('electron-store', () => ({
    default: MockStore,
  }));

  const storage = await import('../storage');

  return { storage, stores };
}

describe('storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    temporaryDirectories.splice(0).forEach((directory) => {
      fs.rmSync(directory, { force: true, recursive: true });
    });
  });

  it('returns and persists default window size when none is stored', async () => {
    const { storage, stores } = await loadStorage();

    expect(storage.getWindowSize(storage.MAIN_WINDOW)).toEqual([800, 600]);
    expect(stores[0].store.MAIN_WINDOW_SIZE).toEqual([800, 600]);
  });

  it('stores and retrieves window size and position', async () => {
    const { storage } = await loadStorage();

    storage.setWindowSize(storage.DISPLAY_WINDOW, [1280, 720]);
    storage.setWindowPosition(storage.DISPLAY_WINDOW, [100, 200]);

    expect(storage.getWindowSize(storage.DISPLAY_WINDOW)).toEqual([1280, 720]);
    expect(storage.getWindowPosition(storage.DISPLAY_WINDOW)).toEqual([
      100, 200,
    ]);
  });

  it('stores and retrieves app settings', async () => {
    const { storage } = await loadStorage();
    const appSettings = {
      keyColour: '#00ff00',
      autoSwitchScreens: false,
    };

    storage.setAppSettings(appSettings);

    expect(storage.getAppSettings()).toEqual(appSettings);
  });

  it('returns default match settings when no saved settings exist', async () => {
    const { storage } = await loadStorage();

    expect(storage.getMatchSettings()).toEqual(defaultMatchSettings);
  });

  it('merges verified saved match settings over defaults', async () => {
    const savedSettings: MatchSettings = {
      homeTeamNameFull: 'Tigers',
      homeTeamNameAbbreviated: 'TIG',
      awayTeamNameFull: 'Bears',
      awayTeamNameAbbreviated: 'BEA',
      halfLength: 40,
    };
    const { storage } = await loadStorage({
      MATCH_SETTINGS: savedSettings,
    });

    expect(storage.getMatchSettings()).toEqual({
      ...defaultMatchSettings,
      ...savedSettings,
    });
  });

  it('prefers legacy team settings once and deletes the legacy key', async () => {
    const legacySettings: MatchSettings = {
      homeTeamNameFull: 'Reds',
      homeTeamNameAbbreviated: 'RED',
      awayTeamNameFull: 'Blues',
      awayTeamNameAbbreviated: 'BLU',
    };
    const { storage, stores } = await loadStorage({
      TEAM_SETTINGS: legacySettings,
      MATCH_SETTINGS: {
        homeTeamNameFull: 'Ignored',
        homeTeamNameAbbreviated: 'IGN',
        awayTeamNameFull: 'Ignored',
        awayTeamNameAbbreviated: 'IGN',
      },
    });

    expect(storage.getMatchSettings()).toEqual({
      ...defaultMatchSettings,
      ...legacySettings,
    });
    expect(stores[0].store.TEAM_SETTINGS).toBeUndefined();
  });

  it('falls back to default match settings when saved data is invalid', async () => {
    const { storage } = await loadStorage({
      MATCH_SETTINGS: {
        homeTeamNameFull: 'Incomplete',
      },
    });

    expect(storage.getMatchSettings()).toEqual(defaultMatchSettings);
  });

  it('stores and retrieves custom screens with an existing backing file', async () => {
    const filePath = createTemporaryImageFile('sponsor.png');
    const customScreens: CustomScreen[] = [
      {
        title: 'Sponsor',
        filePath,
        url: `file://${filePath}`,
        type: 'overlay',
        overlayLinks: ['scoreBug'],
      },
    ];
    const { storage } = await loadStorage();

    expect(storage.getCustomScreens()).toEqual([]);
    storage.setCustomScreens(customScreens);
    expect(storage.getCustomScreens()).toEqual(customScreens);
  });

  it('drops custom screens whose backing file no longer exists, and persists the cleaned-up list', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const survivingFilePath = createTemporaryImageFile('keep.png');
    const missingFilePath = path.join(
      path.dirname(survivingFilePath),
      'deleted.png'
    );
    const survivingScreen: CustomScreen = {
      title: 'Keep',
      filePath: survivingFilePath,
      url: `file://${survivingFilePath}`,
      type: 'screen',
      overlayLinks: [],
    };
    const missingScreen: CustomScreen = {
      title: 'Deleted',
      filePath: missingFilePath,
      url: `file://${missingFilePath}`,
      type: 'screen',
      overlayLinks: [],
    };
    const { storage, stores } = await loadStorage({
      CUSTOM_SCREENS: [survivingScreen, missingScreen],
    });

    expect(storage.getCustomScreens()).toEqual([survivingScreen]);
    expect(consoleError).toHaveBeenCalled();
    // The reconciled (filtered) list is written back, not just returned.
    expect(stores[0].store.CUSTOM_SCREENS).toEqual([survivingScreen]);
  });

  it('reconcileCustomScreensReadOnly reports dropped screens without persisting the cleaned-up list', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const survivingFilePath = createTemporaryImageFile('keep.png');
    const missingFilePath = path.join(
      path.dirname(survivingFilePath),
      'deleted.png'
    );
    const survivingScreen: CustomScreen = {
      title: 'Keep',
      filePath: survivingFilePath,
      url: `file://${survivingFilePath}`,
      type: 'screen',
      overlayLinks: [],
    };
    const missingScreen: CustomScreen = {
      title: 'Deleted',
      filePath: missingFilePath,
      url: `file://${missingFilePath}`,
      type: 'screen',
      overlayLinks: [],
    };
    const original = [survivingScreen, missingScreen];
    const { storage, stores } = await loadStorage({
      CUSTOM_SCREENS: original,
    });

    const result = storage.reconcileCustomScreensReadOnly();

    expect(result).toEqual({
      kept: [survivingScreen],
      dropped: [missingScreen],
    });
    // Unlike getCustomScreensReconciliation, this must never write back the
    // cleaned-up list: a read-only preflight check must never mutate saved
    // configuration just from being run.
    expect(stores[0].store.CUSTOM_SCREENS).toEqual(original);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('drops a malformed custom screen entry while keeping its valid siblings', async () => {
    const filePath = createTemporaryImageFile('valid.png');
    const validScreen: CustomScreen = {
      title: 'Valid',
      filePath,
      url: `file://${filePath}`,
      type: 'screen',
      overlayLinks: [],
    };
    const { storage } = await loadStorage({
      CUSTOM_SCREENS: [validScreen, { title: 'Missing everything else' }],
    });

    expect(storage.getCustomScreens()).toEqual([validScreen]);
  });

  it('stores and retrieves saved match settings', async () => {
    const savedMatchSettings: MatchSettings[] = [
      {
        ...defaultMatchSettings,
        saveId: 'match-1',
        saveTitle: 'Semi Final',
      },
    ];
    const { storage } = await loadStorage();

    expect(storage.getSavedMatchSettings()).toEqual([]);
    storage.setSavedMatchSettings(savedMatchSettings);
    expect(storage.getSavedMatchSettings()).toEqual(savedMatchSettings);
  });

  it('drops an invalid saved match (missing required team names) while keeping the rest', async () => {
    const validSaved: MatchSettings = {
      ...defaultMatchSettings,
      saveId: 'match-1',
      saveTitle: 'Final',
    };
    const { storage } = await loadStorage({
      SAVED_MATCH_SETTINGS: [validSaved, { homeTeamNameFull: 'Incomplete' }],
    });

    expect(storage.getSavedMatchSettings()).toEqual([validSaved]);
  });

  it('stores and retrieves a live match snapshot', async () => {
    const liveMatch: LiveMatch = {
      scores: { homeTeam: 2, awayTeam: 1, penalties: [] },
      time: { time: '75:00', paused: false },
      matchState: {
        displayScreen: 'scoreBug',
        penaltiesFirstTeam: 'home',
        overlays: [],
      },
      savedAt: 12345,
    };
    const { storage } = await loadStorage();

    expect(storage.getLiveMatch()).toBeUndefined();
    storage.setLiveMatch(liveMatch);
    expect(storage.getLiveMatch()).toEqual(liveMatch);
  });

  it('degrades an individually corrupt live-match field to its default instead of discarding the snapshot', async () => {
    const { storage } = await loadStorage({
      LIVE_MATCH: {
        scores: { homeTeam: 2, awayTeam: 1, penalties: [] },
        time: { time: '75:00', paused: false },
        // Wholly the wrong shape: degrades to defaultMatchState rather than
        // failing the whole snapshot.
        matchState: 'not-an-object',
        savedAt: 12345,
      },
    });

    expect(storage.getLiveMatch()).toEqual({
      scores: { homeTeam: 2, awayTeam: 1, penalties: [] },
      time: { time: '75:00', paused: false },
      matchState: defaultMatchState,
      savedAt: 12345,
    });
  });

  it('falls back the restored screen to scoreBug when its custom screen no longer exists', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const { storage } = await loadStorage({
      CUSTOM_SCREENS: [],
      LIVE_MATCH: {
        scores: { homeTeam: 0, awayTeam: 0, penalties: [] },
        time: {},
        matchState: {
          displayScreen: 'custom',
          penaltiesFirstTeam: 'home',
          customScreenImageUrl: 'file:///deleted/sponsor.png',
          overlays: [],
        },
        savedAt: 1,
      },
    });

    const restored = storage.getLiveMatch();

    expect(restored?.matchState.displayScreen).toBe(
      defaultMatchState.displayScreen
    );
    expect(restored?.matchState.customScreenImageUrl).toBeUndefined();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('keeps the restored custom screen selection when its backing file still exists', async () => {
    const filePath = createTemporaryImageFile('surviving.png');
    const survivingScreen: CustomScreen = {
      title: 'Surviving',
      filePath,
      url: `file://${filePath}`,
      type: 'screen',
      overlayLinks: [],
    };
    const { storage } = await loadStorage({
      CUSTOM_SCREENS: [survivingScreen],
      LIVE_MATCH: {
        scores: { homeTeam: 0, awayTeam: 0, penalties: [] },
        time: {},
        matchState: {
          displayScreen: 'custom',
          penaltiesFirstTeam: 'home',
          customScreenImageUrl: survivingScreen.url,
          overlays: [],
        },
        savedAt: 1,
      },
    });

    const restored = storage.getLiveMatch();

    expect(restored?.matchState.displayScreen).toBe('custom');
    expect(restored?.matchState.customScreenImageUrl).toBe(survivingScreen.url);
  });

  it('drops an overlay from a restored match whose backing file no longer exists', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const survivingFilePath = createTemporaryImageFile('overlay-keep.png');
    const survivingOverlay: CustomScreen = {
      title: 'Overlay Keep',
      filePath: survivingFilePath,
      url: `file://${survivingFilePath}`,
      type: 'overlay',
      overlayLinks: ['scoreBug'],
    };
    const missingOverlay: CustomScreen = {
      title: 'Overlay Deleted',
      filePath: path.join(path.dirname(survivingFilePath), 'gone.png'),
      url: 'file:///gone.png',
      type: 'overlay',
      overlayLinks: ['scoreBug'],
    };
    const { storage } = await loadStorage({
      LIVE_MATCH: {
        scores: { homeTeam: 0, awayTeam: 0, penalties: [] },
        time: {},
        matchState: {
          displayScreen: 'scoreBug',
          penaltiesFirstTeam: 'home',
          overlays: [survivingOverlay, missingOverlay],
        },
        savedAt: 1,
      },
    });

    expect(storage.getLiveMatch()?.matchState.overlays).toEqual([
      survivingOverlay,
    ]);
    expect(consoleError).toHaveBeenCalled();
  });
});
