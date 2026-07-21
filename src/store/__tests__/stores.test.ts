import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  defaultAppSettings,
  defaultMatchSettings,
  defaultMatchState,
} from '../../constants';
import { useAppSettingsStore } from '../appSettings';
import { useCustomGraphicsStore } from '../customGraphics';
import { useMatchSettingsStore } from '../matchSettings';
import { useMatchStateStore } from '../matchState';
import { useScoresStore } from '../scores';
import { useTimeStore } from '../time';

function installElectronAPI() {
  const electronAPI = {
    updateScores: vi.fn(),
    updateTime: vi.fn(),
    updateMatchSettings: vi.fn(),
    updateAppSettings: vi.fn(),
    updateMatchState: vi.fn(),
  } as unknown as Window['electronAPI'];

  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: electronAPI,
  });

  return electronAPI;
}

describe('Zustand stores', () => {
  beforeEach(() => {
    installElectronAPI();
    useScoresStore.setState({
      scores: { homeTeam: 0, awayTeam: 0, penalties: [] },
    });
    useTimeStore.setState({ time: { paused: false } });
    useMatchSettingsStore.setState({
      matchSettings: { ...defaultMatchSettings },
    });
    useMatchStateStore.setState({ matchState: { ...defaultMatchState } });
    useAppSettingsStore.setState({ appSettings: { ...defaultAppSettings } });
    useCustomGraphicsStore.setState({ customGraphics: [] });
  });

  it('merges score updates and notifies Electron', () => {
    const api = installElectronAPI();

    useScoresStore.getState().setScores({
      homeTeam: 2,
      penalties: [{ team: 'home', result: 'scored' }],
    });

    const expectedScores = {
      homeTeam: 2,
      awayTeam: 0,
      penalties: [{ team: 'home', result: 'scored' }],
    };
    expect(useScoresStore.getState().scores).toEqual(expectedScores);
    expect(api.updateScores).toHaveBeenCalledWith(expectedScores);
  });

  it('merges time updates and notifies Electron', () => {
    const api = installElectronAPI();

    useTimeStore.getState().setTime({
      time: '12:34',
      remainingTime: '32:26',
      matchPhase: 'firstHalf',
    });

    const expectedTime = {
      paused: false,
      time: '12:34',
      remainingTime: '32:26',
      matchPhase: 'firstHalf',
    };
    expect(useTimeStore.getState().time).toEqual(expectedTime);
    expect(api.updateTime).toHaveBeenCalledWith(expectedTime);
  });

  it('merges match settings updates and keeps existing defaults', () => {
    const api = installElectronAPI();

    useMatchSettingsStore.getState().setMatchSettings({
      homeTeamNameFull: 'Tigers',
      homeTeamNameAbbreviated: 'TIG',
      halfLength: 40,
    });

    const expectedSettings = {
      ...defaultMatchSettings,
      homeTeamNameFull: 'Tigers',
      homeTeamNameAbbreviated: 'TIG',
      halfLength: 40,
    };
    expect(useMatchSettingsStore.getState().matchSettings).toEqual(
      expectedSettings
    );
    expect(api.updateMatchSettings).toHaveBeenCalledWith(expectedSettings);
  });

  it('merges match state updates and notifies Electron', () => {
    const api = installElectronAPI();

    useMatchStateStore.getState().setMatchState({
      displayScreen: 'penalties',
      matchPhase: 'secondHalf',
    });

    const expectedState = {
      ...defaultMatchState,
      displayScreen: 'penalties',
      matchPhase: 'secondHalf',
    };
    expect(useMatchStateStore.getState().matchState).toEqual(expectedState);
    expect(api.updateMatchState).toHaveBeenCalledWith(expectedState);
  });

  it('merges app settings updates and notifies Electron', () => {
    const api = installElectronAPI();

    useAppSettingsStore.getState().setAppSettings({
      keyColour: '#00ff00',
    });

    const expectedSettings = {
      ...defaultAppSettings,
      keyColour: '#00ff00',
    };
    expect(useAppSettingsStore.getState().appSettings).toEqual(
      expectedSettings
    );
    expect(api.updateAppSettings).toHaveBeenCalledWith(expectedSettings);
  });

  it('tracks whether persisted settings have loaded (gates the first-run picker)', () => {
    installElectronAPI();

    // Defaults to false so the picker stays hidden until the async load runs.
    expect(useAppSettingsStore.getInitialState().settingsLoaded).toBe(false);

    useAppSettingsStore.getState().markSettingsLoaded();
    expect(useAppSettingsStore.getState().settingsLoaded).toBe(true);
  });

  it('stores custom graphics without notifying Electron directly', () => {
    const customGraphics = [
      {
        title: 'Sponsor board',
        filePath: '/tmp/sponsor.png',
        url: 'file:///tmp/sponsor.png',
        type: 'overlay' as const,
        overlayLinks: ['scoreBug' as const],
      },
    ];

    useCustomGraphicsStore.getState().setCustomGraphics(customGraphics);

    expect(useCustomGraphicsStore.getState().customGraphics).toEqual(
      customGraphics
    );
  });

  it('does not throw when Electron API is unavailable', () => {
    delete (window as Partial<Window>).electronAPI;

    expect(() =>
      useScoresStore.getState().setScores({ awayTeam: 1 })
    ).not.toThrow();
    expect(useScoresStore.getState().scores.awayTeam).toBe(1);
  });
});
