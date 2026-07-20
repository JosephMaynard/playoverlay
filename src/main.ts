import {
  app,
  BrowserWindow,
  ipcMain,
  powerSaveBlocker,
  screen,
  Menu,
  shell,
  globalShortcut,
} from 'electron';
import path from 'path';
import {
  AppSettings,
  BrowserSourceSettings,
  CustomScreen,
  LiveMatch,
  MatchState,
  Scores,
  Time,
} from './types';
import {
  defaultAppSettings,
  defaultMatchSettings,
  defaultMatchState,
  defaultScores,
} from './constants';
import { MatchSettings } from './zodSchemas';
import {
  deriveGlobalAccelerator,
  getBrowserSourceSettings,
  getKeyboardShortcuts,
} from './utils';
import {
  DISPLAY_WINDOW,
  MAIN_WINDOW,
  WindowName,
  getAppSettings,
  getCustomScreens,
  getLiveMatch,
  getMatchSettings,
  getSavedMatchSettings,
  setAppSettings,
  setLiveMatch,
  setCustomScreens,
  setMatchSettings,
  setSavedMatchSettings,
} from './main-functions/storage';
import createAppWindow from './main-functions/createAppWindow';
import resetWindow from './main-functions/resetWindow';
import {
  handleFileDeletion,
  handleFileUpload,
  imagesPath,
  saveImageFile,
} from './main-functions/fileHandler';
import convertFilePathToUrl from './main-functions/convertFilePathToUrl';
import { checkForUpdates } from './main-functions/apiRequests';
import {
  broadcastToBrowserSources,
  getBrowserSourceServerPort,
  isBrowserSourceServerRunning,
  rewriteFileUrls,
  startBrowserSourceServer,
  stopBrowserSourceServer,
} from './main-functions/browserSourceServer';

const SHOW_DEV_TOOLS = false;

export const isDev = process.env.NODE_ENV === 'development';
const quitWhenAllWindowsClose = true;

export const showDevTools = isDev && SHOW_DEV_TOOLS;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  console.log('electron-squirrel-startup');
  app.quit();
}

let mainWindow: BrowserWindow | null;
let displayWindow: BrowserWindow | null;
let powerSaveBlockerId: number | null = null;
let isLocked = false; // Track lock status
// Set in 'before-quit' so window teardown during quit isn't mistaken for a
// user closing the display window (which we recreate in production).
let isQuitting = false;
// True while the renderer has shortcuts disabled (e.g. a text field is open),
// so window focus events don't re-register them behind its back
let keyboardShortcutsDisabled = false;

// Cached renderer state for reliable initial sync to display
let cachedScores: Scores = { ...defaultScores };
let cachedTime: Time = {};
let cachedAppSettings: AppSettings = { ...defaultAppSettings };
let cachedMatchSettings = { ...defaultMatchSettings };
let cachedMatchState: MatchState = { ...defaultMatchState };

// Snapshot of the persisted live match taken at launch, before the
// renderer's initial state pushes overwrite it. Offered to the dashboard
// so an interrupted match can be restored.
let liveMatchAtLaunch: LiveMatch | undefined;

// Set when the browser source server most recently failed to start (e.g.
// EADDRINUSE), so the settings UI can surface it. Cleared on a successful
// (re)start or once the feature is disabled.
let browserSourceError: string | undefined;

function getImagesDirUrlPrefix(): string {
  return `${convertFilePathToUrl(imagesPath)}/`;
}

// Every payload sent to a browser source (snapshot or broadcast) needs its
// file:// image URLs rewritten to this server's /images/ route.
function toBrowserSourcePayload<T>(payload: T): T {
  return rewriteFileUrls(payload, getImagesDirUrlPrefix());
}

function broadcastToBrowserSourcesRewritten(channel: string, payload: unknown) {
  broadcastToBrowserSources(channel, toBrowserSourcePayload(payload));
}

// Matches the order display-ready sends in: settings first, then
// state/scores/time. Keep this in sync with that handler below.
function getBrowserSourceSnapshot() {
  return [
    { channel: 'match-settings-updated', payload: toBrowserSourcePayload(cachedMatchSettings) },
    { channel: 'app-settings-updated', payload: toBrowserSourcePayload(cachedAppSettings) },
    { channel: 'match-state-updated', payload: toBrowserSourcePayload(cachedMatchState) },
    { channel: 'score-updated', payload: toBrowserSourcePayload(cachedScores) },
    { channel: 'time-updated', payload: toBrowserSourcePayload(cachedTime) },
  ];
}

// Applies a (possibly changed) browser-source configuration: always stops
// any running server first (idempotent if none is running), then restarts
// it if enabled. Used both at launch and whenever settings change.
async function applyBrowserSourceSettings(settings: BrowserSourceSettings) {
  await stopBrowserSourceServer();
  browserSourceError = undefined;

  if (!settings.enabled) return;

  const result = await startBrowserSourceServer({
    port: settings.port,
    imagesPath,
    getSnapshot: getBrowserSourceSnapshot,
  });

  if (result.ok === false) {
    browserSourceError = result.error;
    console.error('Failed to start browser source server:', result.error);
  }
}

// Serializes applyBrowserSourceSettings calls so rapid settings changes
// (e.g. toggling enabled then immediately changing the port) can't interleave
// their stop/start work. Each call is chained onto the previous one and
// errors are swallowed here (applyBrowserSourceSettings already handles its
// own failures) so one bad call never breaks the chain for later ones.
let browserSourceTransition = Promise.resolve();

function queueBrowserSourceSettings(settings: BrowserSourceSettings) {
  browserSourceTransition = browserSourceTransition
    .then(() => applyBrowserSourceSettings(settings))
    .catch((error) => {
      console.error('Error applying browser source settings:', error);
    });
  return browserSourceTransition;
}

// Live-match writes are throttled: time updates arrive every second while
// the clock runs, and each electron-store set() synchronously rewrites the
// whole config file on the main thread. Deferring the write keeps crash
// recovery at most ~2s stale while halving+ the disk churn over a match.
let persistLiveMatchTimer: ReturnType<typeof setTimeout> | null = null;

function writeLiveMatch() {
  try {
    setLiveMatch({
      scores: cachedScores,
      time: cachedTime,
      matchState: cachedMatchState,
      savedAt: Date.now(),
      matchSettings: cachedMatchSettings,
    });
  } catch (error) {
    console.error('Error persisting live match:', error);
  }
}

function persistLiveMatch() {
  if (persistLiveMatchTimer) return;
  persistLiveMatchTimer = setTimeout(() => {
    persistLiveMatchTimer = null;
    writeLiveMatch();
  }, 2000);
}

function flushLiveMatch() {
  if (persistLiveMatchTimer) {
    clearTimeout(persistLiveMatchTimer);
    persistLiveMatchTimer = null;
    writeLiveMatch();
  }
}

// Prevent more than one instance of the app running
const additionalData = { playOverlay: 'PlayOverlay' };
const gotTheLock = app.requestSingleInstanceLock(additionalData);

if (!gotTheLock && !isDev) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Creates (or recreates) the display window, loads its URL, and wires it
// into the module-level displayWindow variable so update forwarding and the
// display-ready handshake keep working across recreations.
const createDisplayWindow = () => {
  const window = createAppWindow(DISPLAY_WINDOW);
  displayWindow = window;

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    window.loadURL(`${DISPLAY_WINDOW_VITE_DEV_SERVER_URL}/display.html`);
  } else {
    window.loadFile(
      path.join(
        __dirname,
        `../renderer/${DISPLAY_WINDOW_VITE_NAME}/display.html`
      )
    );
  }

  if (showDevTools) {
    window.webContents.openDevTools();
  }

  window.on('closed', () => {
    if (displayWindow === window) {
      displayWindow = null;
    }
    // In production a closed display window would silently swallow every
    // update with no way to get output back, recreate it unless the app
    // is quitting. The display-ready handshake resends the current state.
    if (!isDev && !isQuitting) {
      createDisplayWindow();
    }
  });
};

// Function to create main and display windows
const createWindows = () => {
  mainWindow = createAppWindow(MAIN_WINDOW);
  createDisplayWindow();

  // Load URLs
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  // Open the DevTools in dev mode
  if (showDevTools) {
    mainWindow.webContents.openDevTools();
  }

  // IPC Handlers
  setupIPCHandlers();

  // Keyboard shortcuts
  mainWindow.on('focus', () => {
    if (!keyboardShortcutsDisabled) {
      registerKeyboardShortcuts();
    }
  });

  mainWindow.on('blur', () => {
    unregisterKeyboardShortcuts();
  });

  registerGlobalKeyboardShortcuts();

  // Registered once on the session (not inside the select-hid-device
  // handler, which would leak a new pair of listeners on every chooser
  // invocation). The session is captured here so nothing below touches
  // mainWindow, which may be null by the time a pending chooser resolves.
  const mainSession = mainWindow.webContents.session;

  mainSession.on('hid-device-added', (_event, device) => {
    console.log('hid-device-added FIRED WITH', device);
    // Optionally update details.deviceList
  });

  mainSession.on('hid-device-removed', (_event, device) => {
    console.log('hid-device-removed FIRED WITH', device);
    // Optionally update details.deviceList
  });

  mainSession.on('select-hid-device', (event, details, callback) => {
    event.preventDefault();
    if (details.deviceList && details.deviceList.length > 0) {
      callback(details.deviceList[0].deviceId);
    } else {
      // Cancel the request explicitly so it isn't left pending forever
      callback();
    }
  });

  mainSession.setPermissionCheckHandler(
    (_webContents, permission) => permission === 'hid'
  );

  mainSession.setDevicePermissionHandler(
    (details) => details.deviceType === 'hid'
  );

  // Window closed event
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (!isDev) {
      console.log('mainWindow closed');
      app.quit();
    }
  });
};

// Setup IPC handlers
function setupIPCHandlers() {
  ipcMain.on('update-score', (_, scores: Scores) => {
    cachedScores = scores;
    displayWindow?.webContents.send('score-updated', scores);
    broadcastToBrowserSourcesRewritten('score-updated', scores);
    persistLiveMatch();
  });

  ipcMain.on('update-time', (_, time: Time) => {
    cachedTime = time;
    displayWindow?.webContents.send('time-updated', time);
    broadcastToBrowserSourcesRewritten('time-updated', time);
    persistLiveMatch();
  });

  ipcMain.on('update-match-settings', (_, teamSettings: MatchSettings) => {
    setMatchSettings(teamSettings);
    cachedMatchSettings = teamSettings;
    displayWindow?.webContents.send('match-settings-updated', teamSettings);
    broadcastToBrowserSourcesRewritten('match-settings-updated', teamSettings);
  });

  ipcMain.on('update-app-settings', (_, appSettings: AppSettings) => {
    const previousShortcuts = getKeyboardShortcuts(cachedAppSettings);
    const previousBrowserSource = getBrowserSourceSettings(cachedAppSettings);

    setAppSettings(appSettings);
    cachedAppSettings = appSettings;
    displayWindow?.webContents.send('app-settings-updated', appSettings);
    broadcastToBrowserSourcesRewritten('app-settings-updated', appSettings);

    const nextShortcuts = getKeyboardShortcuts(cachedAppSettings);
    const shortcutsChanged =
      previousShortcuts.nextMatchPhase !== nextShortcuts.nextMatchPhase ||
      previousShortcuts.homeTeamScored !== nextShortcuts.homeTeamScored ||
      previousShortcuts.awayTeamScored !== nextShortcuts.awayTeamScored;

    // Re-register with the new bindings. If shortcuts are currently
    // disabled (a side menu is open) both sets are already unregistered -
    // leave them alone and let enable-keyboard-shortcuts pick up the new
    // bindings when the menu closes. The global Alt set is always on while
    // enabled; the focus set only registers while the main window has
    // focus.
    if (shortcutsChanged && !keyboardShortcutsDisabled) {
      // Unregister both sets before registering either replacement, a new
      // binding in one set could otherwise collide with a stale
      // registration still held by the other.
      const registerFocusSet = mainWindow?.isFocused() ?? false;
      unregisterGlobalKeyboardShortcuts();
      unregisterKeyboardShortcuts();
      registerGlobalKeyboardShortcuts();
      if (registerFocusSet) {
        registerKeyboardShortcuts();
      }
    }

    const nextBrowserSource = getBrowserSourceSettings(cachedAppSettings);
    if (
      previousBrowserSource.enabled !== nextBrowserSource.enabled ||
      previousBrowserSource.port !== nextBrowserSource.port
    ) {
      void queueBrowserSourceSettings(nextBrowserSource);
    }
  });

  ipcMain.on('update-match-state', (_, matchState: MatchState) => {
    cachedMatchState = matchState;
    displayWindow?.webContents.send('match-state-updated', matchState);
    broadcastToBrowserSourcesRewritten('match-state-updated', matchState);
    persistLiveMatch();
  });

  ipcMain.handle('get-live-match', () => {
    return liveMatchAtLaunch;
  });

  ipcMain.handle('get-browser-source-status', () => {
    const settings = getBrowserSourceSettings(cachedAppSettings);
    return {
      running: isBrowserSourceServerRunning(),
      port: getBrowserSourceServerPort() ?? settings.port,
      error: browserSourceError,
    };
  });

  // Display window signals it's ready to receive initial state
  ipcMain.on('display-ready', () => {
    if (!displayWindow) return;
    // Send settings first, then state/scores/time
    displayWindow.webContents.send(
      'match-settings-updated',
      cachedMatchSettings
    );
    displayWindow.webContents.send('app-settings-updated', cachedAppSettings);
    displayWindow.webContents.send('match-state-updated', cachedMatchState);
    displayWindow.webContents.send('score-updated', cachedScores);
    displayWindow.webContents.send('time-updated', cachedTime);
  });

  ipcMain.on('toggle-fullscreen', () => {
    const isFullScreen = displayWindow?.isFullScreen();
    displayWindow?.setFullScreen(!isFullScreen);
  });

  ipcMain.handle('get-fullscreen-status', () => {
    return displayWindow?.isFullScreen() ?? false;
  });

  ipcMain.on('get-version', (event) => {
    event.returnValue = app.getVersion();
  });

  ipcMain.handle('get-app-settings', async () => {
    try {
      return await getAppSettings();
    } catch (error) {
      console.error('Error getting app settings:', error);
      throw error;
    }
  });

  ipcMain.handle('get-match-settings', async () => {
    try {
      return getMatchSettings();
    } catch (error) {
      console.error('Error getting team settings:', error);
      throw error;
    }
  });

  ipcMain.on('get-screens', (event) => {
    event.reply('screens-info', screen.getAllDisplays());
  });

  ipcMain.handle('move-window-to-screen', (event, screenId) => {
    const displays = screen.getAllDisplays();
    const display = displays.find((d) => d.id === screenId);
    if (display && displayWindow) {
      displayWindow.setBounds({
        x: display.bounds.x,
        y: display.bounds.y,
        width: displayWindow.getBounds().width,
        height: displayWindow.getBounds().height,
      });
      displayWindow.setFullScreen(true);
    }
  });

  ipcMain.on('reset-windows', () => {
    displayWindow?.setFullScreen(false);
    resetWindow(displayWindow, DISPLAY_WINDOW, 50);
    resetWindow(mainWindow, MAIN_WINDOW, -50);
  });

  ipcMain.on('lock-windows', () => {
    lockWindows();
  });

  ipcMain.on('unlock-windows', () => {
    unlockWindows();
  });

  ipcMain.on('get-lock-status', (event) => {
    event.reply('lock-status-info', getLockStatus());
  });

  ipcMain.handle(
    'upload-image',
    async (_, buffer: Buffer, fileName: string, title: string) => {
      return await handleFileUpload(buffer, fileName, title);
    }
  );

  ipcMain.handle('delete-image', async (_, filePath: string) => {
    return handleFileDeletion(filePath);
  });

  ipcMain.handle(
    'upload-logo',
    async (_, buffer: Buffer, fileName: string) => {
      return saveImageFile(buffer, fileName);
    }
  );

  ipcMain.handle('get-custom-screens', () => {
    return getCustomScreens();
  });

  ipcMain.handle(
    'set-custom-screens',
    (event, customScreens: CustomScreen[]) => {
      try {
        setCustomScreens(customScreens);
        return { success: true };
      } catch (error) {
        console.error('Error setting custom screens:', error);
        return { success: false, error: error.message };
      }
    }
  );

  ipcMain.handle('get-saved-match-settings', () => {
    return getSavedMatchSettings();
  });

  ipcMain.handle(
    'set-saved-match-settings',
    (event, savedMatchSettings: MatchSettings[]) => {
      try {
        setSavedMatchSettings(savedMatchSettings);
        return { success: true };
      } catch (error) {
        console.error('Error setting saved match settings:', error);
        return { success: false, error: error.message };
      }
    }
  );

  ipcMain.on('custom-screens-updated', (event, screens) => {
    mainWindow?.webContents.send('custom-screens-updated', screens);
    displayWindow?.webContents.send('custom-screens-updated', screens);
  });

  ipcMain.handle('check-for-updates', async () => {
    try {
      const updates = await checkForUpdates();
      return { success: true, updates };
    } catch (error) {
      console.error('Check for updates failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.on('open-url-in-browser', (_event, url: string) => {
    // url comes from an IPC caller, only hand http(s) URLs to the OS.
    // Anything else (file:, javascript:, custom protocols, unparseable
    // strings) is logged and ignored.
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        console.error('Blocked non-http(s) URL from opening in browser:', url);
        return;
      }
    } catch {
      console.error('Blocked invalid URL from opening in browser:', url);
      return;
    }
    shell.openExternal(url).catch((error) => {
      console.error('Failed to open URL in browser:', error);
    });
  });

  // Disable/enable both shortcut sets (the focus set and the global Alt set)
  // so no shortcut fires while the user is typing in a text field
  ipcMain.on('enable-keyboard-shortcuts', () => {
    keyboardShortcutsDisabled = false;
    registerKeyboardShortcuts();
    registerGlobalKeyboardShortcuts();
  });

  ipcMain.on('disable-keyboard-shortcuts', () => {
    keyboardShortcutsDisabled = true;
    unregisterKeyboardShortcuts();
    unregisterGlobalKeyboardShortcuts();
  });
}

// Setup display listeners
function setupDisplayListeners() {
  screen.on('display-added', () => {
    ensureWindowsAreVisible(); // Ensure windows are visible when a display is added
    mainWindow?.webContents.send('display-change', screen.getAllDisplays());
  });

  screen.on('display-removed', () => {
    ensureWindowsAreVisible(); // Ensure windows are visible when a display is removed
    mainWindow?.webContents.send('display-change', screen.getAllDisplays());
  });
}

// Keyboard shortcuts
// Track exactly which accelerators are registered right now (bindings can
// change between a register and its matching unregister, e.g. via a
// rebind), so unregistering always removes precisely those accelerators
// and never leaves a stale one behind.
let registeredFocusAccelerators: string[] = [];
let registeredGlobalAccelerators: string[] = [];

function getShortcutBindings(): Array<{ accelerator: string; channel: string }> {
  const shortcuts = getKeyboardShortcuts(cachedAppSettings);
  return [
    { accelerator: shortcuts.nextMatchPhase, channel: 'next-match-phase' },
    { accelerator: shortcuts.homeTeamScored, channel: 'home-team-scored' },
    { accelerator: shortcuts.awayTeamScored, channel: 'away-team-scored' },
  ];
}

const registerKeyboardShortcuts = () => {
  // Idempotent: clear any tracked registrations first so a repeated focus
  // event can't reset the tracking while the shortcuts stay registered.
  unregisterKeyboardShortcuts();
  const failed: string[] = [];

  getShortcutBindings().forEach(({ accelerator, channel }) => {
    // globalShortcut.register only returns false for conflicts, a
    // malformed accelerator string (e.g. from a corrupt config) THROWS, so
    // catch it and keep going rather than crashing the main process.
    let registered = false;
    try {
      registered = globalShortcut.register(accelerator, () => {
        mainWindow?.webContents.send(channel);
      });
    } catch (error) {
      console.error(`Invalid keyboard shortcut "${accelerator}":`, error);
    }
    if (registered) {
      registeredFocusAccelerators.push(accelerator);
    } else {
      failed.push(accelerator);
    }
  });

  if (failed.length > 0) {
    console.error('Failed to register keyboard shortcut(s):', failed);
  }
};

const unregisterKeyboardShortcuts = () => {
  registeredFocusAccelerators.forEach((accelerator) =>
    globalShortcut.unregister(accelerator)
  );
  registeredFocusAccelerators = [];
};

const registerGlobalKeyboardShortcuts = () => {
  // Idempotent: see registerKeyboardShortcuts.
  unregisterGlobalKeyboardShortcuts();
  const failed: string[] = [];

  getShortcutBindings().forEach(({ accelerator, channel }) => {
    const globalAccelerator = deriveGlobalAccelerator(accelerator);
    // Accelerators that already include Alt have no separate global variant.
    if (!globalAccelerator) return;

    // See registerKeyboardShortcuts: register throws on malformed
    // accelerators instead of returning false.
    let registered = false;
    try {
      registered = globalShortcut.register(globalAccelerator, () => {
        mainWindow?.webContents.send(channel);
      });
    } catch (error) {
      console.error(
        `Invalid global keyboard shortcut "${globalAccelerator}":`,
        error
      );
    }
    if (registered) {
      registeredGlobalAccelerators.push(globalAccelerator);
    } else {
      failed.push(globalAccelerator);
    }
  });

  if (failed.length > 0) {
    console.error('Failed to register global keyboard shortcut(s):', failed);
  }
};

const unregisterGlobalKeyboardShortcuts = () => {
  registeredGlobalAccelerators.forEach((accelerator) =>
    globalShortcut.unregister(accelerator)
  );
  registeredGlobalAccelerators = [];
};

// App ready event
app.on('ready', async () => {
  // Initialize cached settings from storage so display gets something sane immediately
  try {
    const storedApp = await getAppSettings();
    if (storedApp) cachedAppSettings = storedApp as AppSettings;
  } catch {
    // Ignore invalid or missing cached app settings.
  }
  try {
    const storedMatch = getMatchSettings();
    if (storedMatch) cachedMatchSettings = storedMatch as MatchSettings;
  } catch {
    // Ignore invalid or missing cached match settings.
  }
  try {
    liveMatchAtLaunch = getLiveMatch();
  } catch {
    // Ignore invalid or missing persisted live match.
  }
  // Off by default; only binds a 127.0.0.1 server if explicitly enabled in
  // settings. Startup errors (e.g. a busy port) are caught inside and never
  // reach here.
  void queueBrowserSourceSettings(getBrowserSourceSettings(cachedAppSettings));
  createWindows();
  setupDisplayListeners();
  ensureWindowsAreVisible();
  const menu = Menu.buildFromTemplate([
    {
      label: 'PlayOverlay',
      submenu: [{ role: 'quit' }, { role: 'about' }],
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: 'Select All', accelerator: 'CmdOrCtrl+A', role: 'selectAll' },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);
});

// All windows closed event
app.on('window-all-closed', () => {
  if (!isDev && quitWhenAllWindowsClose) {
    console.log('window-all-closed');
    app.quit();
  }
});

// Prevent DevTools in production
if (!isDev) {
  app.on('browser-window-created', (_, window) => {
    window.webContents.on('before-input-event', (event, input) => {
      if (
        ((input.control || input.meta) &&
          input.shift &&
          input.key.toLowerCase() === 'i') ||
        input.key === 'F12'
      ) {
        event.preventDefault();
      }
    });
    window.webContents.on('devtools-opened', () => {
      window.webContents.closeDevTools();
    });
  });
}

// App lock functions
function lockWindows() {
  if (mainWindow && displayWindow) {
    mainWindow.focus();
    displayWindow.focus();
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    displayWindow.setAlwaysOnTop(true, 'screen-saver');
    if (powerSaveBlockerId === null) {
      powerSaveBlockerId = powerSaveBlocker.start('prevent-display-sleep');
    }
    isLocked = true;
  }
}

function unlockWindows() {
  if (mainWindow && displayWindow) {
    mainWindow.setAlwaysOnTop(false);
    displayWindow.setAlwaysOnTop(false);
    if (
      powerSaveBlockerId !== null &&
      powerSaveBlocker.isStarted(powerSaveBlockerId)
    ) {
      powerSaveBlocker.stop(powerSaveBlockerId);
      powerSaveBlockerId = null;
    }
    isLocked = false;
  }
}

function getLockStatus() {
  return isLocked;
}

function ensureWindowsAreVisible() {
  const displays = screen.getAllDisplays();
  const visibleBounds = displays.reduce(
    (acc, display) => {
      return {
        x: Math.min(acc.x, display.bounds.x),
        y: Math.min(acc.y, display.bounds.y),
        width: Math.max(acc.width, display.bounds.x + display.bounds.width),
        height: Math.max(acc.height, display.bounds.y + display.bounds.height),
      };
    },
    { x: Infinity, y: Infinity, width: -Infinity, height: -Infinity }
  );

  const checkAndMoveWindow = (
    window: BrowserWindow | null,
    windowName: WindowName
  ) => {
    if (window) {
      const [windowX, windowY] = window.getPosition();
      const windowBounds = window.getBounds();

      const isVisible =
        windowX >= visibleBounds.x &&
        windowY >= visibleBounds.y &&
        windowX + windowBounds.width <= visibleBounds.width &&
        windowY + windowBounds.height <= visibleBounds.height;

      if (!isVisible) {
        resetWindow(window, windowName);
        unlockWindows(); // Unlock windows if they are moved
      }
    }
  };

  checkAndMoveWindow(mainWindow, MAIN_WINDOW);
  checkAndMoveWindow(displayWindow, DISPLAY_WINDOW);
}

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  flushLiveMatch();
  globalShortcut.unregisterAll();
  void stopBrowserSourceServer();
});
