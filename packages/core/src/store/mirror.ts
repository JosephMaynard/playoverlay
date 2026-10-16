import { AppSettings, MatchState, Scores, Time } from '../types';
import { MatchSettings } from '../zodSchemas';
import { useAppSettingsStore } from './appSettings';
import { useMatchSettingsStore } from './matchSettings';
import { useMatchStateStore } from './matchState';
import { useScoresStore } from './scores';
import { useTimeStore } from './time';

// Where a host sends the live match state as it changes. In the Electron app
// this is IPC to the main process, which fans it out to the display window,
// the OBS browser source and any paired phone, and persists it. Every
// callback is optional, so a host only forwards what it has an output for.
export interface StoreBridge {
  onScores?: (scores: Scores) => void;
  onTime?: (time: Time) => void;
  onMatchState?: (matchState: MatchState) => void;
  onMatchSettings?: (matchSettings: MatchSettings) => void;
  onAppSettings?: (appSettings: AppSettings) => void;
}

// Forwards every change to the mirrored slices to the bridge, and returns a
// function that stops it. This is the single pipeline that carries state to
// the outputs: every write goes through a store setter (operator actions,
// undo/redo restores, settings loaded at startup), so every write reaches
// the bridge the same way.
//
// The stores used to make these calls themselves, inside their setters. A
// zustand subscriber runs synchronously inside set(), right after the new
// state is stored and before the setter returns to the action that called
// it, so the bridge sees the same values in the same order as it did then:
// the IPC sequence is unchanged in practice.
//
// Each callback fires only when its own slice changes (a new object from
// the setter), so e.g. marking settings as loaded does not resend them.
export function mirrorStores(bridge: StoreBridge): () => void {
  const unsubscribers = [
    useScoresStore.subscribe((state, previous) => {
      if (state.scores !== previous.scores) bridge.onScores?.(state.scores);
    }),
    useTimeStore.subscribe((state, previous) => {
      if (state.time !== previous.time) bridge.onTime?.(state.time);
    }),
    useMatchStateStore.subscribe((state, previous) => {
      if (state.matchState !== previous.matchState) {
        bridge.onMatchState?.(state.matchState);
      }
    }),
    useMatchSettingsStore.subscribe((state, previous) => {
      if (state.matchSettings !== previous.matchSettings) {
        bridge.onMatchSettings?.(state.matchSettings);
      }
    }),
    useAppSettingsStore.subscribe((state, previous) => {
      if (state.appSettings !== previous.appSettings) {
        bridge.onAppSettings?.(state.appSettings);
      }
    }),
  ];

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}
