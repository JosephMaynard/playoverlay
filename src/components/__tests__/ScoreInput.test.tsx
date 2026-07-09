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

    await user.click(screen.getAllByRole('button')[0]);
    fireEvent.change(await screen.findByLabelText('Tigers score'), {
      target: { value: '5' },
    });

    expect(setScore).toHaveBeenCalledWith(5);
  });
});
