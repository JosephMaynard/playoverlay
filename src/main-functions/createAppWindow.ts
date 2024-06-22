import { BrowserWindow } from 'electron';
import path from 'path';
import {
  getWindowSize,
  getWindowPosition,
  setWindowSize,
  setWindowPosition,
  WindowName,
} from './storage';
import { isDev } from '../main';

export default function createAppWindow(windowName: WindowName): BrowserWindow {
  const commonOptions = {
    autoHideMenuBar: true,
    minWidth: 700,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: !isDev,
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
