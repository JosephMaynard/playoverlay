// Window and power decisions for the main process, kept free of Electron
// imports so the policy itself is unit-testable. main.ts gathers the live
// signals (window bounds, fullscreen state, the cached clock) and applies
// whatever these functions decide.

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DisplayLike {
  id: number;
  bounds: Rectangle;
}

export interface SleepSignals {
  // The cached clock has a phase (a half, extra time, penalties...).
  phaseRunning: boolean;
  // The output window is fullscreen, i.e. on air on its HDMI screen.
  displayFullscreen: boolean;
  windowsLocked: boolean;
}

// A laptop that sleeps (or just blanks its screens) mid-match takes the
// output off air. Previously only locking the windows held the display
// awake, and a volunteer who never locks them could lose the picture at half
// time. Any one of these signals means "something is live", so the display
// is kept awake; with none of them the OS is free to sleep as normal.
export function shouldPreventDisplaySleep(signals: SleepSignals): boolean {
  return (
    signals.phaseRunning || signals.displayFullscreen || signals.windowsLocked
  );
}

function intersectionArea(a: Rectangle, b: Rectangle): number {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return width > 0 && height > 0 ? width * height : 0;
}

// Share of the window that must sit on real screens for it to count as
// visible. Half is enough to find and drag it; anything less and the
// operator may not see it at all.
export const MIN_VISIBLE_WINDOW_FRACTION = 0.5;

// Checks the window against each display separately. The previous check
// compared it with one bounding box around every display, which in an L
// shaped or offset layout includes empty space that no screen shows, so a
// window stranded there counted as visible. Displays never overlap, so the
// per-display intersections can simply be added up.
export function isWindowVisibleOnDisplays(
  windowBounds: Rectangle,
  displays: DisplayLike[]
): boolean {
  const windowArea = windowBounds.width * windowBounds.height;
  if (windowArea <= 0) return false;
  const visibleArea = displays.reduce(
    (sum, display) => sum + intersectionArea(windowBounds, display.bounds),
    0
  );
  return visibleArea / windowArea >= MIN_VISIBLE_WINDOW_FRACTION;
}

// The part of BrowserWindow moveWindowToDisplay needs, so tests can drive it
// with a small fake instead of a real window.
export interface MovableWindow {
  isDestroyed(): boolean;
  isFullScreen(): boolean;
  setFullScreen(flag: boolean): void;
  getBounds(): Rectangle;
  setBounds(bounds: Partial<Rectangle>): void;
  once(event: 'leave-full-screen', listener: () => void): unknown;
  removeListener(event: 'leave-full-screen', listener: () => void): unknown;
}

// Fallback for a leave-full-screen event that never arrives (e.g. the window
// was already leaving fullscreen when this ran). macOS's exit animation
// takes well under a second.
export const LEAVE_FULLSCREEN_TIMEOUT_MS = 2000;

// Moves a window onto `display`, optionally making it fullscreen there.
// macOS ignores setBounds on a fullscreen window (it stays on its current
// screen), and leaving fullscreen is animated, so the window has to finish
// leaving fullscreen before it can be moved and then re-enter it.
export async function moveWindowToDisplay(
  window: MovableWindow,
  display: DisplayLike,
  options: { fullscreen: boolean; leaveTimeoutMs?: number }
): Promise<void> {
  if (window.isDestroyed()) return;

  if (window.isFullScreen()) {
    await new Promise<void>((resolve) => {
      // Only ever called after `timer` below is assigned: by the event,
      // which setFullScreen(false) triggers, or by the timer itself.
      const done = () => {
        clearTimeout(timer);
        window.removeListener('leave-full-screen', done);
        resolve();
      };
      // Attached before setFullScreen, since some platforms emit the event
      // synchronously.
      window.once('leave-full-screen', done);
      const timer = setTimeout(
        done,
        options.leaveTimeoutMs ?? LEAVE_FULLSCREEN_TIMEOUT_MS
      );
      window.setFullScreen(false);
    });
    if (window.isDestroyed()) return;
  }

  const { width, height } = window.getBounds();
  window.setBounds({
    x: display.bounds.x,
    y: display.bounds.y,
    width,
    height,
  });
  if (options.fullscreen) {
    window.setFullScreen(true);
  }
}

// Renderer crash recovery reloads the window automatically, but a renderer
// that dies on every load (a corrupt asset, a GPU fault) would otherwise
// reload in a tight loop, burning CPU and flooding the log. After this many
// crashes inside the window the app stops reloading and leaves the window for
// the operator (Reset windows, or a restart).
export const MAX_RENDERER_RELOADS = 3;
export const RENDERER_RELOAD_WINDOW_MS = 60 * 1000;

// Pure: given when this renderer previously crashed, should the crash at
// `now` be recovered with an automatic reload? Returns the updated history
// alongside the decision so the caller just stores it.
export function decideRendererReload(
  previousCrashes: number[],
  now: number
): { reload: boolean; crashes: number[] } {
  const crashes = [
    ...previousCrashes.filter(
      (timestamp) => now - timestamp < RENDERER_RELOAD_WINDOW_MS
    ),
    now,
  ];
  return { reload: crashes.length <= MAX_RENDERER_RELOADS, crashes };
}
