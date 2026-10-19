import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SUBSTITUTION_BANNER_DURATION_MS,
  defaultMatchSettings,
  defaultMatchState,
  Goal,
  MatchState,
  Substitution,
} from '@playoverlay/core';
import SubstitutionBannerLayout from '../SubstitutionBannerLayout/SubstitutionBannerLayout';
import Screens from '../Screens';

const settings = {
  ...defaultMatchSettings,
  homeTeamNameFull: 'Rovers',
  awayTeamNameFull: 'United',
  awayTeamTextColour: '#ffffff',
  awayTeamBackgroundColour: '#0000aa',
};

const substitution: Substitution = {
  id: 's1',
  team: 'away',
  time: '62:10',
  matchPhase: 'secondHalf',
  off: { name: 'Rowe', number: '7' },
  on: { name: 'Jones', number: '14' },
};

function banner(
  matchState: Partial<MatchState>,
  substitutions: Substitution[] = [substitution]
) {
  return (
    <SubstitutionBannerLayout
      substitutions={substitutions}
      matchSettings={settings}
      matchState={{ ...defaultMatchState, ...matchState }}
    />
  );
}

describe('SubstitutionBannerLayout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-23T15:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the team, the players on and off and the minute, then takes itself off air', () => {
    const { container } = render(
      banner({
        substitutionBanner: { substitutionId: 's1', shownAt: Date.now() },
      })
    );

    expect(container.firstChild).toHaveClass('SubstitutionBannerLayout_active');
    expect(screen.getByText('Sub')).toBeInTheDocument();
    expect(screen.getByText('United')).toHaveStyle({
      color: '#ffffff',
      backgroundColor: '#0000aa',
    });
    expect(screen.getByText('14 Jones')).toBeInTheDocument();
    expect(screen.getByText('7 Rowe')).toBeInTheDocument();
    expect(screen.getByText("63'")).toBeInTheDocument();
    // The arrows are decoration beside the names, not part of them.
    expect(screen.getByText('▲')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('▼')).toHaveAttribute('aria-hidden', 'true');

    act(() => {
      vi.advanceTimersByTime(SUBSTITUTION_BANNER_DURATION_MS);
    });
    expect(container.firstChild).not.toHaveClass(
      'SubstitutionBannerLayout_active'
    );
  });

  it('does not replay a banner that was shown before this output connected', () => {
    const { container } = render(
      banner({
        substitutionBanner: {
          substitutionId: 's1',
          shownAt: Date.now() - SUBSTITUTION_BANNER_DURATION_MS - 1,
        },
      })
    );

    expect(container.firstChild).not.toHaveClass(
      'SubstitutionBannerLayout_active'
    );
  });

  it('comes off air early when its entry disappears (e.g. undone)', () => {
    const shown = {
      substitutionBanner: { substitutionId: 's1', shownAt: Date.now() },
    };
    const { container, rerender } = render(banner(shown));
    expect(container.firstChild).toHaveClass('SubstitutionBannerLayout_active');

    rerender(banner(shown, []));
    expect(container.firstChild).not.toHaveClass(
      'SubstitutionBannerLayout_active'
    );
  });

  it('shows no minute for a substitution made with no phase running', () => {
    render(
      banner(
        {
          substitutionBanner: { substitutionId: 's1', shownAt: Date.now() },
        },
        [{ ...substitution, time: undefined, matchPhase: undefined }]
      )
    );

    expect(screen.queryByText(/'/)).not.toBeInTheDocument();
    expect(screen.getByText('14 Jones')).toBeInTheDocument();
  });

  it('stays off a blank output and a full-screen graphic', () => {
    const substitutionBanner = { substitutionId: 's1', shownAt: Date.now() };
    const { container, rerender } = render(
      banner({ substitutionBanner, displayScreen: 'none' })
    );
    expect(container.firstChild).not.toHaveClass(
      'SubstitutionBannerLayout_active'
    );

    rerender(banner({ substitutionBanner, displayScreen: 'custom' }));
    expect(container.firstChild).not.toHaveClass(
      'SubstitutionBannerLayout_active'
    );
  });
});

describe('Screens with both banners', () => {
  const goal: Goal = {
    id: 'g1',
    team: 'home',
    time: '60:00',
    matchPhase: 'secondHalf',
  };
  const scores = {
    homeTeam: 1,
    awayTeam: 0,
    penalties: [],
    goals: [goal],
    substitutions: [substitution],
  };

  function screens(matchState: Partial<MatchState>) {
    return (
      <Screens
        matchSettings={settings}
        scores={scores}
        time={{ time: '63:00', matchPhase: 'secondHalf' }}
        matchState={{ ...defaultMatchState, ...matchState }}
      />
    );
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-23T15:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows only the banner put up most recently', () => {
    const now = Date.now();
    const { container, rerender } = render(
      screens({
        goalBanner: { goalId: 'g1', shownAt: now - 2000 },
        substitutionBanner: { substitutionId: 's1', shownAt: now },
      })
    );
    expect(container.querySelector('.GoalBannerLayout')).not.toHaveClass(
      'GoalBannerLayout_active'
    );
    expect(container.querySelector('.SubstitutionBannerLayout')).toHaveClass(
      'SubstitutionBannerLayout_active'
    );

    // The goal shown again from the log takes the spot back.
    rerender(
      screens({
        goalBanner: { goalId: 'g1', shownAt: now + 1000 },
        substitutionBanner: { substitutionId: 's1', shownAt: now },
      })
    );
    expect(container.querySelector('.GoalBannerLayout')).toHaveClass(
      'GoalBannerLayout_active'
    );
    expect(
      container.querySelector('.SubstitutionBannerLayout')
    ).not.toHaveClass('SubstitutionBannerLayout_active');
  });

  it('shows either banner on its own as before', () => {
    const { container, rerender } = render(
      screens({ goalBanner: { goalId: 'g1', shownAt: Date.now() } })
    );
    expect(container.querySelector('.GoalBannerLayout')).toHaveClass(
      'GoalBannerLayout_active'
    );

    rerender(
      screens({
        substitutionBanner: { substitutionId: 's1', shownAt: Date.now() },
      })
    );
    expect(container.querySelector('.SubstitutionBannerLayout')).toHaveClass(
      'SubstitutionBannerLayout_active'
    );
  });
});
