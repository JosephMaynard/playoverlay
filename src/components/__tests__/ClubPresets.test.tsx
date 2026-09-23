import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultAppSettings, defaultMatchSettings } from '../../constants';
import { Club } from '../../types';
import { MatchSettings } from '../../zodSchemas';
import MatchSettingsMenu from '../MatchSettingsMenu/MatchSettingsMenu';

const rovers: Club = {
  id: 'c1',
  name: 'Rovers',
  abbreviation: 'ROV',
  textColour: '#ffffff',
  backgroundColour: '#aa0000',
};

function installElectronAPI(clubs: Club[], setResult = { success: true }) {
  const api = {
    getVersion: vi.fn(() => '0.21.0-test'),
    getSavedMatchSettings: vi.fn().mockResolvedValue([]),
    setSavedMatchSettings: vi.fn().mockResolvedValue({ success: true }),
    getClubs: vi.fn().mockResolvedValue(clubs),
    setClubs: vi.fn().mockResolvedValue(setResult),
  };
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: api as unknown as Window['electronAPI'],
  });
  return api;
}

function renderMenu(initial: Partial<MatchSettings> = {}) {
  let current: MatchSettings = { ...defaultMatchSettings, ...initial };
  function Harness() {
    const [matchSettings, setMatchSettings] = useState<MatchSettings>(current);
    current = matchSettings;
    return (
      <MatchSettingsMenu
        sidebarOpen
        setSidebarOpen={() => undefined}
        matchSettings={matchSettings}
        updateMatchSettings={(update) =>
          setMatchSettings((previous) => ({ ...previous, ...update }))
        }
        replaceMatchSettings={setMatchSettings}
        appSettings={defaultAppSettings}
      />
    );
  }
  render(<Harness />);
  return { settings: () => current };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('Club presets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads a saved club into a team slot, replacing its logo', async () => {
    installElectronAPI([rovers]);
    const { settings } = renderMenu({
      awayTeamLogo: 'file:///images/old-away.png',
    });
    await flush();

    const [, awayPicker] = screen.getAllByLabelText('Load a saved club');
    fireEvent.change(awayPicker, { target: { value: 'c1' } });

    expect(settings()).toEqual(
      expect.objectContaining({
        awayTeamNameFull: 'Rovers',
        awayTeamNameAbbreviated: 'ROV',
        awayTeamTextColour: '#ffffff',
        awayTeamBackgroundColour: '#aa0000',
      })
    );
    expect(settings().awayTeamLogo).toBeUndefined();
    // The home slot is untouched.
    expect(settings().homeTeamNameFull).toBe(
      defaultMatchSettings.homeTeamNameFull
    );
  });

  it('saves a team as a club, and saving the same name again updates it', async () => {
    const api = installElectronAPI([rovers]);
    renderMenu({
      homeTeamNameFull: 'Rovers',
      homeTeamNameAbbreviated: 'RFC',
      homeTeamBackgroundColour: '#0000aa',
    });
    await flush();

    const [homeSave] = screen.getAllByRole('button', { name: 'Save as club' });
    fireEvent.click(homeSave);
    await flush();

    expect(api.setClubs).toHaveBeenCalledTimes(1);
    const [saved] = api.setClubs.mock.calls[0][0] as Club[];
    expect(saved).toEqual(
      expect.objectContaining({
        id: 'c1',
        name: 'Rovers',
        abbreviation: 'RFC',
        backgroundColour: '#0000aa',
      })
    );
    expect(screen.getByText('Saved to your clubs.')).toBeInTheDocument();
  });

  it('keeps the list unchanged and says so when saving fails', async () => {
    installElectronAPI([], { success: false });
    renderMenu({ awayTeamNameFull: 'United' });
    await flush();

    const [, awaySave] = screen.getAllByRole('button', {
      name: 'Save as club',
    });
    fireEvent.click(awaySave);
    await flush();

    expect(
      screen.getByText('The club could not be saved. Please try again.')
    ).toBeInTheDocument();
    expect(screen.getAllByText('No saved clubs yet')).toHaveLength(2);
  });

  it('deletes a saved club after confirmation', async () => {
    const api = installElectronAPI([rovers]);
    renderMenu();
    await flush();

    fireEvent.click(screen.getByRole('button', { name: 'Delete Rovers' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await flush();

    expect(api.setClubs).toHaveBeenCalledWith([]);
    expect(
      screen.queryByRole('button', { name: 'Delete Rovers' })
    ).not.toBeInTheDocument();
  });
});
