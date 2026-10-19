import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { defaultMatchSettings } from '@playoverlay/core';
import EditScoreModal from '../Dashboard/EditScoreModal';

const matchSettings = {
  ...defaultMatchSettings,
  homeTeamNameFull: 'Tigers',
  awayTeamNameFull: 'Bears',
};

function renderModal(homeTeam = 1, awayTeam = 0) {
  const updateScore = vi.fn();
  render(
    <EditScoreModal
      open
      setOpen={() => undefined}
      scores={{ homeTeam, awayTeam, penalties: [], goals: [] }}
      matchSettings={matchSettings}
      updateScore={updateScore}
    />
  );
  return { updateScore };
}

describe('EditScoreModal', () => {
  it('sends a typed score once it is committed, not per keystroke', async () => {
    const { updateScore } = renderModal();
    const input = await screen.findByLabelText('Tigers score');

    // Clearing "1" to type "5" must not send 0 to the outputs on the way.
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.change(input, { target: { value: '5' } });
    expect(updateScore).not.toHaveBeenCalled();

    fireEvent.blur(input);
    expect(updateScore).toHaveBeenCalledTimes(1);
    expect(updateScore).toHaveBeenCalledWith({ homeTeam: 5 });
  });

  it('discards an empty or unchanged score instead of committing it', async () => {
    const { updateScore } = renderModal();
    const input = await screen.findByLabelText('Bears score');

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(updateScore).not.toHaveBeenCalled();
  });

  it('adjusts either score by one with the labelled buttons, never below zero', async () => {
    const user = userEvent.setup();
    const { updateScore } = renderModal(1, 0);

    await user.click(screen.getByRole('button', { name: 'Increase Tigers score' }));
    expect(updateScore).toHaveBeenLastCalledWith({ homeTeam: 2 });
    await user.click(screen.getByRole('button', { name: 'Decrease Tigers score' }));
    expect(updateScore).toHaveBeenLastCalledWith({ homeTeam: 0 });
    await user.click(screen.getByRole('button', { name: 'Decrease Bears score' }));
    expect(updateScore).toHaveBeenCalledTimes(2);
  });
});
