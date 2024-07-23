import * as Sentry from '@sentry/electron/main';
import {
  app,
  BrowserWindow,
  ipcMain,
  Settings,
  powerSaveBlocker,
  screen,
  Menu,
  protocol,
  dialog,
  shell,
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
  deleteLicenceKey,
  getAppSettings,
  getCustomScreens,
  getTeamSettings,
  setAppSettings,
  setTeamSettings,
} from './main-functions/storage';
import createAppWindow from './main-functions/createAppWindow';
import resetWindow from './main-functions/resetWindow';
import sendToScreen from './main-functions/sendToScreen';
import isLicensed, { getLicencedData } from './main-functions/isLicensed';
import {
  handleFileDeletion,
  handleFileUpload,
} from './main-functions/fileHandler';
import isDemoMode from './main-functions/isDemoMode';
import {
  getSystemInfo,
  getEncodedSystemInfo,
} from './main-functions/getSystemInfo';
import saveLicenceKey from './main-functions/saveLicenceKey';
import openActivationLink from './main-functions/openActivationLink';
import {
  checkForUpdates,
  checkInternetConnection,
  deactivateLicenceKey,
  renewLicenceKey,
} from './main-functions/apiRequests';
import checkLicenceExpiry from './main-functions/checkLicenceExpiry';

Sentry.init({
  dsn: 'https://556706afa7ed94da620b5b704d9f6d50@o4507562253352960.ingest.de.sentry.io/4507562261610576',
});

const SHOW_DEV_TOOLS = false;

export const isDev = process.env.NODE_ENV === 'development';
let quitWhenAllWindowsClose = true;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  console.log('electron-squirrel-startup');
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

if (!gotTheLock && !isDev) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

protocol.registerSchemesAsPrivileged([
  { scheme: 'playoverlay', privileges: { standard: true, secure: true } },
]);

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('playoverlay', process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient('playoverlay');
}

// Function to create the registration window
function createActivationWindow() {
  activationWindow = new BrowserWindow({
    autoHideMenuBar: true,
    minWidth: 400,
    minHeight: 400,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: !isDev,
    },
  });

  // Load the registration HTML or URL
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    activationWindow.loadURL(
      `${ACTIVATION_WINDOW_VITE_DEV_SERVER_URL}/activation.html`
    );
  } else {
    activationWindow.loadFile(
      path.join(
        __dirname,
        `../renderer/${ACTIVATION_WINDOW_VITE_NAME}/activation.html`
      )
    );
  }

  activationWindow.on('closed', () => {
    activationWindow = null;
  });

  ipcMain.handle('get-encoded-system-info-activation-window', async () => {
    const systemInfo = await getEncodedSystemInfo();
    return systemInfo;
  });

  ipcMain.handle(
    'save-licence-key-activation-window',
    async (event, licenceKey: string) => {
      const saveLicenceKeyResult = await saveLicenceKey(licenceKey, true);
      return saveLicenceKeyResult;
    }
  );

  ipcMain.on('run-in-demo-mode', () => {
    openMainAndDisplayWindows();
  });

  ipcMain.on('open-activation-link-activation-window', () => {
    openActivationLink();
  });

  ipcMain.on('open-buy-now-link', () => {
    shell.openExternal('https://account.playoverlay.com/');
  });

  // Open the DevTools in dev mode
  if (SHOW_DEV_TOOLS && isDev) {
    activationWindow.webContents.openDevTools();
  }

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
  if (SHOW_DEV_TOOLS && process.env.NODE_ENV !== 'production') {
    mainWindow.webContents.openDevTools();
    displayWindow.webContents.openDevTools();
  }

  // IPC Handlers
  setupIPCHandlers();

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

// Function to open main and display windows
function openMainAndDisplayWindows() {
  if (activationWindow) {
    activationWindow.close();
    activationWindow = null;
  }
  createWindows();
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
    event.returnValue = `${app.getVersion()}${isDemoMode() ? ' DEMO MODE' : ''}`;
  });

  ipcMain.handle('get-system-info', async () => {
    const systemInfo = await getSystemInfo();
    return systemInfo;
  });

  ipcMain.handle('save-licence-key', async (event, licenceKey: string) => {
    const saveLicenceKeyResult = await saveLicenceKey(licenceKey, true);
    return saveLicenceKeyResult;
  });

  ipcMain.handle('get-encoded-system-info', async () => {
    const systemInfo = await getEncodedSystemInfo();
    return systemInfo;
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

  ipcMain.handle('get-demo-mode', () => isDemoMode());

  ipcMain.on('delete-licence-key', async () => {
    try {
      const success = await deactivateLicenceKey();

      if (!success) {
        console.error('Deactivate licence key API call failed');
      }
    } catch (err) {
      console.error('Deactivate licence key API call failed');
    }

    deleteLicenceKey();
    app.relaunch();
    app.exit();
  });

  ipcMain.handle('get-licence-data', () => {
    return getLicencedData();
  });

  ipcMain.on('open-activation-link', () => {
    openActivationLink();
  });

  ipcMain.handle('renew-licence-key', async () => {
    try {
      const token = await renewLicenceKey();
      return { success: true, token };
    } catch (error) {
      console.error('Renew license key failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('deactivate-licence-key', async () => {
    try {
      const success = await deactivateLicenceKey();
      return { success };
    } catch (error) {
      console.error('Delete license key failed:', error);
      return { success: false, error: error.message };
    }
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

  ipcMain.handle('check-internet-connection', async () => {
    try {
      const isConnected = await checkInternetConnection();
      return { success: true, isConnected };
    } catch (error) {
      console.error('Check internet connection failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.on('open-url-in-browser', (event, url: string) => {
    shell.openExternal(url);
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
app.on('ready', async () => {
  const isLicencedResult = await isLicensed();
  if (isLicencedResult.licenced === true) {
    createWindows();
    setupDisplayListeners();
    ensureWindowsAreVisible();
    checkLicenceExpiry();
  } else {
    createActivationWindow();
  }
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

if (process.platform === 'darwin') {
  // Handle the protocol. In this case, we choose to show an Error Box.
  app.on('open-url', async (event, url) => {
    if (isDemoMode()) {
      const jwt = new URL(url).searchParams.get('jwt');
      const { error } = await saveLicenceKey(jwt, true);
      if (error) {
        dialog.showErrorBox('An error occured', error);
      }
    }
  });
}
