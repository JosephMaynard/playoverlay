import { describe, expect, it } from 'vitest';
import {
  createGoal,
  formatGoalMinute,
  goalsByScorer,
  removeLatestGoal,
  trimGoalsToScore,
} from '../goalLog';
import { Goal } from '../types';
import {
  appSettingsSchema,
  goalListSchema,
  matchStateSchema,
  scoresSchema,
} from '../zodSchemas';
import {
  defaultAppSettings,
  defaultMatchSettings,
  defaultMatchState,
} from '../constants';

const football = { ...defaultMatchSettings };

function goal(overrides: Partial<Goal> & Pick<Goal, 'id' | 'team'>): Goal {
  return { ...overrides };
}

describe('createGoal', () => {
  it('captures the clock and phase while a phase is running', () => {
    expect(
      createGoal('g1', 'home', { time: '22:10', matchPhase: 'firstHalf' })
    ).toEqual({
      id: 'g1',
      team: 'home',
      time: '22:10',
      matchPhase: 'firstHalf',
    });
  });

  it('records no minute with no phase running', () => {
    expect(createGoal('g1', 'away', { time: '45:00' })).toEqual({
      id: 'g1',
      team: 'away',
    });
  });
});

describe('formatGoalMinute', () => {
  it.each([
    ['0:10', 'firstHalf', "1'"],
    ['22:10', 'firstHalf', "23'"],
    ['44:59', 'firstHalf', "45'"],
    ['45:00', 'firstHalf', "45+1'"],
    ['46:30', 'firstHalf', "45+2'"],
    ['45:00', 'secondHalf', "46'"],
    ['89:59', 'secondHalf', "90'"],
    ['92:05', 'secondHalf', "90+3'"],
    ['104:00', 'extraTimeFirstHalf', "105'"],
    ['121:30', 'extraTimeSecondHalf', "120+2'"],
  ])('%s in %s is %s', (time, matchPhase, expected) => {
    expect(
      formatGoalMinute(
        goal({ id: 'g', team: 'home', time, matchPhase }),
        football
      )
    ).toBe(expected);
  });

  it('uses the configured period lengths in generic timer mode', () => {
    const quarters = {
      ...defaultMatchSettings,
      timerMode: 'generic' as const,
      periodCount: 4,
      halfLength: 10,
    };
    expect(
      formatGoalMinute(
        goal({ id: 'g', team: 'home', time: '10:30', matchPhase: 'period1' }),
        quarters
      )
    ).toBe("10+1'");
    expect(
      formatGoalMinute(
        goal({ id: 'g', team: 'home', time: '15:00', matchPhase: 'period2' }),
        quarters
      )
    ).toBe("16'");
  });

  it('is empty for a goal with no recorded minute', () => {
    expect(formatGoalMinute(goal({ id: 'g', team: 'home' }), football)).toBe(
      ''
    );
  });
});

describe('removeLatestGoal and trimGoalsToScore', () => {
  const log: Goal[] = [
    goal({ id: 'h1', team: 'home' }),
    goal({ id: 'a1', team: 'away' }),
    goal({ id: 'h2', team: 'home' }),
    goal({ id: 'a2', team: 'away' }),
  ];

  it("removes only that team's most recent goal", () => {
    expect(removeLatestGoal(log, 'home').map((g) => g.id)).toEqual([
      'h1',
      'a1',
      'a2',
    ]);
    expect(removeLatestGoal([], 'home')).toEqual([]);
  });

  it('trims a team down to its corrected score, latest first', () => {
    expect(trimGoalsToScore(log, 'away', 0).map((g) => g.id)).toEqual([
      'h1',
      'h2',
    ]);
    expect(trimGoalsToScore(log, 'home', 1).map((g) => g.id)).toEqual([
      'h1',
      'a1',
      'a2',
    ]);
    // A correction upwards leaves the log alone.
    expect(trimGoalsToScore(log, 'home', 5)).toBe(log);
  });
});

describe('goalsByScorer', () => {
  it('groups by scorer in first-scored order, with unnamed goals together', () => {
    const log: Goal[] = [
      goal({
        id: '1',
        team: 'home',
        time: '22:10',
        matchPhase: 'firstHalf',
        scorer: 'Smith',
      }),
      goal({
        id: '2',
        team: 'away',
        time: '30:00',
        matchPhase: 'firstHalf',
        scorer: 'Jones',
      }),
      goal({ id: '3', team: 'home', time: '40:00', matchPhase: 'firstHalf' }),
      goal({
        id: '4',
        team: 'home',
        time: '66:00',
        matchPhase: 'secondHalf',
        scorer: 'Smith',
      }),
      // No scorer and no minute: nothing to show for it.
      goal({ id: '5', team: 'home' }),
    ];

    expect(goalsByScorer(log, 'home', football)).toEqual([
      { scorer: 'Smith', minutes: ["23'", "67'"] },
      { scorer: undefined, minutes: ["41'"] },
    ]);
    expect(goalsByScorer(log, 'away', football)).toEqual([
      { scorer: 'Jones', minutes: ["31'"] },
    ]);
  });
});

describe('goal log schema', () => {
  it('drops malformed entries and trims and bounds the scorer', () => {
    const parsed = goalListSchema.parse([
      { id: 'g1', team: 'home', scorer: '  Smith  ' },
      { id: 'g2', team: 'sideways' },
      'not a goal',
      { id: 'g3', team: 'away', scorer: 'x'.repeat(100) },
      { id: 'g4', team: 'away', scorer: '   ' },
    ]);

    expect(parsed.map((entry) => entry.id)).toEqual(['g1', 'g3', 'g4']);
    expect(parsed[0].scorer).toBe('Smith');
    expect(parsed[1].scorer).toHaveLength(40);
    expect(parsed[2].scorer).toBeUndefined();
  });

  it('leaves scores from before the goal log without one', () => {
    expect(
      scoresSchema.parse({ homeTeam: 1, awayTeam: 0, penalties: [] })
    ).toEqual({ homeTeam: 1, awayTeam: 0, penalties: [] });
  });

  // The main process validates every renderer update with these schemas,
  // and zod strips keys it doesn't know, so the goal-log fields must be
  // declared or they'd never reach the outputs.
  it('passes the goal banner and its setting through main-process validation', () => {
    const goalBanner = { goalId: 'g1', shownAt: 1_700_000_000_000 };
    expect(
      matchStateSchema.parse({ ...defaultMatchState, goalBanner }).goalBanner
    ).toEqual(goalBanner);
    expect(
      appSettingsSchema.parse({
        ...defaultAppSettings,
        showGoalBannerAutomatically: true,
      }).showGoalBannerAutomatically
    ).toBe(true);
    expect(
      scoresSchema.parse({
        homeTeam: 1,
        awayTeam: 0,
        penalties: [],
        goals: [
          { id: 'g1', team: 'home', time: '1:00', matchPhase: 'firstHalf' },
        ],
      }).goals
    ).toHaveLength(1);
  });
});
