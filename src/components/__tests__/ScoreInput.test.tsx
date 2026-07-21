import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ScoreInput from '../ScoresPanel/ScoreInput';

const baseProps = {
  title: 'Home Team',
  score: 1,
  id: 'home-score',
  teamNameFull: 'Tigers',
  teamNameAbbreviated: 'TIG',
  textColour: '#ffffff',
  backgroundColour: '#000000',
};

describe('ScoreInput', () => {
  it('increments the score when the scored button is pressed', async () => {
    const setScore = vi.fn();
    const user = userEvent.setup();
    render(<ScoreInput {...baseProps} setScore={setScore} />);

    await user.click(screen.getByRole('button', { name: /Home Team Scored/ }));

    expect(setScore).toHaveBeenCalledWith(2);
  });

  it('opens the edit modal and sends numeric score changes', async () => {
    const setScore = vi.fn();
    const user = userEvent.setup();
    render(<ScoreInput {...baseProps} setScore={setScore} />);

    await user.click(screen.getByRole('button', { name: 'Edit Tigers score' }));
    fireEvent.change(await screen.findByLabelText('Tigers score'), {
      target: { value: '5' },
    });

    expect(setScore).toHaveBeenCalledWith(5);
  });

  it('adjusts the score by one via the labelled increase/decrease buttons in the edit modal', async () => {
    const setScore = vi.fn();
    const user = userEvent.setup();
    render(<ScoreInput {...baseProps} setScore={setScore} />);

    await user.click(screen.getByRole('button', { name: 'Edit Tigers score' }));
    await user.click(
      await screen.findByRole('button', { name: 'Increase Tigers score' })
    );
    expect(setScore).toHaveBeenCalledWith(2);

    await user.click(
      screen.getByRole('button', { name: 'Decrease Tigers score' })
    );
    expect(setScore).toHaveBeenCalledWith(0);
  });
});
