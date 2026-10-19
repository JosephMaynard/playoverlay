import { homeOrAway, Player, Substitution, Time } from './types';
import type { MatchSettings } from './zodSchemas';
import { formatEventMinute } from './goalLog';
import { isStarter, teamPlayers } from './lineup';

// Pure helpers for substitutions (see the Substitution type). The log is the
// only thing stored: who is on the pitch and who is on the bench are worked
// out from the squad and the log every time, so removing a wrong entry puts
// everyone back where they were with nothing else to undo.

// A new log entry for a substitution made now. Like createGoal, the clock
// and phase are only captured while a phase is running. The two players are
// stored by name and number alone: the bench flag describes the squad, not
// the swap, and a change to it later must not alter the log.
export function createSubstitution(
  id: string,
  team: homeOrAway,
  off: Player,
  on: Player,
  time: Time
): Substitution {
  const players = { off: playerIdentity(off), on: playerIdentity(on) };
  if (time.matchPhase === undefined || !time.time) {
    return { id, team, ...players };
  }
  return { id, team, time: time.time, matchPhase: time.matchPhase, ...players };
}

function playerIdentity({ name, number }: Player): Player {
  return number ? { name, number } : { name };
}

// Whether two entries are the same player: same name and shirt number, with
// no number and a blank one counting as equal (a number is optional on a
// stored player but '' in an editor draft).
export function samePlayer(a: Player, b: Player): boolean {
  return a.name === b.name && (a.number || '') === (b.number || '');
}

export interface LineupAfterSubstitutions {
  // The starting players in squad order, each substituted player replaced
  // in place by the player who came on, so the on-air list keeps its shape.
  onPitch: Player[];
  // The non-starters in squad order, minus those who have come on, with
  // those who have come off appended in the order they went off.
  bench: Player[];
}

// Applies a team's substitutions, in order, to its squad. An entry whose
// outgoing player is not on the pitch, or whose incoming player already is,
// cannot be applied (the squad was edited after it, or it was logged twice)
// and is skipped rather than producing a pitch with gaps or duplicates. A
// player who came on and later went off, or went off and later came back
// on, is handled by the same two moves as anyone else.
export function lineupAfterSubstitutions(
  matchSettings: MatchSettings,
  team: homeOrAway,
  substitutions: Substitution[]
): LineupAfterSubstitutions {
  const squad = teamPlayers(matchSettings, team);
  let onPitch = squad.filter(isStarter);
  let bench = squad.filter((player) => !isStarter(player));
  for (const substitution of substitutions) {
    if (substitution.team !== team) continue;
    const { off, on } = substitution;
    const index = onPitch.findIndex((player) => samePlayer(player, off));
    if (index === -1) continue;
    if (onPitch.some((player) => samePlayer(player, on))) continue;
    onPitch = onPitch.map((player, position) =>
      position === index ? on : player
    );
    bench = [...bench.filter((player) => !samePlayer(player, on)), off];
  }
  return { onPitch, bench };
}

export function playersOnPitch(
  matchSettings: MatchSettings,
  team: homeOrAway,
  substitutions: Substitution[]
): Player[] {
  return lineupAfterSubstitutions(matchSettings, team, substitutions).onPitch;
}

export function playersOnBench(
  matchSettings: MatchSettings,
  team: homeOrAway,
  substitutions: Substitution[]
): Player[] {
  return lineupAfterSubstitutions(matchSettings, team, substitutions).bench;
}

// The on-air minute for a substitution, counted like a goal's.
export function formatSubstitutionMinute(
  substitution: Substitution,
  matchSettings: MatchSettings
): string {
  return formatEventMinute(substitution, matchSettings);
}
