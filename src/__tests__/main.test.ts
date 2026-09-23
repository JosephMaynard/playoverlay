import { EventEmitter } from 'events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  defaultAppSettings,
  defaultMatchSettings,
  defaultMatchState,
  defaultScores,
} from '../constants';
import { LiveMatch } from '../types';

// Drives main.ts end to end against a mocked Electron: every IPC and
// lifecycle handler it registers is captured, so the tests can fire them the
// way the renderers and the OS would and assert on what reaches the display
// window, OBS and the phones. No real window, server or file is touched.

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

class FakeWebContents extends EventEmitter {
  send = vi.fn();
  reload = vi.fn();
  forcefullyCrashRenderer = vi.fn();
  isCrashed = vi.fn(() => false);
  openDevTools = vi.fn();
  closeDevTools = vi.fn();
  setWindowOpenHandler = vi.fn();
  session = {
    on: vi.fn(),
    setPermissionCheckHandler: vi.fn(),
    setDevicePermissionHandler: vi.fn(),
  };
}

class FakeWindow extends EventEmitter {
  webContents = new FakeWebContents();
  bounds: Rect = { x: 100, y: 100, width: 800, height: 600 };
  fullscreen = false;
  destroyed = false;

  constructor(readonly name: string) {
    super();
  }

  loadURL = vi.fn();
  loadFile = vi.fn();
  isDestroyed = () => this.destroyed;
  isFullScreen = () => this.fullscreen;
  setFullScreen = vi.fn((flag: boolean) => {
    const was = this.fullscreen;
    this.fullscreen = flag;
    if (was && !flag) this.emit('leave-full-screen');
    if (!was && flag) this.emit('enter-full-screen');
  });
  getBounds = () => this.bounds;
  setBounds = vi.fn((bounds: Partial<Rect>) => {
    this.bounds = { ...this.bounds, ...bounds };
  });
  getPosition = () => [this.bounds.x, this.bounds.y];
  getSize = () => [this.bounds.width, this.bounds.height];
  isFocused = () => false;
  focus = vi.fn();
  isMinimized = () => false;
  restore = vi.fn();
  isMaximized = () => false;
  unmaximize = vi.fn();
  setAlwaysOnTop = vi.fn();
}

interface LoadOptions {
  gotLock?: boolean;
  squirrel?: boolean;
  liveMatch?: LiveMatch;
  setMatchSettings?: (settings: unknown) => void;
  setAppSettings?: (settings: unknown) => void;
}

const laptop = { id: 1, bounds: { x: 0, y: 0, width: 1440, height: 900 } };
const hdmi = { id: 2, bounds: { x: 1440, y: 0, width: 1920, height: 1080 } };

async function loadMain(options: LoadOptions = {}) {
  vi.resetModules();

  const appHandlers: Record<
    string,
    Array<(...args: unknown[]) => unknown>
  > = {};
  const screenHandlers: Record<string, Array<() => void>> = {};
  const ipcOn: Record<string, (...args: unknown[]) => unknown> = {};
  const ipcHandle: Record<string, (...args: unknown[]) => unknown> = {};
  const windows: Record<string, FakeWindow> = {};
  let displays = [laptop, hdmi];
  const startedBlockers = new Set<number>();
  let nextBlockerId = 1;

  const app = {
    getPath: vi.fn(() => '/tmp/playoverlay-main-test'),
    setPath: vi.fn(),
    requestSingleInstanceLock: vi.fn(() => options.gotLock ?? true),
    quit: vi.fn(),
    on: vi.fn((event: string, handler: (...args: unknown[]) => unknown) => {
      (appHandlers[event] ??= []).push(handler);
      return app;
    }),
    getVersion: () => '0.0.0-test',
    getLocale: () => 'fr-FR',
  };

  const displayContaining = (bounds: Rect) =>
    displays.find(
      (display) =>
        bounds.x >= display.bounds.x &&
        bounds.x < display.bounds.x + display.bounds.width
    ) ?? displays[0];

  const screen = {
    getAllDisplays: vi.fn(() => displays),
    getPrimaryDisplay: vi.fn(() => ({
      ...laptop,
      workAreaSize: { width: 1440, height: 875 },
    })),
    getDisplayMatching: vi.fn(displayContaining),
    on: vi.fn((event: string, handler: () => void) => {
      (screenHandlers[event] ??= []).push(handler);
    }),
  };

  const powerSaveBlocker = {
    start: vi.fn(() => {
      const id = nextBlockerId++;
      startedBlockers.add(id);
      return id;
    }),
    stop: vi.fn((id: number) => startedBlockers.delete(id)),
    isStarted: vi.fn((id: number) => startedBlockers.has(id)),
  };

  const Menu = {
    buildFromTemplate: vi.fn((template: unknown) => template),
    setApplicationMenu: vi.fn(),
  };

  vi.doMock('electron', () => ({
    app,
    BrowserWindow: class {},
    dialog: { showSaveDialog: vi.fn() },
    ipcMain: {
      on: (channel: string, handler: (...args: unknown[]) => unknown) => {
        ipcOn[channel] = handler;
      },
      handle: (channel: string, handler: (...args: unknown[]) => unknown) => {
        ipcHandle[channel] = handler;
      },
    },
    powerSaveBlocker,
    screen,
    Menu,
    shell: { openExternal: vi.fn() },
    globalShortcut: {
      register: vi.fn(() => true),
      unregister: vi.fn(),
      unregisterAll: vi.fn(),
    },
  }));
  vi.doMock('electron-squirrel-startup', () => ({
    default: options.squirrel ?? false,
  }));

  const setMatchSettings = vi.fn(options.setMatchSettings);
  const setAppSettings = vi.fn(options.setAppSettings);
  const setLiveMatch = vi.fn();
  vi.doMock('../main-functions/storage', () => ({
    DISPLAY_WINDOW: 'DISPLAY_WINDOW',
    MAIN_WINDOW: 'MAIN_WINDOW',
    getAppSettings: vi.fn(() => undefined),
    getCustomScreens: vi.fn(() => []),
    getLiveMatch: vi.fn(() => options.liveMatch),
    getMatchSettings: vi.fn(() => ({ ...defaultMatchSettings })),
    getSavedMatchSettings: vi.fn(() => []),
    reconcileCustomScreensReadOnly: vi.fn(() => ({ kept: [], dropped: [] })),
    setAppSettings,
    setLiveMatch,
    setCustomScreens: vi.fn(),
    setMatchSettings,
    setSavedMatchSettings: vi.fn(),
    setWindowPosition: vi.fn(),
    setWindowSize: vi.fn(),
  }));
  vi.doMock('../main-functions/createAppWindow', () => ({
    default: vi.fn((name: string) => {
      const window = new FakeWindow(name);
      windows[name] = window;
      return window;
    }),
  }));
  vi.doMock('../main-functions/fileHandler', () => ({
    handleFileDeletion: vi.fn(),
    handleFileUpload: vi.fn(),
    imagesPath: '/tmp/playoverlay-main-test/images',
    saveImageFile: vi.fn(),
  }));

  const broadcastToBrowserSources = vi.fn();
  vi.doMock('../main-functions/browserSourceServer', () => ({
    broadcastToBrowserSources,
    getBrowserSourceServerPort: () => null,
    isBrowserSourceServerRunning: () => false,
    rewriteFileUrls: <T>(payload: T) => payload,
    startBrowserSourceServer: vi.fn(),
    stopBrowserSourceServer: vi.fn(() => Promise.resolve()),
  }));

  const broadcastRemoteControlState = vi.fn();
  vi.doMock('../main-functions/remoteControlServer', () => ({
    broadcastRemoteControlState,
    getLanIPv4: () => '192.168.0.2',
    getRemoteControlConnectedCount: () => 0,
    getRemoteControlServerPort: () => null,
    isRemoteControlServerRunning: () => true,
    startRemoteControlServer: vi.fn(),
    stopRemoteControlServer: vi.fn(() => Promise.resolve()),
  }));

  const logInfo = vi.fn();
  const logError = vi.fn();
  const logFailedOperation = vi.fn();
  vi.doMock('../main-functions/logger', async () => {
    const actual = await vi.importActual<
      typeof import('../main-functions/logger')
    >('../main-functions/logger');
    return {
      ...actual,
      initLogger: vi.fn(),
      logInfo,
      logError,
      logFailedOperation,
      logMatchEvent: vi.fn(),
    };
  });
  vi.doMock('../main-functions/apiRequests', () => ({
    checkForUpdates: vi.fn(),
  }));

  vi.stubGlobal('MAIN_WINDOW_VITE_DEV_SERVER_URL', 'http://localhost:5173');
  vi.stubGlobal('DISPLAY_WINDOW_VITE_DEV_SERVER_URL', 'http://localhost:5173');
  vi.stubGlobal('MAIN_WINDOW_VITE_NAME', 'main_window');
  vi.stubGlobal('DISPLAY_WINDOW_VITE_NAME', 'display_window');

  await import('../main');

  const emitApp = async (event: string, ...args: unknown[]) => {
    for (const handler of appHandlers[event] ?? []) await handler(...args);
  };

  return {
    app,
    windows,
    screen,
    powerSaveBlocker,
    startedBlockers,
    Menu,
    setMatchSettings,
    setAppSettings,
    setLiveMatch,
    broadcastToBrowserSources,
    broadcastRemoteControlState,
    logInfo,
    logError,
    logFailedOperation,
    ipcOn,
    ipcHandle,
    ready: () => emitApp('ready'),
    emitApp,
    send: (channel: string, payload?: unknown) =>
      ipcOn[channel]({ reply: vi.fn() }, payload),
    invoke: (channel: string, payload?: unknown) =>
      ipcHandle[channel]({}, payload),
    setDisplays: (next: typeof displays) => {
      displays = next;
    },
    emitScreen: (event: string) =>
      (screenHandlers[event] ?? []).forEach((handler) => handler()),
    display: () => windows.DISPLAY_WINDOW,
    control: () => windows.MAIN_WINDOW,
  };
}

// The last payload sent to the display window on `channel`.
function lastSent(window: FakeWindow, channel: string) {
  const calls = window.webContents.send.mock.calls.filter(
    ([sentChannel]) => sentChannel === channel
  );
  return calls[calls.length - 1]?.[1];
}

const interruptedMatch: LiveMatch = {
  scores: { homeTeam: 2, awayTeam: 1, penalties: [] },
  time: { time: '67:12', paused: true, matchPhase: 'secondHalf' },
  matchState: { ...defaultMatchState, matchPhase: 'secondHalf' },
  savedAt: 1,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.doUnmock('electron');
});

describe('main process: launch', () => {
  it('does no startup work in a second instance that failed to get the lock', async () => {
    const main = await loadMain({ gotLock: false });

    expect(main.app.quit).toHaveBeenCalled();
    await main.ready();

    expect(main.windows).toEqual({});
    expect(main.ipcOn['update-score']).toBeUndefined();
    expect(main.logInfo).not.toHaveBeenCalled();

    // Its shutdown must not write to the running instance's log either.
    await main.emitApp('will-quit');
    expect(main.logInfo).not.toHaveBeenCalled();
  });

  it('does no startup work during a Squirrel install run', async () => {
    const main = await loadMain({ squirrel: true });

    expect(main.app.quit).toHaveBeenCalled();
    expect(main.app.requestSingleInstanceLock).not.toHaveBeenCalled();
    await main.ready();
    expect(main.windows).toEqual({});
  });

  it('starts normally with the lock', async () => {
    const main = await loadMain();
    await main.ready();

    expect(main.app.quit).not.toHaveBeenCalled();
    expect(main.display()).toBeDefined();
    expect(main.control()).toBeDefined();
  });

  it('builds the app menu in the operator language, falling back to the OS locale', async () => {
    const main = await loadMain();
    await main.ready();

    // No language chosen yet: the mocked OS locale is fr-FR.
    const template = main.Menu.buildFromTemplate.mock.calls.at(-1)?.[0] as {
      label: string;
    }[];
    expect(template[1].label).toBe('Édition');

    main.send('update-app-settings', { ...defaultAppSettings, language: 'de' });
    const german = main.Menu.buildFromTemplate.mock.calls.at(-1)?.[0] as {
      label: string;
    }[];
    expect(german[1].label).toBe('Bearbeiten');
  });
});

describe('main process: pending restore offer', () => {
  it('keeps a fake 0-0 scorebug off the outputs until the operator resolves the offer', async () => {
    const main = await loadMain({ liveMatch: interruptedMatch });
    await main.ready();
    const display = main.display();

    // The dashboard's blank mount-time seed.
    main.send('update-match-state', { ...defaultMatchState });
    main.send('update-score', { ...defaultScores });
    main.send('update-time', {});
    main.send('display-ready');

    expect(lastSent(display, 'match-state-updated')).toMatchObject({
      displayScreen: 'none',
      overlays: [],
    });
    expect(lastSent(display, 'score-updated')).toEqual(interruptedMatch.scores);
    expect(
      main.broadcastToBrowserSources.mock.calls
        .filter(([channel]) => channel === 'match-state-updated')
        .every(([, payload]) => payload.displayScreen === 'none')
    ).toBe(true);
    expect(
      main.broadcastRemoteControlState.mock.calls.at(-1)?.[0].matchState
        .displayScreen
    ).toBe('none');

    // Restoring the match (a meaningful update) resolves the offer and the
    // real state goes out.
    main.send('update-score', { homeTeam: 2, awayTeam: 1, penalties: [] });
    expect(lastSent(display, 'match-state-updated')).toMatchObject({
      displayScreen: 'scoreBug',
    });
    expect(lastSent(display, 'score-updated')).toMatchObject({
      homeTeam: 2,
      awayTeam: 1,
    });
  });

  it('sends the real state once the offer is dismissed', async () => {
    const main = await loadMain({ liveMatch: interruptedMatch });
    await main.ready();
    main.send('update-match-state', { ...defaultMatchState });

    main.send('resolve-live-match');

    expect(lastSent(main.display(), 'match-state-updated')).toMatchObject({
      displayScreen: 'scoreBug',
    });
  });

  it('hands the output back when the operator puts another screen on air', async () => {
    const main = await loadMain({ liveMatch: interruptedMatch });
    await main.ready();
    main.send('update-match-state', { ...defaultMatchState });

    main.send('update-match-state', {
      ...defaultMatchState,
      displayScreen: 'matchTitle',
    });

    expect(lastSent(main.display(), 'match-state-updated')).toMatchObject({
      displayScreen: 'matchTitle',
    });
  });

  it('does not hold the outputs for a snapshot the dashboard will not offer', async () => {
    const main = await loadMain({
      liveMatch: {
        scores: { ...defaultScores },
        time: {},
        matchState: { ...defaultMatchState },
        savedAt: 1,
      },
    });
    await main.ready();

    main.send('update-match-state', { ...defaultMatchState });

    expect(lastSent(main.display(), 'match-state-updated')).toMatchObject({
      displayScreen: 'scoreBug',
    });
  });
});

describe('main process: settings updates', () => {
  it('still sends a match settings change to the outputs when saving it fails', async () => {
    const main = await loadMain({
      setMatchSettings: () => {
        throw new Error('EACCES: permission denied');
      },
    });
    await main.ready();
    const update = {
      ...defaultMatchSettings,
      homeTeamNameFull: 'Riverside Rovers',
    };

    expect(() => main.send('update-match-settings', update)).not.toThrow();

    expect(lastSent(main.display(), 'match-settings-updated')).toMatchObject({
      homeTeamNameFull: 'Riverside Rovers',
    });
    expect(main.broadcastToBrowserSources).toHaveBeenCalledWith(
      'match-settings-updated',
      expect.objectContaining({ homeTeamNameFull: 'Riverside Rovers' })
    );
    expect(main.logFailedOperation).toHaveBeenCalledWith(
      expect.stringContaining('EACCES')
    );
  });

  it('still applies an app settings change when saving it fails', async () => {
    const main = await loadMain({
      setAppSettings: () => {
        throw new Error('ENOSPC: no space left on device');
      },
    });
    await main.ready();

    expect(() =>
      main.send('update-app-settings', {
        ...defaultAppSettings,
        keyColour: '#123456',
      })
    ).not.toThrow();

    expect(lastSent(main.display(), 'app-settings-updated')).toMatchObject({
      keyColour: '#123456',
    });
    expect(main.logFailedOperation).toHaveBeenCalledWith(
      expect.stringContaining('ENOSPC')
    );
  });

  it('rejects malformed settings payloads before they reach the outputs or disk', async () => {
    const main = await loadMain();
    await main.ready();
    main.display().webContents.send.mockClear();

    main.send('update-match-settings', { homeTeamNameFull: 42 });
    main.send('update-app-settings', 'not an object');

    expect(main.display().webContents.send).not.toHaveBeenCalled();
    expect(main.setMatchSettings).not.toHaveBeenCalled();
    expect(main.setAppSettings).not.toHaveBeenCalled();
    expect(main.logError).toHaveBeenCalledWith(
      expect.stringContaining('Rejected invalid match settings update')
    );
    expect(main.logError).toHaveBeenCalledWith(
      expect.stringContaining('Rejected invalid app settings update')
    );
  });
});

describe('main process: keeping the display awake', () => {
  it('holds the blocker while a phase runs and releases it afterwards, without locking', async () => {
    const main = await loadMain();
    await main.ready();

    main.send('update-time', { time: '00:01', matchPhase: 'firstHalf' });
    expect(main.startedBlockers.size).toBe(1);

    main.send('update-time', {});
    expect(main.startedBlockers.size).toBe(0);
  });

  it('holds the blocker while the output is fullscreen', async () => {
    const main = await loadMain();
    await main.ready();

    main.send('toggle-fullscreen');
    expect(main.startedBlockers.size).toBe(1);
    main.send('toggle-fullscreen');
    expect(main.startedBlockers.size).toBe(0);
  });
});

describe('main process: renderer crashes', () => {
  it('reloads a crashed display window and stops reporting it ready', async () => {
    const main = await loadMain();
    await main.ready();
    const display = main.display();
    main.send('display-ready');
    const readiness = async () => {
      const preflight = (await main.invoke('run-preflight')) as {
        checks: { id: string; status: string }[];
      };
      return preflight.checks.find((check) => check.id === 'displayWindowReady')
        ?.status;
    };
    expect(await readiness()).toBe('ok');

    display.webContents.emit(
      'render-process-gone',
      {},
      {
        reason: 'crashed',
        exitCode: 11,
      }
    );

    expect(display.webContents.reload).toHaveBeenCalled();
    expect(await readiness()).not.toBe('ok');

    // The reloaded page's handshake makes it ready again.
    main.send('display-ready');
    expect(await readiness()).toBe('ok');
  });

  it('restarts a hung display window renderer', async () => {
    const main = await loadMain();
    await main.ready();

    main.display().emit('unresponsive');

    expect(
      main.display().webContents.forcefullyCrashRenderer
    ).toHaveBeenCalled();
  });

  it('protects the match and freezes the outputs when the control window crashes mid-match', async () => {
    const main = await loadMain();
    await main.ready();
    const display = main.display();
    main.send('update-match-state', {
      ...defaultMatchState,
      matchPhase: 'secondHalf',
    });
    main.send('update-score', { homeTeam: 3, awayTeam: 1, penalties: [] });
    main.send('update-time', { time: '70:00', matchPhase: 'secondHalf' });

    main.control().webContents.emit(
      'render-process-gone',
      {},
      {
        reason: 'oom',
        exitCode: 0,
      }
    );

    expect(main.control().webContents.reload).toHaveBeenCalled();
    expect(main.setLiveMatch).toHaveBeenCalledWith(
      expect.objectContaining({
        scores: expect.objectContaining({ homeTeam: 3, awayTeam: 1 }),
      })
    );
    // The reloaded dashboard is offered the match...
    expect(await main.invoke('get-live-match')).toMatchObject({
      scores: { homeTeam: 3, awayTeam: 1 },
    });

    // ...and its blank seed doesn't reach the outputs.
    main.send('update-match-state', { ...defaultMatchState });
    main.send('update-score', { ...defaultScores });
    main.send('update-time', {});
    expect(lastSent(display, 'score-updated')).toMatchObject({
      homeTeam: 3,
      awayTeam: 1,
    });
    expect(lastSent(display, 'time-updated')).toMatchObject({ time: '70:00' });
  });

  it('gives a hung control window a grace period before restarting it', async () => {
    vi.useFakeTimers();
    const main = await loadMain();
    await main.ready();
    const control = main.control();

    control.emit('unresponsive');
    control.emit('responsive');
    await vi.advanceTimersByTimeAsync(10000);
    expect(control.webContents.forcefullyCrashRenderer).not.toHaveBeenCalled();

    control.emit('unresponsive');
    await vi.advanceTimersByTimeAsync(10000);
    expect(control.webContents.forcefullyCrashRenderer).toHaveBeenCalled();
  });
});

describe('main process: screens', () => {
  it('tells the settings UI when an unplugged screen unlocks the windows', async () => {
    const main = await loadMain();
    await main.ready();
    const display = main.display();
    display.bounds = { ...hdmi.bounds };
    main.send('lock-windows');
    main.control().webContents.send.mockClear();

    main.setDisplays([laptop]);
    main.emitScreen('display-removed');

    expect(main.control().webContents.send).toHaveBeenCalledWith(
      'lock-status-info',
      false
    );
    expect(display.bounds.x).toBeLessThan(laptop.bounds.width);
  });

  it('moves the output back onto its screen, fullscreen again, when it returns', async () => {
    const main = await loadMain();
    await main.ready();
    const display = main.display();
    await main.invoke('move-window-to-screen', hdmi.id);
    expect(display.bounds.x).toBe(hdmi.bounds.x);
    expect(display.fullscreen).toBe(true);

    main.setDisplays([laptop]);
    main.emitScreen('display-removed');
    expect(display.fullscreen).toBe(false);
    expect(display.bounds.x).toBeLessThan(laptop.bounds.width);

    main.setDisplays([laptop, hdmi]);
    main.emitScreen('display-added');
    await vi.waitFor(() => expect(display.fullscreen).toBe(true));
    expect(display.bounds.x).toBe(hdmi.bounds.x);
  });

  it('leaves fullscreen before moving a fullscreen output to another screen', async () => {
    const main = await loadMain();
    await main.ready();
    const display = main.display();
    display.fullscreen = true;

    await main.invoke('move-window-to-screen', hdmi.id);

    const order = [
      ...display.setFullScreen.mock.calls.map(
        (call, index) =>
          [
            display.setFullScreen.mock.invocationCallOrder[index],
            `fs:${call[0]}`,
          ] as const
      ),
      ...display.setBounds.mock.calls.map(
        (_call, index) =>
          [display.setBounds.mock.invocationCallOrder[index], 'move'] as const
      ),
    ]
      .sort((a, b) => a[0] - b[0])
      .map(([, label]) => label);
    expect(order).toEqual(['fs:false', 'move', 'fs:true']);
    expect(display.bounds.x).toBe(hdmi.bounds.x);
  });

  it('keeps going when saving a reset window position fails on unplug', async () => {
    const main = await loadMain();
    await main.ready();
    main.display().bounds = { ...hdmi.bounds };
    const storage = await import('../main-functions/storage');
    vi.mocked(storage.setWindowPosition).mockImplementation(() => {
      throw new Error('EACCES');
    });

    main.setDisplays([laptop]);
    expect(() => main.emitScreen('display-removed')).not.toThrow();
  });
});
