import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { defaultMatchSettings } from '../../constants';
import { AppSettings, MatchState, Scores, Time } from '../../types';
import Display from '../Display/Display';

function installDisplayAPI(fullscreenStatus = false) {
  const callbacks: {
    score?: (scores: Scores) => void;
    time?: (time: Time) => void;
    matchSettings?: (settings: typeof defaultMatchSettings) => void;
    appSettings?: (settings: AppSettings) => void;
    matchState?: (state: MatchState) => void;
  } = {};
  const removeScoreListener = vi.fn();
  const removeTimeListener = vi.fn();
  const removeMatchSettingsListener = vi.fn();
  const removeAppSettingsListener = vi.fn();
  const removeMatchStateListener = vi.fn();
  const electronAPI = {
    getFullscreenStatus: vi.fn().mockResolvedValue(fullscreenStatus),
    toggleFullscreen: vi.fn(),
    onScoreUpdated: vi.fn((callback: (scores: Scores) => void) => {
      callbacks.score = callback;
      return removeScoreListener;
    }),
    onTimeUpdated: vi.fn((callback: (time: Time) => void) => {
      callbacks.time = callback;
      return removeTimeListener;
    }),
    onMatchSettingsUpdated: vi.fn(
      (callback: (settings: typeof defaultMatchSettings) => void) => {
        callbacks.matchSettings = callback;
        return removeMatchSettingsListener;
      }
    ),
    onAppSettingsUpdated: vi.fn((callback: (settings: AppSettings) => void) => {
      callbacks.appSettings = callback;
      return removeAppSettingsListener;
    }),
    onMatchStateUpdated: vi.fn((callback: (state: MatchState) => void) => {
      callbacks.matchState = callback;
      return removeMatchStateListener;
    }),
    displayReady: vi.fn(),
  } as unknown as Window['electronAPI'];

  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: electronAPI,
  });

  return {
    callbacks,
    electronAPI,
    removeScoreListener,
    removeTimeListener,
    removeMatchSettingsListener,
    removeAppSettingsListener,
    removeMatchStateListener,
  };
}

describe('Display', () => {
  it('registers IPC listeners, requests initial state, and renders incoming updates', async () => {
    const { callbacks, electronAPI } = installDisplayAPI();
    const { container } = render(<Display />);

    await waitFor(() => expect(electronAPI.displayReady).toHaveBeenCalled());
    expect(electronAPI.onScoreUpdated).toHaveBeenCalledTimes(1);
    expect(electronAPI.onTimeUpdated).toHaveBeenCalledTimes(1);
    expect(electronAPI.onMatchSettingsUpdated).toHaveBeenCalledTimes(1);
    expect(electronAPI.onAppSettingsUpdated).toHaveBeenCalledTimes(1);
    expect(electronAPI.onMatchStateUpdated).toHaveBeenCalledTimes(1);

    act(() => {
      callbacks.matchSettings?.({
        ...defaultMatchSettings,
        homeTeamNameAbbreviated: 'TIG',
        awayTeamNameAbbreviated: 'BEA',
      });
      callbacks.appSettings?.({
        keyColour: '#123456',
        autoSwitchScreens: false,
      });
      callbacks.matchState?.({
        displayScreen: 'scoreBug',
        penaltiesFirstTeam: 'home',
        overlays: [],
      });
      callbacks.score?.({ homeTeam: 3, awayTeam: 2, penalties: [] });
      callbacks.time?.({ time: '63:21', additionalTime: 2 });
    });

    expect(screen.getAllByText('TIG').length).toBeGreaterThan(0);
    expect(screen.getAllByText('BEA').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/3 - 2/).length).toBeGreaterThan(0);
    // The match clock renders in both the score bug and the (hidden)
    // spectator scoreboard, so match on all occurrences
    expect(screen.getAllByText('63:21').length).toBeGreaterThan(0);
    expect(container.firstChild).toHaveStyle({ backgroundColor: '#123456' });
  });

  it('toggles fullscreen from the display button', async () => {
    const user = userEvent.setup();
    const { electronAPI } = installDisplayAPI(false);
    render(<Display />);

    await user.click(await screen.findByRole('button'));

    expect(electronAPI.toggleFullscreen).toHaveBeenCalledTimes(1);
    expect(electronAPI.getFullscreenStatus).toHaveBeenCalledTimes(2);
  });

  it('removes every IPC listener when unmounted', () => {
    const listeners = installDisplayAPI();
    const { unmount } = render(<Display />);

    unmount();

    expect(listeners.removeScoreListener).toHaveBeenCalledTimes(1);
    expect(listeners.removeTimeListener).toHaveBeenCalledTimes(1);
    expect(listeners.removeMatchSettingsListener).toHaveBeenCalledTimes(1);
    expect(listeners.removeAppSettingsListener).toHaveBeenCalledTimes(1);
    expect(listeners.removeMatchStateListener).toHaveBeenCalledTimes(1);
  });
});
