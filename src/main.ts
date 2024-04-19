import { app, BrowserWindow, ipcMain, Settings } from 'electron';
import path from 'path';
import { Scores, Time } from './types';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null;
let displayWindow: BrowserWindow | null;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  displayWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    displayWindow.loadURL(
      `${MAIN_WINDOW_VITE_DEV_SERVER_URL}/display/index.html`
    );
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
    displayWindow.loadFile(
      path.join(
        __dirname,
        `../renderer/${MAIN_WINDOW_VITE_NAME}/display/index.html`
      )
    );
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
  displayWindow.webContents.openDevTools();

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

  ipcMain.on('toggle-fullscreen', () => {
    const isFullScreen = displayWindow?.isFullScreen();
    displayWindow?.setFullScreen(!isFullScreen);
  });

  ipcMain.handle('get-fullscreen-status', () => {
    return displayWindow?.isFullScreen(); // Return the fullscreen status
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
