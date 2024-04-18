// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  send: (channel: string, data: unknown) => {
    const validChannels = ["update-score", "update-time", "update-settings"];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel: string, func: (...args: any[] | null) => void) => {
    if (func === null) {
      ipcRenderer.removeAllListeners(channel);
      return;
    }
    const validChannels = ["score-update", "time-update", "settings-update"];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
});
