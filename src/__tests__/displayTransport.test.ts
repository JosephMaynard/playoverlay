import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDisplayTransport } from '../displayTransport';

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onopen: (() => void) | null = null;
  url: string;
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send() {}

  close() {
    this.closed = true;
    this.onclose?.();
  }

  emitMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}

describe('displayTransport', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    window.history.pushState({}, '', '/display.html?ws=4750');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('delegates 1:1 to window.electronAPI in Electron mode', async () => {
    const unsubscribeScore = vi.fn();
    const onScoreUpdated = vi.fn().mockReturnValue(unsubscribeScore);
    const displayReady = vi.fn();
    const toggleFullscreen = vi.fn();
    const getFullscreenStatus = vi.fn().mockResolvedValue(true);

    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: {
        onScoreUpdated,
        onTimeUpdated: vi.fn(),
        onMatchSettingsUpdated: vi.fn(),
        onAppSettingsUpdated: vi.fn(),
        onMatchStateUpdated: vi.fn(),
        displayReady,
        toggleFullscreen,
        getFullscreenStatus,
      },
    });

    const transport = createDisplayTransport();
    expect(transport.isBrowserSource).toBe(false);
    expect(MockWebSocket.instances).toHaveLength(0);

    const callback = vi.fn();
    const unsubscribe = transport.onScoreUpdated(callback);
    expect(onScoreUpdated).toHaveBeenCalledWith(callback);
    expect(unsubscribe).toBe(unsubscribeScore);

    transport.displayReady();
    expect(displayReady).toHaveBeenCalledTimes(1);

    transport.toggleFullscreen();
    expect(toggleFullscreen).toHaveBeenCalledTimes(1);

    await expect(transport.getFullscreenStatus()).resolves.toBe(true);

    delete (window as { electronAPI?: unknown }).electronAPI;
  });

  it('connects a WebSocket and dispatches messages to the right channel', () => {
    delete (window as { electronAPI?: unknown }).electronAPI;
    const transport = createDisplayTransport();

    expect(transport.isBrowserSource).toBe(true);
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0].url).toBe('ws://localhost:4750');

    const scoreCallback = vi.fn();
    const timeCallback = vi.fn();
    transport.onScoreUpdated(scoreCallback);
    transport.onTimeUpdated(timeCallback);

    const socket = MockWebSocket.instances[0];
    socket.emitMessage({ channel: 'score-updated', payload: { homeTeam: 1, awayTeam: 0 } });

    expect(scoreCallback).toHaveBeenCalledWith({ homeTeam: 1, awayTeam: 0 });
    expect(timeCallback).not.toHaveBeenCalled();
  });

  it('replays the latest cached payload to a subscriber that joins after it arrived', () => {
    delete (window as { electronAPI?: unknown }).electronAPI;
    const transport = createDisplayTransport();
    const socket = MockWebSocket.instances[0];

    // Snapshot arrives before anything subscribes.
    socket.emitMessage({ channel: 'score-updated', payload: { homeTeam: 2, awayTeam: 1 } });

    const lateCallback = vi.fn();
    transport.onScoreUpdated(lateCallback);

    expect(lateCallback).toHaveBeenCalledTimes(1);
    expect(lateCallback).toHaveBeenCalledWith({ homeTeam: 2, awayTeam: 1 });

    // Later live updates still dispatch normally.
    socket.emitMessage({ channel: 'score-updated', payload: { homeTeam: 3, awayTeam: 1 } });
    expect(lateCallback).toHaveBeenCalledTimes(2);
    expect(lateCallback).toHaveBeenLastCalledWith({ homeTeam: 3, awayTeam: 1 });
  });

  it('does not replay a payload for a channel that has never received a message', () => {
    delete (window as { electronAPI?: unknown }).electronAPI;
    const transport = createDisplayTransport();

    const callback = vi.fn();
    transport.onTimeUpdated(callback);

    expect(callback).not.toHaveBeenCalled();
  });

  it('stops delivering to a channel once unsubscribed', () => {
    delete (window as { electronAPI?: unknown }).electronAPI;
    const transport = createDisplayTransport();
    const socket = MockWebSocket.instances[0];

    const callback = vi.fn();
    const unsubscribe = transport.onMatchStateUpdated(callback);
    socket.emitMessage({ channel: 'match-state-updated', payload: { displayScreen: 'scoreBug' } });
    expect(callback).toHaveBeenCalledTimes(1);

    unsubscribe();
    socket.emitMessage({ channel: 'match-state-updated', payload: { displayScreen: 'endScreen' } });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('ignores unparsable messages instead of throwing', () => {
    delete (window as { electronAPI?: unknown }).electronAPI;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const transport = createDisplayTransport();
    const socket = MockWebSocket.instances[0];
    const callback = vi.fn();
    transport.onScoreUpdated(callback);

    expect(() => socket.onmessage?.({ data: 'not json' })).not.toThrow();
    expect(callback).not.toHaveBeenCalled();
  });

  it('is a browser-source stub: displayReady/toggleFullscreen no-op, fullscreen status resolves true', async () => {
    delete (window as { electronAPI?: unknown }).electronAPI;
    const transport = createDisplayTransport();

    expect(() => transport.displayReady()).not.toThrow();
    expect(() => transport.toggleFullscreen()).not.toThrow();
    await expect(transport.getFullscreenStatus()).resolves.toBe(true);
  });

  it('reconnects automatically after the socket closes', () => {
    delete (window as { electronAPI?: unknown }).electronAPI;
    vi.useFakeTimers();
    createDisplayTransport();
    expect(MockWebSocket.instances).toHaveLength(1);

    MockWebSocket.instances[0].close();
    expect(MockWebSocket.instances).toHaveLength(1); // not yet — reconnect is delayed

    vi.advanceTimersByTime(2000);
    expect(MockWebSocket.instances).toHaveLength(2);
  });

  it('schedules a reconnect instead of dying when the WebSocket constructor throws', () => {
    delete (window as { electronAPI?: unknown }).electronAPI;
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    class ThrowingWebSocket {
      static attempts = 0;
      constructor() {
        ThrowingWebSocket.attempts += 1;
        throw new SyntaxError("Failed to construct 'WebSocket': invalid URL");
      }
    }
    vi.stubGlobal('WebSocket', ThrowingWebSocket);

    expect(() => createDisplayTransport()).not.toThrow();
    expect(ThrowingWebSocket.attempts).toBe(1);

    // The normal reconnect path keeps retrying.
    vi.advanceTimersByTime(2000);
    expect(ThrowingWebSocket.attempts).toBe(2);
    vi.advanceTimersByTime(2000);
    expect(ThrowingWebSocket.attempts).toBe(3);
  });

  it('closes a socket that has been silent for 30s so the reconnect path fires', () => {
    delete (window as { electronAPI?: unknown }).electronAPI;
    vi.useFakeTimers();
    createDisplayTransport();
    const socket = MockWebSocket.instances[0];

    vi.advanceTimersByTime(29999);
    expect(socket.closed).toBe(false);

    vi.advanceTimersByTime(1);
    expect(socket.closed).toBe(true);

    // The watchdog close routes through the normal reconnect path.
    vi.advanceTimersByTime(2000);
    expect(MockWebSocket.instances).toHaveLength(2);
  });

  it('keeps the socket open while messages keep arriving (watchdog resets)', () => {
    delete (window as { electronAPI?: unknown }).electronAPI;
    vi.useFakeTimers();
    createDisplayTransport();
    const socket = MockWebSocket.instances[0];

    vi.advanceTimersByTime(29999);
    socket.emitMessage({ channel: 'time-updated', payload: { time: '12:00' } });

    // A fresh 30s window starts after the message.
    vi.advanceTimersByTime(29999);
    expect(socket.closed).toBe(false);

    vi.advanceTimersByTime(1);
    expect(socket.closed).toBe(true);
  });
});
