import { BrowserWindow, screen } from 'electron';
import { WindowName, setWindowPosition, setWindowSize } from './storage';

export default function resetWindow(
  window: BrowserWindow | null,
  windowName: WindowName,
  offset: number = 0,
  windowWidth: number = 800,
  windowHeight: number = 600
) {
  if (window) {
    if (window.isMinimized()) window.restore();
    if (window.isFullScreen()) window.setFullScreen(false);
    if (window.isMaximized()) window.unmaximize();

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const x =
      Math.floor(primaryDisplay.bounds.x + (width - windowWidth) / 2) + offset;
    const y =
      Math.floor(primaryDisplay.bounds.y + (height - windowHeight) / 2) +
      offset;

    window.focus();
    window.setAlwaysOnTop(true);
    window.setAlwaysOnTop(false);
    window.setBounds({ x, y, width: windowWidth, height: windowHeight });

    setWindowPosition(windowName, window.getPosition());
    setWindowSize(windowName, window.getSize());
  }
}
