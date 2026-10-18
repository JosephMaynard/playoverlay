import { create } from 'zustand';

import { ScreenRotationEntry } from '../types';
import {
  getScreenRotationSettings,
  isRotationEntryAvailable,
  nextRotationIndex,
} from '../screenRotation';
import { useAppSettingsStore } from './appSettings';
import { useCustomGraphicsStore } from './customGraphics';
import { useMatchSettingsStore } from './matchSettings';
import { useMatchStateStore } from './matchState';

// Whether the screen rotation is running, and where it has got to. Kept out
// of matchState on purpose: undo snapshots and the outputs carry matchState,
// and neither should ever hold a rotation. Not persisted either; a restart
// comes back with the rotation stopped. The timer that advances it is the
// useScreenRotation hook.
interface ScreenRotationStore {
  active: boolean;
  // Position in the configured list of the screen now showing.
  index: number;
  // Shows the first screen that can be shown, straight away. Returns false
  // (and stays stopped) when fewer than two chosen screens can be shown.
  start: () => boolean;
  stop: () => void;
  // Shows the next screen that can be shown, or stops when fewer than two
  // are left.
  advance: () => void;
}

// The chosen screens and a check for which can be shown, read fresh: a
// rotation runs for minutes while the operator edits settings and graphics.
function currentRotation() {
  const { screens } = getScreenRotationSettings(
    useAppSettingsStore.getState().appSettings
  );
  const { matchSettings } = useMatchSettingsStore.getState();
  const { customGraphics } = useCustomGraphicsStore.getState();
  const isAvailable = (entry: ScreenRotationEntry) =>
    isRotationEntryAvailable(entry, matchSettings, customGraphics);
  return {
    screens,
    isAvailable,
    availableCount: screens.filter(isAvailable).length,
  };
}

// Straight to the store setter, not a match action: an automatic switch is
// not an operator action, so it must not fill the undo stack (or stop the
// rotation, as an operator's screen switch does).
function show(entry: ScreenRotationEntry) {
  useMatchStateStore.getState().setMatchState({
    displayScreen: entry.screen,
    customScreenImageUrl:
      entry.screen === 'custom' ? entry.customScreenImageUrl : undefined,
  });
}

export const useScreenRotationStore = create<ScreenRotationStore>(
  (set, get) => ({
    active: false,
    index: 0,

    start: () => {
      const { screens, isAvailable, availableCount } = currentRotation();
      if (availableCount < 2) {
        get().stop();
        return false;
      }
      const index = nextRotationIndex(screens, -1, isAvailable);
      set({ active: true, index });
      show(screens[index]);
      return true;
    },

    stop: () => {
      if (get().active) set({ active: false, index: 0 });
    },

    advance: () => {
      if (!get().active) return;
      const { screens, isAvailable, availableCount } = currentRotation();
      if (availableCount < 2) {
        get().stop();
        return;
      }
      const index = nextRotationIndex(screens, get().index, isAvailable);
      set({ index });
      show(screens[index]);
    },
  })
);
