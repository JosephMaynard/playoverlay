import { EventEmitter } from 'events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  decideRendererReload,
  isWindowVisibleOnDisplays,
  MAX_RENDERER_RELOADS,
  moveWindowToDisplay,
  Rectangle,
  RENDERER_RELOAD_WINDOW_MS,
  shouldPreventDisplaySleep,
} from '../windowManagement';

describe('shouldPreventDisplaySleep', () => {
  const idle = {
    phaseRunning: false,
    displayFullscreen: false,
    windowsLocked: false,
  };

  it('lets the system sleep when nothing is live', () => {
    expect(shouldPreventDisplaySleep(idle)).toBe(false);
  });

  it('keeps the display awake while a phase runs, even with the windows unlocked', () => {
    expect(shouldPreventDisplaySleep({ ...idle, phaseRunning: true })).toBe(
      true
    );
  });

  it('keeps the display awake while the output is fullscreen', () => {
    expect(
      shouldPreventDisplaySleep({ ...idle, displayFullscreen: true })
    ).toBe(true);
  });

  it('keeps the display awake while the windows are locked', () => {
    expect(shouldPreventDisplaySleep({ ...idle, windowsLocked: true })).toBe(
      true
    );
  });
});

describe('isWindowVisibleOnDisplays', () => {
  // An L-shaped layout: a laptop at the origin and a taller monitor to its
  // right, offset downwards. The single bounding box around both includes
  // an empty area above the laptop's right-hand neighbour.
  const laptop = { id: 1, bounds: { x: 0, y: 0, width: 1440, height: 900 } };
  const monitor = {
    id: 2,
    bounds: { x: 1440, y: 600, width: 1920, height: 1080 },
  };

  it('accepts a window fully on one display', () => {
    expect(
      isWindowVisibleOnDisplays({ x: 100, y: 100, width: 800, height: 600 }, [
        laptop,
        monitor,
      ])
    ).toBe(true);
  });

  it('accepts a window straddling two displays', () => {
    expect(
      isWindowVisibleOnDisplays({ x: 1100, y: 600, width: 800, height: 280 }, [
        laptop,
        monitor,
      ])
    ).toBe(true);
  });

  it('rejects a window stranded in the gap inside the bounding box', () => {
    const inTheGap: Rectangle = { x: 1600, y: 0, width: 800, height: 500 };
    expect(isWindowVisibleOnDisplays(inTheGap, [laptop, monitor])).toBe(false);
  });

  it('rejects a window left on a display that has been unplugged', () => {
    expect(
      isWindowVisibleOnDisplays(
        { x: 1440, y: 600, width: 1920, height: 1080 },
        [laptop]
      )
    ).toBe(false);
  });

  it('rejects a degenerate window', () => {
    expect(
      isWindowVisibleOnDisplays({ x: 0, y: 0, width: 0, height: 0 }, [laptop])
    ).toBe(false);
  });
});

class FakeWindow extends EventEmitter {
  fullscreen: boolean;
  bounds: Rectangle = { x: 0, y: 0, width: 800, height: 600 };
  destroyed = false;
  // When false, setFullScreen(false) never emits leave-full-screen, to
  // exercise the timeout fallback.
  emitsLeave = true;
  calls: string[] = [];

  constructor(fullscreen: boolean) {
    super();
    this.fullscreen = fullscreen;
  }

  isDestroyed() {
    return this.destroyed;
  }

  isFullScreen() {
    return this.fullscreen;
  }

  setFullScreen(flag: boolean) {
    this.calls.push(`setFullScreen(${flag})`);
    if (!flag && this.fullscreen) {
      this.fullscreen = false;
      // macOS finishes the exit animation later.
      if (this.emitsLeave) setTimeout(() => this.emit('leave-full-screen'), 50);
    } else {
      this.fullscreen = flag;
    }
  }

  getBounds() {
    return this.bounds;
  }

  setBounds(bounds: Partial<Rectangle>) {
    this.calls.push(`setBounds(${bounds.x},${bounds.y})`);
    // What macOS does: a fullscreen window ignores setBounds.
    if (this.fullscreen) return;
    this.bounds = { ...this.bounds, ...bounds };
  }
}

describe('moveWindowToDisplay', () => {
  const hdmi = { id: 2, bounds: { x: 1440, y: 0, width: 1920, height: 1080 } };

  afterEach(() => {
    vi.useRealTimers();
  });

  it('leaves fullscreen and waits for it before moving, then re-enters fullscreen', async () => {
    vi.useFakeTimers();
    const window = new FakeWindow(true);

    const moving = moveWindowToDisplay(window, hdmi, { fullscreen: true });
    // Nothing moves until the exit animation has finished.
    expect(window.calls).toEqual(['setFullScreen(false)']);
    await vi.advanceTimersByTimeAsync(50);
    await moving;

    expect(window.calls).toEqual([
      'setFullScreen(false)',
      'setBounds(1440,0)',
      'setFullScreen(true)',
    ]);
    expect(window.bounds.x).toBe(1440);
    expect(window.fullscreen).toBe(true);
  });

  it('moves a windowed window straight away and leaves it windowed when asked', async () => {
    const window = new FakeWindow(false);

    await moveWindowToDisplay(window, hdmi, { fullscreen: false });

    expect(window.calls).toEqual(['setBounds(1440,0)']);
    expect(window.fullscreen).toBe(false);
  });

  it('still moves when leave-full-screen never arrives', async () => {
    vi.useFakeTimers();
    const window = new FakeWindow(true);
    window.emitsLeave = false;

    const moving = moveWindowToDisplay(window, hdmi, {
      fullscreen: true,
      leaveTimeoutMs: 500,
    });
    await vi.advanceTimersByTimeAsync(500);
    await moving;

    expect(window.bounds.x).toBe(1440);
    expect(window.listenerCount('leave-full-screen')).toBe(0);
  });

  it('gives up quietly if the window is destroyed mid-move', async () => {
    vi.useFakeTimers();
    const window = new FakeWindow(true);

    const moving = moveWindowToDisplay(window, hdmi, { fullscreen: true });
    window.destroyed = true;
    await vi.advanceTimersByTimeAsync(50);
    await moving;

    expect(window.calls).toEqual(['setFullScreen(false)']);
  });
});

describe('decideRendererReload', () => {
  it(`reloads up to ${MAX_RENDERER_RELOADS} crashes in a row, then stops`, () => {
    let crashes: number[] = [];
    const decisions: boolean[] = [];
    for (let index = 0; index <= MAX_RENDERER_RELOADS; index++) {
      const result = decideRendererReload(crashes, 1000 + index);
      crashes = result.crashes;
      decisions.push(result.reload);
    }
    expect(decisions).toEqual([
      ...Array(MAX_RENDERER_RELOADS).fill(true),
      false,
    ]);
  });

  it('forgets crashes older than the window', () => {
    const old = Array.from({ length: MAX_RENDERER_RELOADS }, (_, i) => i);
    const result = decideRendererReload(old, RENDERER_RELOAD_WINDOW_MS + 10);
    expect(result.reload).toBe(true);
    expect(result.crashes).toEqual([RENDERER_RELOAD_WINDOW_MS + 10]);
  });
});
