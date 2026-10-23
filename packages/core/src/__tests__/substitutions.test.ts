import { describe, expect, it } from 'vitest';
import { defaultMatchSettings } from '../constants';
import {
  createSubstitution,
  findPlayerRename,
  formatSubstitutionMinute,
  lineupAfterSubstitutions,
  playersOnBench,
  playersOnPitch,
  renamePlayerInScores,
  samePlayer,
} from '../substitutions';
import { Player, Substitution } from '../types';

const keeper: Player = { name: 'Sam Keeper', number: '1' };
const smith: Player = { name: 'Ali Smith', number: '9' };
const bloggs: Player = { name: 'Jo Bloggs', number: '10' };
const lee: Player = { name: 'Kim Lee', number: '14', starting: false };
const rowe: Player = { name: 'Pat Rowe', number: '15', starting: false };
const doe: Player = { name: 'Max Doe', starting: false };

const settings = {
  ...defaultMatchSettings,
  homeTeamPlayers: [keeper, smith, bloggs, lee, rowe, doe],
  awayTeamPlayers: [
    { name: 'Away One' },
    { name: 'Away Two', starting: false },
  ],
};

function sub(
  id: string,
  off: Player,
  on: Player,
  team: 'home' | 'away' = 'home'
): Substitution {
  return { id, team, off, on };
}

describe('createSubstitution', () => {
  it('captures the clock and phase while a phase is running, and the players by name and number', () => {
    expect(
      createSubstitution('s1', 'home', smith, lee, {
        time: '62:10',
        matchPhase: 'secondHalf',
      })
    ).toEqual({
      id: 's1',
      team: 'home',
      time: '62:10',
      matchPhase: 'secondHalf',
      off: { name: 'Ali Smith', number: '9' },
      on: { name: 'Kim Lee', number: '14' },
    });
  });

  it('records no minute with no phase running, and no number for a player without one', () => {
    expect(
      createSubstitution('s1', 'away', smith, doe, { time: '00:00' })
    ).toEqual({
      id: 's1',
      team: 'away',
      off: { name: 'Ali Smith', number: '9' },
      on: { name: 'Max Doe' },
    });
  });
});

describe('samePlayer', () => {
  it('matches on name and number, treating no number and a blank one alike', () => {
    expect(samePlayer(smith, { name: 'Ali Smith', number: '9' })).toBe(true);
    expect(samePlayer(smith, { name: 'Ali Smith', number: '10' })).toBe(false);
    expect(samePlayer(smith, { name: 'Ali Smyth', number: '9' })).toBe(false);
    expect(
      samePlayer({ name: 'Max Doe' }, { name: 'Max Doe', number: '' })
    ).toBe(true);
    expect(samePlayer(doe, { name: 'Max Doe' })).toBe(true);
  });
});

describe('playersOnPitch and playersOnBench', () => {
  it('starts with the starters on the pitch and the rest on the bench, in squad order', () => {
    expect(playersOnPitch(settings, 'home', [])).toEqual([
      keeper,
      smith,
      bloggs,
    ]);
    expect(playersOnBench(settings, 'home', [])).toEqual([lee, rowe, doe]);
    expect(playersOnPitch(settings, 'away', [])).toEqual([
      { name: 'Away One' },
    ]);
  });

  it('replaces a substituted player in place and moves them to the end of the bench', () => {
    const subs = [sub('s1', smith, lee)];
    expect(playersOnPitch(settings, 'home', subs)).toEqual([
      keeper,
      lee,
      bloggs,
    ]);
    expect(playersOnBench(settings, 'home', subs)).toEqual([rowe, doe, smith]);
  });

  it('applies substitutions in order, including a player who came on and later went off', () => {
    const subs = [
      sub('s1', smith, lee),
      sub('s2', lee, rowe),
      sub('s3', bloggs, doe),
    ];
    expect(playersOnPitch(settings, 'home', subs)).toEqual([keeper, rowe, doe]);
    expect(playersOnBench(settings, 'home', subs)).toEqual([
      smith,
      lee,
      bloggs,
    ]);
  });

  it('lets a player who went off come back on (rolling substitutions)', () => {
    const subs = [sub('s1', smith, lee), sub('s2', lee, smith)];
    expect(playersOnPitch(settings, 'home', subs)).toEqual([
      keeper,
      smith,
      bloggs,
    ]);
    expect(playersOnBench(settings, 'home', subs)).toEqual([rowe, doe, lee]);
  });

  it("ignores the other team's substitutions", () => {
    const subs = [
      sub('s1', { name: 'Away One' }, { name: 'Away Two' }, 'away'),
    ];
    expect(playersOnPitch(settings, 'home', subs)).toEqual([
      keeper,
      smith,
      bloggs,
    ]);
    expect(playersOnPitch(settings, 'away', subs)).toEqual([
      { name: 'Away Two' },
    ]);
    expect(playersOnBench(settings, 'away', subs)).toEqual([
      { name: 'Away One' },
    ]);
  });

  it('skips an entry that cannot be applied rather than leaving a gap or a duplicate', () => {
    // The outgoing player is already off; the incoming player is already on.
    const subs = [
      sub('s1', smith, lee),
      sub('s2', smith, rowe),
      sub('s3', bloggs, lee),
    ];
    expect(lineupAfterSubstitutions(settings, 'home', subs)).toEqual({
      onPitch: [keeper, lee, bloggs],
      bench: [rowe, doe, smith],
    });
  });

  it('shows a squad with no players as empty on both lists', () => {
    expect(lineupAfterSubstitutions(defaultMatchSettings, 'home', [])).toEqual({
      onPitch: [],
      bench: [],
    });
  });
});

describe('formatSubstitutionMinute', () => {
  it('counts the minute like a goal, stoppage time included', () => {
    const base = sub('s1', smith, lee);
    expect(
      formatSubstitutionMinute(
        { ...base, time: '62:10', matchPhase: 'secondHalf' },
        defaultMatchSettings
      )
    ).toBe("63'");
    expect(
      formatSubstitutionMinute(
        { ...base, time: '46:30', matchPhase: 'firstHalf' },
        defaultMatchSettings
      )
    ).toBe("45+2'");
    expect(formatSubstitutionMinute(base, defaultMatchSettings)).toBe('');
  });
});

describe('findPlayerRename', () => {
  it('finds the one player whose name or number changed', () => {
    const renamed = { ...lee, name: 'Kim Leigh' };
    expect(findPlayerRename([smith, lee], [smith, renamed])).toEqual({
      from: lee,
      to: renamed,
    });
  });

  it('ignores the Starts box, changes in length, and several changes', () => {
    expect(
      findPlayerRename([smith, lee], [smith, { ...lee, starting: true }])
    ).toBeUndefined();
    expect(findPlayerRename([smith, lee], [smith])).toBeUndefined();
    expect(findPlayerRename([smith], undefined)).toBeUndefined();
    expect(
      findPlayerRename([smith, lee], [{ name: 'A' }, { name: 'B' }])
    ).toBeUndefined();
  });

  it('ignores a rename of a player who shares their name and number', () => {
    const sam = { name: 'Sam' };
    expect(
      findPlayerRename([sam, smith, sam], [{ name: 'Sam Reid' }, smith, sam])
    ).toBeUndefined();
  });
});

describe('renamePlayerInScores', () => {
  it('renames the player in both directions of the log and drops a cleared number', () => {
    const scores = {
      homeTeam: 1,
      awayTeam: 0,
      penalties: [],
      goals: [
        {
          id: 'g1',
          team: 'home' as const,
          scorer: 'Kim Lee',
          scorerNumber: '14',
        },
      ],
      substitutions: [
        {
          id: 's1',
          team: 'home' as const,
          off: smith,
          on: { name: 'Kim Lee', number: '14' },
        },
        {
          id: 's2',
          team: 'home' as const,
          off: { name: 'Kim Lee', number: '14' },
          on: smith,
        },
      ],
    };
    const result = renamePlayerInScores(scores, 'home', {
      from: lee,
      to: { name: 'Kim Leigh', starting: false },
    });
    expect(result.substitutions?.[0].on).toEqual({ name: 'Kim Leigh' });
    expect(result.substitutions?.[1].off).toEqual({ name: 'Kim Leigh' });
    expect(result.goals?.[0]).toEqual({
      id: 'g1',
      team: 'home',
      scorer: 'Kim Leigh',
    });
  });
});
