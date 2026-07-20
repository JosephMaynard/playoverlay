import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultMatchSettings, defaultMatchState } from '../../constants';
import { AppSettings, MatchState, Scores, Time } from '../../types';
import Display from '../Display/Display';

// Minimal WebSocket stub for browser-source mode (no window.electronAPI),
// matching the pattern in src/__tests__/displayTransport.test.ts.
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onopen: (() => void) | null = null;
  url: string;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send() {}
  close() {
    this.onclose?.();
  }

  emitMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}

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
    // The match clock renders in exactly two places: the score bug and the
    // (hidden) spectator scoreboard
    expect(screen.getAllByText('63:21')).toHaveLength(2);
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

describe('Display browser-source ?screen= override', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete (window as { electronAPI?: unknown }).electronAPI;
    window.history.pushState({}, '', '/display.html');
  });

  async function renderBrowserSource(search: string) {
    delete (window as { electronAPI?: unknown }).electronAPI;
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    window.history.pushState({}, '', `/display.html${search}`);

    const { container } = render(<Display />);
    // Flush the fullscreen-status promise (resolves immediately in browser
    // mode) before driving further state, so its resolution doesn't land
    // outside of act().
    await act(async () => {});
    const socket = MockWebSocket.instances[0];

    act(() => {
      socket.emitMessage({
        channel: 'match-state-updated',
        payload: {
          ...defaultMatchState,
          displayScreen: 'matchTitle',
        } satisfies MatchState,
      });
    });

    return container;
  }

  it('pins the screen named by ?screen= regardless of the current matchState', async () => {
    const container = await renderBrowserSource('?ws=4750&screen=scoreboard');

    expect(
      container.querySelector('.ScoreboardLayout_active')
    ).not.toBeNull();
    expect(container.querySelector('.MatchTitleLayout_active')).toBeNull();
  });

  it('follows matchState when ?screen= names something invalid', async () => {
    const container = await renderBrowserSource('?ws=4750&screen=bogus');

    expect(container.querySelector('.MatchTitleLayout_active')).not.toBeNull();
    expect(container.querySelector('.ScoreboardLayout_active')).toBeNull();
  });

  it('follows matchState when ?screen=custom (custom screens cannot be pinned)', async () => {
    const container = await renderBrowserSource('?ws=4750&screen=custom');

    expect(container.querySelector('.MatchTitleLayout_active')).not.toBeNull();
    expect(container.querySelector('.ScoreboardLayout_active')).toBeNull();
  });

  it('follows matchState when ?screen= is absent', async () => {
    const container = await renderBrowserSource('?ws=4750');

    expect(container.querySelector('.MatchTitleLayout_active')).not.toBeNull();
    expect(container.querySelector('.ScoreboardLayout_active')).toBeNull();
  });

  it('never applies an override in Electron mode, even if ?screen= is present', async () => {
    window.history.pushState({}, '', '/display.html?screen=scoreboard');
    const { callbacks } = installDisplayAPI();
    const { container } = render(<Display />);
    await waitFor(() => expect(callbacks.matchState).toBeDefined());

    act(() => {
      callbacks.matchState?.({
        ...defaultMatchState,
        displayScreen: 'matchTitle',
      });
    });

    expect(container.querySelector('.MatchTitleLayout_active')).not.toBeNull();
    expect(container.querySelector('.ScoreboardLayout_active')).toBeNull();
  });
});
