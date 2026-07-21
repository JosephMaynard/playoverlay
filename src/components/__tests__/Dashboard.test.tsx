import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultAppSettings, defaultMatchSettings } from '../../constants';
import { AppSettings, LiveMatch } from '../../types';
import { MatchSettings, UpdateStatus } from '../../zodSchemas';

// The Dashboard keeps its clock (seconds/baseSeconds/tickingSince/interval)
// at module scope, and every zustand store is a module-scope singleton too.
// vi.resetModules() + a dynamic import per test is the only way to get a
// truly fresh Dashboard (and fresh stores) so no test can leak clock or
// store state into the next one.

type Callbacks = {
  nextMatchPhase?: () => void;
  homeTeamScored?: () => void;
  awayTeamScored?: () => void;
  homeTeamUnscored?: () => void;
  awayTeamUnscored?: () => void;
  toggleClock?: () => void;
  setDisplayScreen?: (screen: string) => void;
  customScreensUpdated?: (screens: unknown[]) => void;
  screenInfo?: (displays: unknown[]) => void;
  displayChange?: (displays: unknown[]) => void;
  lockStatus?: (locked: boolean) => void;
};

interface InstallOptions {
  matchSettings?: MatchSettings | undefined;
  appSettings?: AppSettings | undefined;
  liveMatch?: LiveMatch | undefined;
  updates?: UpdateStatus;
}

function installElectronAPI(options: InstallOptions = {}) {
  const callbacks: Callbacks = {};

  const electronAPI = {
    updateScores: vi.fn(),
    onScoreUpdated: vi.fn(() => vi.fn()),
    updateTime: vi.fn(),
    onTimeUpdated: vi.fn(() => vi.fn()),
    updateMatchSettings: vi.fn(),
    onMatchSettingsUpdated: vi.fn(() => vi.fn()),
    updateAppSettings: vi.fn(),
    onAppSettingsUpdated: vi.fn(() => vi.fn()),
    updateMatchState: vi.fn(),
    onMatchStateUpdated: vi.fn(() => vi.fn()),
    toggleFullscreen: vi.fn(),
    getFullscreenStatus: vi.fn().mockResolvedValue(false),
    getVersion: vi.fn(() => '0.17.0-test'),
    getAppSettings: vi.fn().mockResolvedValue(options.appSettings),
    getBrowserSourceStatus: vi
      .fn()
      .mockResolvedValue({ running: false, port: 4750 }),
    getMatchSettings: vi.fn().mockResolvedValue(options.matchSettings),
    moveWindowToScreen: vi.fn().mockResolvedValue(undefined),
    onDisplayChange: vi.fn((callback: (displays: unknown[]) => void) => {
      callbacks.displayChange = callback;
      return vi.fn();
    }),
    getScreenInfo: vi.fn(),
    onScreenInfo: vi.fn((callback: (displays: unknown[]) => void) => {
      callbacks.screenInfo = callback;
      return vi.fn();
    }),
    resetWindows: vi.fn(),
    lockWindows: vi.fn(),
    unlockWindows: vi.fn(),
    getLockStatus: vi.fn(),
    onLockStatus: vi.fn((callback: (locked: boolean) => void) => {
      callbacks.lockStatus = callback;
      return vi.fn();
    }),
    uploadImage: vi.fn().mockResolvedValue(null),
    deleteImage: vi.fn().mockResolvedValue(true),
    uploadLogo: vi.fn().mockResolvedValue(null),
    getCustomScreens: vi.fn().mockResolvedValue([]),
    setCustomScreens: vi.fn().mockResolvedValue({ success: true }),
    getSavedMatchSettings: vi.fn().mockResolvedValue([]),
    setSavedMatchSettings: vi.fn().mockResolvedValue({ success: true }),
    onCustomScreensUpdated: vi.fn((callback: (screens: unknown[]) => void) => {
      callbacks.customScreensUpdated = callback;
      return vi.fn();
    }),
    checkForUpdates: vi.fn().mockResolvedValue({
      success: true,
      updates: options.updates ?? {
        newVersionAvailable: false,
        latestVersion: '',
        downloadUrl: '',
      },
    }),
    getLiveMatch: vi.fn().mockResolvedValue(options.liveMatch),
    openUrlInBrowser: vi.fn(),
    onNextMatchPhase: vi.fn((callback: () => void) => {
      callbacks.nextMatchPhase = callback;
      return vi.fn();
    }),
    onHomeTeamScored: vi.fn((callback: () => void) => {
      callbacks.homeTeamScored = callback;
      return vi.fn();
    }),
    onAwayTeamScored: vi.fn((callback: () => void) => {
      callbacks.awayTeamScored = callback;
      return vi.fn();
    }),
    onHomeTeamUnscored: vi.fn((callback: () => void) => {
      callbacks.homeTeamUnscored = callback;
      return vi.fn();
    }),
    onAwayTeamUnscored: vi.fn((callback: () => void) => {
      callbacks.awayTeamUnscored = callback;
      return vi.fn();
    }),
    onToggleClock: vi.fn((callback: () => void) => {
      callbacks.toggleClock = callback;
      return vi.fn();
    }),
    onSetDisplayScreen: vi.fn((callback: (screen: string) => void) => {
      callbacks.setDisplayScreen = callback;
      return vi.fn();
    }),
    getRemoteControlStatus: vi.fn().mockResolvedValue({
      running: false,
      port: 3006,
      pin: '',
      url: 'http://127.0.0.1:3006/',
      connectedCount: 0,
    }),
    onRemoteControlStatus: vi.fn(() => vi.fn()),
    enableKeyboardShortcuts: vi.fn(),
    disableKeyboardShortcuts: vi.fn(),
    displayReady: vi.fn(),
  } as unknown as Window['electronAPI'];

  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: electronAPI,
  });

  return { electronAPI, callbacks };
}

// Renders a fresh Dashboard against a freshly re-imported module graph (see
// the file-level comment) so clock/store state can never leak between
// tests. Also returns the freshly-imported stores so assertions can read
// state directly instead of scraping the DOM.
async function renderDashboard(options: InstallOptions = {}) {
  vi.resetModules();
  const { electronAPI, callbacks } = installElectronAPI(options);

  const { default: Dashboard } = await import('../Dashboard/Dashboard');
  const { useScoresStore } = await import('../../store/scores');
  const { useMatchStateStore } = await import('../../store/matchState');
  const { useTimeStore } = await import('../../store/time');
  const { useAppSettingsStore } = await import('../../store/appSettings');
  const { useMatchSettingsStore } = await import('../../store/matchSettings');

  const view = render(<Dashboard />);

  // Flush the mount-time promise chain (getMatchSettings/getAppSettings/
  // getLiveMatch/checkForUpdates) before the test starts interacting.
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });

  return {
    ...view,
    electronAPI,
    callbacks,
    stores: {
      scores: useScoresStore,
      matchState: useMatchStateStore,
      time: useTimeStore,
      appSettings: useAppSettingsStore,
      matchSettings: useMatchSettingsStore,
    },
  };
}

// Advances both the fake timers and (via vi's Date mock) the wall clock the
// tick logic anchors against, in 250ms steps matching the Dashboard's own
// interval so the "tick every 250ms, apply every second" behavior is
// exercised the same way the real interval would.
function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

// The pencil button that opens the "Adjust Time" modal is icon-only, but
// carries an aria-label (reusing the same "Adjust Time" copy as the modal's
// own title), so it can be found by accessible name rather than structurally.
function getOpenAdjustTimeButton(): HTMLElement {
  return screen.getByRole('button', { name: 'Adjust Time' });
}

// The pause/resume icon button is also icon-only, but carries an aria-label
// of whichever action it currently performs ("Pause" while running, "Resume"
// while paused), so it too can be found by accessible name.
function getPauseOrResumeButton(): HTMLElement {
  return screen.getByRole('button', { name: /^(Pause|Resume)$/ });
}

describe('Dashboard match engine', () => {
  beforeEach(() => {
    // Fake only what the clock engine needs. Leaving requestAnimationFrame
    // (and friends) real keeps headlessui's Transition/Dialog focus
    // management from stalling forever waiting on a frame that fake timers
    // will never deliver. Interactions use fireEvent (not userEvent) for
    // the same reason: userEvent's internal pointer-event choreography
    // hangs indefinitely under fake timers even with delay disabled.
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'Date',
      ],
    });
    vi.setSystemTime(new Date('2026-07-18T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('phase walk', () => {
    it('walks the full football phase list via the next-phase shortcut, ticking once per second while running', async () => {
      const { callbacks, electronAPI, stores } = await renderDashboard();

      // Press 1: nothing running, nothing previous -> starts firstHalf at 0:00
      act(() => callbacks.nextMatchPhase?.());
      expect(stores.time.getState().time.matchPhase).toBe('firstHalf');
      expect(stores.time.getState().time.time).toBe('0:00');
      expect(stores.matchState.getState().matchState.matchPhase).toBe(
        'firstHalf'
      );

      (electronAPI.updateTime as ReturnType<typeof vi.fn>).mockClear();
      advance(4 * 250); // 1 second of ticking
      expect(stores.time.getState().time.time).toBe('0:01');
      advance(4 * 250);
      expect(stores.time.getState().time.time).toBe('0:02');
      const tickedTimes = (
        electronAPI.updateTime as ReturnType<typeof vi.fn>
      ).mock.calls.map((call) => call[0].time);
      expect(tickedTimes).toEqual(['0:01', '0:02']);

      // Press 2 (mid-phase): stops the clock, records previousMatchPhase
      act(() => callbacks.nextMatchPhase?.());
      expect(stores.time.getState().time.matchPhase).toBeUndefined();
      expect(stores.time.getState().time.time).toBeUndefined();
      expect(
        stores.matchState.getState().matchState.matchPhase
      ).toBeUndefined();
      expect(stores.matchState.getState().matchState.previousMatchPhase).toBe(
        'firstHalf'
      );

      // A stopped clock must not keep ticking in the background
      advance(4 * 250);
      expect(stores.time.getState().time.time).toBeUndefined();

      // Press 3: starts secondHalf at 45:00 (halfLength=45)
      act(() => callbacks.nextMatchPhase?.());
      expect(stores.time.getState().time.matchPhase).toBe('secondHalf');
      expect(stores.time.getState().time.time).toBe('45:00');

      // Press 4: stops secondHalf
      act(() => callbacks.nextMatchPhase?.());
      expect(stores.matchState.getState().matchState.previousMatchPhase).toBe(
        'secondHalf'
      );

      // Press 5: starts extraTimeFirstHalf at 90:00
      act(() => callbacks.nextMatchPhase?.());
      expect(stores.time.getState().time.matchPhase).toBe('extraTimeFirstHalf');
      expect(stores.time.getState().time.time).toBe('90:00');

      // Press 6: stops extraTimeFirstHalf
      act(() => callbacks.nextMatchPhase?.());
      expect(stores.matchState.getState().matchState.previousMatchPhase).toBe(
        'extraTimeFirstHalf'
      );

      // Press 7: starts extraTimeSecondHalf at 105:00
      act(() => callbacks.nextMatchPhase?.());
      expect(stores.time.getState().time.matchPhase).toBe(
        'extraTimeSecondHalf'
      );
      expect(stores.time.getState().time.time).toBe('105:00');

      // Press 8: stops extraTimeSecondHalf -- the last phase
      act(() => callbacks.nextMatchPhase?.());
      expect(stores.matchState.getState().matchState.previousMatchPhase).toBe(
        'extraTimeSecondHalf'
      );
      expect(
        stores.matchState.getState().matchState.matchPhase
      ).toBeUndefined();

      // Press 9: nothing running, previousMatchPhase is already the last
      // phase in the list -> no-op, previousMatchPhase preserved
      act(() => callbacks.nextMatchPhase?.());
      expect(stores.matchState.getState().matchState.previousMatchPhase).toBe(
        'extraTimeSecondHalf'
      );
      expect(
        stores.matchState.getState().matchState.matchPhase
      ).toBeUndefined();
      expect(stores.time.getState().time.time).toBeUndefined();
    });
  });

  describe('auto-switch screens', () => {
    it('never touches displayScreen from the shortcut path when autoSwitchScreens is false', async () => {
      const { callbacks, stores } = await renderDashboard({
        appSettings: { ...defaultAppSettings, autoSwitchScreens: false },
      });

      expect(stores.appSettings.getState().appSettings.autoSwitchScreens).toBe(
        false
      );

      // Move OFF the default screen first: the default is scoreBug, which is
      // exactly what a broken always-switch-on-start would set, so asserting
      // against the default would pass even with the guard removed.
      act(() =>
        stores.matchState
          .getState()
          .setMatchState({ displayScreen: 'matchTitle' })
      );

      act(() => callbacks.nextMatchPhase?.()); // start firstHalf
      expect(stores.matchState.getState().matchState.displayScreen).toBe(
        'matchTitle'
      );

      act(() => callbacks.nextMatchPhase?.()); // stop firstHalf
      expect(stores.matchState.getState().matchState.displayScreen).toBe(
        'matchTitle'
      );
    });

    it('switches to scoreBug on start and matchTitle on stop when autoSwitchScreens is true', async () => {
      const { callbacks, stores } = await renderDashboard({
        appSettings: { ...defaultAppSettings, autoSwitchScreens: true },
      });

      expect(stores.appSettings.getState().appSettings.autoSwitchScreens).toBe(
        true
      );

      act(() => callbacks.nextMatchPhase?.()); // start firstHalf
      expect(stores.matchState.getState().matchState.displayScreen).toBe(
        'scoreBug'
      );

      act(() => callbacks.nextMatchPhase?.()); // stop firstHalf
      expect(stores.matchState.getState().matchState.displayScreen).toBe(
        'matchTitle'
      );
    });
  });

  describe('restore', () => {
    function fixture(): LiveMatch {
      return {
        scores: { homeTeam: 2, awayTeam: 1, penalties: [] },
        time: {
          time: '61:07',
          matchPhase: 'firstHalf',
          remainingTime: '-16:07',
          paused: false,
        },
        matchState: {
          matchPhase: 'firstHalf',
          displayScreen: 'scoreBug',
          penaltiesFirstTeam: 'home',
          overlays: [],
        },
        savedAt: Date.now(),
      };
    }

    it('offers to restore, populates the stores with the clock paused, and resumes from the restored time', async () => {
      const liveMatch = fixture();
      const { stores } = await renderDashboard({ liveMatch });

      const restoreButton = screen.getByRole('button', {
        name: 'Restore',
      });
      fireEvent.click(restoreButton);

      expect(stores.scores.getState().scores).toEqual(liveMatch.scores);
      expect(stores.matchState.getState().matchState).toEqual(
        liveMatch.matchState
      );
      expect(stores.time.getState().time.time).toBe('61:07');
      expect(stores.time.getState().time.paused).toBe(true);

      // Paused: advancing time must not tick the clock
      advance(3000);
      expect(stores.time.getState().time.time).toBe('61:07');

      // Resume from the Adjust Time modal and confirm it continues from
      // the restored value rather than jumping
      fireEvent.click(getOpenAdjustTimeButton());
      fireEvent.click(getPauseOrResumeButton());
      expect(stores.time.getState().time.paused).toBe(false);

      advance(4 * 250); // 1 second
      expect(stores.time.getState().time.time).toBe('61:08');
    });

    it('replaces match state on restore so a stray field from the current session cannot survive', async () => {
      const liveMatch = fixture(); // matchState has no customScreenImageUrl
      const { stores } = await renderDashboard({ liveMatch });

      // Simulate the operator having a custom screen showing before restore
      act(() =>
        stores.matchState.getState().setMatchState({
          displayScreen: 'custom',
          customScreenImageUrl: 'file:///old/custom.png',
        })
      );

      fireEvent.click(screen.getByRole('button', { name: 'Restore' }));

      // Full replace: the snapshot's matchState wins and the stale custom
      // image is gone, not merged in.
      expect(
        stores.matchState.getState().matchState.customScreenImageUrl
      ).toBeUndefined();
      expect(stores.matchState.getState().matchState.displayScreen).toBe(
        'scoreBug'
      );
    });

    it("prompts with the snapshot's team abbreviations and applies its match settings on restore, ahead of scores/state/time", async () => {
      // The snapshot deliberately OMITS a field (hasExtraTime) that the
      // currently loaded settings set to a non-default value: a full
      // replace over defaults must reset it to the default, while a merge
      // with the current settings would keep the stale `false`. Without
      // this divergence the test cannot tell replace from merge.
      const snapshotMatchSettings: MatchSettings = {
        ...defaultMatchSettings,
        homeTeamNameAbbreviated: 'TIG',
        awayTeamNameAbbreviated: 'BEA',
        halfLength: 40,
      };
      delete snapshotMatchSettings.hasExtraTime;
      const currentMatchSettings: MatchSettings = {
        ...defaultMatchSettings,
        homeTeamNameAbbreviated: 'HOM',
        awayTeamNameAbbreviated: 'AWA',
        hasExtraTime: false,
      };
      const liveMatch: LiveMatch = {
        ...fixture(),
        matchSettings: snapshotMatchSettings,
      };

      const { stores } = await renderDashboard({
        liveMatch,
        matchSettings: currentMatchSettings,
      });

      // The prompt uses the snapshot's abbreviations, not the currently
      // loaded ones.
      expect(screen.getByText(/TIG 2–1 BEA/)).toBeInTheDocument();

      const restoreButton = screen.getByRole('button', { name: 'Restore' });
      fireEvent.click(restoreButton);

      // Full replace: the store now holds the snapshot's settings over
      // defaults, not a merge with whatever was loaded before the restore -
      // the field the snapshot omitted reverts to its default instead of
      // keeping the stale current value.
      expect(stores.matchSettings.getState().matchSettings).toEqual({
        ...defaultMatchSettings,
        ...snapshotMatchSettings,
      });
      expect(stores.matchSettings.getState().matchSettings.hasExtraTime).toBe(
        defaultMatchSettings.hasExtraTime
      );
      expect(stores.scores.getState().scores).toEqual(liveMatch.scores);
      expect(stores.matchState.getState().matchState).toEqual(
        liveMatch.matchState
      );
      expect(stores.time.getState().time.time).toBe('61:07');
      expect(stores.time.getState().time.paused).toBe(true);
    });

    it('falls back to the currently loaded team abbreviations when the snapshot predates matchSettings', async () => {
      const currentMatchSettings: MatchSettings = {
        ...defaultMatchSettings,
        homeTeamNameAbbreviated: 'HOM',
        awayTeamNameAbbreviated: 'AWA',
      };
      const liveMatch = fixture(); // no matchSettings field, as with old snapshots

      await renderDashboard({ liveMatch, matchSettings: currentMatchSettings });

      expect(screen.getByText(/HOM 2–1 AWA/)).toBeInTheDocument();
    });
  });

  describe('pause and resume', () => {
    it('holds the clock while paused and continues from the paused value on resume, without a jump or a doubled tick rate', async () => {
      const { callbacks, stores } = await renderDashboard();

      act(() => callbacks.nextMatchPhase?.()); // start firstHalf at 0:00
      advance(4 * 250); // tick to 0:01
      expect(stores.time.getState().time.time).toBe('0:01');

      fireEvent.click(getOpenAdjustTimeButton());
      fireEvent.click(getPauseOrResumeButton()); // pause
      expect(stores.time.getState().time.paused).toBe(true);

      advance(10_000); // 10s while paused
      expect(stores.time.getState().time.time).toBe('0:01');

      fireEvent.click(getPauseOrResumeButton()); // resume
      expect(stores.time.getState().time.paused).toBe(false);

      // Immediately after resume the clock must continue from the paused
      // value, not from wherever wall-clock time would place it, and must
      // tick at the normal 1 real-second-per-clock-second rate (not
      // doubled, which is what a stale second interval left running
      // alongside a new one would produce).
      advance(4 * 250);
      expect(stores.time.getState().time.time).toBe('0:02');
      advance(4 * 250);
      expect(stores.time.getState().time.time).toBe('0:03');
    });
  });

  describe('adjustTime', () => {
    it('clamps at zero and never goes negative', async () => {
      const { callbacks, stores } = await renderDashboard();

      act(() => callbacks.nextMatchPhase?.()); // start firstHalf at 0:00
      expect(stores.time.getState().time.time).toBe('0:00');

      fireEvent.click(getOpenAdjustTimeButton());
      fireEvent.click(screen.getByRole('button', { name: '-1s' }));

      expect(stores.time.getState().time.time).toBe('0:00');
    });
  });

  describe('settings reconciliation', () => {
    it('stops the clock when a settings change removes the running phase', async () => {
      const { stores } = await renderDashboard();

      // Start extraTimeSecondHalf directly via the Time panel's phase
      // buttons (default football settings include extra time).
      fireEvent.click(
        screen.getByRole('button', { name: 'Extra Time Second Half' })
      );
      expect(stores.time.getState().time.matchPhase).toBe(
        'extraTimeSecondHalf'
      );

      // Open Team Settings (the desktop rail button; the mobile header
      // duplicates it under a different accessible name) and turn extra
      // time off, which removes extraTimeSecondHalf from the phase list.
      fireEvent.click(screen.getByRole('button', { name: 'Team Settings' }));
      // Opening the menu mounts SavedMatchSettings, which kicks off its own
      // getSavedMatchSettings() fetch; flush it before interacting further.
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      const extraTimeSwitch = screen.getByRole('switch', {
        name: 'Extra time',
      });
      fireEvent.click(extraTimeSwitch);

      expect(stores.time.getState().time.matchPhase).toBeUndefined();
      expect(stores.time.getState().time.time).toBeUndefined();
      // previousMatchPhase is set to the just-stopped phase and then
      // immediately cleared again, since that same phase (extraTimeSecondHalf)
      // is also absent from the new (no-extra-time) phase list, see the
      // "stopped match's previousMatchPhase can also vanish" comment in
      // Dashboard's updateMatchSettings.
      expect(
        stores.matchState.getState().matchState.previousMatchPhase
      ).toBeUndefined();

      // And the now-orphaned clock must not keep ticking either
      advance(4 * 250);
      expect(stores.time.getState().time.time).toBeUndefined();
    });
  });

  describe('wall-clock jump guard', () => {
    it('re-anchors instead of leaping the clock on a large system-time jump', async () => {
      const { callbacks, stores } = await renderDashboard();

      act(() => callbacks.nextMatchPhase?.());
      advance(2000); // 2s of normal ticking
      expect(stores.time.getState().time.time).toBe('0:02');

      // Simulate a laptop-sleep-style wall clock jump without any
      // corresponding timer callbacks having fired
      act(() => {
        vi.setSystemTime(new Date(Date.now() + 10 * 60 * 1000));
      });

      // The next tick must re-anchor, not leap to ~10:02
      advance(250);
      expect(stores.time.getState().time.time).not.toBe('10:02');
      expect(stores.time.getState().time.time).toBe('0:02');

      // ...and ticking then continues normally from the re-anchored point
      advance(2000);
      expect(stores.time.getState().time.time).toBe('0:04');
    });
  });
});
