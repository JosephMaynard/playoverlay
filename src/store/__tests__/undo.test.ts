import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultMatchState } from '../../constants';
import { MatchState, Scores, Time } from '../../types';
import { useScoresStore } from '../scores';
import { useTimeStore } from '../time';
import { useMatchStateStore } from '../matchState';
import {
  UNDO_STACK_CAP,
  isTextEntryTarget,
  selectCanRedo,
  selectCanUndo,
  selectNextRedoLabel,
  selectNextUndoLabel,
  useUndoStore,
} from '../undo';

// These tests exercise the per-slice undo/redo stack in isolation from React
// and Electron: they drive the three underlying stores directly and assert
// that a captured slice round-trips through undo/redo while the untouched
// slices are left exactly as they were. The store setters mirror to
// window.electronAPI via optional chaining, which is simply absent here, so
// nothing Electron is required.

function scores(
  homeTeam: number,
  awayTeam = 0,
  penalties: Scores['penalties'] = []
): Scores {
  return { homeTeam, awayTeam, penalties };
}

function seedStores(
  scoresValue: Scores,
  time: Time = { paused: false },
  matchState: MatchState = { ...defaultMatchState }
) {
  useScoresStore.setState({ scores: scoresValue });
  useTimeStore.setState({ time });
  useMatchStateStore.setState({ matchState });
}

describe('undo store', () => {
  beforeEach(() => {
    useUndoStore.setState({
      undoStack: [],
      redoStack: [],
      clockResync: null,
    });
    seedStores(scores(0));
  });

  it('captures a slice then undo restores it', () => {
    const { captureUndo, undo } = useUndoStore.getState();

    // Snapshot the pre-action score (0-0), then apply the "action".
    captureUndo('undo:actions.homeGoal', ['scores']);
    useScoresStore.getState().setScores({ homeTeam: 1 });
    expect(useScoresStore.getState().scores.homeTeam).toBe(1);

    undo();
    expect(useScoresStore.getState().scores.homeTeam).toBe(0);
    // The pre-undo state is now available to redo.
    expect(selectCanRedo(useUndoStore.getState())).toBe(true);
    expect(selectCanUndo(useUndoStore.getState())).toBe(false);
  });

  it('walks back N actions with multi-step undo', () => {
    const { captureUndo, undo } = useUndoStore.getState();

    // Three discrete actions, each captured before it mutates.
    captureUndo('undo:actions.homeGoal', ['scores']);
    useScoresStore.getState().setScores({ homeTeam: 1 });
    captureUndo('undo:actions.homeGoal', ['scores']);
    useScoresStore.getState().setScores({ homeTeam: 2 });
    captureUndo('undo:actions.homeGoal', ['scores']);
    useScoresStore.getState().setScores({ homeTeam: 3 });

    undo();
    expect(useScoresStore.getState().scores.homeTeam).toBe(2);
    undo();
    expect(useScoresStore.getState().scores.homeTeam).toBe(1);
    undo();
    expect(useScoresStore.getState().scores.homeTeam).toBe(0);
    // Exhausted.
    undo();
    expect(useScoresStore.getState().scores.homeTeam).toBe(0);
  });

  it('replays actions with redo', () => {
    const { captureUndo, undo, redo } = useUndoStore.getState();

    captureUndo('undo:actions.homeGoal', ['scores']);
    useScoresStore.getState().setScores({ homeTeam: 1 });
    captureUndo('undo:actions.homeGoal', ['scores']);
    useScoresStore.getState().setScores({ homeTeam: 2 });

    undo();
    undo();
    expect(useScoresStore.getState().scores.homeTeam).toBe(0);

    redo();
    expect(useScoresStore.getState().scores.homeTeam).toBe(1);
    redo();
    expect(useScoresStore.getState().scores.homeTeam).toBe(2);
    // Exhausted.
    redo();
    expect(useScoresStore.getState().scores.homeTeam).toBe(2);
  });

  it('clears the redo stack when a fresh action is captured after an undo', () => {
    const { captureUndo, undo } = useUndoStore.getState();

    captureUndo('undo:actions.homeGoal', ['scores']);
    useScoresStore.getState().setScores({ homeTeam: 1 });
    undo();
    expect(selectCanRedo(useUndoStore.getState())).toBe(true);

    // A new action invalidates the pending redo.
    captureUndo('undo:actions.awayGoal', ['scores']);
    useScoresStore.getState().setScores({ awayTeam: 1 });
    expect(selectCanRedo(useUndoStore.getState())).toBe(false);
  });

  it('is a no-op when undo or redo is called on an empty stack', () => {
    const { undo, redo } = useUndoStore.getState();
    seedStores(scores(4, 2));

    undo();
    redo();

    expect(useScoresStore.getState().scores).toEqual(scores(4, 2));
    expect(selectCanUndo(useUndoStore.getState())).toBe(false);
    expect(selectCanRedo(useUndoStore.getState())).toBe(false);
  });

  it('deep-clones snapshots so mutating live state after capture cannot corrupt them', () => {
    const { captureUndo, undo } = useUndoStore.getState();

    seedStores(scores(1, 0, [{ team: 'home', result: 'scored' }]));
    captureUndo('undo:actions.penaltyScored', ['scores']);

    // Mutate the live penalties array in place, then move the state on. The
    // stored snapshot must be unaffected by both.
    const livePenalties = useScoresStore.getState().scores.penalties;
    livePenalties.push({ team: 'away', result: 'missed' });
    useScoresStore.getState().setScores({ homeTeam: 9, penalties: [] });

    undo();
    expect(useScoresStore.getState().scores.homeTeam).toBe(1);
    expect(useScoresStore.getState().scores.penalties).toEqual([
      { team: 'home', result: 'scored' },
    ]);
  });

  // The headline regression test. A misclicked goal is the commonest undo, and
  // it must never rewind the clock.
  it('undoing a score-only action leaves the running clock exactly where it is', () => {
    const resync = vi.fn();
    useUndoStore.getState().registerClockResync(resync);
    const { captureUndo, undo } = useUndoStore.getState();

    // Goal scored at 37:12 while the first half runs.
    seedStores(scores(0), {
      time: '37:12',
      matchPhase: 'firstHalf',
      paused: false,
    });
    captureUndo('undo:actions.homeGoal', ['scores']);
    useScoresStore.getState().setScores({ homeTeam: 1 });

    // The operator only notices the misclick five minutes later; the clock has
    // moved on to 42:00.
    useTimeStore.getState().setTime({ time: '42:00' });

    undo();

    // Score reverted...
    expect(useScoresStore.getState().scores.homeTeam).toBe(0);
    // ...but the clock is untouched, not rewound to 37:12.
    expect(useTimeStore.getState().time.time).toBe('42:00');
    expect(useTimeStore.getState().time.matchPhase).toBe('firstHalf');
    // And the clock was never re-anchored, because the time slice was not part
    // of this undo.
    expect(resync).not.toHaveBeenCalled();
  });

  it('undoing a phase change restores both the phase and its clock', () => {
    const resync = vi.fn();
    useUndoStore.getState().registerClockResync(resync);
    const { captureUndo, undo } = useUndoStore.getState();

    // Pre-advance state: first half at 45:00, on the score bug.
    seedStores(
      scores(0),
      { time: '45:00', matchPhase: 'firstHalf', paused: false },
      {
        ...defaultMatchState,
        matchPhase: 'firstHalf',
        displayScreen: 'scoreBug',
      }
    );
    captureUndo('undo:actions.nextPhase', ['time', 'matchState']);

    // Advance to the second half.
    useTimeStore
      .getState()
      .setTime({ time: '45:00', matchPhase: 'secondHalf', paused: false });
    useMatchStateStore.getState().setMatchState({ matchPhase: 'secondHalf' });

    undo();

    // Both the phase (time + matchState) and its clock are restored, and the
    // clock is re-anchored to the restored value.
    expect(useTimeStore.getState().time.matchPhase).toBe('firstHalf');
    expect(useMatchStateStore.getState().matchState.matchPhase).toBe(
      'firstHalf'
    );
    expect(resync).toHaveBeenLastCalledWith(
      expect.objectContaining({ matchPhase: 'firstHalf', time: '45:00' })
    );
  });

  it('a time-only undo restores only the time slice, leaving scores and matchState alone', () => {
    const { captureUndo, undo } = useUndoStore.getState();

    seedStores(
      scores(2, 1),
      { time: '10:00', matchPhase: 'firstHalf', paused: false },
      { ...defaultMatchState, displayScreen: 'scoreBug' }
    );
    captureUndo('undo:actions.adjustTime', ['time']);

    // The clock is adjusted, and (independently) the score and screen change
    // later. Undoing the time-only action must revert only the clock.
    useTimeStore.getState().setTime({ time: '09:50' });
    useScoresStore.getState().setScores({ homeTeam: 3 });
    useMatchStateStore
      .getState()
      .setMatchState({ displayScreen: 'matchTitle' });

    undo();

    expect(useTimeStore.getState().time.time).toBe('10:00');
    expect(useScoresStore.getState().scores.homeTeam).toBe(3);
    expect(useMatchStateStore.getState().matchState.displayScreen).toBe(
      'matchTitle'
    );
  });

  it('a screen-only undo restores only matchState and never re-anchors the clock', () => {
    const resync = vi.fn();
    useUndoStore.getState().registerClockResync(resync);
    const { captureUndo, undo } = useUndoStore.getState();

    seedStores(
      scores(1, 1),
      { time: '20:00', matchPhase: 'secondHalf', paused: false },
      { ...defaultMatchState, displayScreen: 'scoreBug' }
    );
    captureUndo('undo:actions.switchScreen', ['matchState']);
    useMatchStateStore.getState().setMatchState({ displayScreen: 'penalties' });

    undo();

    expect(useMatchStateStore.getState().matchState.displayScreen).toBe(
      'scoreBug'
    );
    // The clock slice was not part of this undo, so no re-anchor.
    expect(resync).not.toHaveBeenCalled();
    expect(useTimeStore.getState().time.time).toBe('20:00');
  });

  it('fully replaces optional time/matchState fields on a phase-slice restore', () => {
    const { captureUndo, undo } = useUndoStore.getState();

    // Snapshot with the clock stopped (stopping a phase touches both slices).
    seedStores(scores(0), { paused: false }, { ...defaultMatchState });
    captureUndo('undo:actions.stopClock', ['time', 'matchState']);

    // Now the clock is running with a phase and a custom screen pinned.
    useTimeStore
      .getState()
      .setTime({ time: '05:00', matchPhase: 'firstHalf', paused: false });
    useMatchStateStore.getState().setMatchState({
      displayScreen: 'custom',
      customScreenImageUrl: 'file:///pinned.png',
      matchPhase: 'firstHalf',
    });

    undo();

    // The stale running-clock and custom-image fields must be cleared, not
    // merged, when restoring the stopped snapshot.
    expect(useTimeStore.getState().time.matchPhase).toBeUndefined();
    expect(useTimeStore.getState().time.time).toBeUndefined();
    expect(
      useMatchStateStore.getState().matchState.customScreenImageUrl
    ).toBeUndefined();
    expect(useMatchStateStore.getState().matchState.matchPhase).toBeUndefined();
  });

  it('bounds the undo stack, dropping the oldest entries past the cap', () => {
    const { captureUndo } = useUndoStore.getState();

    const total = UNDO_STACK_CAP + 3;
    for (let index = 0; index < total; index += 1) {
      captureUndo(`label-${index}`, ['scores']);
      useScoresStore.getState().setScores({ homeTeam: index + 1 });
    }

    const { undoStack } = useUndoStore.getState();
    expect(undoStack).toHaveLength(UNDO_STACK_CAP);
    // The first three captures were dropped; the oldest surviving label is #3.
    expect(undoStack[0].label).toBe('label-3');
    expect(undoStack[undoStack.length - 1].label).toBe(`label-${total - 1}`);
  });

  it('exposes the next undo/redo label for the button copy', () => {
    const { captureUndo, undo } = useUndoStore.getState();

    expect(selectNextUndoLabel(useUndoStore.getState())).toBeNull();
    expect(selectNextRedoLabel(useUndoStore.getState())).toBeNull();

    captureUndo('undo:actions.homeGoal', ['scores']);
    useScoresStore.getState().setScores({ homeTeam: 1 });
    expect(selectNextUndoLabel(useUndoStore.getState())).toBe(
      'undo:actions.homeGoal'
    );

    undo();
    // Redo now carries the same label (redoing re-applies that action).
    expect(selectNextRedoLabel(useUndoStore.getState())).toBe(
      'undo:actions.homeGoal'
    );
  });

  it('re-syncs the clock from the restored time on undo and redo of a time slice', () => {
    const resync = vi.fn();
    const unregister = useUndoStore.getState().registerClockResync(resync);

    seedStores(scores(0), { time: '05:00', matchPhase: 'firstHalf' });
    useUndoStore.getState().captureUndo('undo:actions.adjustTime', ['time']);
    useTimeStore.getState().setTime({ time: '06:00' });

    useUndoStore.getState().undo();
    // Undo restores the snapshot's time; the clock is re-anchored to it.
    expect(resync).toHaveBeenLastCalledWith(
      expect.objectContaining({ time: '05:00', matchPhase: 'firstHalf' })
    );

    useUndoStore.getState().redo();
    // Redo re-anchors to the post-action time.
    expect(resync).toHaveBeenLastCalledWith(
      expect.objectContaining({ time: '06:00' })
    );

    // Unregister clears the callback so a later undo does not call it.
    unregister();
    resync.mockClear();
    useUndoStore.getState().undo();
    expect(resync).not.toHaveBeenCalled();
  });
});

describe('captureUndo match-event emission', () => {
  // captureUndo mirrors every recorded action to window.electronAPI.
  // logMatchEvent (see main-functions/logger.ts), a pure observability
  // side-channel that must never change what gets captured or how undo/redo
  // restore state, that's covered by the "undo store" tests above with no
  // electronAPI installed at all. These tests only assert the mirror itself.
  function installElectronAPI() {
    const electronAPI = {
      logMatchEvent: vi.fn(),
    } as unknown as Window['electronAPI'];

    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: electronAPI,
    });

    return electronAPI;
  }

  beforeEach(() => {
    useUndoStore.setState({ undoStack: [], redoStack: [], clockResync: null });
  });

  afterEach(() => {
    delete (window as Partial<Window>).electronAPI;
  });

  it('emits the label with source defaulted to laptop when none is given', () => {
    const electronAPI = installElectronAPI();

    useUndoStore.getState().captureUndo('undo:actions.homeGoal', ['scores']);

    expect(electronAPI.logMatchEvent).toHaveBeenCalledWith(
      'undo:actions.homeGoal',
      'laptop'
    );
  });

  it('emits the explicit source when one is passed', () => {
    const electronAPI = installElectronAPI();

    useUndoStore
      .getState()
      .captureUndo('undo:actions.switchScreen', ['matchState'], 'phone');

    expect(electronAPI.logMatchEvent).toHaveBeenCalledWith(
      'undo:actions.switchScreen',
      'phone'
    );
  });
});

describe('isTextEntryTarget', () => {
  it('treats form text fields as text-entry targets', () => {
    expect(isTextEntryTarget(document.createElement('input'))).toBe(true);
    expect(isTextEntryTarget(document.createElement('textarea'))).toBe(true);
    expect(isTextEntryTarget(document.createElement('select'))).toBe(true);
  });

  it('treats an ARIA textbox as a text-entry target', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'textbox');
    expect(isTextEntryTarget(el)).toBe(true);
  });

  it('does not treat plain elements or null as text-entry targets', () => {
    expect(isTextEntryTarget(document.createElement('div'))).toBe(false);
    expect(isTextEntryTarget(document.createElement('button'))).toBe(false);
    expect(isTextEntryTarget(null)).toBe(false);
  });
});
