// Abstracts how the display view receives state so the exact same
// components render both in the Electron display window (via IPC) and as a
// plain web page loaded as an OBS browser source (via WebSocket). Electron
// mode delegates 1:1 to window.electronAPI — nothing about its behavior
// changes.
import { AppSettings, MatchState, Scores, Time } from './types';
import { MatchSettings } from './zodSchemas';

type Unsubscribe = () => void;

export interface DisplayTransport {
  isBrowserSource: boolean;
  onScoreUpdated: (callback: (scores: Scores) => void) => Unsubscribe;
  onTimeUpdated: (callback: (time: Time) => void) => Unsubscribe;
  onMatchSettingsUpdated: (
    callback: (settings: MatchSettings) => void
  ) => Unsubscribe;
  onAppSettingsUpdated: (
    callback: (settings: AppSettings) => void
  ) => Unsubscribe;
  onMatchStateUpdated: (callback: (state: MatchState) => void) => Unsubscribe;
  displayReady: () => void;
  getFullscreenStatus: () => Promise<boolean>;
  toggleFullscreen: () => void;
}

const CHANNELS = [
  'score-updated',
  'time-updated',
  'match-settings-updated',
  'app-settings-updated',
  'match-state-updated',
] as const;

type Channel = (typeof CHANNELS)[number];

function createElectronTransport(): DisplayTransport {
  return {
    isBrowserSource: false,
    onScoreUpdated: (callback) => window.electronAPI.onScoreUpdated(callback),
    onTimeUpdated: (callback) => window.electronAPI.onTimeUpdated(callback),
    onMatchSettingsUpdated: (callback) =>
      window.electronAPI.onMatchSettingsUpdated(callback),
    onAppSettingsUpdated: (callback) =>
      window.electronAPI.onAppSettingsUpdated(callback),
    onMatchStateUpdated: (callback) =>
      window.electronAPI.onMatchStateUpdated(callback),
    displayReady: () => window.electronAPI.displayReady(),
    getFullscreenStatus: () =>
      Promise.resolve(window.electronAPI.getFullscreenStatus()),
    toggleFullscreen: () => window.electronAPI.toggleFullscreen(),
  };
}

const RECONNECT_DELAY_MS = 2000;
// If nothing arrives for this long the connection is assumed half-open
// (e.g. the TCP peer vanished without a FIN) and is torn down so the
// reconnect path fires. The server sends an application-level heartbeat
// every 15s (see browserSourceServer.ts) so a healthy idle connection is
// never torn down: this window tolerates one missed beat plus jitter. The
// server also pushes a full snapshot on every connect, so a reconnect
// always yields fresh data.
const LIVENESS_TIMEOUT_MS = 40000;

function createBrowserTransport(): DisplayTransport {
  const listeners: Record<Channel, Set<(payload: unknown) => void>> = {
    'score-updated': new Set(),
    'time-updated': new Set(),
    'match-settings-updated': new Set(),
    'app-settings-updated': new Set(),
    'match-state-updated': new Set(),
  };

  // The server pushes a full snapshot as soon as the socket opens, but a
  // subscriber (e.g. a Display component re-mounting) can start listening
  // after that snapshot has already arrived. Cache the latest payload per
  // channel so a late subscribe() can replay it instead of waiting for the
  // next live update.
  const latestPayloads = new Map<Channel, unknown>();

  function connect() {
    const params = new URLSearchParams(window.location.search);
    const port = params.get('ws') ?? window.location.port;

    // The constructor throws synchronously on a malformed URL (e.g. no
    // `?ws=` param and an empty window.location.port gives `ws://host:`).
    // Without this catch the whole transport would be dead forever.
    let socket: WebSocket;
    try {
      socket = new WebSocket(`ws://${window.location.hostname}:${port}`);
    } catch (error) {
      console.error('Failed to open browser-source WebSocket:', error);
      setTimeout(connect, RECONNECT_DELAY_MS);
      return;
    }

    // Liveness watchdog: a half-open connection delivers neither messages
    // nor a close event, silently freezing the scoreboard. Closing the
    // socket after a silent period routes through the normal reconnect
    // path below.
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    const resetWatchdog = () => {
      clearTimeout(watchdog);
      watchdog = setTimeout(() => socket.close(), LIVENESS_TIMEOUT_MS);
    };
    resetWatchdog();

    socket.onmessage = (event) => {
      resetWatchdog();
      try {
        const { channel, payload } = JSON.parse(event.data as string) as {
          channel: Channel;
          payload: unknown;
        };
        if (!CHANNELS.includes(channel)) return;
        latestPayloads.set(channel, payload);
        listeners[channel].forEach((callback) => callback(payload));
      } catch (error) {
        console.error('Failed to parse browser-source message:', error);
      }
    };

    // This runs for hours during a live stream — always try to come back.
    socket.onclose = () => {
      clearTimeout(watchdog);
      setTimeout(connect, RECONNECT_DELAY_MS);
    };
  }

  connect();

  function subscribe<T>(
    channel: Channel,
    callback: (payload: T) => void
  ): Unsubscribe {
    const wrapped = callback as (payload: unknown) => void;
    listeners[channel].add(wrapped);
    if (latestPayloads.has(channel)) {
      wrapped(latestPayloads.get(channel));
    }
    return () => {
      listeners[channel].delete(wrapped);
    };
  }

  return {
    isBrowserSource: true,
    onScoreUpdated: (callback) => subscribe('score-updated', callback),
    onTimeUpdated: (callback) => subscribe('time-updated', callback),
    onMatchSettingsUpdated: (callback) =>
      subscribe('match-settings-updated', callback),
    onAppSettingsUpdated: (callback) =>
      subscribe('app-settings-updated', callback),
    onMatchStateUpdated: (callback) =>
      subscribe('match-state-updated', callback),
    // No-op: the server pushes a full snapshot as soon as the socket opens.
    displayReady: () => {},
    // Never show/rely on the Electron fullscreen button in a browser source.
    getFullscreenStatus: () => Promise.resolve(true),
    toggleFullscreen: () => {},
  };
}

export function createDisplayTransport(): DisplayTransport {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return createElectronTransport();
  }
  return createBrowserTransport();
}
