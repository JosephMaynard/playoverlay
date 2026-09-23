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
  onScored: vi.fn(),
};

describe('ScoreInput', () => {
  it('records a goal (not a manual edit) when the scored button is pressed', async () => {
    const onScored = vi.fn();
    const setScore = vi.fn();
    const user = userEvent.setup();
    render(
      <ScoreInput {...baseProps} onScored={onScored} setScore={setScore} />
    );

    await user.click(screen.getByRole('button', { name: /Home Team Scored/ }));

    // The big scored button is a goal, routed through the goal handler, not a
    // score edit, so it must not go through setScore.
    expect(onScored).toHaveBeenCalledTimes(1);
    expect(setScore).not.toHaveBeenCalled();
  });

  it('opens the edit modal and sends the typed score once it is committed', async () => {
    const setScore = vi.fn();
    const user = userEvent.setup();
    render(<ScoreInput {...baseProps} setScore={setScore} />);

    await user.click(screen.getByRole('button', { name: 'Edit Tigers score' }));
    const input = await screen.findByLabelText('Tigers score');
    fireEvent.change(input, { target: { value: '5' } });
    expect(setScore).not.toHaveBeenCalled();

    fireEvent.blur(input);
    expect(setScore).toHaveBeenCalledWith(5);
  });

  it('does not put intermediate keystrokes on air', async () => {
    // Clearing "3" to type "4" must not send 0 to the outputs (and record an
    // undo entry) on the way.
    const setScore = vi.fn();
    const user = userEvent.setup();
    render(<ScoreInput {...baseProps} score={3} setScore={setScore} />);

    await user.click(screen.getByRole('button', { name: 'Edit Tigers score' }));
    const input = await screen.findByLabelText('Tigers score');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.change(input, { target: { value: '4' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(setScore).toHaveBeenCalledTimes(1);
    expect(setScore).toHaveBeenCalledWith(4);
  });

  it('discards an empty or unchanged score instead of committing it', async () => {
    const setScore = vi.fn();
    const user = userEvent.setup();
    render(<ScoreInput {...baseProps} score={3} setScore={setScore} />);

    await user.click(screen.getByRole('button', { name: 'Edit Tigers score' }));
    const input = await screen.findByLabelText('Tigers score');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    fireEvent.change(input, { target: { value: '3' } });
    fireEvent.blur(input);

    expect(setScore).not.toHaveBeenCalled();
    expect(input).toHaveValue(3);
  });

  it('adjusts the score by one via the labelled increase/decrease buttons in the edit modal', async () => {
    const setScore = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <ScoreInput {...baseProps} setScore={setScore} />
    );

    await user.click(screen.getByRole('button', { name: 'Edit Tigers score' }));
    await user.click(
      await screen.findByRole('button', { name: 'Increase Tigers score' })
    );
    expect(setScore).toHaveBeenCalledWith(2);

    // The score is controlled by the parent, so reflect the applied increment
    // before decrementing to prove the decrease works off the updated value
    // (1 -> 2 -> 1) rather than always off the original prop.
    rerender(<ScoreInput {...baseProps} score={2} setScore={setScore} />);

    await user.click(
      screen.getByRole('button', { name: 'Decrease Tigers score' })
    );
    expect(setScore).toHaveBeenCalledWith(1);
  });
});
