import { useCallback, useEffect, useRef, useState } from 'react';
import { MatchPhase, Time } from '../../types';
import { getPhaseById, timeToString } from '../../utils';
import { useTimeStore } from '../../store/time';
import { useMatchStateStore } from '../../store/matchState';
import { useMatchSettingsStore } from '../../store/matchSettings';
import { useAppSettingsStore } from '../../store/appSettings';

// Parses a "MM:SS" clock string into whole seconds. Shared by restoreClock
// and resyncToTime below, the two places that re-seed the internal second
// counter from a persisted/restored time string; each keeps its own handling
// of a missing/empty time value, only the conversion itself is shared here.
function parseTimeToSeconds(time: string): number {
  const [minutes, secs] = time.split(':').map(Number);
  return (minutes || 0) * 60 + (secs || 0);
}

export interface StopTimeOptions {
  // Whether stopping should apply the auto-switch-screens behaviour (jump
  // to matchTitle). Defaults to true; settings-driven stops (a match
  // settings edit removing the running phase) pass false since editing
  // settings has never switched the operator's display screen.
  autoSwitch?: boolean;
}

export interface UseMatchClock {
  paused: boolean;
  startTime: (matchPhase: MatchPhase) => void;
  stopTime: (options?: StopTimeOptions) => void;
  pause: () => void;
  resume: () => void;
  adjustTime: (difference: number) => void;
  restoreClock: (time: Time | undefined) => void;
  resyncToTime: (time: Time | undefined) => void;
}

// Owns the match clock (seconds/baseSeconds/tickingSince/interval) plus the
// auto-switch-screens behaviour that starting/stopping a phase triggers.
// State lives in refs rather than module scope: a single Dashboard instance
// calls this hook once, so refs give the same "one clock for the app's
// lifetime" behaviour module-scope variables used to, while also making a
// freshly mounted Dashboard (as in tests using vi.resetModules() + a fresh
// render) get a genuinely fresh clock instead of leaking state.
export default function useMatchClock(): UseMatchClock {
  const [paused, setPaused] = useState(false);

  const secondsRef = useRef(0);
  const baseSecondsRef = useRef(0);
  const tickingSinceRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined
  );

  const setTime = useTimeStore((state) => state.setTime);
  const setMatchState = useMatchStateStore((state) => state.setMatchState);

  // Push a new clock value (and any extra time fields) to the time store.
  // Match settings are read fresh from the store so a half-length change
  // mid-half takes effect immediately.
  const applyTime = useCallback(
    (newSeconds: number, timeUpdates: Partial<Time> = {}) => {
      secondsRef.current = newSeconds;
      const currentTime = useTimeStore.getState().time;
      const currentMatchSettings =
        useMatchSettingsStore.getState().matchSettings;
      const matchPhase = timeUpdates.matchPhase ?? currentTime.matchPhase;
      const remainingSeconds =
        (getPhaseById(currentMatchSettings, matchPhase)?.end || 0) * 60 -
        newSeconds;

      setTime({
        ...currentTime,
        ...timeUpdates,
        time: timeToString(newSeconds),
        remainingTime:
          remainingSeconds > 0
            ? `-${timeToString(remainingSeconds)}`
            : `+${timeToString(0 - remainingSeconds)}`,
      });
    },
    [setTime]
  );

  const tick = useCallback(() => {
    if (tickingSinceRef.current === null) return;
    let newSeconds =
      baseSecondsRef.current +
      Math.round((Date.now() - tickingSinceRef.current) / 1000);

    // The anchor is the system clock, which can step (NTP sync, manual
    // change) or pause (laptop sleep). A backwards step or a jump of more
    // than a few seconds between ticks is not real match time, re-anchor
    // at the current value instead of leaping the on-air clock.
    if (
      newSeconds < secondsRef.current ||
      newSeconds > secondsRef.current + 5
    ) {
      baseSecondsRef.current = secondsRef.current;
      tickingSinceRef.current = Date.now();
      newSeconds = secondsRef.current;
    }

    newSeconds = Math.max(0, newSeconds);
    if (newSeconds !== secondsRef.current) {
      applyTime(newSeconds);
    }
  }, [applyTime]);

  const startTicking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    baseSecondsRef.current = secondsRef.current;
    tickingSinceRef.current = Date.now();
    // Tick faster than once per second: each tick recomputes from the wall
    // clock, so the displayed time stays accurate even after delays
    intervalRef.current = setInterval(tick, 250);
  }, [tick]);

  const stopTicking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
    tickingSinceRef.current = null;
  }, []);

  // Defensive cleanup: Dashboard mounts this hook once for the app's
  // lifetime, but stopping the interval on unmount keeps the hook correct
  // if it's ever used somewhere shorter-lived (and mirrors the listener
  // cleanup pattern already used elsewhere in Dashboard).
  useEffect(() => stopTicking, [stopTicking]);

  // Starting a phase switches the display screen to the score bug when
  // auto-switch is on (read fresh from the store, not a stale closure) and
  // clears any pinned custom screen image so the score bug is what's
  // actually shown.
  const startTime = useCallback(
    (matchPhase: MatchPhase) => {
      stopTicking();
      setPaused(false);

      const phase = getPhaseById(
        useMatchSettingsStore.getState().matchSettings,
        matchPhase
      );

      applyTime((phase?.start ?? 0) * 60, { matchPhase, paused: false });

      setMatchState({ matchPhase });

      const { autoSwitchScreens } = useAppSettingsStore.getState().appSettings;
      if (autoSwitchScreens) {
        setMatchState({
          displayScreen: 'scoreBug',
          customScreenImageUrl: undefined,
        });
      }

      startTicking();
    },
    [applyTime, setMatchState, startTicking, stopTicking]
  );

  // Stopping records how far the match got (previousMatchPhase) and, when
  // auto-switch is on and this call opts in (the default), returns the
  // display to matchTitle. Settings-driven stops pass { autoSwitch: false }
  // since a settings edit should never move the operator's display screen.
  const stopTime = useCallback(
    (options: StopTimeOptions = {}) => {
      const { autoSwitch = true } = options;
      stopTicking();

      setTime({
        time: undefined,
        additionalTime: undefined,
        matchPhase: undefined,
        remainingTime: undefined,
        paused: false,
      });

      setPaused(false);

      setMatchState({
        previousMatchPhase: useMatchStateStore.getState().matchState.matchPhase,
        matchPhase: undefined,
      });

      const { autoSwitchScreens } = useAppSettingsStore.getState().appSettings;
      if (autoSwitchScreens && autoSwitch) {
        setMatchState({ displayScreen: 'matchTitle' });
      }
    },
    [setMatchState, setTime, stopTicking]
  );

  const pause = useCallback(() => {
    if (intervalRef.current) {
      stopTicking();
      setPaused(true);
      setTime({ paused: true });
    }
  }, [setTime, stopTicking]);

  const resume = useCallback(() => {
    startTicking();
    setPaused(false);
    setTime({ paused: false });
  }, [setTime, startTicking]);

  const adjustTime = useCallback(
    (difference: number) => {
      const newSeconds = Math.max(secondsRef.current + difference, 0);
      baseSecondsRef.current = newSeconds;
      if (tickingSinceRef.current !== null) {
        tickingSinceRef.current = Date.now();
      }
      applyTime(newSeconds);
    },
    [applyTime]
  );

  // Restore with the clock paused; the operator resumes when ready.
  const restoreClock = useCallback(
    (time: Time | undefined) => {
      stopTicking();

      if (time?.time) {
        secondsRef.current = parseTimeToSeconds(time.time);
        baseSecondsRef.current = secondsRef.current;
      }

      const clockWasRunning = time?.matchPhase !== undefined;
      setTime({ ...time, paused: clockWasRunning });
      setPaused(clockWasRunning);
    },
    [setTime, stopTicking]
  );

  // Re-anchor the clock to an externally restored time (used by undo/redo).
  // Unlike restoreClock, this does NOT re-write the time store (undo/redo has
  // already restored it) and it does NOT force a pause: it honours the
  // restored state. If the restored phase is active and not paused the clock
  // resumes ticking from the restored value; if it was paused, or no phase is
  // running, the clock stays stopped. The internal second counter is re-seeded
  // from the restored clock string so ticking continues from there rather than
  // from wherever the previous anchor left secondsRef, which is the subtle bit:
  // the running time is derived from baseSeconds + wall-clock elapsed, so
  // without re-seeding, a resumed clock would leap back to the old value.
  const resyncToTime = useCallback(
    (time: Time | undefined) => {
      stopTicking();

      if (time?.time) {
        secondsRef.current = parseTimeToSeconds(time.time);
      } else {
        secondsRef.current = 0;
      }
      baseSecondsRef.current = secondsRef.current;

      const phaseActive = time?.matchPhase !== undefined;
      const shouldPause = phaseActive ? Boolean(time?.paused) : false;
      setPaused(shouldPause);

      // startTicking re-anchors baseSeconds/tickingSince to "now" from the
      // freshly seeded secondsRef, so the first tick continues from the
      // restored value instead of leaping.
      if (phaseActive && !shouldPause) {
        startTicking();
      }
    },
    [startTicking, stopTicking]
  );

  return {
    paused,
    startTime,
    stopTime,
    pause,
    resume,
    adjustTime,
    restoreClock,
    resyncToTime,
  };
}
