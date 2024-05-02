import {
  app,
  BrowserWindow,
  ipcMain,
  Settings,
  powerSaveBlocker,
  screen,
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

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null;
let displayWindow: BrowserWindow | null;
let powerSaveBlockerId: number | null = null;

function createAppWindow(windowName: WindowName) {
  const commonOptions = {
    autoHideMenuBar: true,
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

const createWindow = () => {
  mainWindow = createAppWindow(MAIN_WINDOW);
  displayWindow = createAppWindow(DISPLAY_WINDOW);

  // and load the index.html of the app.
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
  // mainWindow.webContents.openDevTools();
  // displayWindow.webContents.openDevTools();

  // Handle IPC
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
    return displayWindow?.isFullScreen(); // Return the fullscreen status
  });

  ipcMain.handle('start-power-save-blocker', () => {
    if (powerSaveBlockerId === null) {
      // Ensuring it's not already started
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
    }
  });

  ipcMain.handle('get-team-settings', async () => {
    try {
      return await getTeamSettings();
    } catch (error) {
      console.error('Error getting team settings:', error);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  displayWindow.on('closed', () => {
    displayWindow = null;
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  createWindow();
  setupScreenHandling();
  setupDisplayListeners();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

function setupDisplayListeners() {
  screen.on('display-added', (_, newDisplay) => {
    mainWindow?.webContents.send('display-change', screen.getAllDisplays());
  });

  screen.on('display-removed', (_, oldDisplay) => {
    mainWindow?.webContents.send('display-change', screen.getAllDisplays());
  });
}

function getAllScreens(): Electron.Display[] {
  return screen.getAllDisplays();
}

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
  }
}

function setupScreenHandling() {
  ipcMain.on('get-screens', (event) => {
    event.reply('screens-info', getAllScreens());
  });

  ipcMain.on('move-window-to-screen', (_, screenId) => {
    const displays = getAllScreens();
    const display = displays.find((d) => d.id === screenId);
    if (display) {
      sendToScreen(displayWindow, display);
    }
  });
}

ipcMain.handle('move-window-to-screen', (event, screenId) => {
  const displays = screen.getAllDisplays();
  const display = displays.find((d) => d.id === screenId);
  if (display && mainWindow) {
    mainWindow.setBounds({
      x: display.bounds.x,
      y: display.bounds.y,
      width: mainWindow.getBounds().width,
      height: mainWindow.getBounds().height,
    });
  }
});
