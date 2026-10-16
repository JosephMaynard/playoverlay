import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  CustomScreen,
  defaultMatchSettings,
  defaultMatchState,
  MatchSettings,
} from '@playoverlay/core';
import DisplayControlsPanel from '../Dashboard/DisplayControlsPanel';
import EditCustomScreen from '../CustomScreens/EditCustomScreen';

const withHomeLineup: MatchSettings = {
  ...defaultMatchSettings,
  homeTeamPlayers: [{ name: 'Ali Smith', number: '9' }],
};

function renderPanel(matchSettings: MatchSettings) {
  const switchScreen = vi.fn();
  render(
    <DisplayControlsPanel
      updateMatchState={vi.fn()}
      switchScreen={switchScreen}
      matchState={defaultMatchState}
      customGraphics={[]}
      matchSettings={matchSettings}
    />
  );
  return { switchScreen };
}

describe('Display Controls line-up buttons', () => {
  it('offers exactly the usual screens when no team has a line-up', () => {
    renderPanel(defaultMatchSettings);

    expect(
      screen
        .getAllByRole('button', { pressed: false })
        .map((b) => b.textContent)
    ).toEqual(['None', 'Match Title', 'Penalties', 'End Screen', 'Scoreboard']);
    expect(
      screen.queryByRole('button', { name: 'Home Line-up' })
    ).not.toBeInTheDocument();
  });

  it("offers a team's line-up screen once it has players, and switches to it", () => {
    const { switchScreen } = renderPanel(withHomeLineup);

    fireEvent.click(screen.getByRole('button', { name: 'Home Line-up' }));
    expect(switchScreen).toHaveBeenCalledWith({
      displayScreen: 'homeLineup',
      customScreenImageUrl: undefined,
    });
    expect(
      screen.queryByRole('button', { name: 'Away Line-up' })
    ).not.toBeInTheDocument();
  });
});

describe('Overlay screen links', () => {
  const overlay: CustomScreen = {
    title: 'Sponsor',
    filePath: '/images/sponsor.png',
    url: 'file:///images/sponsor.png',
    type: 'overlay',
    overlayLinks: [
      'none',
      'matchTitle',
      'scoreBug',
      'penalties',
      'custom',
      'endScreen',
      'scoreboard',
    ],
  };

  function renderEditor(
    matchSettings?: MatchSettings,
    toEdit: CustomScreen = overlay
  ) {
    const handleOnChange = vi.fn();
    render(
      <EditCustomScreen
        customScreenToEdit={toEdit}
        setCustomScreenToEdit={vi.fn()}
        handleSaveChanges={vi.fn()}
        handleOnChange={handleOnChange}
        keyColour="#0000FF"
        matchSettings={matchSettings}
      />
    );
    return { handleOnChange, dialog: screen.getByRole('dialog') };
  }

  it('lists no line-up screens without line-ups, so "All Screens" means what it did', () => {
    const { dialog } = renderEditor(defaultMatchSettings);
    expect(
      within(dialog).queryByLabelText('Home Line-up')
    ).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText('All Screens')).toBeChecked();
  });

  it('stores the same screens for "All Screens" as before line-ups existed', () => {
    const { dialog, handleOnChange } = renderEditor(defaultMatchSettings, {
      ...overlay,
      overlayLinks: [],
    });

    fireEvent.click(within(dialog).getByLabelText('All Screens'));
    expect(handleOnChange).toHaveBeenCalledWith({
      overlayLinks: overlay.overlayLinks,
    });
  });

  it("lists a team's line-up screen once it has players", () => {
    const { dialog } = renderEditor(withHomeLineup);

    expect(within(dialog).getByLabelText('Home Line-up')).not.toBeChecked();
    expect(
      within(dialog).queryByLabelText('Away Line-up')
    ).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText('All Screens')).not.toBeChecked();
  });
});
