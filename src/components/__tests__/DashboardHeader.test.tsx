import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DashboardHeader from '../Dashboard/DashboardHeader';
import { MatchSnapshot, UndoEntry, useUndoStore } from '../../store/undo';

// A throwaway snapshot: the header only reads entry labels and stack lengths,
// never the snapshot or slices (undo/redo are stubbed here), so its contents
// are immaterial.
const snapshot: MatchSnapshot = {
  scores: { homeTeam: 0, awayTeam: 0, penalties: [] },
};

function entry(label: string): UndoEntry {
  return { snapshot, slices: ['scores'], label };
}

// The header renders each control twice (mobile top bar + desktop rail), so an
// accessible name resolves to two buttons; assert on the pair.
function buttons(name: string | RegExp): HTMLElement[] {
  return screen.getAllByRole('button', { name });
}

describe('DashboardHeader undo/redo controls', () => {
  beforeEach(() => {
    useUndoStore.setState({
      undoStack: [],
      redoStack: [],
      clockResync: null,
      undo: vi.fn(),
      redo: vi.fn(),
    });
  });

  it('disables both actions and labels them "nothing" when the stacks are empty', () => {
    render(<DashboardHeader setSideMenu={vi.fn()} />);

    const undoButtons = buttons('Nothing to undo');
    const redoButtons = buttons('Nothing to redo');
    expect(undoButtons).toHaveLength(2);
    expect(redoButtons).toHaveLength(2);
    undoButtons.forEach((button) => expect(button).toBeDisabled());
    redoButtons.forEach((button) => expect(button).toBeDisabled());
  });

  it('enables undo and names it after the next undoable action', () => {
    useUndoStore.setState({ undoStack: [entry('undo:actions.homeGoal')] });
    render(<DashboardHeader setSideMenu={vi.fn()} />);

    const undoButtons = buttons('Undo home goal');
    expect(undoButtons).toHaveLength(2);
    undoButtons.forEach((button) => expect(button).toBeEnabled());
    // Redo is still empty, so it stays disabled.
    buttons('Nothing to redo').forEach((button) =>
      expect(button).toBeDisabled()
    );
  });

  it('enables redo and names it after the next redoable action', () => {
    useUndoStore.setState({
      redoStack: [entry('undo:actions.switchScreen')],
    });
    render(<DashboardHeader setSideMenu={vi.fn()} />);

    const redoButtons = buttons('Redo screen change');
    expect(redoButtons).toHaveLength(2);
    redoButtons.forEach((button) => expect(button).toBeEnabled());
  });

  it('calls the store undo action when an enabled undo button is clicked', () => {
    const undo = vi.fn();
    useUndoStore.setState({
      undoStack: [entry('undo:actions.awayGoal')],
      undo,
    });
    render(<DashboardHeader setSideMenu={vi.fn()} />);

    fireEvent.click(buttons('Undo away goal')[0]);
    expect(undo).toHaveBeenCalledTimes(1);
  });

  it('keeps the settings-navigation buttons working alongside the match actions', () => {
    const setSideMenu = vi.fn();
    render(<DashboardHeader setSideMenu={setSideMenu} />);

    fireEvent.click(screen.getByRole('button', { name: 'Team Settings' }));
    expect(setSideMenu).toHaveBeenCalledWith('team-settings');
  });
});
