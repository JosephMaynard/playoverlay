import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultMatchSettings, defaultMatchState } from '../../constants';
import SystemSettingsMenu from '../SystemSettingsMenu/SystemSettingsMenu';

const connectToStreamDeck = vi.hoisted(() =>
  vi.fn<
    (
      buttons: Array<{ text: string }>,
      nextScreen: () => void
    ) => Promise<void>
  >()
);

vi.mock('../../stream-deck', () => ({
  connectToStreamDeck,
  NEXT_SET_KEY_INDEX: 5,
}));

function renderMenu(matchSettings = defaultMatchSettings) {
  return render(
    <SystemSettingsMenu
      open
      setOpen={() => undefined}
      matchSettings={matchSettings}
      incrementHomeTeamScore={() => undefined}
      incrementAwayTeamScore={() => undefined}
      startTime={() => undefined}
      stopTime={() => undefined}
      updateMatchState={() => undefined}
      matchState={defaultMatchState}
      time={{}}
    />
  );
}

async function connectDeck() {
  fireEvent.click(screen.getByRole('button', { name: /Connect to Stream Deck/ }));
  await act(async () => {});
}

function lastCall() {
  return connectToStreamDeck.mock.calls[
    connectToStreamDeck.mock.calls.length - 1
  ];
}

describe('SystemSettingsMenu stream deck pagination', () => {
  beforeEach(() => {
    connectToStreamDeck.mockReset();
    connectToStreamDeck.mockResolvedValue(undefined);
  });

  it('pages through scoring, phase, and screen sets and wraps around', async () => {
    renderMenu();
    await connectDeck();

    // Default settings: scoring set + 1 phase chunk (4 football phases) +
    // 2 screen chunks (6 screens split 5+1) = 4 sets.
    const [firstButtons, nextScreen] = lastCall();
    expect(firstButtons.map((b) => b.text)).toContain('Stop');

    await act(async () => nextScreen());
    expect(lastCall()[0].map((b) => b.text)).toContain('First Half');

    await act(async () => lastCall()[1]());
    expect(lastCall()[0].map((b) => b.text)).toContain('Score Bug');

    await act(async () => lastCall()[1]());
    // Second screen chunk holds the overflow screen
    expect(lastCall()[0]).toHaveLength(1);

    await act(async () => lastCall()[1]());
    // Wrapped back to the scoring set
    expect(lastCall()[0].map((b) => b.text)).toContain('Stop');
  });

  it('clamps a stale page index when the set count shrinks (penalties toggled off)', async () => {
    const { rerender } = renderMenu();
    await connectDeck();

    // Page to the last set (index 3 of 4)
    await act(async () => lastCall()[1]());
    await act(async () => lastCall()[1]());
    await act(async () => lastCall()[1]());
    expect(lastCall()[0]).toHaveLength(1);

    // Penalties off: screens drop to 5 -> one chunk -> 3 sets total. The
    // stale index 3 must clamp instead of indexing undefined (which used
    // to blank the deck and silently disconnect).
    rerender(
      <SystemSettingsMenu
        open
        setOpen={() => undefined}
        matchSettings={{ ...defaultMatchSettings, hasPenalties: false }}
        incrementHomeTeamScore={() => undefined}
        incrementAwayTeamScore={() => undefined}
        startTime={() => undefined}
        stopTime={() => undefined}
        updateMatchState={() => undefined}
        matchState={defaultMatchState}
        time={{}}
      />
    );
    await act(async () => {});

    const [clampedButtons] = lastCall();
    expect(clampedButtons).toBeDefined();
    expect(clampedButtons.length).toBeGreaterThan(0);
    expect(clampedButtons.map((b) => b.text)).not.toContain('Penalties');
  });
});
