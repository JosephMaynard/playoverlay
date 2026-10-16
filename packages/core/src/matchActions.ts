import { nanoid } from 'nanoid';

import {
  LiveMatch,
  MatchPhase,
  MatchState,
  Penalty,
  Scores,
  Time,
} from './types';
import { MatchSettings, matchSetingsSchema } from './zodSchemas';
import {
  DisplayScreen,
  MAX_SCORER_LENGTH,
  defaultMatchSettings,
  defaultMatchState,
  defaultScores,
} from './constants';
import { getNextPhaseId, getPhaseList, isValidAdditionalTime } from './utils';
import { createGoal, removeLatestGoal, trimGoalsToScore } from './goalLog';
import { useScoresStore } from './store/scores';
import { useMatchSettingsStore } from './store/matchSettings';
import { useMatchStateStore } from './store/matchState';
import { useAppSettingsStore } from './store/appSettings';
import { useTimeStore } from './store/time';
import { UndoSlice, useUndoStore } from './store/undo';
import type { UseMatchClock } from './useMatchClock';

// The clock operations the match actions drive. useMatchClock provides them;
// its callbacks are stable across renders.
export type MatchClock = Pick<
  UseMatchClock,
  | 'startTime'
  | 'stopTime'
  | 'pause'
  | 'resume'
  | 'adjustTime'
  | 'restoreClock'
  | 'resetClock'
>;

export interface MatchActionOptions {
  // Called at each point where an operator action supersedes the host's
  // offer to restore the match that was in progress when the app last
  // closed: a goal, a score edit, starting a phase, restoring the match
  // itself. The offer is host UI state the actions have no notion of, so
  // the host clears it here (the Electron dashboard drops its
  // restorableMatch).
  onOperatorAction?: () => void;
}

// The operator's match actions: goals, the goal log, penalties, the clock and
// phases, screen switches, score edits, settings changes that can strand the
// running phase, and restoring or starting a match. Every app that runs a
// match uses these, whether the action comes from a button, a keyboard
// shortcut, a Stream Deck or the phone remote, so they behave identically
// everywhere.
//
// Each action reads fresh state from the stores' getState() rather than from
// a caller's render scope, so a host can bind them once (e.g. in mount-time
// shortcut listeners) without them going stale. Undo capture happens BEFORE
// the mutation, with exactly the slices the action changes, so the undo
// stack holds the pre-action state (see store/undo.ts for why per-slice undo
// matters on a live broadcast).
export function createMatchActions(
  clock: MatchClock,
  { onOperatorAction = () => undefined }: MatchActionOptions = {}
) {
  // The store setters are looked up at call time, like the state they read,
  // so the actions hold no reference that could outlive a store.
  const captureUndo = (label: string, slices: UndoSlice[]) =>
    useUndoStore.getState().captureUndo(label, slices);
  const setScores = (update: Partial<Scores>) =>
    useScoresStore.getState().setScores(update);
  const setMatchState = (update: Partial<MatchState>) =>
    useMatchStateStore.getState().setMatchState(update);
  const setTime = (update: Partial<Time>) =>
    useTimeStore.getState().setTime(update);

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
    useMatchSettingsStore.getState().setMatchSettings(settingsUpdate);
  };

  // Restoring a saved fixture replaces the settings wholesale (see the
  // store's replaceMatchSettings) but still gets the same clock check.
  const replaceMatchSettings = (settings: MatchSettings) => {
    reconcileClockWithSettings(settings);
    useMatchSettingsStore.getState().replaceMatchSettings(settings);
  };

  // Starting a phase supersedes any offer to restore a previous match. That
  // belongs here rather than in the clock hook: the offer is host UI state
  // the hook has no notion of.
  const startTime = (matchPhase: MatchPhase) => {
    onOperatorAction();
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
        useMatchSettingsStore
          .getState()
          .replaceMatchSettings({ ...defaultMatchSettings, ...parsed.data });
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
    onOperatorAction();
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
  // goes to the match title, ready for the next kick-off. What happens to a
  // pending restore offer is up to the host, after this returns.
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
    onOperatorAction();
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
    onOperatorAction();
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
    onOperatorAction();
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
    onOperatorAction();
    captureUndo('undo:actions.awayGoalRemoved', ['scores']);
    setScores({
      ...prevScores,
      awayTeam: prevScores.awayTeam - 1,
      goals: removeLatestGoal(prevScores.goals ?? [], 'away'),
    });
  };

  // Manual score correction. Capture before mutating, then edit (scores-only,
  // so undoing a manual correction never touches the clock). Editing the
  // score also supersedes the restore offer. A correction downwards takes
  // that team's latest goals out of the log with it.
  const updateScore = (updatedScores: Partial<Scores>) => {
    captureUndo('undo:actions.scoreEdit', ['scores']);
    onOperatorAction();
    let goals = useScoresStore.getState().scores.goals ?? [];
    if (updatedScores.homeTeam !== undefined) {
      goals = trimGoalsToScore(goals, 'home', updatedScores.homeTeam);
    }
    if (updatedScores.awayTeam !== undefined) {
      goals = trimGoalsToScore(goals, 'away', updatedScores.awayTeam);
    }
    setScores({ ...updatedScores, goals });
  };

  // Phone-remote clock toggle. The clock is "running" when a phase is active
  // and not paused (see the Time type), so this pauses a running clock and
  // resumes a paused one via the exact same hooks the operator's pause/resume
  // controls use. With no phase active there's nothing to toggle (the
  // operator's own pause/resume are likewise disabled then), so it's a no-op.
  // Reads paused fresh from the store rather than the clock hook's `paused`
  // state, which would be stale inside a mount-time listener; the hook's
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
    // setTime merges; spreading a caller's render-scope time here would
    // overwrite a fresher tick with stale clock strings.
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

  return {
    reconcileClockWithSettings,
    updateMatchSettings,
    replaceMatchSettings,
    restoreMatch,
    setGoalScorer,
    removeGoal,
    showGoalBanner,
    maybeShowGoalBanner,
    startNewMatch,
    setPenalties,
    incrementHomeTeamScore,
    incrementAwayTeamScore,
    decrementHomeTeamScore,
    decrementAwayTeamScore,
    updateScore,
    toggleClock,
    switchDisplayScreen,
    setDisplayScreen,
    handleStartPhase,
    handleStopClock,
    handlePauseClock,
    handleResumeClock,
    handleAdjustTime,
    handleSetAdditionalTime,
    nextMatchPhase,
  };
}

export type MatchActions = ReturnType<typeof createMatchActions>;
