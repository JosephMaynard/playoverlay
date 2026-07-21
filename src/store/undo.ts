import { create } from 'zustand';

import { MatchState, Scores, Time } from '../types';
import { useScoresStore } from './scores';
import { useTimeStore } from './time';
import { useMatchStateStore } from './matchState';

// Multi-step undo/redo for live match state. The on-air state is split across
// three stores: scores (including the penalty shootout), time (the clock), and
// matchState (screen, phase, overlays).
//
// Undo is PER-SLICE, not whole-state: each action records and restores only
// the slice(s) it actually changed. This is a hard correctness requirement for
// a live broadcast. The commonest undo, a score correction, must never touch
// the clock: if an operator misclicks a goal at 37:12 and presses Ctrl+Z at
// 42:00, the clock must stay at 42:00, not rewind five minutes. Restoring the
// time slice happens ONLY when the action actually moved the clock (a clock
// action, or a phase advance which sets both the phase and its clock).

export type UndoSlice = 'scores' | 'time' | 'matchState';

// A snapshot holds only the slices its action touched; the others are absent.
export interface MatchSnapshot {
  scores?: Scores;
  time?: Time;
  matchState?: MatchState;
}

export interface UndoEntry {
  // The captured values of just this action's slices (deep cloned).
  snapshot: MatchSnapshot;
  // Which slices this entry holds and restores.
  slices: UndoSlice[];
  // i18n key (e.g. 'undo:actions.homeGoal') describing the action this entry
  // reverses. Kept as a key, not a resolved string, so the label re-renders in
  // the operator's current language.
  label: string;
  // Optional origin of the action (e.g. 'keyboard', 'phone'), unused by the
  // core logic but available for diagnostics/telemetry later.
  source?: string;
}

// The clock is system-clock driven (see useMatchClock): its running value is
// derived from an internal anchor, not from the time store alone. Restoring
// the time store is therefore not enough, the clock hook has to re-anchor
// itself to the restored value and start/stop ticking to match. The hook
// registers this callback; undo()/redo() invoke it, but ONLY when the time
// slice is part of the restore.
export type ClockResync = (time: Time) => void;

// Cap the history so a long match can't grow the stack without bound. When the
// cap is exceeded the oldest entry is dropped (standard bounded-undo history).
export const UNDO_STACK_CAP = 50;

interface UndoStore {
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
  clockResync: ClockResync | null;

  // Register the clock re-sync callback. Returns an unregister function that
  // clears it again (only if it is still the one registered), for the hook's
  // effect cleanup.
  registerClockResync: (resync: ClockResync) => () => void;

  // Snapshot the CURRENT values of the given slices and push them as the new
  // top of the undo stack, then clear the redo stack (a fresh action always
  // invalidates any pending redo). Call this at the START of an undoable
  // action, before it mutates, so the snapshot is the pre-action state, and
  // pass exactly the slices the action is about to change.
  captureUndo: (label: string, slices: UndoSlice[], source?: string) => void;

  // Restore the top undo entry's slices. The current values of those same
  // slices are first pushed onto the redo stack so redo() can return to them.
  undo: () => void;

  // Inverse of undo().
  redo: () => void;
}

// Deep clone so a snapshot can never alias live store state (the penalties and
// overlays arrays in particular): a later in-place mutation of the live arrays
// must not reach back into a stored snapshot, and restoring a snapshot must not
// hand the live store a reference we still hold.
function cloneSnapshot(snapshot: MatchSnapshot): MatchSnapshot {
  return structuredClone(snapshot);
}

// Read the current values of just the requested slices as one deep-cloned
// partial snapshot.
function snapshotSlices(slices: UndoSlice[]): MatchSnapshot {
  const snapshot: MatchSnapshot = {};
  if (slices.includes('scores')) {
    snapshot.scores = useScoresStore.getState().scores;
  }
  if (slices.includes('time')) {
    snapshot.time = useTimeStore.getState().time;
  }
  if (slices.includes('matchState')) {
    snapshot.matchState = useMatchStateStore.getState().matchState;
  }
  return cloneSnapshot(snapshot);
}

// The store setters merge partial updates into current state, so restoring
// must spell out every optional field (as undefined where the snapshot omits
// it) or a stale field from the current session would survive the merge, e.g.
// a leftover matchPhase or customScreenImageUrl. Building full objects turns
// each merge into a full replace.
function fullScores(scores: Scores): Scores {
  return {
    homeTeam: scores.homeTeam,
    awayTeam: scores.awayTeam,
    penalties: scores.penalties ?? [],
  };
}

function fullTime(time: Time): Time {
  return {
    time: time.time,
    remainingTime: time.remainingTime,
    additionalTime: time.additionalTime,
    paused: time.paused,
    showAdditionalTime: time.showAdditionalTime,
    matchPhase: time.matchPhase,
  };
}

function fullMatchState(matchState: MatchState): MatchState {
  return {
    displayScreen: matchState.displayScreen,
    penaltiesFirstTeam: matchState.penaltiesFirstTeam,
    overlays: matchState.overlays ?? [],
    matchPhase: matchState.matchPhase,
    previousMatchPhase: matchState.previousMatchPhase,
    customScreenImageUrl: matchState.customScreenImageUrl,
  };
}

// Apply an entry's slices to the live stores via the REAL store setters.
// Routing the restore through setScores/setTime/setMatchState is deliberate:
// those setters are the single pipeline that mirrors state out to the display
// window, the OBS browser source, and any paired phone, so a restore reaches
// every output the same way an ordinary edit does. It also means the restore
// must never go through the wrapped action handlers (incrementHomeTeamScore
// and friends), which is exactly why undo()/redo() call these setters directly
// and never re-enter captureUndo.
//
// matchState is applied before time so a phase-slice restore lands the phase
// before the clock re-anchors against it. The clock is re-anchored ONLY when
// the time slice is being restored, so a score-only or screen-only undo leaves
// the running clock completely alone.
function restoreEntry(entry: UndoEntry, clockResync: ClockResync | null) {
  // Clone before applying so the live store never shares a reference with the
  // stored entry (which stays on the redo/undo stack for a possible replay).
  const snapshot = cloneSnapshot(entry.snapshot);

  if (entry.slices.includes('scores') && snapshot.scores) {
    useScoresStore.getState().setScores(fullScores(snapshot.scores));
  }
  if (entry.slices.includes('matchState') && snapshot.matchState) {
    useMatchStateStore
      .getState()
      .setMatchState(fullMatchState(snapshot.matchState));
  }
  if (entry.slices.includes('time') && snapshot.time) {
    useTimeStore.getState().setTime(fullTime(snapshot.time));
    // Re-anchor the match clock to the restored time (continue ticking if the
    // restored phase was active and not paused, stay paused otherwise). Only
    // reached when the time slice is part of this restore.
    clockResync?.(snapshot.time);
  }
}

export const useUndoStore = create<UndoStore>((set, get) => ({
  undoStack: [],
  redoStack: [],
  clockResync: null,

  registerClockResync: (resync) => {
    set({ clockResync: resync });
    return () => {
      // Only clear it if nobody else has since registered a different one.
      if (get().clockResync === resync) {
        set({ clockResync: null });
      }
    };
  },

  captureUndo: (label, slices, source) => {
    const entry: UndoEntry = {
      snapshot: snapshotSlices(slices),
      slices,
      label,
      source,
    };
    const nextStack = [...get().undoStack, entry];
    // Bound the history, dropping the oldest entries first.
    const bounded =
      nextStack.length > UNDO_STACK_CAP
        ? nextStack.slice(nextStack.length - UNDO_STACK_CAP)
        : nextStack;
    // A fresh action invalidates any pending redo.
    set({ undoStack: bounded, redoStack: [] });
  },

  undo: () => {
    const { undoStack, redoStack, clockResync } = get();
    if (undoStack.length === 0) return;

    const entry = undoStack[undoStack.length - 1];
    // Push the current values of just THIS entry's slices onto the redo stack
    // so redo() can return here. It carries the same slices and label as the
    // entry being undone: redoing re-applies that same action.
    const redoEntry: UndoEntry = {
      snapshot: snapshotSlices(entry.slices),
      slices: entry.slices,
      label: entry.label,
      source: entry.source,
    };

    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, redoEntry],
    });

    restoreEntry(entry, clockResync);
  },

  redo: () => {
    const { undoStack, redoStack, clockResync } = get();
    if (redoStack.length === 0) return;

    const entry = redoStack[redoStack.length - 1];
    const undoEntry: UndoEntry = {
      snapshot: snapshotSlices(entry.slices),
      slices: entry.slices,
      label: entry.label,
      source: entry.source,
    };

    set({
      redoStack: redoStack.slice(0, -1),
      undoStack: [...undoStack, undoEntry],
    });

    restoreEntry(entry, clockResync);
  },
}));

// Reactive selectors for the header buttons: subscribing to these makes the
// buttons re-render (enable/disable, tooltip) as the stacks change.
export const selectCanUndo = (state: UndoStore) => state.undoStack.length > 0;
export const selectCanRedo = (state: UndoStore) => state.redoStack.length > 0;
export const selectNextUndoLabel = (state: UndoStore): string | null =>
  state.undoStack.length > 0
    ? state.undoStack[state.undoStack.length - 1].label
    : null;
export const selectNextRedoLabel = (state: UndoStore): string | null =>
  state.redoStack.length > 0
    ? state.redoStack[state.redoStack.length - 1].label
    : null;

// A keydown target inside which the browser's own text undo/redo must be left
// alone: undo/redo shortcuts inside an input, textarea, contenteditable, or an
// ARIA textbox belong to the text field, not to the match. Kept as a pure,
// DOM-only helper so it can be unit tested without React or Electron.
export function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  const tagName = target.tagName;
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
    return true;
  }
  if (target.isContentEditable) return true;
  if (target.getAttribute('role') === 'textbox') return true;

  return false;
}
