import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultMatchSettings } from '../../constants';
import { CustomScreen, LiveMatch } from '../../types';
import { MatchSettings } from '../../zodSchemas';

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
      100,
      200,
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

  it('stores and retrieves custom screens', async () => {
    const customScreens: CustomScreen[] = [
      {
        title: 'Sponsor',
        filePath: '/tmp/sponsor.png',
        url: 'file:///tmp/sponsor.png',
        type: 'overlay',
        overlayLinks: ['scoreBug'],
      },
    ];
    const { storage } = await loadStorage();

    expect(storage.getCustomScreens()).toEqual([]);
    storage.setCustomScreens(customScreens);
    expect(storage.getCustomScreens()).toEqual(customScreens);
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
});
