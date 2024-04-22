// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { Settings, contextBridge, ipcRenderer } from 'electron';
import { Scores, Time } from './types';

contextBridge.exposeInMainWorld('electronAPI', {
  updateScores: (scores: Scores) => ipcRenderer.send('update-score', scores),
  onScoreUpdated: (callback: (scores: Scores) => void) =>
    ipcRenderer.on('score-updated', (_, scores) => callback(scores)),
  updateTime: (time: Time) => ipcRenderer.send('update-time', time),
  onTimeUpdated: (callback: (time: Time) => void) =>
    ipcRenderer.on('time-updated', (_, time) => callback(time)),
  updateSettings: (settings: Settings) =>
    ipcRenderer.send('update-settings', settings),
  onSettingsUpdated: (callback: (settings: Settings) => void) =>
    ipcRenderer.on('settings-updated', (_, settings) => callback(settings)),
  toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),
  getFullscreenStatus: () => ipcRenderer.invoke('get-fullscreen-status'),

  startPowerSaveBlocker: () => ipcRenderer.invoke('start-power-save-blocker'),
  stopPowerSaveBlocker: () => ipcRenderer.invoke('stop-power-save-blocker'),
  getPowerSaveBlockerStatus: () =>
    ipcRenderer.invoke('get-power-save-blocker-status'),
});
