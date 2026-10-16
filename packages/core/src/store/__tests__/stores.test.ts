import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  defaultAppSettings,
  defaultMatchSettings,
  defaultMatchState,
} from '../../constants';
import { useAppSettingsStore } from '../appSettings';
import { useCustomGraphicsStore } from '../customGraphics';
import { useMatchSettingsStore } from '../matchSettings';
import { useMatchStateStore } from '../matchState';
import { mirrorStores } from '../mirror';
import { useScoresStore } from '../scores';
import { useTimeStore } from '../time';

// The stores no longer talk to Electron themselves: a host connects them to
// its outputs with mirrorStores. These tests connect a fake bridge in its
// place and assert the same notifications the setters used to send.
let stopMirroring: (() => void) | undefined;

function installBridge() {
  stopMirroring?.();
  const bridge = {
    onScores: vi.fn(),
    onTime: vi.fn(),
    onMatchSettings: vi.fn(),
    onAppSettings: vi.fn(),
    onMatchState: vi.fn(),
  };
  stopMirroring = mirrorStores(bridge);
  return bridge;
}

describe('Zustand stores', () => {
  beforeEach(() => {
    stopMirroring?.();
    stopMirroring = undefined;
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

  afterEach(() => {
    stopMirroring?.();
    stopMirroring = undefined;
  });

  it('merges score updates and notifies the bridge', () => {
    const api = installBridge();

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
    expect(api.onScores).toHaveBeenCalledWith(expectedScores);
  });

  it('merges time updates and notifies the bridge', () => {
    const api = installBridge();

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
    expect(api.onTime).toHaveBeenCalledWith(expectedTime);
  });

  it('merges match settings updates and keeps existing defaults', () => {
    const api = installBridge();

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
    expect(api.onMatchSettings).toHaveBeenCalledWith(expectedSettings);
  });

  it('replaces match settings wholesale, dropping omitted optional fields', () => {
    const api = installBridge();
    useMatchSettingsStore.getState().setMatchSettings({
      homeTeamLogo: 'file:///images/old-home.png',
      venue: 'Old Ground',
    });

    const replacement = { ...defaultMatchSettings, homeTeamNameFull: 'Rovers' };
    useMatchSettingsStore.getState().replaceMatchSettings(replacement);

    expect(useMatchSettingsStore.getState().matchSettings).toEqual(replacement);
    expect(api.onMatchSettings).toHaveBeenLastCalledWith(replacement);
  });

  it('merges match state updates and notifies the bridge', () => {
    const api = installBridge();

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
    expect(api.onMatchState).toHaveBeenCalledWith(expectedState);
  });

  it('merges app settings updates and notifies the bridge', () => {
    const api = installBridge();

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
    expect(api.onAppSettings).toHaveBeenCalledWith(expectedSettings);
  });

  it('tracks whether persisted settings have loaded (gates the first-run picker)', () => {
    installBridge();

    // Defaults to false so the picker stays hidden until the async load runs.
    expect(useAppSettingsStore.getInitialState().settingsLoaded).toBe(false);

    useAppSettingsStore.getState().markSettingsLoaded();
    expect(useAppSettingsStore.getState().settingsLoaded).toBe(true);
  });

  it('only notifies the bridge for the slice that changed', () => {
    const api = installBridge();

    // Same store, different field: the app settings themselves are unchanged,
    // so they are not resent.
    useAppSettingsStore.getState().markSettingsLoaded();
    expect(api.onAppSettings).not.toHaveBeenCalled();
  });

  it('stops notifying the bridge once disconnected', () => {
    const api = installBridge();
    stopMirroring?.();
    stopMirroring = undefined;

    useScoresStore.getState().setScores({ homeTeam: 3 });

    expect(useScoresStore.getState().scores.homeTeam).toBe(3);
    expect(api.onScores).not.toHaveBeenCalled();
  });

  it('stores custom graphics without notifying the bridge', () => {
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

  it('does not throw when no bridge is connected', () => {
    expect(() =>
      useScoresStore.getState().setScores({ awayTeam: 1 })
    ).not.toThrow();
    expect(useScoresStore.getState().scores.awayTeam).toBe(1);
  });
});
