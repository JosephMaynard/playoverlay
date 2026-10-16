import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { defaultMatchSettings, Goal, MatchSettings } from '@playoverlay/core';
import GoalLogPanel from '../Dashboard/GoalLogPanel';

const goal: Goal = {
  id: 'g1',
  team: 'home',
  time: '22:10',
  matchPhase: 'firstHalf',
};

const withLineup: MatchSettings = {
  ...defaultMatchSettings,
  homeTeamPlayers: [
    { name: 'Sam Keeper', number: '1' },
    { name: 'Ali Smith', number: '9' },
    { name: 'Jo Bloggs' },
  ],
};

function renderPanel(matchSettings: MatchSettings, goals: Goal[] = [goal]) {
  const setScorer = vi.fn();
  render(
    <GoalLogPanel
      goals={goals}
      matchSettings={matchSettings}
      showBannerAutomatically
      setShowBannerAutomatically={vi.fn()}
      setScorer={setScorer}
      showBanner={vi.fn()}
      removeGoal={vi.fn()}
    />
  );
  // The panel starts collapsed, like the dashboard's.
  fireEvent.click(screen.getByRole('button', { name: 'Goals' }));
  return { setScorer };
}

const scorerName = "Scorer (Home Team goal, 23')";

describe('GoalLogPanel scorer picker', () => {
  it('is the plain text field, with no list, when the team has no line-up', () => {
    const { setScorer } = renderPanel(defaultMatchSettings);

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    const field = screen.getByRole('textbox', { name: scorerName });
    fireEvent.change(field, { target: { value: 'Smith' } });
    fireEvent.blur(field);
    expect(setScorer).toHaveBeenCalledWith('g1', 'Smith');
  });

  it("offers the scoring team's players and records a pick with the shirt number", async () => {
    const { setScorer } = renderPanel(withLineup);
    const field = screen.getByRole('combobox', { name: scorerName });

    fireEvent.focus(field);
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(
      screen.getByText('Not in the line-up? Just type a name.')
    ).toBeInTheDocument();

    fireEvent.change(field, { target: { value: 'smi' } });
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('9Ali Smith');

    fireEvent.mouseDown(options[0]);
    expect(setScorer).toHaveBeenCalledTimes(1);
    expect(setScorer).toHaveBeenCalledWith('g1', 'Ali Smith', '9');
  });

  it('filters by shirt number too, and picks with the keyboard', async () => {
    const { setScorer } = renderPanel(withLineup);
    const field = screen.getByRole('combobox', { name: scorerName });

    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: '1' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option')).toHaveTextContent('Sam Keeper');

    fireEvent.keyDown(field, { key: 'ArrowDown' });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(setScorer).toHaveBeenCalledTimes(1);
    expect(setScorer).toHaveBeenCalledWith('g1', 'Sam Keeper', '1');
  });

  it('records a player without a number as having none', async () => {
    const { setScorer } = renderPanel(withLineup);
    const field = screen.getByRole('combobox', { name: scorerName });

    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: 'jo' } });
    fireEvent.mouseDown(screen.getByRole('option'));
    expect(setScorer).toHaveBeenCalledWith('g1', 'Jo Bloggs', '');
  });

  it('still takes a name that is not in the line-up, on Enter or on blur', () => {
    const { setScorer } = renderPanel(withLineup, [
      goal,
      { id: 'g2', team: 'home' },
    ]);
    const [first, second] = screen.getAllByRole('combobox');

    fireEvent.focus(first);
    fireEvent.change(first, { target: { value: 'Own goal' } });
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    fireEvent.keyDown(first, { key: 'Enter' });
    expect(setScorer).toHaveBeenLastCalledWith('g1', 'Own goal');

    fireEvent.focus(second);
    fireEvent.change(second, { target: { value: 'Trialist' } });
    fireEvent.blur(second);
    expect(setScorer).toHaveBeenLastCalledWith('g2', 'Trialist');
    expect(setScorer).toHaveBeenCalledTimes(2);
  });

  it('records nothing for a field that was only looked at, or left with Escape', () => {
    const { setScorer } = renderPanel(withLineup);
    const field = screen.getByRole('combobox', { name: scorerName });

    fireEvent.focus(field);
    fireEvent.blur(field);
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: 'Smyth' } });
    fireEvent.keyDown(field, { key: 'Escape' });
    fireEvent.blur(field);
    expect(setScorer).not.toHaveBeenCalled();
  });

  it("shows a picked scorer's shirt number beside the field", () => {
    renderPanel(withLineup, [
      { ...goal, scorer: 'Ali Smith', scorerNumber: '9' },
    ]);

    expect(screen.getByRole('combobox', { name: scorerName })).toHaveValue(
      'Ali Smith'
    );
    expect(screen.getByText('9')).toBeInTheDocument();
  });
});
