import { Goal, homeOrAway, Player } from './types';
import type { MatchSettings } from './zodSchemas';
import {
  MAX_PLAYER_NAME_LENGTH,
  MAX_PLAYER_NUMBER_LENGTH,
  MAX_PLAYERS_PER_TEAM,
} from './constants';

// Pure helpers for team line-ups: tidying what the operator types or pastes,
// reading a team's players out of the match settings, and turning a picked
// player into a goal's scorer. The schemas use the same tidying, so a list
// typed in the dashboard and one read back from config.json agree.

// A name as stored and shown on air: trimmed and bounded like the scorer,
// since a player's name becomes the scorer when picked in the goal log.
export function normalisePlayerName(name: string): string {
  return name.trim().slice(0, MAX_PLAYER_NAME_LENGTH).trim();
}

// A shirt number as stored: trimmed, and undefined when blank. One that is
// too long is dropped rather than cut short, because "1234" cut to "123"
// would put the wrong number on air.
export function normalisePlayerNumber(
  number: string | undefined
): string | undefined {
  const trimmed = number?.trim();
  if (!trimmed || trimmed.length > MAX_PLAYER_NUMBER_LENGTH) return undefined;
  return trimmed;
}

// A list as stored: every name and number tidied, players without a name
// dropped, and the list capped at MAX_PLAYERS_PER_TEAM.
export function normalisePlayers(players: Player[]): Player[] {
  return players
    .map((player) => {
      const name = normalisePlayerName(player.name);
      const number = normalisePlayerNumber(player.number);
      return number ? { name, number } : { name };
    })
    .filter((player) => player.name !== '')
    .slice(0, MAX_PLAYERS_PER_TEAM);
}

// A leading shirt number on a pasted line, with an optional "#" before it
// and an optional ".", ")" or ":" or a spaced "-" after it, so "9 Ali
// Smith", "#9 Ali Smith", "9. Ali Smith" and "9 - Ali Smith" all parse, as
// does a tab-separated line copied from a spreadsheet.
const LEADING_TOKEN = /^#?([0-9A-Za-z]{1,3})[.):]?(?:\s+-\s+|\s+)(\S.*)$/;

// One player per line, as a club secretary's team sheet usually arrives.
// Blank lines are skipped. A leading token of up to three characters becomes
// the shirt number when it contains a digit ("9", "00", "1a"), or when it is
// all capitals and the name after it is not ("GK Ali Smith"). That second
// rule keeps short first names ("Al Smith", "Ed Jones") and lists typed in
// capitals ("ED JONES") as names.
export function parsePlayerList(text: string): Player[] {
  const players = text.split(/\r?\n/).map((rawLine): Player => {
    const line = rawLine.trim();
    const match = LEADING_TOKEN.exec(line);
    if (match) {
      const [, token, rest] = match;
      const isNumber =
        /\d/.test(token) || (/^[A-Z]+$/.test(token) && /[a-z]/.test(rest));
      if (isNumber) return { name: rest, number: token };
    }
    return { name: line };
  });
  return normalisePlayers(players);
}

// A team's players, empty when none have been entered.
export function teamPlayers(
  matchSettings: MatchSettings,
  team: homeOrAway
): Player[] {
  return (
    (team === 'home'
      ? matchSettings.homeTeamPlayers
      : matchSettings.awayTeamPlayers) ?? []
  );
}

// Whether the team has a line-up to show: decides whether its line-up
// screen is offered at all.
export function hasLineup(
  matchSettings: MatchSettings,
  team: homeOrAway
): boolean {
  return teamPlayers(matchSettings, team).length > 0;
}

// The goal-log fields for a scorer picked from the line-up.
export function scorerFromPlayer(
  player: Player
): Pick<Goal, 'scorer' | 'scorerNumber'> {
  return { scorer: player.name, scorerNumber: player.number };
}

// The scorer as the goal banner shows it: "9 Smith" when the scorer was
// picked with a shirt number, otherwise just the name (or '' for none).
export function formatScorer(goal: Pick<Goal, 'scorer' | 'scorerNumber'>) {
  if (!goal.scorer) return '';
  return goal.scorerNumber
    ? `${goal.scorerNumber} ${goal.scorer}`
    : goal.scorer;
}
