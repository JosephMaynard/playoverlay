import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Goal, defaultMatchSettings, MatchSettings } from '@playoverlay/core';
import GoalsPanel, { Props } from '../Dashboard/GoalsPanel';

const withHomeLineup: MatchSettings = {
  ...defaultMatchSettings,
  homeTeamPlayers: [
    { name: 'Ali Smith', number: '9' },
    { name: 'Kai Moore', number: '12' },
  ],
};

const homeGoal: Goal = {
  id: 'g1',
  team: 'home',
  time: '22:10',
  matchPhase: 'firstHalf',
};
const awayGoal: Goal = { id: 'g2', team: 'away', scorer: 'Lee' };

function renderPanel(overrides: Partial<Props> = {}) {
  const props: Props = {
    goals: [homeGoal, awayGoal],
    matchSettings: withHomeLineup,
    onGoal: vi.fn(),
    onPickScorer: vi.fn(),
    setScorer: vi.fn(),
    removeGoal: vi.fn(),
    ...overrides,
  };
  render(<GoalsPanel {...props} />);
  return props;
}

describe('GoalsPanel', () => {
  it('has a goal key per team that reports the team scored', () => {
    const props = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Home Team scored' }));
    fireEvent.click(screen.getByRole('button', { name: 'Away Team scored' }));

    expect(props.onGoal).toHaveBeenNthCalledWith(1, 'home');
    expect(props.onGoal).toHaveBeenNthCalledWith(2, 'away');
  });

  it('lists goals latest first, with the minute', () => {
    renderPanel();

    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveAccessibleName('Away Team goal');
    expect(items[1]).toHaveAccessibleName("Home Team goal, 23'");
  });

  it('opens the scorer picker for a team with a line-up, and types for one without', () => {
    const props = renderPanel();

    fireEvent.click(
      screen.getByRole('button', { name: "Scorer (Home Team goal, 23')" })
    );
    expect(props.onPickScorer).toHaveBeenCalledWith(homeGoal);

    const field = screen.getByRole('textbox', { name: 'Scorer (Away Team goal)' });
    fireEvent.change(field, { target: { value: 'Jones' } });
    expect(props.setScorer).not.toHaveBeenCalled();
    fireEvent.blur(field);
    expect(props.setScorer).toHaveBeenCalledWith('g2', 'Jones');
  });

  it('shows a picked scorer with the shirt number', () => {
    renderPanel({
      goals: [{ ...homeGoal, scorer: 'Ali Smith', scorerNumber: '9' }],
    });

    expect(
      screen.getByRole('button', { name: "Scorer (Home Team goal, 23')" })
    ).toHaveTextContent('9 Ali Smith');
  });

  it('removes a goal from the log', () => {
    const props = renderPanel();

    fireEvent.click(
      screen.getByRole('button', { name: 'Remove goal: Away Team goal' })
    );
    expect(props.removeGoal).toHaveBeenCalledWith('g2');
  });
});
