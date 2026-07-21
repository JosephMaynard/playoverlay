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
    // Mirror what restoreSnapshot does in production: setTime with the restored
    // snapshot, then resyncToTime with the same snapshot.
    useTimeStore.setState({
      time: { time: '10:30', matchPhase: 'firstHalf', paused: false },
    });
    const { result } = renderHook(() => useMatchClock());

    act(() => {
      result.current.resyncToTime({
        time: '10:30',
        matchPhase: 'firstHalf',
        paused: false,
      });
    });

    expect(result.current.paused).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // A tick landed one second later. If baseSecondsRef/secondsRef had not
    // been re-seeded to the restored 10:30 (630s), this would instead read
    // as counting up from 0 (00:01). Ticking only advances the clock, so the
    // restored phase is left intact.
    expect(useTimeStore.getState().time.time).toBe(timeToString(631));
    expect(useTimeStore.getState().time.matchPhase).toBe('firstHalf');
  });

  it('stays stopped and preserves the phase when the restored phase is paused', () => {
    useTimeStore.setState({
      time: { time: '05:00', matchPhase: 'firstHalf', paused: true },
    });
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

    // Ticking never started, so the clock is not advanced past the restored
    // value and the phase is preserved.
    expect(useTimeStore.getState().time.time).toBe('05:00');
    expect(useTimeStore.getState().time.matchPhase).toBe('firstHalf');
  });

  it('clears a running interval when resynced to a paused snapshot', () => {
    useTimeStore.setState({
      time: { time: '10:30', matchPhase: 'firstHalf', paused: false },
    });
    const { result } = renderHook(() => useMatchClock());

    // Start from an active, unpaused resync so the interval is running.
    act(() => {
      result.current.resyncToTime({
        time: '10:30',
        matchPhase: 'firstHalf',
        paused: false,
      });
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(useTimeStore.getState().time.time).toBe(timeToString(631));

    // Resync to a paused snapshot: the previously running interval must stop.
    useTimeStore.setState({
      time: { time: '20:00', matchPhase: 'firstHalf', paused: true },
    });
    act(() => {
      result.current.resyncToTime({
        time: '20:00',
        matchPhase: 'firstHalf',
        paused: true,
      });
    });

    expect(result.current.paused).toBe(true);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // No further ticks fired: the clock stays at the paused value, proving the
    // old interval was cleared rather than left running.
    expect(useTimeStore.getState().time.time).toBe('20:00');
    expect(useTimeStore.getState().time.matchPhase).toBe('firstHalf');
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
