import { describe, expect, it } from 'vitest';
import {
  defaultMatchSettings,
  MAX_PLAYER_NAME_LENGTH,
  MAX_PLAYERS_PER_TEAM,
} from '../constants';
import {
  formatScorer,
  hasLineup,
  isScreenOffered,
  normalisePlayers,
  parsePlayerList,
  reconcileLineupScreen,
  scorerFromPlayer,
  teamPlayers,
} from '../lineup';

describe('parsePlayerList', () => {
  it('reads one player per line, with an optional leading shirt number', () => {
    expect(parsePlayerList('1 Sam Keeper\n9 Ali Smith\nJo Bloggs')).toEqual([
      { name: 'Sam Keeper', number: '1' },
      { name: 'Ali Smith', number: '9' },
      { name: 'Jo Bloggs' },
    ]);
  });

  it('accepts the usual ways of writing the number', () => {
    expect(
      parsePlayerList(
        '#4 Kim Lee\n5. Pat Jones\n6) Ray Wu\n7 - Max Doe\n8\tLou Hart\n00 Ben Ode'
      )
    ).toEqual([
      { name: 'Kim Lee', number: '4' },
      { name: 'Pat Jones', number: '5' },
      { name: 'Ray Wu', number: '6' },
      { name: 'Max Doe', number: '7' },
      { name: 'Lou Hart', number: '8' },
      { name: 'Ben Ode', number: '00' },
    ]);
  });

  it('takes a capitalised code such as GK as the number', () => {
    expect(parsePlayerList('GK Sam Keeper')).toEqual([
      { name: 'Sam Keeper', number: 'GK' },
    ]);
  });

  it('keeps short first names and capitalised lists as names', () => {
    expect(parsePlayerList('Al Smith\nEd Jones\nED JONES')).toEqual([
      { name: 'Al Smith' },
      { name: 'Ed Jones' },
      { name: 'ED JONES' },
    ]);
  });

  it('skips blank lines and trims every line, with Windows line endings too', () => {
    expect(
      parsePlayerList('\r\n  9   Ali Smith  \r\n\r\n   \r\nJo Bloggs\r\n')
    ).toEqual([{ name: 'Ali Smith', number: '9' }, { name: 'Jo Bloggs' }]);
  });

  it('keeps a number on its own as a name rather than losing the line', () => {
    expect(parsePlayerList('9')).toEqual([{ name: '9' }]);
  });

  it('bounds long names and caps the list', () => {
    const longName = 'x'.repeat(MAX_PLAYER_NAME_LENGTH + 10);
    expect(parsePlayerList(longName)[0].name).toHaveLength(
      MAX_PLAYER_NAME_LENGTH
    );

    const lines = Array.from(
      { length: MAX_PLAYERS_PER_TEAM + 5 },
      (_, index) => `${index + 1} Player ${index + 1}`
    ).join('\n');
    const players = parsePlayerList(lines);
    expect(players).toHaveLength(MAX_PLAYERS_PER_TEAM);
    expect(players[MAX_PLAYERS_PER_TEAM - 1]).toEqual({
      name: `Player ${MAX_PLAYERS_PER_TEAM}`,
      number: String(MAX_PLAYERS_PER_TEAM),
    });
  });

  it('returns nothing for empty text', () => {
    expect(parsePlayerList('')).toEqual([]);
    expect(parsePlayerList('\n \n')).toEqual([]);
  });
});

describe('normalisePlayers', () => {
  it('trims, drops nameless players and blank numbers, and caps the list', () => {
    expect(
      normalisePlayers([
        { name: '  Ali Smith ', number: ' 9 ' },
        { name: '   ', number: '4' },
        { name: 'Jo Bloggs', number: '  ' },
        { name: 'Kim Lee', number: '1234' },
      ])
    ).toEqual([
      { name: 'Ali Smith', number: '9' },
      { name: 'Jo Bloggs' },
      { name: 'Kim Lee' },
    ]);

    const many = Array.from({ length: MAX_PLAYERS_PER_TEAM + 1 }, () => ({
      name: 'Player',
    }));
    expect(normalisePlayers(many)).toHaveLength(MAX_PLAYERS_PER_TEAM);
  });
});

describe('teamPlayers and hasLineup', () => {
  it('reads the chosen team, treating unset as no players', () => {
    const settings = {
      ...defaultMatchSettings,
      homeTeamPlayers: [{ name: 'Ali Smith', number: '9' }],
    };
    expect(teamPlayers(settings, 'home')).toEqual([
      { name: 'Ali Smith', number: '9' },
    ]);
    expect(teamPlayers(settings, 'away')).toEqual([]);
    expect(hasLineup(settings, 'home')).toBe(true);
    expect(hasLineup(settings, 'away')).toBe(false);
    expect(
      hasLineup({ ...defaultMatchSettings, awayTeamPlayers: [] }, 'away')
    ).toBe(false);
  });
});

describe('scorerFromPlayer and formatScorer', () => {
  it('carries the shirt number into the goal and onto the banner', () => {
    const scorer = scorerFromPlayer({ name: 'Smith', number: '9' });
    expect(scorer).toEqual({ scorer: 'Smith', scorerNumber: '9' });
    expect(formatScorer(scorer)).toBe('9 Smith');
  });

  it('shows just the name without a number, and nothing without a scorer', () => {
    expect(formatScorer(scorerFromPlayer({ name: 'Smith' }))).toBe('Smith');
    expect(formatScorer({ scorer: 'Jones' })).toBe('Jones');
    expect(formatScorer({})).toBe('');
    expect(formatScorer({ scorerNumber: '9' })).toBe('');
  });
});

describe('isScreenOffered and reconcileLineupScreen', () => {
  const withHome = {
    ...defaultMatchSettings,
    homeTeamPlayers: [{ name: 'Ali Smith' }],
  };

  it("offers a line-up screen only for a team with players, and penalties only while they're on", () => {
    expect(isScreenOffered('homeLineup', withHome)).toBe(true);
    expect(isScreenOffered('awayLineup', withHome)).toBe(false);
    expect(isScreenOffered('scoreBug', defaultMatchSettings)).toBe(true);
    expect(isScreenOffered('penalties', defaultMatchSettings)).toBe(true);
    expect(
      isScreenOffered('penalties', {
        ...defaultMatchSettings,
        hasPenalties: false,
      })
    ).toBe(false);
  });

  it('takes a line-up screen off air once its team has no players', () => {
    expect(reconcileLineupScreen('homeLineup', withHome)).toBeNull();
    expect(reconcileLineupScreen('awayLineup', withHome)).toEqual({
      displayScreen: 'scoreBug',
    });
    expect(
      reconcileLineupScreen('matchTitle', defaultMatchSettings)
    ).toBeNull();
  });
});
