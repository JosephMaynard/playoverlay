import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultMatchSettings, defaultMatchState } from '../../../constants';
import { timeToString } from '../../../utils';
import { useMatchSettingsStore } from '../../../store/matchSettings';
import { useMatchStateStore } from '../../../store/matchState';
import { useTimeStore } from '../../../store/time';
import useMatchClock from '../useMatchClock';

// resyncToTime is the hook's undo/redo re-anchoring path (see Dashboard.tsx's
// registerClockResync): unlike restoreClock it never re-writes the time
// store itself, see its own comment in useMatchClock.ts. The only way to
// observe whether it actually re-seeded the internal secondsRef/
// baseSecondsRef is to let a tick fire and check where it resumed counting
// from, which is what these tests do directly, with fake timers, rather than
// only asserting (as the undo store tests do) that resyncToTime was called.

function seedStores() {
  useMatchSettingsStore.setState({
    matchSettings: { ...defaultMatchSettings },
  });
  useMatchStateStore.setState({ matchState: { ...defaultMatchState } });
  useTimeStore.setState({ time: { paused: false } });
}

describe('useMatchClock resyncToTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    seedStores();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resumes ticking from the restored time when the phase is active and unpaused', () => {
    const { result } = renderHook(() => useMatchClock());

    act(() => {
      result.current.resyncToTime({
        time: '10:30',
        matchPhase: 'firstHalf',
        paused: false,
      });
    });

    expect(result.current.paused).toBe(false);
    // No tick has fired yet: the store still holds whatever restoreClock/undo
    // already put there (untouched by resyncToTime itself).
    expect(useTimeStore.getState().time.time).toBeUndefined();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // A tick landed one second later. If baseSecondsRef/secondsRef had not
    // been re-seeded to the restored 10:30 (630s), this would instead read
    // as counting up from 0 (00:01).
    expect(useTimeStore.getState().time.time).toBe(timeToString(631));
  });

  it('stays stopped when the restored phase is paused', () => {
    const { result } = renderHook(() => useMatchClock());

    act(() => {
      result.current.resyncToTime({
        time: '05:00',
        matchPhase: 'firstHalf',
        paused: true,
      });
    });

    expect(result.current.paused).toBe(true);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Ticking never started, so the time store is never written to.
    expect(useTimeStore.getState().time.time).toBeUndefined();
  });

  it('stays stopped when no phase is running, regardless of the paused flag', () => {
    const { result } = renderHook(() => useMatchClock());

    act(() => {
      result.current.resyncToTime({ time: '05:00', paused: false });
    });

    expect(result.current.paused).toBe(false);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(useTimeStore.getState().time.time).toBeUndefined();
  });

  it('re-seeds to zero and stays stopped when restoring an undefined time', () => {
    const { result } = renderHook(() => useMatchClock());

    act(() => {
      result.current.resyncToTime(undefined);
    });

    expect(result.current.paused).toBe(false);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(useTimeStore.getState().time.time).toBeUndefined();
  });
});
