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
});
