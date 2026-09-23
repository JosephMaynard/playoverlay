import { Goal, homeOrAway, Time } from './types';
import { MatchSettings } from './zodSchemas';
import { getPhaseById, parseTimeToSeconds } from './utils';

// Pure helpers for the goal log (see the Goal type). Kept together so the
// dashboard, the on-air banner and the end screen all agree on what a goal's
// minute is and how the log follows the score.

// A new log entry for a goal scored now. The clock and phase are only
// captured while a phase is running: a goal entered at half-time or before
// kick-off has no meaningful minute.
export function createGoal(id: string, team: homeOrAway, time: Time): Goal {
  if (time.matchPhase === undefined || !time.time) {
    return { id, team };
  }
  return { id, team, time: time.time, matchPhase: time.matchPhase };
}

// The on-air minute for a goal. Football counts the minute in progress
// (22:10 on the clock is the 23rd minute), and a goal after a phase's
// scheduled end is shown as stoppage time: 46:30 in the first half is
// "45+2'". Empty when the goal was recorded with no phase running.
export function formatGoalMinute(
  goal: Goal,
  matchSettings: MatchSettings
): string {
  if (!goal.time) return '';
  const minute = Math.floor(parseTimeToSeconds(goal.time) / 60) + 1;
  const phase = getPhaseById(matchSettings, goal.matchPhase);
  if (phase && minute > phase.end) {
    return `${phase.end}+${minute - phase.end}'`;
  }
  return `${minute}'`;
}

// The log with that team's most recent goal removed (a goal taken off the
// score from the phone or the score editor). Unchanged if the team has none.
export function removeLatestGoal(goals: Goal[], team: homeOrAway): Goal[] {
  const index = goals.map((goal) => goal.team).lastIndexOf(team);
  if (index === -1) return goals;
  return [...goals.slice(0, index), ...goals.slice(index + 1)];
}

// Keeps the log consistent with a manually corrected score: a team can't
// have more logged goals than its score, so the most recent extras go. A
// correction upwards logs nothing (there is no minute to record).
export function trimGoalsToScore(
  goals: Goal[],
  team: homeOrAway,
  score: number
): Goal[] {
  let trimmed = goals;
  while (trimmed.filter((goal) => goal.team === team).length > score) {
    trimmed = removeLatestGoal(trimmed, team);
  }
  return trimmed;
}

export interface ScorerLine {
  // Undefined for goals whose scorer hasn't been entered.
  scorer?: string;
  minutes: string[];
}

// One line per scorer for the end screen ("Smith 23', 67'"), in the order
// each scorer first scored. Goals without a scorer share one line of
// minutes, and goals with neither scorer nor minute are left out.
export function goalsByScorer(
  goals: Goal[],
  team: homeOrAway,
  matchSettings: MatchSettings
): ScorerLine[] {
  const lines: ScorerLine[] = [];
  for (const goal of goals) {
    if (goal.team !== team) continue;
    const minute = formatGoalMinute(goal, matchSettings);
    if (!goal.scorer && !minute) continue;
    let line = lines.find((existing) => existing.scorer === goal.scorer);
    if (!line) {
      line = { scorer: goal.scorer, minutes: [] };
      lines.push(line);
    }
    if (minute) line.minutes.push(minute);
  }
  return lines;
}
