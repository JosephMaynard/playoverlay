// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { Display, contextBridge, ipcRenderer } from 'electron';
import {
  Scores,
  TeamSettingsInterface,
  Time,
  AppSettings,
  MatchSettings,
  CustomScreen,
} from './types';

contextBridge.exposeInMainWorld('electronAPI', {
  updateScores: (scores: Scores) => ipcRenderer.send('update-score', scores),
  onScoreUpdated: (callback: (scores: Scores) => void) =>
    ipcRenderer.on('score-updated', (_, scores) => callback(scores)),
  updateTime: (time: Time) => ipcRenderer.send('update-time', time),
  onTimeUpdated: (callback: (time: Time) => void) =>
    ipcRenderer.on('time-updated', (_, time) => callback(time)),
  updateTeamSettings: (teamSettings: TeamSettingsInterface) =>
    ipcRenderer.send('update-team-settings', teamSettings),
  onTeamSettingsUpdated: (
    callback: (teamSettings: TeamSettingsInterface) => void
  ) =>
    ipcRenderer.on('team-settings-updated', (_, teamSettings) =>
      callback(teamSettings)
    ),
  updateAppSettings: (appSettings: AppSettings) =>
    ipcRenderer.send('update-app-settings', appSettings),
  onAppSettingsUpdated: (callback: (appSettings: AppSettings) => void) =>
    ipcRenderer.on('app-settings-updated', (_, appSettings) =>
      callback(appSettings)
    ),
  updateMatchSettings: (matchSettings: MatchSettings) =>
    ipcRenderer.send('update-match-settings', matchSettings),
  onMatchSettingsUpdated: (callback: (matchSettings: MatchSettings) => void) =>
    ipcRenderer.on('match-settings-updated', (_, matchSettings) =>
      callback(matchSettings)
    ),
  toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),
  getFullscreenStatus: () => ipcRenderer.invoke('get-fullscreen-status'),

  startPowerSaveBlocker: () => ipcRenderer.invoke('start-power-save-blocker'),
  stopPowerSaveBlocker: () => ipcRenderer.invoke('stop-power-save-blocker'),
  getPowerSaveBlockerStatus: () =>
    ipcRenderer.invoke('get-power-save-blocker-status'),
  getVersion: () => ipcRenderer.sendSync('get-version'),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  getEncodedSystemInfo: () => ipcRenderer.invoke('get-encoded-system-info'),
  getAppSettings: () => ipcRenderer.invoke('get-app-settings'),
  getTeamSettings: () => ipcRenderer.invoke('get-team-settings'),
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
  getCustomScreens: (): Promise<CustomScreen[]> =>
    ipcRenderer.invoke('get-custom-screens'),
  onCustomScreensUpdated: (
    callback: (customScreens: CustomScreen[]) => void
  ) => {
    const listener = (_: any, screens: CustomScreen[]) => callback(screens);
    ipcRenderer.on('custom-screens-updated', listener);
    return () => ipcRenderer.removeListener('custom-screens-updated', listener);
  },
  getDemoMode: () => ipcRenderer.invoke('get-demo-mode'),
  saveLicenceKey: (licenceKey: string) =>
    ipcRenderer.invoke('save-licence-key', licenceKey),
});
