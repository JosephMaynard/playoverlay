import { useEffect } from 'react';

import {
  availableRotationEntries,
  getScreenRotationSettings,
  rotationIntervalMs,
} from './screenRotation';
import { useAppSettingsStore } from './store/appSettings';
import { useCustomGraphicsStore } from './store/customGraphics';
import { useMatchSettingsStore } from './store/matchSettings';
import { useScreenRotationStore } from './store/screenRotation';
import { useTimeStore } from './store/time';

// The screen rotation's engine, mounted once by the host's dashboard: while
// the rotation is running it moves on to the next screen every
// intervalSeconds, and it stops the rotation when it can no longer run.
// Everything it needs is in the core stores, so it takes no arguments; the
// match actions start and stop the rotation through the store.
export default function useScreenRotation(): void {
  const active = useScreenRotationStore((state) => state.active);
  const appSettings = useAppSettingsStore((state) => state.appSettings);
  const matchSettings = useMatchSettingsStore((state) => state.matchSettings);
  const customGraphics = useCustomGraphicsStore(
    (state) => state.customGraphics
  );
  const settings = getScreenRotationSettings(appSettings);
  const intervalMs = rotationIntervalMs(settings);
  const availableCount = availableRotationEntries(
    settings,
    matchSettings,
    customGraphics
  ).length;

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(
      () => useScreenRotationStore.getState().advance(),
      intervalMs
    );
    return () => clearInterval(timer);
  }, [active, intervalMs]);

  // A screen unticked, a graphic deleted or a line-up emptied mid-rotation
  // can leave fewer than two screens to cycle between, which is no rotation.
  useEffect(() => {
    if (active && availableCount < 2) {
      useScreenRotationStore.getState().stop();
    }
  }, [active, availableCount]);

  // The rotation is for the breaks. Starting a phase stops it through the
  // match actions, but a phase can also come back by undoing the stop that
  // began the break; the operator then needs the match graphics, not the
  // rotation carrying on over live play.
  useEffect(
    () =>
      useTimeStore.subscribe((state, previous) => {
        if (
          state.time.matchPhase !== undefined &&
          previous.time.matchPhase === undefined
        ) {
          useScreenRotationStore.getState().stop();
        }
      }),
    []
  );
}
