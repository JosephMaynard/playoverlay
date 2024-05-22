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
  getCustomScreens,
  getTeamSettings,
  setAppSettings,
  setTeamSettings,
} from './storage';
import createAppWindow from './main-functions/createAppWindow';
import resetWindow from './main-functions/resetWindow';
import sendToScreen from './main-functions/sendToScreen';
import isLicensed from './main-functions/isLicensed';
import {
  handleFileDeletion,
  handleFileUpload,
} from './main-functions/fileHandler';

const isDev = process.env.NODE_ENV !== 'production';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null;
let displayWindow: BrowserWindow | null;
let activationWindow: BrowserWindow | null;
let powerSaveBlockerId: number | null = null;
let isLocked = false; // Track lock status

// Prevent more than one instance of the app running
const additionalData = { playOverlay: 'PlayOverlay' };
const gotTheLock = app.requestSingleInstanceLock(additionalData);

if (!gotTheLock && process.env.NODE_ENV === 'production') {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Function to create the registration window
function createActivationWindow() {
  activationWindow = new BrowserWindow({
    autoHideMenuBar: true,
    minWidth: 400,
    minHeight: 300,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the registration HTML or URL
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    activationWindow.loadURL(
      `${ACTIVATION_WINDOW_VITE_DEV_SERVER_URL}/activation.html`
    );
  } else {
    activationWindow.loadFile(
      `../renderer/${ACTIVATION_WINDOW_VITE_NAME}/activation.html`
    );
  }

  activationWindow.on('closed', () => {
    activationWindow = null;
  });

  return activationWindow;
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

// Function to open main and display windows
function openMainAndDisplayWindows() {
  if (activationWindow) {
    activationWindow.close();
    activationWindow = null;
  }
  createWindows();
}

// Function to open registration window and close main & display windows
function openactivationWindow() {
  if (mainWindow) {
    mainWindow.close();
    mainWindow = null;
  }
  if (displayWindow) {
    displayWindow.close();
    displayWindow = null;
  }
  createActivationWindow();
}

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

  ipcMain.on('custom-screens-updated', (event, screens) => {
    mainWindow?.webContents.send('custom-screens-updated', screens);
    displayWindow?.webContents.send('custom-screens-updated', screens);
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

// App ready event
app.on('ready', () => {
  if (isLicensed()) {
    createWindows();
    setupDisplayListeners();
    ensureWindowsAreVisible(); // Ensure windows are visible on startup
  } else {
    createActivationWindow();
  }
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
