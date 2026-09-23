import type { BrowserWindow } from 'electron';
import { afterEach, describe, expect, it, vi } from 'vitest';

const setWindowPosition = vi.fn();
const setWindowSize = vi.fn();
const logFailedOperation = vi.fn();

vi.mock('electron', () => ({
  screen: {
    getPrimaryDisplay: () => ({
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      workAreaSize: { width: 1920, height: 1040 },
    }),
  },
}));
vi.mock('../storage', () => ({
  setWindowPosition: (...args: unknown[]) => setWindowPosition(...args),
  setWindowSize: (...args: unknown[]) => setWindowSize(...args),
}));
vi.mock('../logger', () => ({
  logFailedOperation: (message: string) => logFailedOperation(message),
}));

import resetWindow from '../resetWindow';

function fakeWindow(fullscreen: boolean) {
  return {
    isMinimized: vi.fn(() => false),
    restore: vi.fn(),
    isFullScreen: vi.fn(() => fullscreen),
    setFullScreen: vi.fn(),
    isMaximized: vi.fn(() => false),
    unmaximize: vi.fn(),
    focus: vi.fn(),
    setAlwaysOnTop: vi.fn(),
    setBounds: vi.fn(),
    getPosition: vi.fn(() => [560, 220]),
    getSize: vi.fn(() => [800, 600]),
  };
}

describe('resetWindow', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('exits fullscreen, centres the window on the primary display and saves its placement', () => {
    const window = fakeWindow(true);

    resetWindow(window as unknown as BrowserWindow, 'DISPLAY_WINDOW');

    expect(window.setFullScreen).toHaveBeenCalledWith(false);
    expect(window.setBounds).toHaveBeenCalledWith({
      x: 560,
      y: 220,
      width: 800,
      height: 600,
    });
    expect(setWindowPosition).toHaveBeenCalledWith(
      'DISPLAY_WINDOW',
      [560, 220]
    );
    expect(setWindowSize).toHaveBeenCalledWith('DISPLAY_WINDOW', [800, 600]);
  });

  it('logs rather than throws when saving the new placement fails', () => {
    setWindowPosition.mockImplementation(() => {
      throw new Error('EACCES: permission denied');
    });
    const window = fakeWindow(false);

    expect(() =>
      resetWindow(window as unknown as BrowserWindow, 'MAIN_WINDOW')
    ).not.toThrow();
    expect(window.setBounds).toHaveBeenCalled();
    expect(logFailedOperation).toHaveBeenCalledWith(
      expect.stringContaining('EACCES')
    );
  });

  it('does nothing without a window', () => {
    expect(() => resetWindow(null, 'MAIN_WINDOW')).not.toThrow();
    expect(setWindowPosition).not.toHaveBeenCalled();
  });
});
