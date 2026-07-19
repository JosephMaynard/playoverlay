import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { defaultMatchSettings } from '../../constants';
import ScoreboardLayout from '../Screens/ScoreboardLayout/ScoreboardLayout';

describe('ScoreboardLayout', () => {
  it('renders team names, scores, both clocks, and team colours', () => {
    const { container } = render(
      <ScoreboardLayout
        active
        matchSettings={{
          ...defaultMatchSettings,
          homeTeamNameFull: 'Winchester F.C.',
          awayTeamNameFull: 'Romsey United',
          homeTeamBackgroundColour: '#cc0000',
        }}
        scores={{ homeTeam: 7, awayTeam: 0, penalties: [] }}
        time={{ time: '90:00', additionalTime: 3 }}
      />
    );

    expect(container.firstChild).toHaveClass('ScoreboardLayout_active');
    expect(screen.getByText('Winchester F.C.')).toBeInTheDocument();
    expect(screen.getByText('Romsey United')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    // Both clocks are labelled so it's obvious which is which
    expect(screen.getByText('Time')).toBeInTheDocument();
    expect(screen.getByText('Match')).toBeInTheDocument();
    expect(screen.getByText(/90:00/)).toBeInTheDocument();
    expect(screen.getByText('+3')).toBeInTheDocument();

    const homeRow = screen.getByText('Winchester F.C.').closest(
      '.ScoreboardLayout_teamRow'
    ) as HTMLElement;
    expect(homeRow.style.backgroundColor).toBe('rgb(204, 0, 0)');
  });

  it('renders team logos when set and none when absent', () => {
    const { container, rerender } = render(
      <ScoreboardLayout
        active
        matchSettings={{
          ...defaultMatchSettings,
          homeTeamLogo: 'file:///logos/home.png',
        }}
        scores={{ homeTeam: 0, awayTeam: 0, penalties: [] }}
        time={{}}
      />
    );

    const images = container.querySelectorAll('img');
    expect(images).toHaveLength(1);
    expect(images[0].getAttribute('src')).toBe('file:///logos/home.png');

    rerender(
      <ScoreboardLayout
        active
        matchSettings={defaultMatchSettings}
        scores={{ homeTeam: 0, awayTeam: 0, penalties: [] }}
        time={{}}
      />
    );
    expect(container.querySelectorAll('img')).toHaveLength(0);
  });

  it('shows 0:00 for the match clock when no time is running and stays unmounted-looking before first activation', () => {
    const { container } = render(
      <ScoreboardLayout
        active={false}
        matchSettings={defaultMatchSettings}
        scores={{ homeTeam: 0, awayTeam: 0, penalties: [] }}
        time={{}}
      />
    );

    // Never activated: neither animation class applies, so the board stays
    // hidden by its base style instead of flashing its fade-out on mount
    expect(container.firstChild).not.toHaveClass('ScoreboardLayout_active');
    expect(container.firstChild).not.toHaveClass('ScoreboardLayout_hidden');
    expect(screen.getByText('0:00')).toBeInTheDocument();
  });
});
