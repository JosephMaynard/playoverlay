import { BrowserWindow } from 'electron';

export default function sendToScreen(
  window: BrowserWindow | null,
  display: Electron.Display
): void {
  if (window) {
    const { bounds } = display;
    window.setBounds({
      x: bounds.x,
      y: bounds.y,
      width: window.getBounds().width,
      height: window.getBounds().height,
    });
    window.focus();
    window.setAlwaysOnTop(true);
    window.setAlwaysOnTop(false);
  }
}
