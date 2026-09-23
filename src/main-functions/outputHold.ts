import { DisplayScreen, defaultMatchState } from '../constants';
import { LiveMatch, MatchState, Scores, Time } from '../types';
import { isRestorableLiveMatch } from '../liveMatch';

// Re-exported for the main process, which imports the output-hold pieces
// from here; the rule itself lives in liveMatch.ts, shared with the
// dashboard.
export { isRestorableLiveMatch };

// What the on-air outputs (display window, OBS browser sources, paired
// phones) are sent: the live state, or a held stand-in for it.
export interface OutputState {
  scores: Scores;
  time: Time;
  matchState: MatchState;
}

// The held view shown at launch while a restore prompt is pending. The
// dashboard seeds the main process with a blank 0-0 match on mount, and
// broadcasting that would put a live-looking 0-0 scorebug on air in the
// middle of a real match until the operator clicks Restore. The outputs go
// blank instead ('none' screen, no overlays). The snapshot's own scores and
// clock ride along rather than zeros, so anything that ignores the blank
// screen (a browser source pinned to one screen with ?screen=) shows the
// last real score, not a fake one.
export function launchHoldState(liveMatch: LiveMatch): OutputState {
  return {
    scores: liveMatch.scores,
    time: liveMatch.time,
    matchState: {
      ...defaultMatchState,
      ...liveMatch.matchState,
      displayScreen: 'none',
      customScreenImageUrl: undefined,
      overlays: [],
    },
  };
}

// Freezes what the outputs are sending while the state behind them can't be
// trusted: after launch with a restore prompt pending, or while the control
// window reloads after a renderer crash (its fresh dashboard seeds a blank
// match again). Updates keep flowing into main.ts's caches; only the view
// sent to the outputs is held. Released when the operator resolves the
// prompt (restore, dismiss, or any meaningful match action), or when they
// clearly take over the output by putting a different screen on air.
export class OutputHold {
  private held: OutputState | null = null;
  private seedDisplayScreen: DisplayScreen | null = null;

  hold(state: OutputState): void {
    this.held = state;
    this.seedDisplayScreen = null;
  }

  // Returns whether a hold was actually lifted, so the caller only resends
  // the live state when something changes on air.
  release(): boolean {
    const wasHeld = this.held !== null;
    this.held = null;
    this.seedDisplayScreen = null;
    return wasHeld;
  }

  isHeld(): boolean {
    return this.held !== null;
  }

  view(live: OutputState): OutputState {
    return this.held ?? live;
  }

  // Called with every match state the dashboard sends while held. The first
  // one is the dashboard's mount-time seed and is only remembered. A later
  // one on a different screen means the operator picked a screen, e.g. a
  // pre-match title card while last week's full-time snapshot still sits in
  // the restore prompt, so the hold must not keep the output blank behind
  // their back. Returns true when that releases the hold.
  noteMatchState(matchState: MatchState): boolean {
    if (!this.held) return false;
    if (this.seedDisplayScreen === null) {
      this.seedDisplayScreen = matchState.displayScreen;
      return false;
    }
    if (matchState.displayScreen === this.seedDisplayScreen) return false;
    return this.release();
  }
}
