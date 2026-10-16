import { useState } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  defaultAppSettings,
  defaultMatchSettings,
  Club,
  MatchSettings,
} from '@playoverlay/core';
import MatchSettingsMenu from '../MatchSettingsMenu/MatchSettingsMenu';

function installElectronAPI(clubs: Club[] = []) {
  let stored = clubs;
  const api = {
    getVersion: vi.fn(() => '0.21.0-test'),
    getSavedMatchSettings: vi.fn().mockResolvedValue([]),
    setSavedMatchSettings: vi.fn().mockResolvedValue({ success: true }),
    getClubs: vi.fn(async () => stored),
    setClubs: vi.fn(async (submitted: Club[]) => {
      stored = submitted;
      return { success: true };
    }),
  };
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: api as unknown as Window['electronAPI'],
  });
  return api;
}

// Renders the real Match Settings menu over local state, recording every
// update it sends so a test can tell a committed edit from a draft.
async function renderMenu(initial: Partial<MatchSettings> = {}) {
  let current: MatchSettings = { ...defaultMatchSettings, ...initial };
  const updates: Partial<MatchSettings>[] = [];
  function Harness() {
    const [matchSettings, setMatchSettings] = useState<MatchSettings>(current);
    current = matchSettings;
    return (
      <MatchSettingsMenu
        sidebarOpen
        setSidebarOpen={() => undefined}
        matchSettings={matchSettings}
        updateMatchSettings={(update) => {
          updates.push(update);
          setMatchSettings((previous) => ({ ...previous, ...update }));
        }}
        replaceMatchSettings={setMatchSettings}
        appSettings={defaultAppSettings}
      />
    );
  }
  render(<Harness />);
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  return { settings: () => current, updates };
}

function homeLineup() {
  return screen.getAllByRole('region', { name: 'Line-up' })[0];
}

describe('Line-up editor', () => {
  it('shows only the two buttons and a line of help while the list is empty', async () => {
    installElectronAPI();
    await renderMenu();

    const [home, away] = screen.getAllByRole('region', { name: 'Line-up' });
    for (const section of [home, away]) {
      expect(
        within(section).getByText(/Add the squad to show a line-up on air/)
      ).toBeInTheDocument();
      expect(
        within(section).getByRole('button', { name: 'Add player' })
      ).toBeInTheDocument();
      expect(
        within(section).getByRole('button', { name: 'Paste a list' })
      ).toBeInTheDocument();
      expect(within(section).queryAllByRole('textbox')).toHaveLength(0);
    }
  });

  it('adds a player when the new row loses focus, and drops a row left empty', async () => {
    installElectronAPI();
    const { settings, updates } = await renderMenu();
    const home = homeLineup();

    fireEvent.click(within(home).getByRole('button', { name: 'Add player' }));
    const name = within(home).getByRole('textbox', {
      name: 'Home Team player 1: name',
    });
    expect(name).toHaveFocus();

    fireEvent.change(
      within(home).getByRole('textbox', {
        name: 'Home Team player 1: shirt number',
      }),
      { target: { value: '9' } }
    );
    fireEvent.change(name, { target: { value: '  Ali Smith ' } });
    expect(updates).toHaveLength(0);

    fireEvent.blur(name);
    expect(settings().homeTeamPlayers).toEqual([
      { name: 'Ali Smith', number: '9' },
    ]);
    expect(within(home).getByText('1 player (up to 30)')).toBeInTheDocument();

    fireEvent.click(within(home).getByRole('button', { name: 'Add player' }));
    fireEvent.blur(
      within(home).getByRole('textbox', { name: 'Home Team player 2: name' })
    );
    expect(settings().homeTeamPlayers).toHaveLength(1);
    expect(
      within(home).queryByRole('textbox', { name: 'Home Team player 2: name' })
    ).not.toBeInTheDocument();
  });

  it('moves on to a fresh row after Enter, for typing a squad quickly', async () => {
    installElectronAPI();
    const { settings } = await renderMenu();
    const home = homeLineup();

    fireEvent.click(within(home).getByRole('button', { name: 'Add player' }));
    const first = within(home).getByRole('textbox', {
      name: 'Home Team player 1: name',
    });
    fireEvent.change(first, { target: { value: 'Ali Smith' } });
    fireEvent.keyDown(first, { key: 'Enter' });

    expect(settings().homeTeamPlayers).toEqual([{ name: 'Ali Smith' }]);
    expect(
      within(home).getByRole('textbox', { name: 'Home Team player 2: name' })
    ).toHaveFocus();
  });

  it('commits an edit only when the row loses focus, and keeps a player whose name is cleared', async () => {
    installElectronAPI();
    const { settings, updates } = await renderMenu({
      homeTeamPlayers: [{ name: 'Ali Smith', number: '9' }],
    });
    const home = homeLineup();
    const number = within(home).getByRole('textbox', {
      name: 'Home Team player 1: shirt number',
    });
    const name = within(home).getByRole('textbox', {
      name: 'Home Team player 1: name',
    });

    fireEvent.change(number, { target: { value: '10' } });
    // Moving to the row's own name field keeps the draft.
    fireEvent.blur(number, { relatedTarget: name });
    expect(updates).toHaveLength(0);
    fireEvent.change(name, { target: { value: 'Ali Smyth' } });
    fireEvent.keyDown(name, { key: 'Enter' });
    expect(settings().homeTeamPlayers).toEqual([
      { name: 'Ali Smyth', number: '10' },
    ]);

    fireEvent.change(name, { target: { value: '   ' } });
    fireEvent.blur(name);
    expect(settings().homeTeamPlayers).toEqual([
      { name: 'Ali Smyth', number: '10' },
    ]);
    expect(name).toHaveValue('Ali Smyth');
  });

  it('removes players, leaving no line-up at all once the last one goes', async () => {
    installElectronAPI();
    const { settings } = await renderMenu({
      homeTeamPlayers: [
        { name: 'Ali Smith', number: '9' },
        { name: 'Jo Bloggs' },
      ],
    });
    const home = homeLineup();

    fireEvent.click(
      within(home).getByRole('button', { name: 'Remove Ali Smith' })
    );
    expect(settings().homeTeamPlayers).toEqual([{ name: 'Jo Bloggs' }]);

    fireEvent.click(
      within(home).getByRole('button', { name: 'Remove Jo Bloggs' })
    );
    expect(settings().homeTeamPlayers).toBeUndefined();
    expect(
      within(home).getByText(/Add the squad to show a line-up on air/)
    ).toBeInTheDocument();
  });

  it('appends a pasted list to the players already entered', async () => {
    installElectronAPI();
    const { settings } = await renderMenu({
      awayTeamPlayers: [{ name: 'Sam Keeper', number: '1' }],
    });
    const away = screen.getAllByRole('region', { name: 'Line-up' })[1];

    fireEvent.click(within(away).getByRole('button', { name: 'Paste a list' }));
    const dialog = await screen.findByRole('dialog', {
      name: 'Paste the Away Team line-up',
    });
    const addButton = within(dialog).getByRole('button', {
      name: 'Add players',
    });
    expect(addButton).toBeDisabled();

    fireEvent.change(within(dialog).getByLabelText(/One player per line/), {
      target: { value: '9 Ali Smith\n\nGK Jo Bloggs\nKim Lee\n' },
    });
    fireEvent.click(addButton);

    expect(settings().awayTeamPlayers).toEqual([
      { name: 'Sam Keeper', number: '1' },
      { name: 'Ali Smith', number: '9' },
      { name: 'Jo Bloggs', number: 'GK' },
      { name: 'Kim Lee' },
    ]);
    expect(settings().homeTeamPlayers).toBeUndefined();
    expect(within(away).getByText('4 players (up to 30)')).toBeInTheDocument();
  });

  it('gives each team panel its own control ids', async () => {
    installElectronAPI();
    await renderMenu({
      homeTeamPlayers: [{ name: 'Ali Smith' }],
      awayTeamPlayers: [{ name: 'Jo Bloggs' }],
    });

    const ids = screen
      .getAllByRole('textbox', { name: /player 1: / })
      .map((input) => input.id);
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(4);
  });

  it("saves a team's squad with its club, and lists the club's player count", async () => {
    const api = installElectronAPI();
    await renderMenu({
      homeTeamNameFull: 'Rovers',
      homeTeamPlayers: [
        { name: 'Ali Smith', number: '9' },
        { name: 'Jo Bloggs' },
      ],
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Save as club' })[0]);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(api.setClubs).toHaveBeenCalledWith([
      expect.objectContaining({
        name: 'Rovers',
        players: [{ name: 'Ali Smith', number: '9' }, { name: 'Jo Bloggs' }],
      }),
    ]);
    expect(await screen.findByText('2 players')).toBeInTheDocument();
  });

  it("loads a club's squad, replacing the slot's players", async () => {
    installElectronAPI([
      {
        id: 'c1',
        name: 'United',
        abbreviation: 'UTD',
        textColour: '#ffffff',
        backgroundColour: '#0000aa',
        players: [{ name: 'Kim Lee', number: '4' }],
      },
      {
        id: 'c2',
        name: 'Wanderers',
        abbreviation: 'WAN',
        textColour: '#ffffff',
        backgroundColour: '#00aa00',
      },
    ]);
    const { settings } = await renderMenu({
      awayTeamPlayers: [{ name: 'Old Player' }],
    });
    const [, awayPicker] = screen.getAllByLabelText('Load a saved club');

    fireEvent.change(awayPicker, { target: { value: 'c1' } });
    expect(settings().awayTeamPlayers).toEqual([
      { name: 'Kim Lee', number: '4' },
    ]);

    fireEvent.change(awayPicker, { target: { value: 'c2' } });
    expect(settings().awayTeamPlayers).toBeUndefined();
  });
});
