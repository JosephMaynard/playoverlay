import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  defaultAppSettings,
  defaultMatchSettings,
  useAppSettingsStore,
  useMatchSettingsStore,
  useMatchStateStore,
  useScoresStore,
  useTimeStore,
  useUndoStore,
} from '@playoverlay/core';
import { connectStoresToElectron } from '../electronBridge';

function installElectronAPI() {
  const electronAPI = {
    updateScores: vi.fn(),
    updateTime: vi.fn(),
    updateMatchState: vi.fn(),
    updateMatchSettings: vi.fn(),
    updateAppSettings: vi.fn(),
    logMatchEvent: vi.fn(),
  } as unknown as Window['electronAPI'];

  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: electronAPI,
  });

  return electronAPI;
}

describe('connectStoresToElectron', () => {
  let disconnect: (() => void) | undefined;

  afterEach(() => {
    disconnect?.();
    disconnect = undefined;
    delete (window as Partial<Window>).electronAPI;
  });

  it('sends each store change to its IPC channel', () => {
    const electronAPI = installElectronAPI();
    disconnect = connectStoresToElectron();

    useScoresStore.getState().setScores({ homeTeam: 2 });
    useTimeStore.getState().setTime({ time: '1:00' });
    useMatchStateStore.getState().setMatchState({ displayScreen: 'scoreBug' });
    useMatchSettingsStore.getState().replaceMatchSettings({
      ...defaultMatchSettings,
      venue: 'Home Park',
    });
    useAppSettingsStore.getState().setAppSettings({ ...defaultAppSettings });

    expect(electronAPI.updateScores).toHaveBeenCalledWith(
      useScoresStore.getState().scores
    );
    expect(electronAPI.updateTime).toHaveBeenCalledWith(
      useTimeStore.getState().time
    );
    expect(electronAPI.updateMatchState).toHaveBeenCalledWith(
      useMatchStateStore.getState().matchState
    );
    expect(electronAPI.updateMatchSettings).toHaveBeenCalledWith(
      useMatchSettingsStore.getState().matchSettings
    );
    expect(electronAPI.updateAppSettings).toHaveBeenCalledWith(
      useAppSettingsStore.getState().appSettings
    );
  });

  it('logs recorded operator actions to the main process', () => {
    const electronAPI = installElectronAPI();
    disconnect = connectStoresToElectron();

    useUndoStore.getState().captureUndo('undo:actions.homeGoal', ['scores']);

    expect(electronAPI.logMatchEvent).toHaveBeenCalledWith(
      'undo:actions.homeGoal',
      'laptop'
    );
  });

  it('stops sending once disconnected, and copes with no electronAPI', () => {
    const electronAPI = installElectronAPI();
    connectStoresToElectron()();

    useScoresStore.getState().setScores({ awayTeam: 1 });
    useUndoStore.getState().captureUndo('undo:actions.awayGoal', ['scores']);
    expect(electronAPI.updateScores).not.toHaveBeenCalled();
    expect(electronAPI.logMatchEvent).not.toHaveBeenCalled();

    delete (window as Partial<Window>).electronAPI;
    disconnect = connectStoresToElectron();
    expect(() =>
      useScoresStore.getState().setScores({ awayTeam: 2 })
    ).not.toThrow();
  });
});
