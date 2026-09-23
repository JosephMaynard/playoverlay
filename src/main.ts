// Must stay the first import: it can redirect userData, which the modules
// below read while they load. See userDataOverride.ts.
import './main-functions/userDataOverride';
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  powerSaveBlocker,
  screen,
  Menu,
  shell,
  globalShortcut,
} from 'electron';
import squirrelStartup from 'electron-squirrel-startup';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import {
  AppSettings,
  BrowserSourceSettings,
  CustomScreen,
  LiveMatch,
  MatchState,
  RemoteControlSettings,
  Scores,
  Time,
} from './types';
import {
  defaultAppSettings,
  defaultMatchSettings,
  defaultMatchState,
  defaultScores,
} from './constants';
import {
  appSettingsSchema,
  customScreenListSchema,
  matchEventLogSchema,
  MatchSettings,
  matchSetingsSchema,
  matchSettingsListSchema,
  matchStateSchema,
  scoresSchema,
  timeSchema,
} from './zodSchemas';
import {
  deriveGlobalAccelerator,
  getBrowserSourceSettings,
  getKeyboardShortcuts,
  getRemoteControlSettings,
  nearestSupportedLanguage,
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
  reconcileCustomScreensReadOnly,
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
import {
  RemoteCommand,
  RemoteControlSnapshot,
  broadcastRemoteControlState,
  getLanIPv4,
  getRemoteControlConnectedCount,
  getRemoteControlServerPort,
  isRemoteControlServerRunning,
  startRemoteControlServer,
  stopRemoteControlServer,
} from './main-functions/remoteControlServer';
import {
  getLogger,
  initLogger,
  logError,
  logFailedOperation,
  logInfo,
  logMatchEvent,
  sanitizeLogPath,
} from './main-functions/logger';
import {
  buildDiagnosticsReport,
  ExportDiagnosticsResult,
  sanitizeRemoteControlStatus,
  suggestedDiagnosticsFileName,
} from './main-functions/diagnostics';
import {
  DEFAULT_DISK_WARNING_THRESHOLD_BYTES,
  evaluatePreflightChecks,
  findMissingTeamLogos,
  PreflightResult,
} from './main-functions/preflight';
import { buildAppMenuTemplate } from './main-functions/appMenu';
import {
  isRestorableLiveMatch,
  launchHoldState,
  OutputHold,
  OutputState,
} from './main-functions/outputHold';
import {
  decideRendererReload,
  isWindowVisibleOnDisplays,
  moveWindowToDisplay,
  shouldPreventDisplaySleep,
} from './main-functions/windowManagement';

const SHOW_DEV_TOOLS = false;

export const isDev = process.env.NODE_ENV === 'development';
const quitWhenAllWindowsClose = true;

export const showDevTools = isDev && SHOW_DEV_TOOLS;

// Initialised as early as possible so as much of the app's lifetime as
// possible is captured durably. Module-scope `app.getPath('userData')` reads
// (like this one) never require the app to be 'ready', mirroring the
// existing pattern in storage.ts/fileHandler.ts. One early gap remains:
// nothing here can capture a console.error from storage.ts's own top-level
// `createStorage()` call, since that module (imported above) already ran its
// top-level code before this line executes; that's an extremely narrow,
// pre-existing edge case (a corrupt config.json on the very first read) that
// still prints to the console, just not durably.
initLogger(app.getPath('userData'));

// Set before every quit (and again in 'before-quit') so window teardown
// during quit isn't mistaken for a user closing the display window (which we
// recreate in production).
let isQuitting = false;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// Imported (not require'd) so it is bundled into main.js: the packaged app
// ships no node_modules, so a runtime require would fail to resolve.
//
// Prevent more than one instance of the app running. The lock isn't
// requested during a Squirrel install/update run, which quits regardless.
const additionalData = { playOverlay: 'PlayOverlay' };
const gotTheLock =
  !squirrelStartup && app.requestSingleInstanceLock(additionalData);

// app.quit() before 'ready' does not stop 'ready' from firing, so a second
// launch (or a Squirrel run) used to go on to open both windows (one of them
// fullscreen on the HDMI screen), bind the server ports, register global
// shortcuts and write to the shared log, all while shutting down. Every
// lifecycle handler below checks this flag and does nothing when it is set.
// Dev builds keep running without the lock so a second `npm start` works.
const quittingAtLaunch = Boolean(squirrelStartup) || (!gotTheLock && !isDev);

if (quittingAtLaunch) {
  isQuitting = true;
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

let mainWindow: BrowserWindow | null;
let displayWindow: BrowserWindow | null;
let powerSaveBlockerId: number | null = null;
let isLocked = false; // Track lock status
// True while the renderer has shortcuts disabled (e.g. a text field is open),
// so window focus events don't re-register them behind its back
let keyboardShortcutsDisabled = false;

// Cached renderer state for reliable initial sync to display
let cachedScores: Scores = { ...defaultScores };
let cachedTime: Time = {};
let cachedAppSettings: AppSettings = { ...defaultAppSettings };
let cachedMatchSettings: MatchSettings = { ...defaultMatchSettings };
let cachedMatchState: MatchState = { ...defaultMatchState };

// Snapshot of the persisted live match taken at launch, before the
// renderer's initial state pushes overwrite it. Offered to the dashboard
// so an interrupted match can be restored. Replaced with the current match
// if the control window's renderer crashes and is reloaded, since the
// reloaded dashboard starts blank and needs the same offer.
let liveMatchAtLaunch: LiveMatch | undefined;

// Holds what the outputs show while the dashboard's state can't be trusted
// (a restore offer pending at launch, or the control window reloading after
// a crash). See outputHold.ts; released by markLiveMatchResolved.
const outputHold = new OutputHold();

// Where the operator last put the output window, so it can go back there
// (fullscreen again if it was) when an unplugged HDMI screen returns.
let outputPlacement: { displayId: number; fullscreen: boolean } | null = null;

// Recent renderer crash times per window, for the reload loop guard in
// windowManagement.ts's decideRendererReload.
let displayRendererCrashes: number[] = [];
let mainRendererCrashes: number[] = [];

// A hung control window gets this long to recover by itself (a long
// garbage-collection pause, a slow disk) before its renderer is restarted.
const MAIN_WINDOW_HANG_GRACE_MS = 5000;
let mainWindowHangTimer: ReturnType<typeof setTimeout> | null = null;

// Set when the browser source server most recently failed to start (e.g.
// EADDRINUSE), so the settings UI can surface it. Cleared on a successful
// (re)start or once the feature is disabled.
let browserSourceError: string | undefined;

// Same as browserSourceError, for the phone-remote server.
let remoteControlError: string | undefined;

// The pairing PIN for the currently running remote-control server. Regenerated
// on every (re)start (each enable) with a CSPRNG so a leaked PIN from a
// previous session is useless, and never persisted. Empty when the server is
// off.
let remoteControlPin = '';

// True once the current display window has completed the display-ready
// handshake below (requested and received its initial state), so the
// preflight check can distinguish "window exists but is still a blank/
// loading page" from "actually showing something". Reset whenever the
// window is (re)created, since a fresh window hasn't asked for state yet.
let displayWindowReady = false;

// The accelerators that failed to register the last time
// registerKeyboardShortcuts/registerGlobalKeyboardShortcuts ran (most likely
// because another app already claimed them, see the try/catch in each
// function). Surfaced to the preflight check, which otherwise has no way to
// know a configured shortcut silently isn't working; previously this only
// ever reached logError.
let lastFailedFocusAccelerators: string[] = [];
let lastFailedGlobalAccelerators: string[] = [];

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

function getLiveOutputState(): OutputState {
  return {
    scores: cachedScores,
    time: cachedTime,
    matchState: cachedMatchState,
  };
}

// What every output (display window, browser sources, phones) is sent: the
// live state, or the held stand-in while outputHold is active.
function getOutputState(): OutputState {
  return outputHold.view(getLiveOutputState());
}

// Matches the order display-ready sends in: settings first, then
// state/scores/time. Keep this in sync with that handler below.
function getBrowserSourceSnapshot() {
  const { scores, time, matchState } = getOutputState();
  return [
    {
      channel: 'match-settings-updated',
      payload: toBrowserSourcePayload(cachedMatchSettings),
    },
    {
      channel: 'app-settings-updated',
      payload: toBrowserSourcePayload(cachedAppSettings),
    },
    {
      channel: 'match-state-updated',
      payload: toBrowserSourcePayload(matchState),
    },
    { channel: 'score-updated', payload: toBrowserSourcePayload(scores) },
    { channel: 'time-updated', payload: toBrowserSourcePayload(time) },
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
    logFailedOperation(
      `Failed to start browser source server: ${result.error}`
    );
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
      logError(`Error applying browser source settings: ${String(error)}`);
    });
  return browserSourceTransition;
}

// The compact snapshot pushed to every paired phone: score, clock, on-air
// screen, and team labels, and nothing else (see RemoteControlSnapshot). Sent
// on every state change and to each phone as it pairs, so two phones stay in
// sync with each other and with the operator.
function getRemoteControlSnapshot(): RemoteControlSnapshot {
  const { scores, time, matchState } = getOutputState();
  return {
    scores: {
      homeTeam: scores.homeTeam,
      awayTeam: scores.awayTeam,
    },
    time: {
      time: time.time,
      paused: time.paused,
      matchPhase: time.matchPhase,
    },
    matchState: {
      displayScreen: matchState.displayScreen,
      matchPhase: matchState.matchPhase,
    },
    matchSettings: {
      homeTeamNameAbbreviated: cachedMatchSettings.homeTeamNameAbbreviated,
      awayTeamNameAbbreviated: cachedMatchSettings.awayTeamNameAbbreviated,
      homeTeamNameFull: cachedMatchSettings.homeTeamNameFull,
      awayTeamNameFull: cachedMatchSettings.awayTeamNameFull,
    },
  };
}

// Pushes the current snapshot to all paired phones. A no-op when the server
// isn't running, so it's safe to call unconditionally from the state handlers.
function broadcastRemoteControlSnapshot() {
  if (!isRemoteControlServerRunning()) return;
  broadcastRemoteControlState(getRemoteControlSnapshot());
}

// Per-channel pushes to the display window and browser sources, always of
// the output view (see getOutputState), followed by a phone snapshot.
function sendScoresToOutputs() {
  const { scores } = getOutputState();
  displayWindow?.webContents.send('score-updated', scores);
  broadcastToBrowserSourcesRewritten('score-updated', scores);
  broadcastRemoteControlSnapshot();
}

function sendTimeToOutputs() {
  const { time } = getOutputState();
  displayWindow?.webContents.send('time-updated', time);
  broadcastToBrowserSourcesRewritten('time-updated', time);
  broadcastRemoteControlSnapshot();
}

function sendMatchStateToOutputs() {
  const { matchState } = getOutputState();
  displayWindow?.webContents.send('match-state-updated', matchState);
  broadcastToBrowserSourcesRewritten('match-state-updated', matchState);
  broadcastRemoteControlSnapshot();
}

// Resends everything once a hold is lifted, in the display-ready order
// (state, then scores, then time), with a single phone snapshot.
function sendAllStateToOutputs() {
  const { scores, time, matchState } = getOutputState();
  displayWindow?.webContents.send('match-state-updated', matchState);
  displayWindow?.webContents.send('score-updated', scores);
  displayWindow?.webContents.send('time-updated', time);
  broadcastToBrowserSourcesRewritten('match-state-updated', matchState);
  broadcastToBrowserSourcesRewritten('score-updated', scores);
  broadcastToBrowserSourcesRewritten('time-updated', time);
  broadcastRemoteControlSnapshot();
}

function releaseOutputHold(reason: string) {
  if (!outputHold.release()) return;
  logInfo(`Outputs showing the live match again (${reason})`);
  sendAllStateToOutputs();
  updatePowerSaveBlocker();
}

// Routes a validated remote command to the control window using the same
// reverse-IPC channel pattern as the keyboard/Stream Deck shortcuts: the
// Dashboard receives the channel and applies it to its zustand store, so a
// phone tap and an operator click take exactly the same code path. Commands
// are intents only; the Dashboard computes the resulting state.
function routeRemoteCommand(command: RemoteCommand) {
  switch (command.type) {
    case 'homeGoal':
      mainWindow?.webContents.send('home-team-scored');
      break;
    case 'awayGoal':
      mainWindow?.webContents.send('away-team-scored');
      break;
    case 'homeGoalRemove':
      mainWindow?.webContents.send('home-team-unscored');
      break;
    case 'awayGoalRemove':
      mainWindow?.webContents.send('away-team-unscored');
      break;
    case 'nextPhase':
      mainWindow?.webContents.send('next-match-phase');
      break;
    case 'toggleClock':
      mainWindow?.webContents.send('toggle-clock');
      break;
    case 'setScreen':
      mainWindow?.webContents.send('set-display-screen', command.screen);
      break;
  }
}

// Applies a (possibly changed) phone-remote configuration: always stops any
// running server first, then restarts it if enabled, mirroring
// applyBrowserSourceSettings. A fresh 6-digit PIN is minted on each start with
// crypto.randomInt (uniform, unbiased) so every enable requires re-pairing.
async function applyRemoteControlSettings(settings: RemoteControlSettings) {
  await stopRemoteControlServer();
  remoteControlError = undefined;
  remoteControlPin = '';

  if (!settings.enabled) {
    notifyRemoteControlStatus();
    return;
  }

  remoteControlPin = String(crypto.randomInt(0, 1000000)).padStart(6, '0');

  const result = await startRemoteControlServer({
    port: settings.port,
    pin: remoteControlPin,
    getSnapshot: getRemoteControlSnapshot,
    onCommand: routeRemoteCommand,
    onConnectionChange: () => notifyRemoteControlStatus(),
  });

  if (result.ok === false) {
    remoteControlError = result.error;
    remoteControlPin = '';
    logFailedOperation(
      `Failed to start remote control server: ${result.error}`
    );
  }

  notifyRemoteControlStatus();
}

// Serializes applyRemoteControlSettings calls so rapid settings changes can't
// interleave their stop/start work, identical to queueBrowserSourceSettings.
let remoteControlTransition = Promise.resolve();

function queueRemoteControlSettings(settings: RemoteControlSettings) {
  remoteControlTransition = remoteControlTransition
    .then(() => applyRemoteControlSettings(settings))
    .catch((error) => {
      logError(`Error applying remote control settings: ${String(error)}`);
    });
  return remoteControlTransition;
}

// Builds the status object the settings UI reads, including the LAN URL a phone
// should open. Falls back to 127.0.0.1 only when no external IPv4 is found (no
// network), in which case a phone can't reach it anyway.
function getRemoteControlStatus() {
  const settings = getRemoteControlSettings(cachedAppSettings);
  const port = getRemoteControlServerPort() ?? settings.port;
  const lanIp = getLanIPv4(os.networkInterfaces());
  return {
    running: isRemoteControlServerRunning(),
    port,
    pin: remoteControlPin,
    url: `http://${lanIp ?? '127.0.0.1'}:${port}/`,
    connectedCount: getRemoteControlConnectedCount(),
    error: remoteControlError,
  };
}

// Pushes a fresh status to the control window so the settings UI can update
// the running state, PIN, and connected-phone count live (e.g. when a phone
// pairs or drops) without polling.
function notifyRemoteControlStatus() {
  mainWindow?.webContents.send(
    'remote-control-status',
    getRemoteControlStatus()
  );
}

// Live-match writes are throttled: time updates arrive every second while
// the clock runs, and each electron-store set() synchronously rewrites the
// whole config file on the main thread. Deferring the write keeps crash
// recovery at most ~2s stale while halving+ the disk churn over a match.
let persistLiveMatchTimer: ReturnType<typeof setTimeout> | null = null;

// A restorable snapshot from a previous session must survive on disk until the
// operator resolves it. On launch the dashboard seeds the main process with
// its default (blank) scores/time/state, which would otherwise overwrite the
// snapshot within one throttle window and lose the match to a second crash.
// So while `liveMatchAtLaunch` is still pending, blank state is not written;
// the first genuinely meaningful update (a goal, a running phase, a restore)
// unlocks persistence, and an explicit dismiss resolves it too.
let liveMatchResolved = true;

function isMeaningfulLiveState(): boolean {
  return (
    cachedScores.homeTeam > 0 ||
    cachedScores.awayTeam > 0 ||
    cachedScores.penalties.length > 0 ||
    cachedTime.matchPhase !== undefined ||
    cachedMatchState.matchPhase !== undefined ||
    cachedMatchState.previousMatchPhase !== undefined
  );
}

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
    logFailedOperation(`Error persisting live match: ${String(error)}`);
  }
}

// Resolving the snapshot also lifts the output hold: the dashboard's state
// is now the real match (restored, dismissed, or already underway).
function markLiveMatchResolved(reason: string) {
  liveMatchResolved = true;
  releaseOutputHold(reason);
}

function persistLiveMatch() {
  // Protect an unresolved launch snapshot from being overwritten by blank
  // startup state. Any meaningful state means the operator is underway, so
  // resolve and persist normally from here on.
  if (!liveMatchResolved) {
    if (!isMeaningfulLiveState()) return;
    markLiveMatchResolved('match underway');
  }
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

// The control window's renderer died (or was restarted after hanging) and is
// about to reload. Its fresh dashboard will seed a blank 0-0 match, which
// would go straight to air and, once persisted, overwrite the only copy of
// the real one. So the current match is written to disk now, offered for
// restore exactly like a crash at launch, and the outputs are frozen on
// what they were showing until the operator restores it.
function protectMatchForControlWindowReload() {
  const snapshot: LiveMatch = {
    scores: cachedScores,
    time: cachedTime,
    matchState: cachedMatchState,
    savedAt: Date.now(),
    matchSettings: cachedMatchSettings,
  };
  // Still unresolved means the launch offer (and its hold) is pending and
  // the cached state is the blank seed, not a match worth protecting.
  if (!liveMatchResolved || !isRestorableLiveMatch(snapshot)) return;

  if (persistLiveMatchTimer) {
    clearTimeout(persistLiveMatchTimer);
    persistLiveMatchTimer = null;
  }
  writeLiveMatch();
  liveMatchAtLaunch = snapshot;
  liveMatchResolved = false;
  outputHold.hold(getLiveOutputState());
  // The caches now stand for the reloading dashboard, which starts blank,
  // exactly as at launch. Left holding the old match, the first seed
  // message would find the other two still "meaningful" and resolve the
  // offer (and release the hold) before the operator saw it.
  cachedScores = { ...defaultScores };
  cachedTime = {};
  cachedMatchState = { ...defaultMatchState };
  logInfo(
    'Holding the outputs until the reloaded dashboard restores the match'
  );
}

// Reloads a window whose renderer is gone, unless it keeps crashing (see
// decideRendererReload), in which case it is left for the operator.
function reloadCrashedRenderer(
  window: BrowserWindow,
  label: string,
  crashes: number[]
): number[] {
  const decision = decideRendererReload(crashes, Date.now());
  if (decision.reload) {
    logInfo(`Reloading the ${label}`);
    window.webContents.reload();
  } else {
    logError(
      `The ${label} keeps crashing; not reloading it again automatically. Use Reset windows or restart PlayOverlay.`
    );
  }
  return decision.crashes;
}

function clearMainWindowHangTimer() {
  if (mainWindowHangTimer) {
    clearTimeout(mainWindowHangTimer);
    mainWindowHangTimer = null;
  }
}

// Creates (or recreates) the display window, loads its URL, and wires it
// into the module-level displayWindow variable so update forwarding and the
// display-ready handshake keep working across recreations.
const createDisplayWindow = () => {
  const window = createAppWindow(DISPLAY_WINDOW);
  displayWindow = window;
  // A freshly (re)created window hasn't requested its initial state yet.
  displayWindowReady = false;

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

  // A crashed output renderer leaves a frozen or blank picture on air with
  // nothing in the UI to say so. It holds no state of its own, so it is
  // simply reloaded: the display-ready handshake resends everything. Until
  // then it isn't ready, so the preflight check can't report it as fine.
  window.webContents.on('render-process-gone', (_event, details) => {
    if (displayWindow === window) displayWindowReady = false;
    logError(
      `Display window renderer stopped (${details.reason}, exit code ${details.exitCode})`
    );
    if (isQuitting || window.isDestroyed() || details.reason === 'clean-exit') {
      return;
    }
    displayRendererCrashes = reloadCrashedRenderer(
      window,
      'display window',
      displayRendererCrashes
    );
  });

  // A hung output can't recover by itself in any way that helps a live
  // stream, so its renderer is restarted straight away. Electron documents
  // forcefullyCrashRenderer as the way to recover from 'unresponsive'; the
  // 'render-process-gone' handler above then reloads it.
  window.on('unresponsive', () => {
    if (displayWindow === window) displayWindowReady = false;
    logError('Display window stopped responding; restarting its renderer');
    if (!window.isDestroyed()) window.webContents.forcefullyCrashRenderer();
  });

  window.on('moved', () => recordOutputPlacement());
  window.on('enter-full-screen', () => {
    recordOutputPlacement();
    updatePowerSaveBlocker();
  });
  window.on('leave-full-screen', () => {
    recordOutputPlacement();
    updatePowerSaveBlocker();
  });

  window.on('closed', () => {
    if (displayWindow === window) {
      displayWindow = null;
      displayWindowReady = false;
    }
    updatePowerSaveBlocker();
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

  // Crash recovery for the control window: the match is protected first
  // (see protectMatchForControlWindowReload), then the page reloads.
  const controlWindow = mainWindow;
  controlWindow.webContents.on('render-process-gone', (_event, details) => {
    clearMainWindowHangTimer();
    logError(
      `Control window renderer stopped (${details.reason}, exit code ${details.exitCode})`
    );
    if (
      isQuitting ||
      controlWindow.isDestroyed() ||
      details.reason === 'clean-exit'
    ) {
      return;
    }
    protectMatchForControlWindowReload();
    // The dead renderer may have had shortcuts switched off (a text field
    // or side menu was open); nothing would ever switch them back on.
    keyboardShortcutsDisabled = false;
    registerGlobalKeyboardShortcuts();
    if (controlWindow.isFocused()) registerKeyboardShortcuts();
    mainRendererCrashes = reloadCrashedRenderer(
      controlWindow,
      'control window',
      mainRendererCrashes
    );
  });

  // Unlike the output, the dashboard gets a short grace period: restarting
  // it costs the operator a Restore click, so a hang that clears by itself
  // is left alone.
  controlWindow.on('unresponsive', () => {
    logError('Control window stopped responding');
    if (mainWindowHangTimer) return;
    mainWindowHangTimer = setTimeout(() => {
      mainWindowHangTimer = null;
      if (controlWindow.isDestroyed()) return;
      logError('Control window still not responding; restarting its renderer');
      controlWindow.webContents.forcefullyCrashRenderer();
    }, MAIN_WINDOW_HANG_GRACE_MS);
  });

  controlWindow.on('responsive', () => {
    if (!mainWindowHangTimer) return;
    clearMainWindowHangTimer();
    logInfo('Control window is responding again');
  });

  // Window closed event
  mainWindow.on('closed', () => {
    mainWindow = null;
    clearMainWindowHangTimer();
    if (!isDev) {
      console.log('mainWindow closed');
      isQuitting = true;
      app.quit();
    }
  });
};

// Setup IPC handlers
function setupIPCHandlers() {
  ipcMain.on('update-score', (_, scores: Scores) => {
    // Individually bad fields (e.g. a negative score) degrade to their
    // default rather than being cached/broadcast as-is; a wholly malformed
    // payload (not even an object) is rejected outright so it never reaches
    // the display or gets persisted.
    const parsed = scoresSchema.safeParse(scores);
    if (!parsed.success) {
      logError(`Rejected invalid score update: ${parsed.error.message}`);
      return;
    }
    cachedScores = parsed.data;
    sendScoresToOutputs();
    persistLiveMatch();
  });

  ipcMain.on('update-time', (_, time: Time) => {
    const parsed = timeSchema.safeParse(time);
    if (!parsed.success) {
      logError(`Rejected invalid time update: ${parsed.error.message}`);
      return;
    }
    cachedTime = parsed.data;
    sendTimeToOutputs();
    persistLiveMatch();
    updatePowerSaveBlocker();
  });

  // Same order as the score/time/state handlers: validate, cache, send to
  // the outputs, and only then persist. The write can throw (EACCES, a full
  // disk), and it used to run first, so a failed save also stopped a team
  // name or colour change from ever reaching the display and OBS. A failed
  // save is logged instead; the change is live and the next one retries.
  // A payload the schema rejects outright never reaches the outputs or disk.
  ipcMain.on('update-match-settings', (_, matchSettings: unknown) => {
    const parsed = matchSetingsSchema.safeParse(matchSettings);
    if (!parsed.success) {
      logError(
        `Rejected invalid match settings update: ${parsed.error.message}`
      );
      return;
    }
    cachedMatchSettings = parsed.data;
    displayWindow?.webContents.send(
      'match-settings-updated',
      cachedMatchSettings
    );
    broadcastToBrowserSourcesRewritten(
      'match-settings-updated',
      cachedMatchSettings
    );
    broadcastRemoteControlSnapshot();

    try {
      setMatchSettings(cachedMatchSettings);
    } catch (error) {
      logFailedOperation(`Error saving match settings: ${String(error)}`);
    }
  });

  ipcMain.on('update-app-settings', (_, appSettings: unknown) => {
    const parsed = appSettingsSchema.safeParse(appSettings);
    if (!parsed.success) {
      logError(`Rejected invalid app settings update: ${parsed.error.message}`);
      return;
    }

    const previousShortcuts = getKeyboardShortcuts(cachedAppSettings);
    const previousBrowserSource = getBrowserSourceSettings(cachedAppSettings);
    const previousRemoteControl = getRemoteControlSettings(cachedAppSettings);
    const previousLanguage = cachedAppSettings.language;

    cachedAppSettings = parsed.data;
    displayWindow?.webContents.send('app-settings-updated', cachedAppSettings);
    broadcastToBrowserSourcesRewritten(
      'app-settings-updated',
      cachedAppSettings
    );

    const nextShortcuts = getKeyboardShortcuts(cachedAppSettings);
    const shortcutsChanged =
      previousShortcuts.nextMatchPhase !== nextShortcuts.nextMatchPhase ||
      previousShortcuts.homeTeamScored !== nextShortcuts.homeTeamScored ||
      previousShortcuts.awayTeamScored !== nextShortcuts.awayTeamScored;

    // Re-register with the new bindings. If shortcuts are currently
    // disabled (the operator is typing in a text field or recording a
    // shortcut) both sets are already unregistered: leave them alone and let
    // enable-keyboard-shortcuts pick up the new bindings when focus leaves
    // the field. The global Alt set is always on while
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

    const nextRemoteControl = getRemoteControlSettings(cachedAppSettings);
    if (
      previousRemoteControl.enabled !== nextRemoteControl.enabled ||
      previousRemoteControl.port !== nextRemoteControl.port
    ) {
      void queueRemoteControlSettings(nextRemoteControl);
    }

    if (previousLanguage !== cachedAppSettings.language) {
      applyAppMenu();
    }

    // Persisted last, for the same reason as update-match-settings.
    try {
      setAppSettings(cachedAppSettings);
    } catch (error) {
      logFailedOperation(`Error saving app settings: ${String(error)}`);
    }
  });

  ipcMain.on('update-match-state', (_, matchState: MatchState) => {
    const parsed = matchStateSchema.safeParse(matchState);
    if (!parsed.success) {
      logError(`Rejected invalid match state update: ${parsed.error.message}`);
      return;
    }
    cachedMatchState = parsed.data;
    // The operator putting a different screen on air while a restore offer
    // is pending takes the output back from the hold (see
    // OutputHold.noteMatchState); everything is resent in that case.
    if (outputHold.noteMatchState(cachedMatchState)) {
      logInfo('Outputs showing the live match again (operator changed screen)');
      sendAllStateToOutputs();
      updatePowerSaveBlocker();
    } else {
      sendMatchStateToOutputs();
    }
    persistLiveMatch();
  });

  ipcMain.handle('get-live-match', () => {
    return liveMatchAtLaunch;
  });

  // The operator dismissed the restore prompt without restoring: stop
  // protecting the old snapshot so the current (blank) state can replace it,
  // and it isn't re-offered on the next launch.
  ipcMain.on('resolve-live-match', () => {
    markLiveMatchResolved('restore offer dismissed');
    persistLiveMatch();
  });

  ipcMain.handle('get-browser-source-status', () => {
    const settings = getBrowserSourceSettings(cachedAppSettings);
    return {
      running: isBrowserSourceServerRunning(),
      port: getBrowserSourceServerPort() ?? settings.port,
      error: browserSourceError,
    };
  });

  ipcMain.handle('get-remote-control-status', () => {
    return getRemoteControlStatus();
  });

  // Display window signals it's ready to receive initial state
  ipcMain.on('display-ready', () => {
    if (!displayWindow) return;
    displayWindowReady = true;
    const { scores, time, matchState } = getOutputState();
    // Send settings first, then state/scores/time
    displayWindow.webContents.send(
      'match-settings-updated',
      cachedMatchSettings
    );
    displayWindow.webContents.send('app-settings-updated', cachedAppSettings);
    displayWindow.webContents.send('match-state-updated', matchState);
    displayWindow.webContents.send('score-updated', scores);
    displayWindow.webContents.send('time-updated', time);
  });

  // The display window's enter/leave-full-screen events record the new
  // placement and update the sleep blocker.
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
      logFailedOperation(`Error getting app settings: ${String(error)}`);
      throw error;
    }
  });

  ipcMain.handle('get-match-settings', async () => {
    try {
      return getMatchSettings();
    } catch (error) {
      logFailedOperation(`Error getting team settings: ${String(error)}`);
      throw error;
    }
  });

  ipcMain.on('get-screens', (event) => {
    event.reply('screens-info', screen.getAllDisplays());
  });

  ipcMain.handle('move-window-to-screen', async (_event, screenId) => {
    const displays = screen.getAllDisplays();
    const display = displays.find((d) => d.id === screenId);
    if (display && displayWindow) {
      await queueDisplayWindowMove(display, true);
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

  // Upload payloads cross the renderer trust boundary, so their shape is
  // checked before any helper runs. Structured-clone IPC delivers the
  // preload's Buffer as a plain Uint8Array, which is what is required here.
  // Both handlers also catch rather than let an exception escape: a throw
  // inside an ipcMain.handle callback only reaches the renderer as a generic
  // rejection and Electron's stderr, never main.log or the diagnostics
  // export, which made the v0.19/v0.20 upload failure invisible in the field.
  ipcMain.handle(
    'upload-image',
    async (_, buffer: unknown, fileName: unknown, title: unknown) => {
      if (
        !(buffer instanceof Uint8Array) ||
        typeof fileName !== 'string' ||
        typeof title !== 'string'
      ) {
        logError('Rejected upload-image: malformed upload payload');
        return null;
      }
      try {
        return await handleFileUpload(buffer, fileName, title);
      } catch (error) {
        logFailedOperation(`Error uploading image: ${String(error)}`);
        return null;
      }
    }
  );

  ipcMain.handle('delete-image', async (_, filePath: string) => {
    return handleFileDeletion(filePath);
  });

  ipcMain.handle(
    'upload-logo',
    async (_, buffer: unknown, fileName: unknown) => {
      if (!(buffer instanceof Uint8Array) || typeof fileName !== 'string') {
        logError('Rejected upload-logo: malformed upload payload');
        return null;
      }
      try {
        return saveImageFile(buffer, fileName);
      } catch (error) {
        logFailedOperation(`Error uploading logo: ${String(error)}`);
        return null;
      }
    }
  );

  ipcMain.handle('get-custom-screens', () => {
    return getCustomScreens();
  });

  ipcMain.handle(
    'set-custom-screens',
    (event, customScreens: CustomScreen[]) => {
      // A payload that isn't even an array is rejected outright rather than
      // coerced, an empty array would otherwise silently wipe out every
      // saved custom screen. Once it IS an array, an individually malformed
      // entry is dropped rather than failing the whole write.
      if (!Array.isArray(customScreens)) {
        logError(
          `Rejected set-custom-screens: expected an array, got ${typeof customScreens}`
        );
        return { success: false, error: 'Invalid custom screens payload' };
      }
      const validScreens = customScreenListSchema.parse(customScreens);
      const droppedCount = customScreens.length - validScreens.length;
      if (droppedCount > 0) {
        logError(
          `Dropped malformed custom screen entries on write: ${droppedCount}`
        );
      }
      try {
        setCustomScreens(validScreens);
        return { success: true };
      } catch (error) {
        logFailedOperation(`Error setting custom screens: ${String(error)}`);
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
      // Same reject-if-not-an-array, drop-only-the-bad-entries approach as
      // set-custom-screens: a non-array payload would otherwise silently
      // wipe out every saved match.
      if (!Array.isArray(savedMatchSettings)) {
        logError(
          `Rejected set-saved-match-settings: expected an array, got ${typeof savedMatchSettings}`
        );
        return {
          success: false,
          error: 'Invalid saved match settings payload',
        };
      }
      const validSettings = matchSettingsListSchema.parse(savedMatchSettings);
      const droppedCount = savedMatchSettings.length - validSettings.length;
      if (droppedCount > 0) {
        logError(
          `Dropped malformed saved match settings entries on write: ${droppedCount}`
        );
      }
      try {
        setSavedMatchSettings(validSettings);
        return { success: true };
      } catch (error) {
        logFailedOperation(
          `Error setting saved match settings: ${String(error)}`
        );
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
      logFailedOperation(`Check for updates failed: ${String(error)}`);
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
        logError(`Blocked non-http(s) URL from opening in browser: ${url}`);
        return;
      }
    } catch {
      logError(`Blocked invalid URL from opening in browser: ${url}`);
      return;
    }
    shell.openExternal(url).catch((error) => {
      logError(`Failed to open URL in browser: ${String(error)}`);
    });
  });

  // Disable/enable both shortcut sets (the focus set and the global Alt set)
  // so no shortcut fires while the user is typing in a text field
  ipcMain.on('enable-keyboard-shortcuts', () => {
    keyboardShortcutsDisabled = false;
    // The renderer also re-enables when the control window loses focus (so
    // the global set works from OBS even if a text field kept focus). The
    // focus set must then stay unregistered, or its plain keys would be
    // grabbed system-wide; mainWindow's focus handler registers it later.
    if (mainWindow?.isFocused()) {
      registerKeyboardShortcuts();
    }
    registerGlobalKeyboardShortcuts();
  });

  ipcMain.on('disable-keyboard-shortcuts', () => {
    keyboardShortcutsDisabled = true;
    unregisterKeyboardShortcuts();
    unregisterGlobalKeyboardShortcuts();
  });

  // Operator-action event from the undo choke point (see store/undo.ts's
  // captureUndo). Validated the same way every other IPC boundary is: a
  // malformed payload (not even matching the shape) is dropped rather than
  // crashing the handler or polluting the log with garbage. This is a pure
  // observability side-channel, it never feeds back into undo/redo.
  ipcMain.on('log-match-event', (_, payload) => {
    const parsed = matchEventLogSchema.safeParse(payload);
    if (!parsed.success) return;
    logMatchEvent(parsed.data.action, parsed.data.source ?? 'laptop');
  });

  // Assembles and saves the one-click support bundle. See
  // main-functions/diagnostics.ts for the report contents/sanitization; the
  // PIN is never read out of getRemoteControlStatus() here, only the fields
  // sanitizeRemoteControlStatus explicitly picks.
  ipcMain.handle(
    'export-diagnostics',
    async (): Promise<ExportDiagnosticsResult> => {
      try {
        const now = new Date();
        const report = buildDiagnosticsReport({
          generatedAt: now.toISOString(),
          versions: {
            app: app.getVersion(),
            electron: process.versions.electron ?? 'unknown',
            chrome: process.versions.chrome ?? 'unknown',
            node: process.versions.node ?? 'unknown',
          },
          os: {
            platform: os.platform(),
            arch: os.arch(),
            release: os.release(),
          },
          // Serialized through the same zod schemas used everywhere else
          // settings cross a trust boundary, so a diagnostics export can
          // never surface a corrupt in-memory field verbatim.
          appSettings: appSettingsSchema.parse(cachedAppSettings),
          matchSettings: matchSetingsSchema.parse(cachedMatchSettings),
          browserSourceStatus: {
            running: isBrowserSourceServerRunning(),
            port:
              getBrowserSourceServerPort() ??
              getBrowserSourceSettings(cachedAppSettings).port,
            error: browserSourceError,
          },
          remoteControlStatus: sanitizeRemoteControlStatus(
            getRemoteControlStatus()
          ),
          recentLog: getLogger().getRecentEntries(),
          recentMatchEvents: getLogger().getRecentMatchEvents(),
          recentFailedOperations: getLogger().getRecentFailedOperations(),
          homeDirectory: os.homedir(),
        });

        const dialogOptions = {
          title: 'Export diagnostics',
          defaultPath: suggestedDiagnosticsFileName(now),
          filters: [{ name: 'Text', extensions: ['txt'] }],
        };
        const dialogResult = mainWindow
          ? await dialog.showSaveDialog(mainWindow, dialogOptions)
          : await dialog.showSaveDialog(dialogOptions);

        if (dialogResult.canceled || !dialogResult.filePath) {
          return { cancelled: true };
        }

        fs.writeFileSync(dialogResult.filePath, report, 'utf8');
        // Only the file name: the chosen folder is usually under the home
        // directory, and this line lands in the next export's log tail.
        logInfo(
          `Exported diagnostics to ${sanitizeLogPath(dialogResult.filePath)}`
        );
        return { cancelled: false, path: dialogResult.filePath };
      } catch (error) {
        logFailedOperation(`Failed to export diagnostics: ${String(error)}`);
        return { cancelled: false, error: 'Failed to export diagnostics' };
      }
    }
  );

  // The "Go live check": gathers every raw signal the operator would
  // otherwise have to remember to check by hand (which screen the output is
  // on, whether the optional servers actually started, whether a logo file
  // went missing, disk space) and hands them to the pure evaluator. This
  // handler and everything it calls is read-only: it never moves a window,
  // starts/stops a server, or touches match state, it only looks and
  // reports. Re-run by the UI every time the modal opens.
  ipcMain.handle('run-preflight', async (): Promise<PreflightResult> => {
    const displays = screen.getAllDisplays();
    const controlWindowScreenId =
      mainWindow && !mainWindow.isDestroyed()
        ? screen.getDisplayMatching(mainWindow.getBounds()).id
        : null;
    const displayWindowScreenId =
      displayWindow && !displayWindow.isDestroyed()
        ? screen.getDisplayMatching(displayWindow.getBounds()).id
        : null;

    const browserSourceSettings = getBrowserSourceSettings(cachedAppSettings);
    const remoteControlSettings = getRemoteControlSettings(cachedAppSettings);

    // Custom screens/overlays already reconcile against disk on every read
    // (see storage.ts); team logos have no equivalent check anywhere else in
    // the app, so this is the first place that ever verifies they still
    // exist. Logo paths are stored as file:// URLs (see fileHandler.ts's
    // saveImageFile), fileURLToPath is wrapped in a try/catch since a
    // corrupt/foreign URL should be treated as "nothing to check" rather
    // than crashing the whole preflight run. Uses the read-only
    // reconciliation (not getCustomScreensReconciliation): this handler must
    // never write back or delete anything just from being run, so it only
    // reports what's dropped rather than persisting the cleaned-up list.
    const { dropped: droppedCustomScreens } = reconcileCustomScreensReadOnly();
    const toLogoPath = (url?: string): string | null => {
      if (!url) return null;
      try {
        return fileURLToPath(url);
      } catch {
        return null;
      }
    };
    const { homeMissing, awayMissing } = findMissingTeamLogos(
      {
        home: toLogoPath(cachedMatchSettings.homeTeamLogo),
        away: toLogoPath(cachedMatchSettings.awayTeamLogo),
      },
      fs.existsSync
    );

    let freeDiskBytes: number | null = null;
    try {
      const stats = await fs.promises.statfs(app.getPath('userData'));
      freeDiskBytes = stats.bavail * stats.bsize;
    } catch (error) {
      // statfs can be unsupported on some platform/Node combinations, or the
      // path can be briefly unreadable; either way this check degrades to
      // "unknown" (see evaluateDiskSpace) rather than failing the whole
      // preflight run.
      logError(
        `Could not determine free disk space for preflight: ${String(error)}`
      );
      freeDiskBytes = null;
    }

    return evaluatePreflightChecks({
      displays: {
        screenCount: displays.length,
        controlWindowScreenId,
        displayWindowScreenId,
      },
      displayWindowExists:
        displayWindow !== null && !displayWindow.isDestroyed(),
      // A crashed renderer clears displayWindowReady as it goes, but the
      // live check guards the moment between the crash and that event.
      displayWindowReady:
        displayWindowReady &&
        displayWindow !== null &&
        !displayWindow.isDestroyed() &&
        !displayWindow.webContents.isCrashed(),
      browserSource: {
        enabled: browserSourceSettings.enabled,
        running: isBrowserSourceServerRunning(),
        port: getBrowserSourceServerPort() ?? browserSourceSettings.port,
        error: browserSourceError,
      },
      remoteControl: {
        enabled: remoteControlSettings.enabled,
        running: isRemoteControlServerRunning(),
        port: getRemoteControlServerPort() ?? remoteControlSettings.port,
        error: remoteControlError,
      },
      missingAssets: {
        homeTeamLogoMissing: homeMissing,
        awayTeamLogoMissing: awayMissing,
        missingScreenTitles: droppedCustomScreens.map((screen) => screen.title),
      },
      failedShortcuts: Array.from(
        new Set([
          ...lastFailedFocusAccelerators,
          ...lastFailedGlobalAccelerators,
        ])
      ),
      freeDiskBytes,
      diskWarningThresholdBytes: DEFAULT_DISK_WARNING_THRESHOLD_BYTES,
      hasUnresolvedLiveMatch:
        liveMatchAtLaunch !== undefined && !liveMatchResolved,
    });
  });
}

// Screen hot-plug handling. Wrapped because these run from Electron event
// listeners, where a throw would be an uncaught main-process exception in
// the middle of a match.
function handleDisplayChange(added: boolean) {
  try {
    // A returning HDMI screen gets the output back before the visibility
    // check runs, so the check sees the window where it is headed.
    if (added) restoreOutputToRememberedDisplay();
    ensureWindowsAreVisible();
  } catch (error) {
    logError(`Error handling a display change: ${String(error)}`);
  }
  mainWindow?.webContents.send('display-change', screen.getAllDisplays());
}

// Setup display listeners
function setupDisplayListeners() {
  screen.on('display-added', () => handleDisplayChange(true));
  screen.on('display-removed', () => handleDisplayChange(false));
}

// Remembers which screen the output is on, and whether it is fullscreen
// there. Moves that happen while the remembered screen is missing are the
// OS (or ensureWindowsAreVisible) displacing the window after an unplug, not
// the operator choosing a new home for it, so they don't overwrite it.
function recordOutputPlacement() {
  if (!displayWindow || displayWindow.isDestroyed()) return;
  const displays = screen.getAllDisplays();
  if (
    outputPlacement &&
    !displays.some((display) => display.id === outputPlacement?.displayId)
  ) {
    return;
  }
  outputPlacement = {
    displayId: screen.getDisplayMatching(displayWindow.getBounds()).id,
    fullscreen: displayWindow.isFullScreen(),
  };
}

function restoreOutputToRememberedDisplay() {
  if (!outputPlacement || !displayWindow || displayWindow.isDestroyed()) {
    return;
  }
  const { displayId, fullscreen } = outputPlacement;
  const display = screen
    .getAllDisplays()
    .find((candidate) => candidate.id === displayId);
  if (!display) return;
  const currentDisplayId = screen.getDisplayMatching(
    displayWindow.getBounds()
  ).id;
  if (
    currentDisplayId === displayId &&
    displayWindow.isFullScreen() === fullscreen
  ) {
    return;
  }
  logInfo('Output screen reconnected; moving the output back to it');
  void queueDisplayWindowMove(display, fullscreen);
}

// Serialises output moves (an operator's screen pick racing a hot-plug
// restore) so two fullscreen exit/enter sequences never interleave.
let displayWindowMoveTransition = Promise.resolve();

function queueDisplayWindowMove(
  display: Electron.Display,
  fullscreen: boolean
) {
  displayWindowMoveTransition = displayWindowMoveTransition
    .then(async () => {
      const window = displayWindow;
      if (!window || window.isDestroyed()) return;
      await moveWindowToDisplay(window, display, { fullscreen });
      outputPlacement = { displayId: display.id, fullscreen };
    })
    .catch((error) => {
      logError(`Error moving the output window: ${String(error)}`);
    });
  return displayWindowMoveTransition;
}

// Holds the display awake whenever anything is live (see
// shouldPreventDisplaySleep) and releases it as soon as nothing is.
// Previously only locking the windows held it. Cheap enough to call on
// every clock tick: it only touches powerSaveBlocker on a change.
function updatePowerSaveBlocker() {
  const displayFullscreen =
    displayWindow !== null &&
    !displayWindow.isDestroyed() &&
    displayWindow.isFullScreen();
  const shouldBlock = shouldPreventDisplaySleep({
    // The on-air clock: while a crashed dashboard reloads, its blank seed
    // must not let the display sleep under a held, mid-match picture.
    phaseRunning: getOutputState().time.matchPhase !== undefined,
    displayFullscreen,
    windowsLocked: isLocked,
  });
  const active =
    powerSaveBlockerId !== null &&
    powerSaveBlocker.isStarted(powerSaveBlockerId);

  if (shouldBlock && !active) {
    powerSaveBlockerId = powerSaveBlocker.start('prevent-display-sleep');
    logInfo('Keeping the display awake while the match is live');
  } else if (!shouldBlock && powerSaveBlockerId !== null) {
    if (active) powerSaveBlocker.stop(powerSaveBlockerId);
    powerSaveBlockerId = null;
    logInfo('Display may sleep again');
  }
}

// The native menu follows the operator's language, or the OS locale before
// one has been chosen (the same fallback the renderers use).
function applyAppMenu() {
  const language =
    cachedAppSettings.language ?? nearestSupportedLanguage(app.getLocale());
  Menu.setApplicationMenu(
    Menu.buildFromTemplate(buildAppMenuTemplate(language))
  );
}

// Keyboard shortcuts
// Track exactly which accelerators are registered right now (bindings can
// change between a register and its matching unregister, e.g. via a
// rebind), so unregistering always removes precisely those accelerators
// and never leaves a stale one behind.
let registeredFocusAccelerators: string[] = [];
let registeredGlobalAccelerators: string[] = [];

function getShortcutBindings(): Array<{
  accelerator: string;
  channel: string;
}> {
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
      logError(`Invalid keyboard shortcut "${accelerator}": ${String(error)}`);
    }
    if (registered) {
      registeredFocusAccelerators.push(accelerator);
    } else {
      failed.push(accelerator);
    }
  });

  lastFailedFocusAccelerators = failed;
  if (failed.length > 0) {
    logError(`Failed to register keyboard shortcut(s): ${failed.join(', ')}`);
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
      logError(
        `Invalid global keyboard shortcut "${globalAccelerator}": ${String(error)}`
      );
    }
    if (registered) {
      registeredGlobalAccelerators.push(globalAccelerator);
    } else {
      failed.push(globalAccelerator);
    }
  });

  lastFailedGlobalAccelerators = failed;
  if (failed.length > 0) {
    logError(
      `Failed to register global keyboard shortcut(s): ${failed.join(', ')}`
    );
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
  // A second instance or a Squirrel run is already quitting; see
  // quittingAtLaunch.
  if (quittingAtLaunch) return;
  // A single lifecycle marker per launch, so a diagnostics export's log tail
  // makes it obvious where one session ended and the next began.
  logInfo(`PlayOverlay v${app.getVersion()} starting up`);
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
  // If a restorable snapshot exists, hold off overwriting it with the blank
  // state the dashboard seeds on mount until the operator resolves it.
  if (liveMatchAtLaunch) {
    liveMatchResolved = false;
  }
  // Only a snapshot the dashboard will actually offer for restore holds the
  // outputs; otherwise nothing would ever resolve the hold. Set before the
  // servers start below so their first snapshot is already the held one.
  if (liveMatchAtLaunch && isRestorableLiveMatch(liveMatchAtLaunch)) {
    outputHold.hold(launchHoldState(liveMatchAtLaunch));
    logInfo('Restore offer pending: outputs blank until it is resolved');
  }
  // Off by default; only binds a 127.0.0.1 server if explicitly enabled in
  // settings. Startup errors (e.g. a busy port) are caught inside and never
  // reach here.
  void queueBrowserSourceSettings(getBrowserSourceSettings(cachedAppSettings));
  // Off by default too; only binds a 0.0.0.0 (LAN-reachable) server if
  // explicitly enabled. Independent of the browser source above: enabling one
  // never touches the other, and this one's binding does not affect the
  // browser source's 127.0.0.1-only listener.
  void queueRemoteControlSettings(getRemoteControlSettings(cachedAppSettings));
  createWindows();
  setupDisplayListeners();
  try {
    ensureWindowsAreVisible();
  } catch (error) {
    logError(`Error checking window visibility: ${String(error)}`);
  }
  recordOutputPlacement();
  applyAppMenu();
});

// All windows closed event
app.on('window-all-closed', () => {
  if (!isDev && quitWhenAllWindowsClose) {
    console.log('window-all-closed');
    isQuitting = true;
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
    isLocked = true;
    updatePowerSaveBlocker();
    notifyLockStatus();
  }
}

function unlockWindows() {
  if (mainWindow && displayWindow) {
    mainWindow.setAlwaysOnTop(false);
    displayWindow.setAlwaysOnTop(false);
    isLocked = false;
    updatePowerSaveBlocker();
    notifyLockStatus();
  }
}

function getLockStatus() {
  return isLocked;
}

// Pushed after every lock change, including the ones the main process makes
// by itself (a screen unplugged mid-match unlocks the windows): the settings
// UI only asks for the lock state when it opens, so without this it kept
// showing "locked" after an automatic unlock.
function notifyLockStatus() {
  mainWindow?.webContents.send('lock-status-info', isLocked);
}

function ensureWindowsAreVisible() {
  const displays = screen.getAllDisplays();

  const checkAndMoveWindow = (
    window: BrowserWindow | null,
    windowName: WindowName
  ) => {
    if (window && !window.isDestroyed()) {
      // Checked against each display rather than one bounding box around
      // all of them; see isWindowVisibleOnDisplays.
      if (!isWindowVisibleOnDisplays(window.getBounds(), displays)) {
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
  // Nothing was started by an instance that quit at launch, and its
  // shutdown line would only confuse the running instance's log.
  if (quittingAtLaunch) return;
  logInfo('PlayOverlay shutting down');
  flushLiveMatch();
  globalShortcut.unregisterAll();
  void stopBrowserSourceServer();
  void stopRemoteControlServer();
});
