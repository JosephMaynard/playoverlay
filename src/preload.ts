// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import {
  Display,
  contextBridge,
  ipcRenderer,
  type IpcRendererEvent,
} from 'electron';
import {
  Scores,
  Time,
  AppSettings,
  MatchState,
  CustomScreen,
  LiveMatch,
  RemoteControlStatus,
} from './types';
import { MatchSettings } from './zodSchemas';

contextBridge.exposeInMainWorld('electronAPI', {
  updateScores: (scores: Scores) => ipcRenderer.send('update-score', scores),
  onScoreUpdated: (callback: (scores: Scores) => void) => {
    const listener = (_: IpcRendererEvent, scores: Scores) => callback(scores);
    ipcRenderer.on('score-updated', listener);
    return () => ipcRenderer.removeListener('score-updated', listener);
  },
  updateTime: (time: Time) => ipcRenderer.send('update-time', time),
  onTimeUpdated: (callback: (time: Time) => void) => {
    const listener = (_: IpcRendererEvent, time: Time) => callback(time);
    ipcRenderer.on('time-updated', listener);
    return () => ipcRenderer.removeListener('time-updated', listener);
  },
  updateMatchSettings: (matchSettings: MatchSettings) =>
    ipcRenderer.send('update-match-settings', matchSettings),
  onMatchSettingsUpdated: (
    callback: (matchSettings: MatchSettings) => void
  ) => {
    const listener = (_: IpcRendererEvent, matchSettings: MatchSettings) =>
      callback(matchSettings);
    ipcRenderer.on('match-settings-updated', listener);
    return () => ipcRenderer.removeListener('match-settings-updated', listener);
  },
  updateAppSettings: (appSettings: AppSettings) =>
    ipcRenderer.send('update-app-settings', appSettings),
  onAppSettingsUpdated: (callback: (appSettings: AppSettings) => void) => {
    const listener = (_: IpcRendererEvent, appSettings: AppSettings) =>
      callback(appSettings);
    ipcRenderer.on('app-settings-updated', listener);
    return () => ipcRenderer.removeListener('app-settings-updated', listener);
  },
  updateMatchState: (matchSettings: MatchState) =>
    ipcRenderer.send('update-match-state', matchSettings),
  onMatchStateUpdated: (callback: (matchSettings: MatchState) => void) => {
    const listener = (_: IpcRendererEvent, matchSettings: MatchState) =>
      callback(matchSettings);
    ipcRenderer.on('match-state-updated', listener);
    return () => ipcRenderer.removeListener('match-state-updated', listener);
  },
  toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),
  getFullscreenStatus: () => ipcRenderer.invoke('get-fullscreen-status'),

  getVersion: () => ipcRenderer.sendSync('get-version'),
  getAppSettings: () => ipcRenderer.invoke('get-app-settings'),
  getBrowserSourceStatus: () => ipcRenderer.invoke('get-browser-source-status'),
  getMatchSettings: () => ipcRenderer.invoke('get-match-settings'),
  moveWindowToScreen: (screenId: number) =>
    ipcRenderer.invoke('move-window-to-screen', screenId),
  onDisplayChange: (callback: (displays: Display[]) => void) => {
    ipcRenderer.on('display-change', (_, displays: Display[]) =>
      callback(displays)
    );
    return () => ipcRenderer.removeAllListeners('display-change'); // Return a cleanup function
  },
  getScreenInfo: () => {
    ipcRenderer.send('get-screens');
  },
  onScreenInfo: (callback: (displays: Display[]) => void) => {
    ipcRenderer.on('screens-info', (_, displays: Display[]) =>
      callback(displays)
    );
    return () => ipcRenderer.removeAllListeners('screens-info');
  },
  resetWindows: () => ipcRenderer.send('reset-windows'),
  lockWindows: () => ipcRenderer.send('lock-windows'),
  unlockWindows: () => ipcRenderer.send('unlock-windows'),
  getLockStatus: () => ipcRenderer.send('get-lock-status'),
  onLockStatus: (callback: (isLocked: boolean) => void) => {
    ipcRenderer.on('lock-status-info', (_, isLocked: boolean) =>
      callback(isLocked)
    );
    return () => ipcRenderer.removeAllListeners('lock-status-info');
  },
  uploadImage: async (file: File, title: string) => {
    const arrayBuffer = await file.arrayBuffer();
    return ipcRenderer.invoke(
      'upload-image',
      Buffer.from(arrayBuffer),
      file.name,
      title
    );
  },
  deleteImage: (filePath: string) =>
    ipcRenderer.invoke('delete-image', filePath),
  uploadLogo: async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    return ipcRenderer.invoke(
      'upload-logo',
      Buffer.from(arrayBuffer),
      file.name
    );
  },
  getCustomScreens: (): Promise<CustomScreen[]> =>
    ipcRenderer.invoke('get-custom-screens'),
  setCustomScreens: (customScreens: CustomScreen[]) =>
    ipcRenderer.invoke('set-custom-screens', customScreens),
  getSavedMatchSettings: (): Promise<MatchSettings[]> =>
    ipcRenderer.invoke('get-saved-match-settings'),
  setSavedMatchSettings: (savedMatchSettings: MatchSettings[]) =>
    ipcRenderer.invoke('set-saved-match-settings', savedMatchSettings),
  onCustomScreensUpdated: (
    callback: (customScreens: CustomScreen[]) => void
  ) => {
    const listener = (_: IpcRendererEvent, screens: CustomScreen[]) =>
      callback(screens);
    ipcRenderer.on('custom-screens-updated', listener);
    return () => ipcRenderer.removeListener('custom-screens-updated', listener);
  },
  checkForUpdates: async () => {
    return await ipcRenderer.invoke('check-for-updates');
  },
  getLiveMatch: (): Promise<LiveMatch | undefined> =>
    ipcRenderer.invoke('get-live-match'),
  resolveLiveMatch: () => ipcRenderer.send('resolve-live-match'),
  openUrlInBrowser: (url: string) =>
    ipcRenderer.send('open-url-in-browser', url),

  onNextMatchPhase: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('next-match-phase', listener);
    return () => ipcRenderer.removeListener('next-match-phase', listener);
  },
  onHomeTeamScored: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('home-team-scored', listener);
    return () => ipcRenderer.removeListener('home-team-scored', listener);
  },
  onAwayTeamScored: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('away-team-scored', listener);
    return () => ipcRenderer.removeListener('away-team-scored', listener);
  },
  onHomeTeamUnscored: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('home-team-unscored', listener);
    return () => ipcRenderer.removeListener('home-team-unscored', listener);
  },
  onAwayTeamUnscored: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('away-team-unscored', listener);
    return () => ipcRenderer.removeListener('away-team-unscored', listener);
  },
  onToggleClock: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('toggle-clock', listener);
    return () => ipcRenderer.removeListener('toggle-clock', listener);
  },
  onSetDisplayScreen: (callback: (screen: string) => void) => {
    const listener = (_: IpcRendererEvent, screen: string) => callback(screen);
    ipcRenderer.on('set-display-screen', listener);
    return () => ipcRenderer.removeListener('set-display-screen', listener);
  },

  getRemoteControlStatus: () => ipcRenderer.invoke('get-remote-control-status'),
  onRemoteControlStatus: (callback: (status: RemoteControlStatus) => void) => {
    const listener = (_: IpcRendererEvent, status: RemoteControlStatus) =>
      callback(status);
    ipcRenderer.on('remote-control-status', listener);
    return () => ipcRenderer.removeListener('remote-control-status', listener);
  },

  enableKeyboardShortcuts: () => ipcRenderer.send('enable-keyboard-shortcuts'),
  disableKeyboardShortcuts: () =>
    ipcRenderer.send('disable-keyboard-shortcuts'),

  // Handshake for initial state sync from main to display
  displayReady: () => ipcRenderer.send('display-ready'),
});
