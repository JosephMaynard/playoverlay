import { describe, expect, it } from 'vitest';
import { defaultMatchState, defaultScores } from '../../constants';
import { LiveMatch, MatchState } from '../../types';
import {
  isRestorableLiveMatch,
  launchHoldState,
  OutputHold,
  OutputState,
} from '../outputHold';

const interruptedMatch: LiveMatch = {
  scores: { homeTeam: 2, awayTeam: 1, penalties: [] },
  time: { time: '67:12', paused: true, matchPhase: 'secondHalf' },
  matchState: {
    ...defaultMatchState,
    displayScreen: 'custom',
    customScreenImageUrl: 'file:///images/sponsor.png',
    matchPhase: 'secondHalf',
    overlays: [
      { title: 'Sponsor', filePath: '/images/s.png', url: 'file:///s.png' },
    ],
  },
  savedAt: 1,
};

const blankSeed: OutputState = {
  scores: { ...defaultScores },
  time: {},
  matchState: { ...defaultMatchState },
};

describe('isRestorableLiveMatch', () => {
  it('matches the dashboard: only a match underway is offered', () => {
    expect(isRestorableLiveMatch(undefined)).toBe(false);
    expect(
      isRestorableLiveMatch({
        scores: { ...defaultScores },
        time: {},
        matchState: { ...defaultMatchState },
        savedAt: 1,
      })
    ).toBe(false);
    expect(isRestorableLiveMatch(interruptedMatch)).toBe(true);
    expect(
      isRestorableLiveMatch({
        ...interruptedMatch,
        scores: { ...defaultScores },
        time: {},
        matchState: { ...defaultMatchState, previousMatchPhase: 'firstHalf' },
      })
    ).toBe(true);
  });
});

describe('launchHoldState', () => {
  it('blanks the screen and overlays but keeps the real score, never 0-0', () => {
    const held = launchHoldState(interruptedMatch);

    expect(held.matchState.displayScreen).toBe('none');
    expect(held.matchState.overlays).toEqual([]);
    expect(held.matchState.customScreenImageUrl).toBeUndefined();
    expect(held.scores).toEqual(interruptedMatch.scores);
    expect(held.time).toEqual(interruptedMatch.time);
  });
});

describe('OutputHold', () => {
  it('passes the live state through when nothing is held', () => {
    const hold = new OutputHold();
    expect(hold.isHeld()).toBe(false);
    expect(hold.view(blankSeed)).toBe(blankSeed);
  });

  it('shows the held state instead of the blank seed until released', () => {
    const hold = new OutputHold();
    const held = launchHoldState(interruptedMatch);
    hold.hold(held);

    expect(hold.view(blankSeed)).toBe(held);
    expect(hold.release()).toBe(true);
    expect(hold.view(blankSeed)).toBe(blankSeed);
    expect(hold.release()).toBe(false);
  });

  it('ignores the mount-time seed and repeats of its screen', () => {
    const hold = new OutputHold();
    hold.hold(launchHoldState(interruptedMatch));

    expect(hold.noteMatchState(blankSeed.matchState)).toBe(false);
    expect(hold.noteMatchState({ ...blankSeed.matchState, overlays: [] })).toBe(
      false
    );
    expect(hold.isHeld()).toBe(true);
  });

  it('releases once the operator puts a different screen on air', () => {
    const hold = new OutputHold();
    hold.hold(launchHoldState(interruptedMatch));
    hold.noteMatchState(blankSeed.matchState);

    const titleCard: MatchState = {
      ...blankSeed.matchState,
      displayScreen: 'matchTitle',
    };
    expect(hold.noteMatchState(titleCard)).toBe(true);
    expect(hold.isHeld()).toBe(false);
  });

  it('starts watching for a new seed each time it is held again', () => {
    const hold = new OutputHold();
    hold.hold(blankSeed);
    hold.noteMatchState({ ...blankSeed.matchState, displayScreen: 'custom' });
    hold.release();

    hold.hold(blankSeed);
    // The first state after the new hold is the new seed, not a change.
    expect(hold.noteMatchState(blankSeed.matchState)).toBe(false);
    expect(hold.isHeld()).toBe(true);
  });

  it('does nothing with match states while not held', () => {
    const hold = new OutputHold();
    expect(
      hold.noteMatchState({ ...blankSeed.matchState, displayScreen: 'none' })
    ).toBe(false);
  });
});
