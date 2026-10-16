import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  defaultAppSettings,
  defaultMatchSettings,
  defaultMatchState,
} from '../constants';
import { createMatchActions, MatchClock } from '../matchActions';
import { useAppSettingsStore } from '../store/appSettings';
import { useMatchSettingsStore } from '../store/matchSettings';
import { useMatchStateStore } from '../store/matchState';
import { useScoresStore } from '../store/scores';
import { useTimeStore } from '../store/time';
import { selectNextUndoLabel, useUndoStore } from '../store/undo';

// The match actions are exercised end to end, through a rendered dashboard
// and the real clock, by the Electron app's Dashboard tests. These cover the
// contract a host relies on without React: which actions count as superseding
// the restore offer, and that the guarded no-ops really do nothing.

function fakeClock(): MatchClock {
  return {
    startTime: vi.fn(),
    stopTime: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    adjustTime: vi.fn(),
    restoreClock: vi.fn(),
    resetClock: vi.fn(),
  };
}

describe('createMatchActions', () => {
  beforeEach(() => {
    useScoresStore.setState({
      scores: { homeTeam: 0, awayTeam: 0, penalties: [], goals: [] },
    });
    useTimeStore.setState({ time: { paused: false } });
    useMatchStateStore.setState({ matchState: { ...defaultMatchState } });
    useMatchSettingsStore.setState({
      matchSettings: { ...defaultMatchSettings },
    });
    useAppSettingsStore.setState({ appSettings: { ...defaultAppSettings } });
    useUndoStore.setState({ undoStack: [], redoStack: [], clockResync: null });
  });

  it('records a goal as one score-only undo step and supersedes the restore offer', () => {
    const onOperatorAction = vi.fn();
    const actions = createMatchActions(fakeClock(), { onOperatorAction });

    actions.incrementHomeTeamScore();

    expect(useScoresStore.getState().scores.homeTeam).toBe(1);
    expect(useScoresStore.getState().scores.goals).toHaveLength(1);
    expect(onOperatorAction).toHaveBeenCalledTimes(1);
    const { undoStack } = useUndoStore.getState();
    expect(undoStack).toHaveLength(1);
    expect(undoStack[0].label).toBe('undo:actions.homeGoal');
    expect(undoStack[0].slices).toEqual(['scores']);
  });

  it('leaves a 0-0 score, the undo stack and the restore offer alone on a minus tap', () => {
    const onOperatorAction = vi.fn();
    const actions = createMatchActions(fakeClock(), { onOperatorAction });

    actions.decrementAwayTeamScore();

    expect(useScoresStore.getState().scores.awayTeam).toBe(0);
    expect(useUndoStore.getState().undoStack).toHaveLength(0);
    expect(onOperatorAction).not.toHaveBeenCalled();
  });

  it('starts a phase through the clock, after capturing time and match state', () => {
    const clock = fakeClock();
    const onOperatorAction = vi.fn();
    const actions = createMatchActions(clock, { onOperatorAction });

    actions.nextMatchPhase();

    expect(clock.startTime).toHaveBeenCalledWith('firstHalf');
    expect(onOperatorAction).toHaveBeenCalledTimes(1);
    expect(useUndoStore.getState().undoStack[0].slices).toEqual([
      'time',
      'matchState',
    ]);
    expect(selectNextUndoLabel(useUndoStore.getState())).toBe(
      'undo:actions.nextPhase'
    );
  });

  it('ignores Stop when no phase is running', () => {
    const clock = fakeClock();
    const actions = createMatchActions(clock);

    actions.handleStopClock();

    expect(clock.stopTime).not.toHaveBeenCalled();
    expect(useUndoStore.getState().undoStack).toHaveLength(0);
  });

  it('starts a new match without touching the restore offer, leaving that to the host', () => {
    const clock = fakeClock();
    const onOperatorAction = vi.fn();
    const actions = createMatchActions(clock, { onOperatorAction });
    actions.incrementHomeTeamScore();
    onOperatorAction.mockClear();

    actions.startNewMatch();

    expect(clock.resetClock).toHaveBeenCalledTimes(1);
    expect(useScoresStore.getState().scores).toEqual({
      homeTeam: 0,
      awayTeam: 0,
      penalties: [],
      goals: [],
    });
    expect(useMatchStateStore.getState().matchState.displayScreen).toBe(
      'matchTitle'
    );
    expect(useUndoStore.getState().undoStack).toHaveLength(0);
    expect(onOperatorAction).not.toHaveBeenCalled();
  });
});
