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
import { playersOnBench, playersOnPitch } from '../substitutions';
import { LiveMatch } from '../types';

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
      substitutions: [],
    });
    expect(useMatchStateStore.getState().matchState.displayScreen).toBe(
      'matchTitle'
    );
    expect(useUndoStore.getState().undoStack).toHaveLength(0);
    expect(onOperatorAction).not.toHaveBeenCalled();
  });
});

describe('setGoalScorer', () => {
  const goal = { id: 'g1', team: 'home' as const, time: '12:00' };

  beforeEach(() => {
    useScoresStore.setState({
      scores: { homeTeam: 1, awayTeam: 0, penalties: [], goals: [goal] },
    });
    useUndoStore.setState({ undoStack: [], redoStack: [], clockResync: null });
  });

  const recorded = () => useScoresStore.getState().scores.goals?.[0];

  it('records a player picked from the line-up, name and number, as one undo step', () => {
    const actions = createMatchActions(fakeClock());

    actions.setGoalScorer('g1', 'Smith', '9');

    expect(recorded()).toEqual({ ...goal, scorer: 'Smith', scorerNumber: '9' });
    const { undoStack } = useUndoStore.getState();
    expect(undoStack).toHaveLength(1);
    expect(undoStack[0].label).toBe('undo:actions.goalScorer');
    expect(undoStack[0].slices).toEqual(['scores']);

    useUndoStore.getState().undo();
    expect(recorded()).toEqual(goal);
  });

  it('keeps the number when the same name is typed again, and clears it for any other name', () => {
    const actions = createMatchActions(fakeClock());
    actions.setGoalScorer('g1', 'Smith', '9');

    actions.setGoalScorer('g1', ' Smith ');
    expect(recorded()?.scorerNumber).toBe('9');
    expect(useUndoStore.getState().undoStack).toHaveLength(1);

    actions.setGoalScorer('g1', 'Smyth');
    expect(recorded()).toEqual({ ...goal, scorer: 'Smyth' });
    expect(recorded()).not.toHaveProperty('scorerNumber');
    expect(useUndoStore.getState().undoStack).toHaveLength(2);
  });

  it('clears the number along with the scorer, and records a numberless player without one', () => {
    const actions = createMatchActions(fakeClock());
    actions.setGoalScorer('g1', 'Smith', '9');

    actions.setGoalScorer('g1', '');
    expect(recorded()).toEqual({ ...goal, scorer: undefined });
    expect(recorded()).not.toHaveProperty('scorerNumber');

    actions.setGoalScorer('g1', 'Smith', '9');
    actions.setGoalScorer('g1', 'Smith', '');
    expect(recorded()).toEqual({ ...goal, scorer: 'Smith' });
  });
});

describe('substitutions', () => {
  const smith = { name: 'Ali Smith', number: '9' };
  const bloggs = { name: 'Jo Bloggs', number: '10' };
  const lee = { name: 'Kim Lee', number: '14', starting: false };
  const squad = [smith, bloggs, lee];

  beforeEach(() => {
    useScoresStore.setState({
      scores: {
        homeTeam: 0,
        awayTeam: 0,
        penalties: [],
        goals: [],
        substitutions: [],
      },
    });
    useTimeStore.setState({
      time: { time: '62:10', matchPhase: 'secondHalf', paused: false },
    });
    useMatchStateStore.setState({ matchState: { ...defaultMatchState } });
    useMatchSettingsStore.setState({
      matchSettings: { ...defaultMatchSettings, homeTeamPlayers: squad },
    });
    useAppSettingsStore.setState({ appSettings: { ...defaultAppSettings } });
    useUndoStore.setState({ undoStack: [], redoStack: [], clockResync: null });
  });

  const logged = () => useScoresStore.getState().scores.substitutions ?? [];
  const settings = () => useMatchSettingsStore.getState().matchSettings;

  it('logs a substitution with the minute as one score-only undo step, and shows the banner', () => {
    const onOperatorAction = vi.fn();
    const actions = createMatchActions(fakeClock(), { onOperatorAction });

    actions.makeSubstitution('home', smith, lee);

    expect(logged()).toEqual([
      expect.objectContaining({
        team: 'home',
        time: '62:10',
        matchPhase: 'secondHalf',
        off: smith,
        on: { name: 'Kim Lee', number: '14' },
      }),
    ]);
    expect(playersOnPitch(settings(), 'home', logged())).toEqual([
      { name: 'Kim Lee', number: '14' },
      bloggs,
    ]);
    expect(playersOnBench(settings(), 'home', logged())).toEqual([smith]);
    expect(onOperatorAction).toHaveBeenCalledTimes(1);
    const { undoStack } = useUndoStore.getState();
    expect(undoStack).toHaveLength(1);
    expect(undoStack[0].label).toBe('undo:actions.substitution');
    expect(undoStack[0].slices).toEqual(['scores']);
    expect(useMatchStateStore.getState().matchState.substitutionBanner).toEqual(
      { substitutionId: logged()[0].id, shownAt: expect.any(Number) }
    );
  });

  it('does nothing when a player is swapped for themselves', () => {
    const actions = createMatchActions(fakeClock());

    actions.makeSubstitution('home', smith, { ...smith, starting: false });

    expect(logged()).toEqual([]);
    expect(useUndoStore.getState().undoStack).toHaveLength(0);
  });

  it('leaves the banner alone when automatic banners are switched off, and shows it on request', () => {
    useAppSettingsStore.setState({
      appSettings: {
        ...defaultAppSettings,
        showGoalBannerAutomatically: false,
      },
    });
    const actions = createMatchActions(fakeClock());

    actions.makeSubstitution('home', smith, lee);
    expect(
      useMatchStateStore.getState().matchState.substitutionBanner
    ).toBeUndefined();

    actions.showSubstitutionBanner(logged()[0].id);
    expect(
      useMatchStateStore.getState().matchState.substitutionBanner
        ?.substitutionId
    ).toBe(logged()[0].id);
    // Showing a banner is not an operator action to undo.
    expect(useUndoStore.getState().undoStack).toHaveLength(1);
  });

  it('removes an entry as its own undo step, putting both players back', () => {
    const actions = createMatchActions(fakeClock());
    actions.makeSubstitution('home', smith, lee);
    const [entry] = logged();

    actions.removeSubstitution(entry.id);

    expect(logged()).toEqual([]);
    expect(playersOnPitch(settings(), 'home', logged())).toEqual([
      smith,
      bloggs,
    ]);
    expect(selectNextUndoLabel(useUndoStore.getState())).toBe(
      'undo:actions.substitutionRemoved'
    );

    // An id that is not in the log records nothing.
    actions.removeSubstitution('missing');
    expect(useUndoStore.getState().undoStack).toHaveLength(2);
  });

  it('restores the log on undo and redo', () => {
    const actions = createMatchActions(fakeClock());
    actions.makeSubstitution('home', smith, lee);
    const [entry] = logged();

    useUndoStore.getState().undo();
    expect(logged()).toEqual([]);

    useUndoStore.getState().redo();
    expect(logged()).toEqual([entry]);

    actions.removeSubstitution(entry.id);
    useUndoStore.getState().undo();
    expect(logged()).toEqual([entry]);
  });

  it('clears the log and the banner for a new match', () => {
    const actions = createMatchActions(fakeClock());
    actions.makeSubstitution('home', smith, lee);

    actions.startNewMatch();

    expect(logged()).toEqual([]);
    expect(
      useMatchStateStore.getState().matchState.substitutionBanner
    ).toBeUndefined();
  });

  it('restores the log with a match, and an older snapshot restores with none', () => {
    const actions = createMatchActions(fakeClock());
    const entry = {
      id: 's1',
      team: 'away' as const,
      time: '70:00',
      matchPhase: 'secondHalf',
      off: bloggs,
      on: smith,
    };
    const liveMatch: LiveMatch = {
      scores: {
        homeTeam: 1,
        awayTeam: 0,
        penalties: [],
        goals: [],
        substitutions: [entry],
      },
      time: { time: '71:00', matchPhase: 'secondHalf', paused: true },
      matchState: { ...defaultMatchState },
      savedAt: Date.now(),
    };

    actions.restoreMatch(liveMatch);
    expect(logged()).toEqual([entry]);

    actions.restoreMatch({
      ...liveMatch,
      scores: { homeTeam: 1, awayTeam: 0, penalties: [] },
    });
    expect(logged()).toEqual([]);
  });
});
