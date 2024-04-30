import {
  app,
  BrowserWindow,
  ipcMain,
  Settings,
  powerSaveBlocker,
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

const createWindow = () => {
  // Create the mainWindow.
  const mainWindowSize = getWindowSize(MAIN_WINDOW);
  const mainWindowPosition = getWindowPosition(MAIN_WINDOW);

  mainWindow = new BrowserWindow({
    width: mainWindowSize[0],
    height: mainWindowSize[1],
    x: mainWindowPosition?.[0],
    y: mainWindowPosition?.[1],
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: false,
    },
  });

  mainWindow.on('resized', () =>
    setWindowSize(MAIN_WINDOW, mainWindow.getSize())
  );

  mainWindow.on('moved', () =>
    setWindowPosition(MAIN_WINDOW, mainWindow.getPosition())
  );

  // Create display window
  const displayWindowSize = getWindowSize(DISPLAY_WINDOW);
  const displayWindowPosition = getWindowPosition(DISPLAY_WINDOW);
  displayWindow = new BrowserWindow({
    width: displayWindowSize[0],
    height: displayWindowSize[1],
    x: displayWindowPosition?.[0],
    y: displayWindowPosition?.[1],
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: false,
    },
  });

  displayWindow.on('resized', () =>
    setWindowSize(DISPLAY_WINDOW, displayWindow.getSize())
  );

  displayWindow.on('moved', () =>
    setWindowPosition(DISPLAY_WINDOW, displayWindow.getPosition())
  );

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
    return getAppSettings();
  });

  ipcMain.handle('get-team-settings', async () => {
    return getTeamSettings();
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
app.on('ready', createWindow);

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
