import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Goal, defaultMatchSettings, MatchSettings } from '@playoverlay/core';
import ScorerModal, { Props } from '../Dashboard/ScorerModal';

const matchSettings: MatchSettings = {
  ...defaultMatchSettings,
  homeTeamNameFull: 'Tigers',
  homeTeamPlayers: [
    { name: 'Ali Smith', number: '9' },
    { name: 'Kai Moore', number: '12', starting: false } as never,
  ],
};
const goal: Goal = { id: 'g1', team: 'home', time: '63:40', matchPhase: 'secondHalf' };

function renderModal(overrides: Partial<Props> = {}) {
  const props: Props = {
    goal,
    isNew: true,
    matchSettings,
    scores: { homeTeam: 3, awayTeam: 1, penalties: [], goals: [goal] },
    onPick: vi.fn(),
    onNoScorer: vi.fn(),
    onOwnGoal: vi.fn(),
    onNotAGoal: vi.fn(),
    ...overrides,
  };
  render(<ScorerModal {...props} />);
  return props;
}

describe('ScorerModal', () => {
  it('names the team and minute, and lists the pitch before the bench', async () => {
    renderModal();
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByRole('heading', { name: 'Tigers' })).toBeInTheDocument();
    expect(within(dialog).getByText("64'")).toBeInTheDocument();
    const headings = within(dialog).getAllByRole('heading', { level: 4 });
    expect(headings.map((heading) => heading.textContent)).toEqual([
      'On the pitch',
      'Bench',
    ]);
  });

  it('reports the picked player', async () => {
    const props = renderModal();
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: /Kai Moore/ }));
    expect(props.onPick).toHaveBeenCalledWith({
      name: 'Kai Moore',
      number: '12',
      starting: false,
    });
  });

  it('offers no scorer, own goal and, for a fresh goal, not a goal', async () => {
    const props = renderModal();
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: 'No scorer' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Own goal' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Not a goal' }));
    expect(props.onNoScorer).toHaveBeenCalledTimes(1);
    expect(props.onOwnGoal).toHaveBeenCalledTimes(1);
    expect(props.onNotAGoal).toHaveBeenCalledTimes(1);
  });

  it('hides "not a goal" and the hint when changing a scorer later', async () => {
    renderModal({ isNew: false });
    const dialog = await screen.findByRole('dialog');

    expect(
      within(dialog).queryByRole('button', { name: 'Not a goal' })
    ).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/already updated/)).not.toBeInTheDocument();
  });
});
