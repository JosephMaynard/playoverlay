import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  defaultMatchSettings,
  MatchSettings,
  Substitution,
} from '@playoverlay/core';
import SubstitutionsPanel from '../Dashboard/SubstitutionsPanel';
import SubstitutionModal from '../Dashboard/SubstitutionModal';

const matchSettings: MatchSettings = {
  ...defaultMatchSettings,
  homeTeamNameFull: 'Tigers',
  homeTeamPlayers: [
    { name: 'Ali Smith', number: '9' },
    { name: 'Jake Rowe', number: '7' },
    { name: 'Kai Moore', number: '12', starting: false },
    { name: 'Ed Jones', number: '14', starting: false },
  ],
};
const made: Substitution = {
  id: 's1',
  team: 'home',
  time: '58:20',
  matchPhase: 'secondHalf',
  off: { name: 'Jake Rowe', number: '7' },
  on: { name: 'Ed Jones', number: '14' },
};

describe('SubstitutionsPanel', () => {
  it('offers a key per team with a line-up and lists the changes made', () => {
    const onSubstitute = vi.fn();
    const removeSubstitution = vi.fn();
    render(
      <SubstitutionsPanel
        substitutions={[made]}
        matchSettings={matchSettings}
        onSubstitute={onSubstitute}
        removeSubstitution={removeSubstitution}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tigers substitution' }));
    expect(onSubstitute).toHaveBeenCalledWith('home');
    // The away team has no line-up, so its key is dead.
    expect(
      screen.getByRole('button', { name: 'Away Team substitution' })
    ).toBeDisabled();

    const row = screen.getByRole('listitem', {
      name: 'Tigers: 7 Jake Rowe off, 14 Ed Jones on',
    });
    expect(within(row).getByText("59'")).toBeInTheDocument();
    fireEvent.click(within(row).getByRole('button', { name: /Remove substitution/ }));
    expect(removeSubstitution).toHaveBeenCalledWith('s1');
  });
});

describe('SubstitutionModal', () => {
  function renderModal(substitutions: Substitution[] = []) {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <SubstitutionModal
        team="home"
        matchSettings={matchSettings}
        substitutions={substitutions}
        onConfirm={onConfirm}
        onClose={onClose}
      />
    );
    return { onConfirm, onClose, dialog: screen.getByRole('dialog') };
  }

  it('asks who is coming off from the pitch, then who is coming on from the bench, and confirms', () => {
    const { onConfirm, onClose, dialog } = renderModal();

    expect(
      within(dialog).getByRole('button', { name: 'Confirm substitution' })
    ).toBeDisabled();
    // Only the players on the pitch are offered first.
    expect(within(dialog).queryByRole('button', { name: /Kai Moore/ })).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: /Jake Rowe/ }));
    // Then only the bench.
    expect(within(dialog).queryByRole('button', { name: /Ali Smith/ })).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: /Ed Jones/ }));
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Confirm substitution' })
    );

    expect(onConfirm).toHaveBeenCalledWith(
      'home',
      { name: 'Jake Rowe', number: '7' },
      { name: 'Ed Jones', number: '14', starting: false }
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('follows substitutions already made: the player who came on is on the pitch', () => {
    const { dialog } = renderModal([made]);

    expect(within(dialog).getByRole('button', { name: /Ed Jones/ })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /Jake Rowe/ })).toBeNull();
  });

  it('stays open for another change when asked', () => {
    const { onConfirm, onClose, dialog } = renderModal();

    fireEvent.click(within(dialog).getByRole('button', { name: /Ali Smith/ }));
    fireEvent.click(within(dialog).getByRole('button', { name: /Kai Moore/ }));
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Confirm and make another' })
    );

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    // Back to step one.
    expect(within(dialog).getByText('Pick who is coming off')).toBeInTheDocument();
  });
});
