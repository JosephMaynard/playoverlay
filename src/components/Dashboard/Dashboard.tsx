import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RocketLaunchIcon } from '@heroicons/react/24/outline';

import {
  Scores,
  AppSettings,
  Penalty,
  homeOrAway,
  LiveMatch,
  MatchPhase,
  MatchState,
  SideMenuType,
} from '../../types';
import {
  MatchSettings,
  matchSetingsSchema,
  UpdateStatus,
} from '../../zodSchemas';

import Preview from '../Preview/Preview';
import MatchSettingsMenu from '../MatchSettingsMenu/MatchSettingsMenu';
import TimeControlPanel from './TimeControlPanel';
import Screens from '../Screens/Screens';
import ScoresPanel from '../ScoresPanel/ScoresPanel';
import DisplayControlsPanel, {
  reconcileActiveOverlays,
  reconcileActiveScreen,
} from './DisplayControlsPanel';
import PenaltiesPanel from './PenaltiesPanel';
import GoalLogPanel from './GoalLogPanel';
import AppSettingsMenu from '../AppSettingsMenu/AppSettingsMenu';
import CustomScreensMenu from '../CustomScreens/CustomScreensMenu';
import AppNotification from '../AppNotification/AppNotification';
import SystemSettingsMenu from '../SystemSettingsMenu/SystemSettingsMenu';
import PreflightModal from '../Preflight/PreflightModal';
import Modal from '../Modal/Modal';
import DashboardHeader from './DashboardHeader';
import useMatchClock from './useMatchClock';

import {
  getPhaseList,
  getNextPhaseId,
  isValidAdditionalTime,
} from '../../utils';
import {
  DisplayScreen,
  MAX_SCORER_LENGTH,
  defaultMatchSettings,
  defaultMatchState,
  defaultScores,
} from '../../constants';
import { createGoal, removeLatestGoal, trimGoalsToScore } from '../../goalLog';
import { isRestorableLiveMatch } from '../../liveMatch';
import { nanoid } from 'nanoid';
import { useScoresStore } from '../../store/scores';
import { useMatchSettingsStore } from '../../store/matchSettings';
import { useMatchStateStore } from '../../store/matchState';
import { useAppSettingsStore } from '../../store/appSettings';
import { useTimeStore } from '../../store/time';
import { useCustomGraphicsStore } from '../../store/customGraphics';
import {
  useUndoStore,
  selectCanUndo,
  isTextEntryTarget,
} from '../../store/undo';
import logo from '../../assets/playoverlay-logo.svg';

export default function Dashboard() {
  const { t } = useTranslation();
  const [sideMenu, setSideMenu] = useState<SideMenuType>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [restorableMatch, setRestorableMatch] = useState<LiveMatch | null>(
    null
  );
  const [preflightOpen, setPreflightOpen] = useState(false);
  const [newMatchOpen, setNewMatchOpen] = useState(false);

  const clock = useMatchClock();

  const scores = useScoresStore((state) => state.scores);
  const setScores = useScoresStore((state) => state.setScores);
  const matchSettings = useMatchSettingsStore((state) => state.matchSettings);
  const setMatchSettings = useMatchSettingsStore(
    (state) => state.setMatchSettings
  );
  const replaceStoredMatchSettings = useMatchSettingsStore(
    (state) => state.replaceMatchSettings
  );
  const matchState = useMatchStateStore((state) => state.matchState);
  const setMatchState = useMatchStateStore((state) => state.setMatchState);
  const appSettings = useAppSettingsStore((state) => state.appSettings);
  const setAppSettings = useAppSettingsStore((state) => state.setAppSettings);
  const markSettingsLoaded = useAppSettingsStore(
    (state) => state.markSettingsLoaded
  );

  const time = useTimeStore((state) => state.time);
  const setTime = useTimeStore((state) => state.setTime);

  const customGraphics = useCustomGraphicsStore(
    (state) => state.customGraphics
  );
  const setCustomGraphics = useCustomGraphicsStore(
    (state) => state.setCustomGraphics
  );
  // Until the library has actually been read, an empty customGraphics means
  // "not loaded yet", not "every graphic was deleted", so active overlays are
  // only reconciled against it once this is set.
  const [customGraphicsLoaded, setCustomGraphicsLoaded] = useState(false);

  // Undo/redo. captureUndo/undo/redo/registerClockResync are stable store
  // methods; canUndo is subscribed so the penalty panel's shared "Undo"
  // button enables/disables with the stack.
  const captureUndo = useUndoStore((state) => state.captureUndo);
  // undo is wired to the penalty panel's shared "Undo" button; the keyboard
  // shortcut reads undo/redo fresh from getState() instead (see below), so
  // redo needs no render-scope binding here.
  const undo = useUndoStore((state) => state.undo);
  const registerClockResync = useUndoStore(
    (state) => state.registerClockResync
  );
  const canUndo = useUndoStore(selectCanUndo);

  // Check for updates on launch
  useEffect(() => {
    const checkForUpdates = async () => {
      const currentUpdateStatus = await window.electronAPI.checkForUpdates();
      setUpdateStatus(currentUpdateStatus.updates ?? null);
    };

    checkForUpdates();
  }, []);

  // Set up IPC state and listeners
  useEffect(() => {
    window?.electronAPI?.updateScores(scores);
    window?.electronAPI?.updateMatchState(matchState);
    window?.electronAPI?.updateTime(time);

    window?.electronAPI
      ?.getMatchSettings()
      .then((settings) => {
        if (settings) {
          setMatchSettings(settings);
        } else {
          window?.electronAPI?.updateMatchSettings(matchSettings);
        }
      })
      .catch((error: unknown) => {
        window?.electronAPI?.updateMatchSettings(matchSettings);
        console.error('Failed to load team settings:', error);
      });

    window?.electronAPI
      ?.getAppSettings()
      .then((settings) => {
        if (settings) {
          setAppSettings(settings);
          window?.electronAPI?.updateAppSettings(settings);
        } else {
          window?.electronAPI?.updateAppSettings(appSettings);
        }
      })
      .catch((error: unknown) => {
        window?.electronAPI?.updateAppSettings(appSettings);
        console.error('Failed to load app settings:', error);
      })
      // Whether or not stored settings existed, the load has now completed -
      // the first-run language picker can decide whether to show.
      .finally(() => {
        markSettingsLoaded();
      });

    const unsubscribeNextPhase = window.electronAPI.onNextMatchPhase(() => {
      nextMatchPhase();
    });

    const unsubscribeHomeScored = window.electronAPI.onHomeTeamScored(() => {
      incrementHomeTeamScore();
    });

    const unsubscribeAwayScored = window.electronAPI.onAwayTeamScored(() => {
      incrementAwayTeamScore();
    });

    // Phone-remote commands. These share the same store setters as the
    // operator's own controls, so a phone tap and an on-screen click produce
    // identical behaviour. Like the shortcut handlers above, each reads fresh
    // state from the relevant store's getState() rather than closing over this
    // render's scope.
    const unsubscribeHomeUnscored = window.electronAPI.onHomeTeamUnscored(
      () => {
        decrementHomeTeamScore();
      }
    );

    const unsubscribeAwayUnscored = window.electronAPI.onAwayTeamUnscored(
      () => {
        decrementAwayTeamScore();
      }
    );

    const unsubscribeToggleClock = window.electronAPI.onToggleClock(() => {
      toggleClock();
    });

    const unsubscribeSetScreen = window.electronAPI.onSetDisplayScreen(
      (screen) => {
        setDisplayScreen(screen as DisplayScreen);
      }
    );

    // Offer to restore a match that was in progress when the app last closed
    window?.electronAPI
      ?.getLiveMatch()
      .then((liveMatch) => {
        if (liveMatch && isRestorableLiveMatch(liveMatch)) {
          setRestorableMatch(liveMatch);
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to check for a previous match:', error);
      });

    fetchScreens();

    const unsubscribe = window?.electronAPI?.onCustomScreensUpdated(
      (updatedScreens) => {
        setCustomGraphics(updatedScreens || []);
        setCustomGraphicsLoaded(true);
      }
    );

    // Clean up the listeners on unmount so a remount can never double-fire
    // a shortcut (one press = two goals)
    return () => {
      unsubscribe();
      unsubscribeNextPhase();
      unsubscribeHomeScored();
      unsubscribeAwayScored();
      unsubscribeHomeUnscored();
      unsubscribeAwayUnscored();
      unsubscribeToggleClock();
      unsubscribeSetScreen();
    };
    // Mount-only: seeds the main process with the initial scores/matchState/
    // time (ongoing changes are mirrored to IPC by each store's setter, per
    // house style), fetches settings once, and registers shortcut/update
    // listeners for the component's lifetime. The listener callbacks
    // (nextMatchPhase, incrementHomeTeamScore, etc.) read fresh state via
    // each zustand store's getState() rather than closing over this scope,
    // so they never go stale. Re-running this effect on every dependency
    // change would instead tear down and re-register the listeners on every
    // render (risking a dropped shortcut mid-swap) and keep re-posting the
    // stale initial scores/matchState/time over IPC.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Let the undo store re-anchor the match clock after a restore. The clock's
  // running value is derived from an internal anchor (see useMatchClock), so
  // restoring the time store alone is not enough; undo()/redo() call this to
  // continue ticking from the restored value (or stay paused). Cleared on
  // unmount via the returned unregister.
  useEffect(() => {
    return registerClockResync(clock.resyncToTime);
  }, [registerClockResync, clock.resyncToTime]);

  // Active overlays are copies of library entries, so a rename, a screen-link
  // edit, a delete or a switch to full-screen in Custom Screens would
  // otherwise leave a stale copy on air (and, for a rename, one the
  // operator's toggle could no longer take off). A full-screen graphic that
  // is deleted or turned into an overlay likewise comes off air. An undo can
  // also bring back state from before such an edit. Not recorded as an undo
  // step: it only follows the library, it isn't an operator action.
  useEffect(() => {
    if (!customGraphicsLoaded) return;
    const reconciledOverlays = reconcileActiveOverlays(
      matchState.overlays ?? [],
      customGraphics
    );
    const reconciledScreen = reconcileActiveScreen(matchState, customGraphics);
    if (reconciledOverlays || reconciledScreen) {
      setMatchState({
        ...(reconciledOverlays ? { overlays: reconciledOverlays } : {}),
        ...reconciledScreen,
      });
    }
  }, [customGraphicsLoaded, customGraphics, matchState, setMatchState]);

  // Match shortcuts (both the focused-window set and the system-wide Alt set)
  // are paused only while the operator is typing: focus in a text field
  // anywhere in the control window, or the shortcut recorder. They used to be
  // paused for as long as any side menu was open, so leaving System Settings
  // open (e.g. showing the phone QR code) silently killed every hotkey,
  // including the global ones pressed from OBS. When the control window loses
  // focus, the global set must work again even if a field still holds focus,
  // so window blur re-enables them. Evaluated after the focus event settles
  // (moving between two fields fires focusout then focusin) and only sends
  // IPC on an actual change.
  useEffect(() => {
    let shortcutsPaused = false;
    // Set by the window blur/focus events; document.hasFocus() is read at
    // evaluation time as well so a window that mounted unfocused is handled.
    let windowBlurred = false;
    let pending: ReturnType<typeof setTimeout> | undefined;

    const apply = () => {
      pending = undefined;
      const shouldPause =
        !windowBlurred &&
        document.hasFocus() &&
        isTextEntryTarget(document.activeElement);
      if (shouldPause === shortcutsPaused) return;
      shortcutsPaused = shouldPause;
      if (shouldPause) {
        window?.electronAPI?.disableKeyboardShortcuts();
      } else {
        window?.electronAPI?.enableKeyboardShortcuts();
      }
    };
    const schedule = () => {
      if (pending === undefined) pending = setTimeout(apply, 0);
    };
    const handleWindowFocus = () => {
      windowBlurred = false;
      schedule();
    };
    const handleWindowBlur = () => {
      windowBlurred = true;
      schedule();
    };

    document.addEventListener('focusin', schedule);
    document.addEventListener('focusout', schedule);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);
    return () => {
      document.removeEventListener('focusin', schedule);
      document.removeEventListener('focusout', schedule);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('blur', handleWindowBlur);
      if (pending !== undefined) clearTimeout(pending);
      if (shortcutsPaused) window?.electronAPI?.enableKeyboardShortcuts();
    };
  }, []);

  // App-level (renderer window) undo/redo shortcuts, active while the control
  // window has focus. Deliberately separate from the global-OS accelerators
  // registered in main.ts. Mount-only: the handler reads undo/redo fresh from
  // the store's getState() so it never closes over stale references, and the
  // listener is torn down on unmount so a remount can't double-bind.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() !== 'z') return;

      // Inside a text field, leave the browser's native text undo/redo alone
      // rather than hijacking Ctrl/Cmd+Z for the match. Check both the event
      // target and the active element so a keydown that bubbles up from an
      // editable element is still recognised.
      if (
        isTextEntryTarget(event.target) ||
        isTextEntryTarget(document.activeElement)
      ) {
        return;
      }

      event.preventDefault();
      if (event.shiftKey) {
        useUndoStore.getState().redo();
      } else {
        useUndoStore.getState().undo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchScreens = async () => {
    try {
      const storedScreens = await window?.electronAPI?.getCustomScreens();
      setCustomGraphics(storedScreens || []);
      setCustomGraphicsLoaded(true);
    } catch (error) {
      console.error('Failed to fetch custom screens:', error);
    }
  };

  const openSideMenu = (sideMenu: SideMenuType) => {
    setSideMenu(sideMenu);
  };

  const closeSideMenu = () => {
    setSideMenu(null);
  };

  const updateAppSettings = (settingsUpdated: Partial<AppSettings>) => {
    const updatedSettings = {
      ...appSettings,
      ...settingsUpdated,
    };
    setAppSettings(updatedSettings);
    window?.electronAPI?.updateAppSettings(updatedSettings);
  };

  // Settings changes that remove the running phase, timer mode switch,
  // extra time off, fewer periods, stop the clock instead of leaving it
  // orphaned on a phase id that no longer exists.
  const reconcileClockWithSettings = (nextSettings: MatchSettings) => {
    const { matchPhase } = useTimeStore.getState().time;
    const newPhaseList = getPhaseList(nextSettings);
    if (
      matchPhase !== undefined &&
      !newPhaseList.some((phase) => phase.id === matchPhase)
    ) {
      // Settings edits never switch the operator's display screen.
      clock.stopTime({ autoSwitch: false });
    }
    // A stopped match's previousMatchPhase can also vanish from the new
    // phase list (e.g. extra time turned off after extra time was played);
    // clear it so the next-phase shortcut isn't left permanently dead.
    const { previousMatchPhase } = useMatchStateStore.getState().matchState;
    if (
      previousMatchPhase !== undefined &&
      !newPhaseList.some((phase) => phase.id === previousMatchPhase)
    ) {
      setMatchState({ previousMatchPhase: undefined });
    }
  };

  const updateMatchSettings = (settingsUpdate: Partial<MatchSettings>) => {
    reconcileClockWithSettings({
      ...useMatchSettingsStore.getState().matchSettings,
      ...settingsUpdate,
    });
    setMatchSettings(settingsUpdate);
  };

  // Restoring a saved fixture replaces the settings wholesale (see the
  // store's replaceMatchSettings) but still gets the same clock check.
  const replaceMatchSettings = (settings: MatchSettings) => {
    reconcileClockWithSettings(settings);
    replaceStoredMatchSettings(settings);
  };

  // Starting a phase supersedes any offer to restore a previous match. That
  // belongs here rather than in the clock hook: it's Dashboard-local UI
  // state the hook has no notion of.
  const startTime = (matchPhase: MatchPhase) => {
    setRestorableMatch(null);
    clock.startTime(matchPhase);
  };

  const restoreMatch = (liveMatch: LiveMatch) => {
    // Applied first (full replace, so no stray field from whatever's
    // currently loaded survives) so the clock and phase list below
    // reinterpret the snapshot's scores/state/time against the settings
    // that were active when it was taken. Older snapshots predate this
    // field and simply keep whatever match settings are already loaded.
    if (liveMatch.matchSettings) {
      // Validate the snapshot's settings the same way stored MATCH_SETTINGS
      // are validated on load: the LIVE_MATCH snapshot is otherwise the only
      // path that writes match settings without a schema check, so a corrupt
      // config.json could feed e.g. an out-of-range periodCount straight into
      // getPhaseList. A failed parse falls back to the current settings.
      const parsed = matchSetingsSchema.safeParse(liveMatch.matchSettings);
      if (parsed.success) {
        replaceStoredMatchSettings({ ...defaultMatchSettings, ...parsed.data });
      }
    }
    setScores({ ...liveMatch.scores, goals: liveMatch.scores.goals ?? [] });
    // Restore fully replaces the match state. The store setter merges and
    // both defaultMatchState and the snapshot may omit optional keys, so the
    // optional fields are cleared explicitly first, otherwise one left over
    // from the current session (e.g. a customScreenImageUrl, or a stale
    // matchPhase) would survive into the restored match.
    setMatchState({
      matchPhase: undefined,
      previousMatchPhase: undefined,
      customScreenImageUrl: undefined,
      ...defaultMatchState,
      ...liveMatch.matchState,
    });
    clock.restoreClock(liveMatch.time);
    setRestorableMatch(null);
    // Anything captured before the restore (a screen switch or penalty made
    // while the offer was showing) belongs to the blank launch state; undoing
    // it would mix that into the restored match.
    useUndoStore.getState().clearHistory();
  };

  // Goal log edits. Both are score-slice undo entries, like the goals
  // themselves. Removing an entry removes the goal (the log IS the goals
  // that were scored), so the team's score goes down with it.
  const setGoalScorer = (goalId: string, scorer: string) => {
    const prevScores = useScoresStore.getState().scores;
    const goals = prevScores.goals ?? [];
    const trimmed = scorer.trim().slice(0, MAX_SCORER_LENGTH) || undefined;
    const goal = goals.find((entry) => entry.id === goalId);
    if (!goal || goal.scorer === trimmed) return;
    captureUndo('undo:actions.goalScorer', ['scores']);
    setScores({
      goals: goals.map((entry) =>
        entry.id === goalId ? { ...entry, scorer: trimmed } : entry
      ),
    });
  };

  const removeGoal = (goalId: string) => {
    const prevScores = useScoresStore.getState().scores;
    const goals = prevScores.goals ?? [];
    const goal = goals.find((entry) => entry.id === goalId);
    if (!goal) return;
    captureUndo('undo:actions.goalRemoved', ['scores']);
    const scoreKey = goal.team === 'home' ? 'homeTeam' : 'awayTeam';
    setScores({
      [scoreKey]: Math.max(0, prevScores[scoreKey] - 1),
      goals: goals.filter((entry) => entry.id !== goalId),
    });
  };

  // Puts the goal banner on air for one goal. Not an undo step: it takes
  // itself off after GOAL_BANNER_DURATION_MS.
  const showGoalBanner = (goalId: string) => {
    setMatchState({ goalBanner: { goalId, shownAt: Date.now() } });
  };

  // Called for every new goal; shows the banner straight away unless the
  // operator has switched that off (read fresh: this runs from mount-time
  // shortcut and phone listeners too).
  const maybeShowGoalBanner = (goalId: string) => {
    if (
      useAppSettingsStore.getState().appSettings.showGoalBannerAutomatically !==
      false
    ) {
      showGoalBanner(goalId);
    }
  };

  // New match: back to a clean slate between fixtures in one step, instead of
  // resetting the score, penalties, clock, phase history and graphics one by
  // one (easy to get half right between back-to-back fixtures). Team
  // settings are kept. Not undoable: it replaces the whole match, behind a
  // confirmation, so the previous match's history goes with it. The display
  // goes to the match title, ready for the next kick-off.
  const startNewMatch = () => {
    clock.resetClock();
    setScores({ ...defaultScores, penalties: [], goals: [] });
    setMatchState({
      ...defaultMatchState,
      overlays: [],
      matchPhase: undefined,
      previousMatchPhase: undefined,
      customScreenImageUrl: undefined,
      goalBanner: undefined,
      displayScreen: 'matchTitle',
    });
    useUndoStore.getState().clearHistory();
    if (restorableMatch) {
      // Choosing a new match is choosing not to restore the previous one.
      window?.electronAPI?.resolveLiveMatch();
      setRestorableMatch(null);
    }
    setNewMatchOpen(false);
  };

  // Penalty add/reset flows through here so it lands on the SAME undo stack as
  // everything else (the panel's own "Undo" button delegates to the global
  // undo, see PenaltiesPanel). The caller passes the i18n label for the
  // specific change (scored/missed/reset). captureUndo runs first, snapshotting
  // the pre-change state.
  const setPenalties = (penalties: Penalty[], label: string) => {
    // Penalties live inside the scores slice, so penalty edits are scores-only:
    // undoing one never touches the clock.
    captureUndo(label, ['scores']);
    const prevScores = useScoresStore.getState().scores;
    setScores({ ...prevScores, penalties });
  };

  const incrementHomeTeamScore = () => {
    captureUndo('undo:actions.homeGoal', ['scores']);
    setRestorableMatch(null);
    const prevScores = useScoresStore.getState().scores;
    const goal = createGoal(nanoid(), 'home', useTimeStore.getState().time);
    setScores({
      ...prevScores,
      homeTeam: prevScores.homeTeam + 1,
      goals: [...(prevScores.goals ?? []), goal],
    });
    maybeShowGoalBanner(goal.id);
  };

  const incrementAwayTeamScore = () => {
    captureUndo('undo:actions.awayGoal', ['scores']);
    setRestorableMatch(null);
    const prevScores = useScoresStore.getState().scores;
    const goal = createGoal(nanoid(), 'away', useTimeStore.getState().time);
    setScores({
      ...prevScores,
      awayTeam: prevScores.awayTeam + 1,
      goals: [...(prevScores.goals ?? []), goal],
    });
    maybeShowGoalBanner(goal.id);
  };

  // Phone-remote goal removal. Clamped at 0 so a stray minus tap can never
  // drive the score negative. Clears any pending restore prompt, exactly like
  // the increment handlers and the manual score edits, so a stale restore
  // snapshot can never overwrite a correction made from the phone. When the
  // score is already 0 there is nothing to remove, so it's a full no-op: no
  // undo entry (an undo that visibly changes nothing is worse than no entry
  // at all), and the restore offer stays, since nothing was corrected.
  const decrementHomeTeamScore = () => {
    const prevScores = useScoresStore.getState().scores;
    if (prevScores.homeTeam <= 0) return;
    setRestorableMatch(null);
    captureUndo('undo:actions.homeGoalRemoved', ['scores']);
    setScores({
      ...prevScores,
      homeTeam: prevScores.homeTeam - 1,
      goals: removeLatestGoal(prevScores.goals ?? [], 'home'),
    });
  };

  const decrementAwayTeamScore = () => {
    const prevScores = useScoresStore.getState().scores;
    if (prevScores.awayTeam <= 0) return;
    setRestorableMatch(null);
    captureUndo('undo:actions.awayGoalRemoved', ['scores']);
    setScores({
      ...prevScores,
      awayTeam: prevScores.awayTeam - 1,
      goals: removeLatestGoal(prevScores.goals ?? [], 'away'),
    });
  };

  // Phone-remote clock toggle. The clock is "running" when a phase is active
  // and not paused (see the Time type), so this pauses a running clock and
  // resumes a paused one via the exact same hooks the operator's pause/resume
  // controls use. With no phase active there's nothing to toggle (the
  // operator's own pause/resume are likewise disabled then), so it's a no-op.
  // Reads paused fresh from the store rather than the clock hook's `paused`
  // state, which would be stale inside this mount-time listener; the hook's
  // pause/resume callbacks themselves are stable across renders.
  const toggleClock = () => {
    const { matchPhase, paused } = useTimeStore.getState().time;
    if (matchPhase === undefined) return;
    // Pause/resume only flips time.paused, so these are time-only: undoing a
    // pause resumes the clock, undoing a resume pauses it, nothing else moves.
    if (paused) {
      captureUndo('undo:actions.resumeClock', ['time']);
      clock.resume();
    } else {
      captureUndo('undo:actions.pauseClock', ['time']);
      clock.pause();
    }
  };

  // Screen switch (operator's own screen buttons and the phone remote both
  // funnel through here). A screen switch only changes matchState, so it is
  // matchState-only: undoing it never touches the clock or the score.
  const switchDisplayScreen = (update: Partial<MatchState>) => {
    captureUndo('undo:actions.switchScreen', ['matchState']);
    setMatchState(update);
  };

  // Phone-remote on-air screen switch. Same setter (and the same clearing of
  // any pinned custom-screen image) as the operator's screen buttons.
  const setDisplayScreen = (displayScreen: DisplayScreen) => {
    switchDisplayScreen({ displayScreen, customScreenImageUrl: undefined });
  };

  // Capturing wrappers for the operator's own clock/phase controls (Time
  // panel, System menu). Each records the pre-action snapshot then delegates
  // to the core clock action. The keyboard/Stream Deck/phone paths funnel
  // through their own handlers (nextMatchPhase, toggleClock) which capture
  // once themselves, so no action is ever captured twice.
  // Starting and stopping a phase both set the clock AND matchState (the phase
  // itself, previousMatchPhase, and the auto-switched display screen), so they
  // capture the time + matchState slices together, exactly like nextMatchPhase.
  // Undoing them restores both the phase and its clock. As with every time
  // restore, a clock that was running is carried forward by the time since
  // (see undo.ts), so undoing never rewinds real match time.
  const handleStartPhase = (matchPhase: MatchPhase) => {
    captureUndo('undo:actions.startClock', ['time', 'matchState']);
    startTime(matchPhase);
  };

  const handleStopClock = () => {
    // Stopping with no phase running would overwrite previousMatchPhase with
    // undefined, so the next-phase shortcut would restart the match from the
    // first phase (a Stream Deck double-tap is enough). Same guard as
    // nextMatchPhase's full-time branch; it records no undo entry either.
    if (useTimeStore.getState().time.matchPhase === undefined) return;
    captureUndo('undo:actions.stopClock', ['time', 'matchState']);
    clock.stopTime();
  };

  const handlePauseClock = () => {
    captureUndo('undo:actions.pauseClock', ['time']);
    clock.pause();
  };

  const handleResumeClock = () => {
    captureUndo('undo:actions.resumeClock', ['time']);
    clock.resume();
  };

  const handleAdjustTime = (difference: number) => {
    captureUndo('undo:actions.adjustTime', ['time']);
    clock.adjustTime(difference);
  };

  const handleSetAdditionalTime = (additionalTime?: number) => {
    // Anything but whole positive minutes clears it rather than putting
    // "+ -2" or "+2.5" on air; setting the value it already has is a no-op
    // with no undo entry.
    const next = isValidAdditionalTime(additionalTime)
      ? additionalTime
      : undefined;
    if (next === useTimeStore.getState().time.additionalTime) return;
    captureUndo('undo:actions.additionalTime', ['time']);
    // setTime merges; spreading the render-scope time here would overwrite a
    // fresher tick with stale clock strings.
    setTime({ additionalTime: next });
  };

  const nextMatchPhase = () => {
    const { previousMatchPhase, matchPhase } =
      useMatchStateStore.getState().matchState;

    const phaseList = getPhaseList(
      useMatchSettingsStore.getState().matchSettings
    );
    const nextPhase = getNextPhaseId(phaseList, matchPhase, previousMatchPhase);

    if (nextPhase) {
      // captureUndo before mutating; startTime here is the CORE (non-capturing)
      // handler, so advancing the phase records exactly one undo entry even
      // though the operator's own phase buttons capture through handleStartPhase.
      // Advancing a phase sets both the clock and the phase, so both slices.
      captureUndo('undo:actions.nextPhase', ['time', 'matchState']);
      // startTime (and the clock hook underneath it) handles the matchState
      // update and the auto-switch-screens behaviour.
      startTime(nextPhase);
    } else if (matchPhase !== undefined) {
      // No next phase, and a phase is currently running (full time reached):
      // stop the clock and record how far the match got. Guarded on
      // matchPhase so a stray shortcut press after the match has already
      // finished (matchPhase already undefined) is a no-op, otherwise it
      // would overwrite previousMatchPhase and let the match restart from
      // the first phase.
      captureUndo('undo:actions.nextPhase', ['time', 'matchState']);
      clock.stopTime();
    }
  };

  return (
    <>
      <div className="select-none">
        <DashboardHeader
          setSideMenu={openSideMenu}
          onNewMatch={() => setNewMatchOpen(true)}
        />
        <main className="grid grid-cols-1 bg-slate-100 lg:grid-cols-2 lg:pr-20">
          <div className="lg:grid lg:h-screen lg:grid-cols-1 lg:grid-rows-2">
            <Preview keyColour={appSettings.keyColour}>
              <Screens
                matchSettings={matchSettings}
                scores={scores}
                time={time}
                matchState={matchState}
                clockFormat={appSettings.clockFormat}
              />
            </Preview>
            <div className="lg:overflow-y-auto lg:p-4">
              <div className="mx-4 mb-4 lg:mx-auto">
                <button
                  type="button"
                  onClick={() => setPreflightOpen(true)}
                  className="flex w-full items-center justify-center gap-x-2 rounded-md bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-green-500"
                >
                  <RocketLaunchIcon className="h-5 w-5" aria-hidden="true" />
                  {t('preflight:action.openButton')}
                </button>
              </div>
              <DisplayControlsPanel
                updateMatchState={setMatchState}
                switchScreen={switchDisplayScreen}
                matchState={matchState}
                customGraphics={customGraphics}
                matchSettings={matchSettings}
              />
            </div>
          </div>
          <div className="lg:h-screen lg:overflow-y-auto lg:p-4">
            <TimeControlPanel
              time={time}
              matchSettings={matchSettings}
              pause={handlePauseClock}
              resume={handleResumeClock}
              adjustTime={handleAdjustTime}
              isPaused={clock.paused}
              setAdditionalTime={handleSetAdditionalTime}
              startTime={handleStartPhase}
              stopTime={handleStopClock}
              autoSwitchScreens={appSettings.autoSwitchScreens}
              setAutoSwitchScreens={(autoSwitchScreens: boolean) =>
                updateAppSettings({ autoSwitchScreens })
              }
            />
            <ScoresPanel
              matchSettings={matchSettings}
              scores={scores}
              time={time}
              incrementHomeTeamScore={incrementHomeTeamScore}
              incrementAwayTeamScore={incrementAwayTeamScore}
              updateScore={(updatedScores: Partial<Scores>) => {
                // Capture before mutating, then edit (scores-only, so undoing a
                // manual correction never touches the clock). Editing the score
                // also supersedes the restore offer. A correction downwards
                // takes that team's latest goals out of the log with it.
                captureUndo('undo:actions.scoreEdit', ['scores']);
                setRestorableMatch(null);
                let goals = useScoresStore.getState().scores.goals ?? [];
                if (updatedScores.homeTeam !== undefined) {
                  goals = trimGoalsToScore(
                    goals,
                    'home',
                    updatedScores.homeTeam
                  );
                }
                if (updatedScores.awayTeam !== undefined) {
                  goals = trimGoalsToScore(
                    goals,
                    'away',
                    updatedScores.awayTeam
                  );
                }
                setScores({ ...updatedScores, goals });
              }}
            />
            {matchSettings.hasPenalties !== false && (
              <PenaltiesPanel
                penalties={scores.penalties}
                setPenalties={setPenalties}
                penaltiesFirstTeam={matchState.penaltiesFirstTeam}
                setPenaltiesFirstTeam={(penaltiesFirstTeam: homeOrAway) =>
                  setMatchState({ penaltiesFirstTeam })
                }
                matchSettings={matchSettings}
                onUndo={undo}
                canUndo={canUndo}
              />
            )}
            <GoalLogPanel
              goals={scores.goals ?? []}
              matchSettings={matchSettings}
              showBannerAutomatically={
                appSettings.showGoalBannerAutomatically !== false
              }
              setShowBannerAutomatically={(showGoalBannerAutomatically) =>
                updateAppSettings({ showGoalBannerAutomatically })
              }
              setScorer={setGoalScorer}
              showBanner={showGoalBanner}
              removeGoal={removeGoal}
            />
          </div>
        </main>
        <MatchSettingsMenu
          sidebarOpen={sideMenu === 'team-settings'}
          setSidebarOpen={closeSideMenu}
          matchSettings={matchSettings}
          updateMatchSettings={updateMatchSettings}
          replaceMatchSettings={replaceMatchSettings}
          appSettings={appSettings}
        />
        <CustomScreensMenu
          open={sideMenu === 'custom-screens'}
          setOpen={closeSideMenu}
          keyColour={appSettings.keyColour}
          customGraphics={customGraphics}
          fetchScreens={fetchScreens}
        />
        <AppSettingsMenu
          open={sideMenu === 'app-settings'}
          setOpen={closeSideMenu}
          appSettings={appSettings}
          updateAppSettings={updateAppSettings}
        />
        <SystemSettingsMenu
          open={sideMenu === 'system-settings'}
          setOpen={closeSideMenu}
          incrementHomeTeamScore={incrementHomeTeamScore}
          incrementAwayTeamScore={incrementAwayTeamScore}
          stopTime={handleStopClock}
          matchSettings={matchSettings}
          startTime={handleStartPhase}
          updateMatchState={switchDisplayScreen}
          matchState={matchState}
          time={time}
          appSettings={appSettings}
          updateAppSettings={updateAppSettings}
        />
        <PreflightModal open={preflightOpen} setOpen={setPreflightOpen} />
        <Modal
          open={newMatchOpen}
          setOpen={setNewMatchOpen}
          title={t('dashboard:newMatch.modalTitle')}
          actionButtonLabel={t('dashboard:newMatch.confirm')}
          actionButtonColor="indigo"
          icon="warning"
          action={startNewMatch}
        >
          <p className="text-sm text-gray-500">
            {t('dashboard:newMatch.modalBody')}
          </p>
        </Modal>
      </div>
      <div
        aria-live="assertive"
        className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center gap-4 px-4 py-6 sm:items-end sm:p-6"
      >
        {restorableMatch && (
          <AppNotification
            title={t('dashboard:notifications.restoreMatch.title')}
            text={
              restorableMatch.time?.time
                ? t('dashboard:notifications.restoreMatch.bodyWithTime', {
                    homeTeam:
                      restorableMatch.matchSettings?.homeTeamNameAbbreviated ??
                      matchSettings.homeTeamNameAbbreviated,
                    homeScore: restorableMatch.scores?.homeTeam ?? 0,
                    awayScore: restorableMatch.scores?.awayTeam ?? 0,
                    awayTeam:
                      restorableMatch.matchSettings?.awayTeamNameAbbreviated ??
                      matchSettings.awayTeamNameAbbreviated,
                    time: restorableMatch.time.time,
                  })
                : t('dashboard:notifications.restoreMatch.body', {
                    homeTeam:
                      restorableMatch.matchSettings?.homeTeamNameAbbreviated ??
                      matchSettings.homeTeamNameAbbreviated,
                    homeScore: restorableMatch.scores?.homeTeam ?? 0,
                    awayScore: restorableMatch.scores?.awayTeam ?? 0,
                    awayTeam:
                      restorableMatch.matchSettings?.awayTeamNameAbbreviated ??
                      matchSettings.awayTeamNameAbbreviated,
                  })
            }
            icon={
              <img
                className="h-8 w-auto"
                src={logo}
                alt={t('common:logoAlt')}
              />
            }
            buttonOnClick={() => restoreMatch(restorableMatch)}
            buttonText={t('settings:matchMenu.saved.restore')}
            onClose={() => {
              // Dismissed without restoring: let the main process replace the
              // protected snapshot with the current state so it isn't offered
              // again next launch.
              window?.electronAPI?.resolveLiveMatch();
              setRestorableMatch(null);
            }}
          />
        )}
        {updateStatus?.newVersionAvailable && (
          <AppNotification
            title={t('dashboard:notifications.updateAvailable.title')}
            text={t('dashboard:notifications.updateAvailable.body', {
              version: updateStatus?.latestVersion,
            })}
            icon={
              <img
                className="h-8 w-auto"
                src={logo}
                alt={t('common:logoAlt')}
              />
            }
            buttonOnClick={() => {
              window?.electronAPI?.openUrlInBrowser(updateStatus?.downloadUrl);
            }}
            buttonText={t('dashboard:notifications.updateAvailable.button')}
          />
        )}
      </div>
    </>
  );
}
