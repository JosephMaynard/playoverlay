import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GOAL_BANNER_DURATION_MS,
  defaultMatchSettings,
  defaultMatchState,
} from '../../constants';
import { Goal, MatchState } from '../../types';
import GoalBannerLayout from '../Screens/GoalBannerLayout/GoalBannerLayout';
import EndScreenLayout from '../Screens/EndScreenLayout/EndScreenLayout';

const settings = {
  ...defaultMatchSettings,
  homeTeamNameFull: 'Rovers',
  awayTeamNameFull: 'United',
};

const goal: Goal = {
  id: 'g1',
  team: 'home',
  time: '46:30',
  matchPhase: 'firstHalf',
  scorer: 'Smith',
};

function banner(matchState: Partial<MatchState>, goals: Goal[] = [goal]) {
  return (
    <GoalBannerLayout
      goals={goals}
      matchSettings={settings}
      matchState={{ ...defaultMatchState, ...matchState }}
    />
  );
}

describe('GoalBannerLayout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-23T15:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the team, scorer and minute, then takes itself off air', () => {
    const { container } = render(
      banner({ goalBanner: { goalId: 'g1', shownAt: Date.now() } })
    );

    expect(container.firstChild).toHaveClass('GoalBannerLayout_active');
    expect(screen.getByText('Goal')).toBeInTheDocument();
    expect(screen.getByText('Rovers')).toBeInTheDocument();
    expect(screen.getByText('Smith')).toBeInTheDocument();
    expect(screen.getByText("45+2'")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(GOAL_BANNER_DURATION_MS);
    });
    expect(container.firstChild).not.toHaveClass('GoalBannerLayout_active');
  });

  it('does not replay a banner that was shown before this output connected', () => {
    const { container } = render(
      banner({
        goalBanner: {
          goalId: 'g1',
          shownAt: Date.now() - GOAL_BANNER_DURATION_MS - 1,
        },
      })
    );

    expect(container.firstChild).not.toHaveClass('GoalBannerLayout_active');
  });

  it('comes off air early when its goal disappears (e.g. undone)', () => {
    const shown = { goalBanner: { goalId: 'g1', shownAt: Date.now() } };
    const { container, rerender } = render(banner(shown));
    expect(container.firstChild).toHaveClass('GoalBannerLayout_active');

    rerender(banner(shown, []));
    expect(container.firstChild).not.toHaveClass('GoalBannerLayout_active');
  });

  it('stays off a blank output and a full-screen graphic', () => {
    const goalBanner = { goalId: 'g1', shownAt: Date.now() };
    const { container, rerender } = render(
      banner({ goalBanner, displayScreen: 'none' })
    );
    expect(container.firstChild).not.toHaveClass('GoalBannerLayout_active');

    rerender(banner({ goalBanner, displayScreen: 'custom' }));
    expect(container.firstChild).not.toHaveClass('GoalBannerLayout_active');
  });
});

describe('EndScreenLayout goal list', () => {
  it("lists each team's scorers with their minutes", () => {
    render(
      <EndScreenLayout
        active
        settings={settings}
        scores={{
          homeTeam: 3,
          awayTeam: 1,
          penalties: [],
          goals: [
            goal,
            { id: 'g2', team: 'away', time: '50:00', matchPhase: 'secondHalf' },
            {
              id: 'g3',
              team: 'home',
              time: '66:00',
              matchPhase: 'secondHalf',
              scorer: 'Smith',
            },
            {
              id: 'g4',
              team: 'home',
              time: '70:00',
              matchPhase: 'secondHalf',
              scorer: 'Jones',
            },
          ],
        }}
      />
    );

    expect(screen.getByText("Smith 45+2', 67'")).toBeInTheDocument();
    expect(screen.getByText("Jones 71'")).toBeInTheDocument();
    expect(screen.getByText("51'")).toBeInTheDocument();
  });
});
