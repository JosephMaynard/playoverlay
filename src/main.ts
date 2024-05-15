import {
  app,
  BrowserWindow,
  ipcMain,
  Settings,
  powerSaveBlocker,
  screen,
  Menu,
} from 'electron';
import path from 'path';

import {
  AppSettings,
  MatchSettings,
  Scores,
  TeamSettingsInterface,
  Time,
} from './types';
import {
  DISPLAY_WINDOW,
  MAIN_WINDOW,
  WindowName,
  getAppSettings,
  getTeamSettings,
  getWindowPosition,
  getWindowSize,
  setAppSettings,
  setTeamSettings,
  setWindowPosition,
  setWindowSize,
} from './storage';

const isDev = process.env.NODE_ENV !== 'production';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null;
let displayWindow: BrowserWindow | null;
let powerSaveBlockerId: number | null = null;
let isLocked = false; // Track lock status

// Prevent more than one instance of the app running
const additionalData = { playOverlay: 'PlayOverlay' };
const gotTheLock = app.requestSingleInstanceLock(additionalData);

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Function to create windows
function createAppWindow(windowName: WindowName) {
  const commonOptions = {
    autoHideMenuBar: true,
    minWidth: 700,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  };

  const size = getWindowSize(windowName);
  const position = getWindowPosition(windowName);
  const specificOptions = {
    width: size[0],
    height: size[1],
    x: position?.[0],
    y: position?.[1],
  };

  const window = new BrowserWindow({ ...commonOptions, ...specificOptions });

  window.on('resized', () => {
    try {
      setWindowSize(windowName, window.getSize());
    } catch (error) {
      console.error(`Error when resizing ${windowName}:`, error);
    }
  });

  window.on('moved', () => {
    try {
      setWindowPosition(windowName, window.getPosition());
    } catch (error) {
      console.error(`Error when moving ${windowName}:`, error);
    }
  });

  return window;
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

  // Open the DevTools.
  // if (process.env.NODE_ENV !== 'production') {
  //   mainWindow.webContents.openDevTools();
  //   displayWindow.webContents.openDevTools();
  // }

  // IPC Handlers
  setupIPCHandlers();

  // Window closed event
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  displayWindow.on('closed', () => {
    displayWindow = null;
  });
};

// Setup IPC handlers
function setupIPCHandlers() {
  ipcMain.on('update-score', (_, scores: Scores) => {
    displayWindow?.webContents.send('score-updated', scores);
  });

  ipcMain.on('update-time', (_, time: Time) => {
    displayWindow?.webContents.send('time-updated', time);
  });

  ipcMain.on('update-settings', (_, settings: Settings) => {
    displayWindow?.webContents.send('settings-updated', settings);
  });

  ipcMain.on(
    'update-team-settings',
    (_, teamSettings: TeamSettingsInterface) => {
      setTeamSettings(teamSettings);
      displayWindow?.webContents.send('team-settings-updated', teamSettings);
    }
  );

  ipcMain.on('update-app-settings', (_, appSettings: AppSettings) => {
    setAppSettings(appSettings);
    displayWindow?.webContents.send('app-settings-updated', appSettings);
  });

  ipcMain.on('update-match-settings', (_, matchSettings: MatchSettings) => {
    displayWindow?.webContents.send('match-settings-updated', matchSettings);
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

  ipcMain.handle('get-team-settings', async () => {
    try {
      return await getTeamSettings();
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

  ipcMain.handle('get-lock-status', () => {
    return getLockStatus();
  });
}

// Reset window to default position
function resetWindow(
  window: BrowserWindow | null,
  windowName: WindowName,
  offset: number = 0,
  windowWidth: number = 800,
  windowHeight: number = 600
) {
  if (window) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const x =
      Math.floor(primaryDisplay.bounds.x + (width - windowWidth) / 2) + offset;
    const y =
      Math.floor(primaryDisplay.bounds.y + (height - windowHeight) / 2) +
      offset;

    if (window.isMinimized()) window.restore();
    if (window.isFullScreen()) window.setFullScreen(false);
    window.focus();
    window.setAlwaysOnTop(true);
    window.setAlwaysOnTop(false);
    window.setBounds({ x, y, width: windowWidth, height: windowHeight });

    setWindowPosition(windowName, window.getPosition());
    setWindowSize(windowName, window.getSize());
  }
}

// Send window to a specific screen
function sendToScreen(
  window: BrowserWindow | null,
  display: Electron.Display
): void {
  if (window) {
    const { bounds } = display;
    window.setBounds({
      x: bounds.x,
      y: bounds.y,
      width: window.getBounds().width,
      height: window.getBounds().height,
    });
    window.focus();
    window.setAlwaysOnTop(true);
    window.setAlwaysOnTop(false);
  }
}

// Setup display listeners
function setupDisplayListeners() {
  screen.on('display-added', (_, newDisplay) => {
    mainWindow?.webContents.send('display-change', screen.getAllDisplays());
  });

  screen.on('display-removed', (_, oldDisplay) => {
    mainWindow?.webContents.send('display-change', screen.getAllDisplays());
  });
}

// App ready event
app.on('ready', () => {
  createWindows();
  setupDisplayListeners();
  const menu = Menu.buildFromTemplate([
    {
      label: 'PlayOverlay',
      submenu: [{ role: 'quit' }, { role: 'about' }],
    },
  ]);
  Menu.setApplicationMenu(menu);
});

// All windows closed event
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// App activate event
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindows();
  }
});

// Prevent DevTools in production
if (isDev) {
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
