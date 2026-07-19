import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { defaultMatchSettings } from '../../constants';
import ScoresLayout from '../Screens/ScoresLayout/ScoresLayout';

describe('ScoresLayout', () => {
  it('renders team abbreviations, score, running time, and additional time', () => {
    const { container } = render(
      <ScoresLayout
        active
        matchSettings={{
          ...defaultMatchSettings,
          homeTeamNameAbbreviated: 'TIG',
          awayTeamNameAbbreviated: 'BEA',
        }}
        scores={{ homeTeam: 2, awayTeam: 1, penalties: [] }}
        time={{ time: '78:12', additionalTime: 4 }}
      />
    );

    expect(container.firstChild).toHaveClass('ScoresLayout_active');
    expect(screen.getByText('TIG')).toBeInTheDocument();
    expect(screen.getByText('BEA')).toBeInTheDocument();
    expect(screen.getByText(/2 - 1/)).toBeInTheDocument();
    expect(screen.getByText('78:12')).toBeInTheDocument();
    expect(screen.getByText('+ 4')).toBeInTheDocument();
  });

  it('omits optional time blocks when no time is supplied', () => {
    const { container } = render(
      <ScoresLayout
        active={false}
        matchSettings={defaultMatchSettings}
        scores={{ homeTeam: 0, awayTeam: 0, penalties: [] }}
        time={{}}
      />
    );

    expect(container.firstChild).not.toHaveClass('ScoresLayout_active');
    expect(screen.queryByText(/:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\+/)).not.toBeInTheDocument();
  });

  it('renders no logo images when neither team has a logo set', () => {
    const { container } = render(
      <ScoresLayout
        active
        matchSettings={defaultMatchSettings}
        scores={{ homeTeam: 0, awayTeam: 0, penalties: [] }}
        time={{}}
      />
    );

    expect(container.querySelectorAll('img')).toHaveLength(0);
  });

  it('renders logo images for whichever teams have a logo set', () => {
    const { container, rerender } = render(
      <ScoresLayout
        active
        matchSettings={{
          ...defaultMatchSettings,
          homeTeamLogo: 'file:///tmp/images/home-logo.png',
        }}
        scores={{ homeTeam: 0, awayTeam: 0, penalties: [] }}
        time={{}}
      />
    );

    const singleLogoImages = container.querySelectorAll('img');
    expect(singleLogoImages).toHaveLength(1);
    expect(singleLogoImages[0]).toHaveAttribute(
      'src',
      'file:///tmp/images/home-logo.png'
    );
    // The reveal is content-sized via max-width, so a single active class
    // covers any logo count.
    expect(container.firstChild).toHaveClass('ScoresLayout_active');

    rerender(
      <ScoresLayout
        active
        matchSettings={{
          ...defaultMatchSettings,
          homeTeamLogo: 'file:///tmp/images/home-logo.png',
          awayTeamLogo: 'file:///tmp/images/away-logo.png',
        }}
        scores={{ homeTeam: 0, awayTeam: 0, penalties: [] }}
        time={{}}
      />
    );

    expect(container.querySelectorAll('img')).toHaveLength(2);
    expect(container.firstChild).toHaveClass('ScoresLayout_active');
  });
});
