import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  defaultAppSettings,
  defaultMatchSettings,
  defaultMatchState,
} from '../constants';
import {
  getScreenRotationSettings,
  nextRotationIndex,
  rotationCandidates,
  rotationIntervalMs,
  setRotationEntry,
} from '../screenRotation';
import { createMatchActions, MatchClock } from '../matchActions';
import useScreenRotation from '../useScreenRotation';
import { useAppSettingsStore } from '../store/appSettings';
import { useCustomGraphicsStore } from '../store/customGraphics';
import { useMatchSettingsStore } from '../store/matchSettings';
import { useMatchStateStore } from '../store/matchState';
import { useScreenRotationStore } from '../store/screenRotation';
import { useScoresStore } from '../store/scores';
import { useTimeStore } from '../store/time';
import { useUndoStore } from '../store/undo';
import { CustomScreen, ScreenRotationEntry } from '../types';

const sponsor: CustomScreen = {
  title: 'Sponsor',
  filePath: '/images/sponsor.png',
  url: 'file:///images/sponsor.png',
};
const sponsorEntry: ScreenRotationEntry = {
  screen: 'custom',
  customScreenImageUrl: 'file:///images/sponsor.png',
};

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

function chooseScreens(
  screens: ScreenRotationEntry[],
  extra: { intervalSeconds?: number; autoStartAtHalfTime?: boolean } = {}
) {
  useAppSettingsStore.setState({
    appSettings: {
      ...defaultAppSettings,
      screenRotation: {
        screens,
        intervalSeconds: extra.intervalSeconds ?? 10,
        autoStartAtHalfTime: extra.autoStartAtHalfTime ?? false,
      },
    },
  });
}

const displayed = () => {
  const { displayScreen, customScreenImageUrl } =
    useMatchStateStore.getState().matchState;
  return displayScreen === 'custom'
    ? `custom:${customScreenImageUrl}`
    : displayScreen;
};
const rotating = () => useScreenRotationStore.getState().active;

beforeEach(() => {
  useScoresStore.setState({
    scores: { homeTeam: 0, awayTeam: 0, penalties: [], goals: [] },
  });
  useTimeStore.setState({ time: { paused: false } });
  useMatchStateStore.setState({ matchState: { ...defaultMatchState } });
  useMatchSettingsStore.setState({
    matchSettings: {
      ...defaultMatchSettings,
      homeTeamPlayers: [{ name: 'Ali Smith', number: '9' }],
    },
  });
  useAppSettingsStore.setState({ appSettings: { ...defaultAppSettings } });
  useCustomGraphicsStore.setState({ customGraphics: [sponsor] });
  useUndoStore.setState({ undoStack: [], redoStack: [], clockResync: null });
  useScreenRotationStore.setState({ active: false, index: 0 });
});

describe('screen rotation helpers', () => {
  it('defaults to nothing chosen, ten seconds and no auto-start', () => {
    expect(getScreenRotationSettings(defaultAppSettings)).toEqual({
      screens: [],
      intervalSeconds: 10,
      autoStartAtHalfTime: false,
    });
    expect(
      rotationIntervalMs({
        screens: [],
        intervalSeconds: 0,
        autoStartAtHalfTime: false,
      })
    ).toBe(3000);
  });

  it('offers the screens in rotation order, line-ups and penalties only when shown on the dashboard', () => {
    const matchSettings = useMatchSettingsStore.getState().matchSettings;
    expect(rotationCandidates(matchSettings, [sponsor])).toEqual([
      { screen: 'matchTitle' },
      { screen: 'homeLineup' },
      { screen: 'scoreBug' },
      { screen: 'scoreboard' },
      { screen: 'penalties' },
      { screen: 'endScreen' },
      sponsorEntry,
    ]);
    expect(
      rotationCandidates({ ...defaultMatchSettings, hasPenalties: false }, [
        { ...sponsor, type: 'overlay' },
      ]).map((entry) => entry.screen)
    ).toEqual(['matchTitle', 'scoreBug', 'scoreboard', 'endScreen']);
  });

  it('keeps the chosen screens in rotation order as they are ticked and unticked', () => {
    let screens = setRotationEntry([], sponsorEntry, true, [sponsor]);
    screens = setRotationEntry(screens, { screen: 'scoreBug' }, true, [
      sponsor,
    ]);
    screens = setRotationEntry(screens, { screen: 'matchTitle' }, true, [
      sponsor,
    ]);
    expect(screens).toEqual([
      { screen: 'matchTitle' },
      { screen: 'scoreBug' },
      sponsorEntry,
    ]);
    expect(
      setRotationEntry(screens, { screen: 'scoreBug' }, false, [sponsor])
    ).toEqual([{ screen: 'matchTitle' }, sponsorEntry]);
  });

  it('finds the next screen to show, wrapping round and skipping any that cannot be shown', () => {
    const screens: ScreenRotationEntry[] = [
      { screen: 'matchTitle' },
      { screen: 'awayLineup' },
      { screen: 'scoreBug' },
    ];
    const canShow = (entry: ScreenRotationEntry) =>
      entry.screen !== 'awayLineup';
    expect(nextRotationIndex(screens, -1, canShow)).toBe(0);
    expect(nextRotationIndex(screens, 0, canShow)).toBe(2);
    expect(nextRotationIndex(screens, 2, canShow)).toBe(0);
    expect(nextRotationIndex(screens, 0, () => false)).toBe(-1);
  });
});

describe('useScreenRotationStore', () => {
  it('shows the first screen as soon as it starts, outside the undo stack', () => {
    chooseScreens([{ screen: 'homeLineup' }, sponsorEntry]);

    expect(useScreenRotationStore.getState().start()).toBe(true);

    expect(rotating()).toBe(true);
    expect(displayed()).toBe('homeLineup');
    expect(useUndoStore.getState().undoStack).toHaveLength(0);
  });

  it('cycles through the chosen screens and back to the first', () => {
    chooseScreens([
      { screen: 'matchTitle' },
      { screen: 'homeLineup' },
      sponsorEntry,
    ]);
    useScreenRotationStore.getState().start();

    useScreenRotationStore.getState().advance();
    expect(displayed()).toBe('homeLineup');
    useScreenRotationStore.getState().advance();
    expect(displayed()).toBe(`custom:${sponsor.url}`);
    useScreenRotationStore.getState().advance();
    expect(displayed()).toBe('matchTitle');
    expect(useMatchStateStore.getState().matchState.customScreenImageUrl).toBe(
      undefined
    );
  });

  it('skips a screen that can no longer be shown, and stops when fewer than two are left', () => {
    chooseScreens([
      { screen: 'matchTitle' },
      sponsorEntry,
      { screen: 'scoreBug' },
    ]);
    useScreenRotationStore.getState().start();

    useCustomGraphicsStore.setState({ customGraphics: [] });
    useScreenRotationStore.getState().advance();
    expect(displayed()).toBe('scoreBug');

    useMatchSettingsStore.setState({
      matchSettings: { ...defaultMatchSettings },
    });
    chooseScreens([{ screen: 'matchTitle' }, { screen: 'homeLineup' }]);
    useScreenRotationStore.getState().advance();
    expect(rotating()).toBe(false);
    expect(displayed()).toBe('scoreBug');
  });

  it('will not start with fewer than two screens that can be shown', () => {
    chooseScreens([{ screen: 'matchTitle' }, { screen: 'awayLineup' }]);

    expect(useScreenRotationStore.getState().start()).toBe(false);
    expect(rotating()).toBe(false);
    expect(displayed()).toBe('scoreBug');
  });
});

describe('useScreenRotation', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('moves on every intervalSeconds while running, and not once stopped', () => {
    chooseScreens([{ screen: 'matchTitle' }, { screen: 'scoreboard' }], {
      intervalSeconds: 15,
    });
    renderHook(() => useScreenRotation());
    act(() => {
      useScreenRotationStore.getState().start();
    });

    act(() => vi.advanceTimersByTime(14_999));
    expect(displayed()).toBe('matchTitle');
    act(() => vi.advanceTimersByTime(1));
    expect(displayed()).toBe('scoreboard');
    act(() => vi.advanceTimersByTime(15_000));
    expect(displayed()).toBe('matchTitle');

    act(() => useScreenRotationStore.getState().stop());
    act(() => vi.advanceTimersByTime(60_000));
    expect(displayed()).toBe('matchTitle');
  });

  it('stops as soon as fewer than two chosen screens can be shown', () => {
    chooseScreens([{ screen: 'matchTitle' }, sponsorEntry]);
    renderHook(() => useScreenRotation());
    act(() => {
      useScreenRotationStore.getState().start();
    });

    act(() => useCustomGraphicsStore.setState({ customGraphics: [] }));
    expect(rotating()).toBe(false);
  });

  it('stops when a phase starts by any route, an undone stop included', () => {
    chooseScreens([{ screen: 'matchTitle' }, { screen: 'scoreboard' }]);
    renderHook(() => useScreenRotation());
    act(() => {
      useScreenRotationStore.getState().start();
    });

    act(() =>
      useTimeStore.setState({
        time: { matchPhase: 'secondHalf', time: '45:00' },
      })
    );
    expect(rotating()).toBe(false);
  });
});

describe('screen rotation and the match actions', () => {
  function startRotating() {
    chooseScreens([{ screen: 'matchTitle' }, { screen: 'scoreboard' }]);
    useScreenRotationStore.getState().start();
    expect(rotating()).toBe(true);
  }

  it("stops for an operator's screen switch, which is undoable as usual", () => {
    const actions = createMatchActions(fakeClock());
    startRotating();

    actions.switchDisplayScreen({ displayScreen: 'endScreen' });
    expect(rotating()).toBe(false);
    expect(displayed()).toBe('endScreen');

    useUndoStore.getState().undo();
    expect(displayed()).toBe('matchTitle');
    expect(rotating()).toBe(false);
  });

  it('stops for the phone and Stream Deck screen switch too', () => {
    const actions = createMatchActions(fakeClock());
    startRotating();

    actions.setDisplayScreen('scoreBug');
    expect(rotating()).toBe(false);
  });

  it('stops for a phase start, New match and a restored match', () => {
    const clock = fakeClock();
    const actions = createMatchActions(clock);

    startRotating();
    actions.handleStartPhase('firstHalf');
    expect(rotating()).toBe(false);
    expect(clock.startTime).toHaveBeenCalledWith('firstHalf');

    startRotating();
    actions.nextMatchPhase();
    expect(rotating()).toBe(false);

    startRotating();
    actions.startNewMatch();
    expect(rotating()).toBe(false);
    expect(displayed()).toBe('matchTitle');

    startRotating();
    actions.restoreMatch({
      scores: { homeTeam: 1, awayTeam: 0, penalties: [] },
      time: {},
      matchState: { ...defaultMatchState, displayScreen: 'scoreBug' },
      savedAt: Date.now(),
    });
    expect(rotating()).toBe(false);
    expect(displayed()).toBe('scoreBug');
  });

  describe('starting automatically', () => {
    function runningPhase(matchPhase: string) {
      useTimeStore.setState({ time: { matchPhase, time: '45:00' } });
      useMatchStateStore.setState({
        matchState: { ...defaultMatchState, matchPhase },
      });
    }

    it('starts at half-time, from either stop control, when switched on', () => {
      chooseScreens([{ screen: 'homeLineup' }, { screen: 'scoreboard' }], {
        autoStartAtHalfTime: true,
      });
      const actions = createMatchActions(fakeClock());

      runningPhase('firstHalf');
      actions.handleStopClock();
      expect(rotating()).toBe(true);
      expect(displayed()).toBe('homeLineup');
      // The stop is still one undo step, the rotation's switch no step at all.
      expect(useUndoStore.getState().undoStack).toHaveLength(1);

      useScreenRotationStore.getState().stop();
      runningPhase('firstHalf');
      actions.nextMatchPhase();
      expect(rotating()).toBe(true);
    });

    it('does not start at full time', () => {
      chooseScreens([{ screen: 'homeLineup' }, { screen: 'scoreboard' }], {
        autoStartAtHalfTime: true,
      });
      useMatchSettingsStore.setState({
        matchSettings: {
          ...useMatchSettingsStore.getState().matchSettings,
          hasExtraTime: false,
        },
      });
      const actions = createMatchActions(fakeClock());

      runningPhase('secondHalf');
      actions.handleStopClock();
      expect(rotating()).toBe(false);

      runningPhase('secondHalf');
      actions.nextMatchPhase();
      expect(rotating()).toBe(false);
    });

    it('does not start when switched off, or with fewer than two screens', () => {
      const actions = createMatchActions(fakeClock());

      chooseScreens([{ screen: 'homeLineup' }, { screen: 'scoreboard' }]);
      runningPhase('firstHalf');
      actions.handleStopClock();
      expect(rotating()).toBe(false);

      chooseScreens([{ screen: 'scoreboard' }], { autoStartAtHalfTime: true });
      runningPhase('firstHalf');
      actions.handleStopClock();
      expect(rotating()).toBe(false);
    });

    it('does not start for a stop caused by a settings change', () => {
      chooseScreens([{ screen: 'homeLineup' }, { screen: 'scoreboard' }], {
        autoStartAtHalfTime: true,
      });
      const clock = fakeClock();
      const actions = createMatchActions(clock);

      runningPhase('firstHalf');
      actions.updateMatchSettings({ timerMode: 'generic' });
      expect(clock.stopTime).toHaveBeenCalledWith({ autoSwitch: false });
      expect(rotating()).toBe(false);
    });
  });
});
