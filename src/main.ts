import * as Sentry from '@sentry/electron/main';
import {
  app,
  BrowserWindow,
  ipcMain,
  Settings,
  powerSaveBlocker,
  screen,
  Menu,
  shell,
  globalShortcut,
} from 'electron';
import path from 'path';
import {
  AppSettings,
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
import sendToScreen from './main-functions/sendToScreen';
import {
  handleFileDeletion,
  handleFileUpload,
} from './main-functions/fileHandler';
import { checkForUpdates } from './main-functions/apiRequests';

// Crash reporting is opt-in: builds without SENTRY_DSN send nothing.
if (__SENTRY_DSN__) {
  Sentry.init({
    dsn: __SENTRY_DSN__,
    enabled: process.env.NODE_ENV === 'production',
  });
}

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

function persistLiveMatch() {
  try {
    setLiveMatch({
      scores: cachedScores,
      time: cachedTime,
      matchState: cachedMatchState,
      savedAt: Date.now(),
    });
  } catch (error) {
    console.error('Error persisting live match:', error);
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

// Function to create main and display windows
const createWindows = () => {
  mainWindow = createAppWindow(MAIN_WINDOW);
  displayWindow = createAppWindow(DISPLAY_WINDOW);

  // Load URLs
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    displayWindow.loadURL(`${DISPLAY_WINDOW_VITE_DEV_SERVER_URL}/display.html`);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
    displayWindow.loadFile(
      path.join(
        __dirname,
        `../renderer/${DISPLAY_WINDOW_VITE_NAME}/display.html`
      )
    );
  }

  // Open the DevTools in dev mode
  if (showDevTools) {
    mainWindow.webContents.openDevTools();
    displayWindow.webContents.openDevTools();
  }

  // IPC Handlers
  setupIPCHandlers();

  // Keyboard shortcuts
  mainWindow.on('focus', () => {
    registerKeyboardShortcuts();
  });

  mainWindow.on('blur', () => {
    unregisterKeyboardShortcuts();
  });

  registerGlobalKeyboardShortcuts();

  mainWindow.webContents.session.on(
    'select-hid-device',
    (event, details, callback) => {
      // Add events to handle devices being added or removed before the callback on
      // `select-hid-device` is called.
      mainWindow.webContents.session.on('hid-device-added', (event, device) => {
        console.log('hid-device-added FIRED WITH', device);
        // Optionally update details.deviceList
      });

      mainWindow.webContents.session.on(
        'hid-device-removed',
        (event, device) => {
          console.log('hid-device-removed FIRED WITH', device);
          // Optionally update details.deviceList
        }
      );

      event.preventDefault();
      if (details.deviceList && details.deviceList.length > 0) {
        callback(details.deviceList[0].deviceId);
      }
    }
  );

  mainWindow.webContents.session.setPermissionCheckHandler(
    (_webContents, permission, _requestingOrigin, _details) => {
      if (permission === 'hid') {
        return true;
      }
    }
  );

  mainWindow.webContents.session.setDevicePermissionHandler((details) => {
    if (details.deviceType === 'hid') {
      return true;
    }
  });

  // Window closed event
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (!isDev) {
      console.log('mainWindow closed');
      app.quit();
    }
  });

  displayWindow.on('closed', () => {
    displayWindow = null;
  });
};

// Setup IPC handlers
function setupIPCHandlers() {
  ipcMain.on('update-score', (_, scores: Scores) => {
    cachedScores = scores;
    displayWindow?.webContents.send('score-updated', scores);
    persistLiveMatch();
  });

  ipcMain.on('update-time', (_, time: Time) => {
    cachedTime = time;
    displayWindow?.webContents.send('time-updated', time);
    persistLiveMatch();
  });

  ipcMain.on('update-settings', (_, settings: Settings) => {
    displayWindow?.webContents.send('settings-updated', settings);
  });

  ipcMain.on('update-match-settings', (_, teamSettings: MatchSettings) => {
    setMatchSettings(teamSettings);
    cachedMatchSettings = teamSettings;
    displayWindow?.webContents.send('match-settings-updated', teamSettings);
  });

  ipcMain.on('update-app-settings', (_, appSettings: AppSettings) => {
    setAppSettings(appSettings);
    cachedAppSettings = appSettings;
    displayWindow?.webContents.send('app-settings-updated', appSettings);
  });

  ipcMain.on('update-match-state', (_, matchState: MatchState) => {
    cachedMatchState = matchState;
    displayWindow?.webContents.send('match-state-updated', matchState);
    persistLiveMatch();
  });

  ipcMain.handle('get-live-match', () => {
    return liveMatchAtLaunch;
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
    return displayWindow?.isFullScreen();
  });

  ipcMain.handle('start-power-save-blocker', () => {
    if (powerSaveBlockerId === null) {
      powerSaveBlockerId = powerSaveBlocker.start('prevent-app-suspension');
    }
    return powerSaveBlocker.isStarted(powerSaveBlockerId);
  });

  ipcMain.handle('stop-power-save-blocker', () => {
    if (
      powerSaveBlockerId !== null &&
      powerSaveBlocker.isStarted(powerSaveBlockerId)
    ) {
      powerSaveBlocker.stop(powerSaveBlockerId);
      powerSaveBlockerId = null;
    }
    return powerSaveBlockerId === null;
  });

  ipcMain.handle('get-power-save-blocker-status', () => {
    return (
      powerSaveBlockerId !== null &&
      powerSaveBlocker.isStarted(powerSaveBlockerId)
    );
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

  ipcMain.on('move-window-to-screen', (_, screenId) => {
    const displays = screen.getAllDisplays();
    const display = displays.find((d) => d.id === screenId);
    if (display) {
      sendToScreen(displayWindow, display);
    }
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

  ipcMain.on('open-url-in-browser', (event, url: string) => {
    shell.openExternal(url);
  });

  ipcMain.on('enable-keyboard-shortcuts', () => {
    registerKeyboardShortcuts();
  });

  ipcMain.on('disable-keyboard-shortcuts', () => {
    unregisterKeyboardShortcuts();
  });
}

// Setup display listeners
function setupDisplayListeners() {
  screen.on('display-added', (_, newDisplay) => {
    ensureWindowsAreVisible(); // Ensure windows are visible when a display is added
    mainWindow?.webContents.send('display-change', screen.getAllDisplays());
  });

  screen.on('display-removed', (_, oldDisplay) => {
    ensureWindowsAreVisible(); // Ensure windows are visible when a display is removed
    mainWindow?.webContents.send('display-change', screen.getAllDisplays());
  });
}

// Keyboard shortcuts
const registerKeyboardShortcuts = () => {
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    mainWindow?.webContents.send('next-match-phase');
  });

  globalShortcut.register('CommandOrControl+Shift+h', () => {
    mainWindow?.webContents.send('home-team-scored');
  });

  globalShortcut.register('CommandOrControl+Shift+a', () => {
    mainWindow?.webContents.send('away-team-scored');
  });
};

const unregisterKeyboardShortcuts = () => {
  globalShortcut.unregister('CommandOrControl+Shift+Space');
  globalShortcut.unregister('CommandOrControl+Shift+h');
  globalShortcut.unregister('CommandOrControl+Shift+a');
};

const registerGlobalKeyboardShortcuts = () => {
  globalShortcut.register('CommandOrControl+Alt+Shift+Space', () => {
    mainWindow?.webContents.send('next-match-phase');
  });
  globalShortcut.register('CommandOrControl+Alt+Shift+H', () => {
    mainWindow?.webContents.send('home-team-scored');
  });
  globalShortcut.register('CommandOrControl+Alt+Shift+A', () => {
    mainWindow?.webContents.send('away-team-scored');
  });
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

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
