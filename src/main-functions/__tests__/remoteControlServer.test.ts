import net from 'net';
import os from 'os';
import { WebSocket } from 'ws';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  RemoteControlSnapshot,
  broadcastRemoteControlState,
  constantTimeEqual,
  getLanIPv4,
  getRemoteControlConnectedCount,
  getRemoteControlServerAddress,
  getRemoteControlServerPort,
  isRemoteControlServerRunning,
  parseRemoteCommand,
  startRemoteControlServer,
  stopRemoteControlServer,
} from '../remoteControlServer';

const SNAPSHOT: RemoteControlSnapshot = {
  scores: { homeTeam: 1, awayTeam: 0 },
  time: { time: '12:34', paused: false, matchPhase: 'firstHalf' },
  matchState: { displayScreen: 'scoreBug', matchPhase: 'firstHalf' },
  matchSettings: {
    homeTeamNameAbbreviated: 'HOM',
    awayTeamNameAbbreviated: 'AWA',
    homeTeamNameFull: 'Home Team',
    awayTeamNameFull: 'Away Team',
  },
};

// Opens a client, resolving once a message matching `predicate` arrives (or
// rejecting on timeout), collecting every message seen along the way.
function collectUntil(
  port: number,
  onOpen: (client: WebSocket) => void,
  predicate: (message: Record<string, unknown>) => boolean,
  timeoutMs = 1000
): Promise<{ client: WebSocket; messages: Record<string, unknown>[] }> {
  const client = new WebSocket(`ws://127.0.0.1:${port}`);
  const messages: Record<string, unknown>[] = [];
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('timed out waiting for message')),
      timeoutMs
    );
    client.on('error', reject);
    client.on('open', () => onOpen(client));
    client.on('message', (data) => {
      const message = JSON.parse(data.toString());
      messages.push(message);
      if (predicate(message)) {
        clearTimeout(timer);
        resolve({ client, messages });
      }
    });
  });
}

describe('constantTimeEqual', () => {
  it('accepts an identical PIN', () => {
    expect(constantTimeEqual('123456', '123456')).toBe(true);
  });

  it('rejects a wrong PIN of the same length', () => {
    expect(constantTimeEqual('123456', '123457')).toBe(false);
  });

  it('rejects a PIN of a different length', () => {
    expect(constantTimeEqual('123456', '12345')).toBe(false);
    expect(constantTimeEqual('123456', '1234567')).toBe(false);
  });

  it('rejects an empty candidate', () => {
    expect(constantTimeEqual('123456', '')).toBe(false);
    expect(constantTimeEqual('', '123456')).toBe(false);
  });

  it('treats two empty strings as equal', () => {
    // Not a real pairing case (the server never runs with an empty PIN), but
    // documents that the comparison itself is purely value-based.
    expect(constantTimeEqual('', '')).toBe(true);
  });
});

describe('parseRemoteCommand', () => {
  it('accepts each no-payload command in the allowlist', () => {
    for (const type of [
      'homeGoal',
      'awayGoal',
      'homeGoalRemove',
      'awayGoalRemove',
      'nextPhase',
      'toggleClock',
    ]) {
      expect(parseRemoteCommand({ type })).toEqual({ type });
    }
  });

  it('accepts setScreen with a known screen id', () => {
    expect(
      parseRemoteCommand({ type: 'setScreen', screen: 'scoreBug' })
    ).toEqual({ type: 'setScreen', screen: 'scoreBug' });
  });

  it('rejects setScreen with an unknown or missing screen id', () => {
    expect(
      parseRemoteCommand({ type: 'setScreen', screen: 'bogus' })
    ).toBeNull();
    expect(
      parseRemoteCommand({ type: 'setScreen', screen: 'custom' })
    ).toBeNull();
    expect(parseRemoteCommand({ type: 'setScreen' })).toBeNull();
  });

  it('rejects unknown command types and non-objects', () => {
    expect(parseRemoteCommand({ type: 'shutdown' })).toBeNull();
    expect(parseRemoteCommand({ type: 'pair', pin: '123456' })).toBeNull();
    expect(parseRemoteCommand({})).toBeNull();
    expect(parseRemoteCommand(null)).toBeNull();
    expect(parseRemoteCommand('homeGoal')).toBeNull();
  });

  it('ignores extra fields on an otherwise valid command', () => {
    expect(
      parseRemoteCommand({ type: 'homeGoal', pin: 'x', evil: true })
    ).toEqual({ type: 'homeGoal' });
  });
});

describe('getLanIPv4', () => {
  it('returns the first non-internal IPv4 address', () => {
    const interfaces = {
      lo0: [
        {
          address: '127.0.0.1',
          family: 'IPv4',
          internal: true,
        } as os.NetworkInterfaceInfo,
      ],
      en0: [
        {
          address: 'fe80::1',
          family: 'IPv6',
          internal: false,
        } as os.NetworkInterfaceInfo,
        {
          address: '192.168.1.42',
          family: 'IPv4',
          internal: false,
        } as os.NetworkInterfaceInfo,
      ],
    };

    expect(getLanIPv4(interfaces)).toBe('192.168.1.42');
  });

  it('accepts the numeric family reported by newer Node versions', () => {
    const interfaces = {
      en0: [
        {
          address: '10.0.0.5',
          family: 4 as unknown as 'IPv4',
          internal: false,
        } as os.NetworkInterfaceInfo,
      ],
    };

    expect(getLanIPv4(interfaces)).toBe('10.0.0.5');
  });

  it('returns null when only internal or IPv6 interfaces exist', () => {
    const interfaces = {
      lo0: [
        {
          address: '127.0.0.1',
          family: 'IPv4',
          internal: true,
        } as os.NetworkInterfaceInfo,
      ],
      en0: [
        {
          address: 'fe80::1',
          family: 'IPv6',
          internal: false,
        } as os.NetworkInterfaceInfo,
      ],
    };

    expect(getLanIPv4(interfaces)).toBeNull();
  });
});

describe('remote control server lifecycle', () => {
  afterEach(async () => {
    await stopRemoteControlServer();
  });

  it('is not running before start and is running after a successful start', async () => {
    expect(isRemoteControlServerRunning()).toBe(false);

    const result = await startRemoteControlServer({
      port: 0,
      pin: '123456',
      getSnapshot: () => SNAPSHOT,
      onCommand: () => {},
    });

    expect(result).toEqual({ ok: true });
    expect(isRemoteControlServerRunning()).toBe(true);
    expect(getRemoteControlServerPort()).toEqual(expect.any(Number));
  });

  it('binds to all interfaces (0.0.0.0) so a phone can reach it', async () => {
    await startRemoteControlServer({
      port: 0,
      pin: '123456',
      getSnapshot: () => SNAPSHOT,
      onCommand: () => {},
    });

    expect(getRemoteControlServerAddress()).toBe('0.0.0.0');
  });

  it('serves the self-contained control page at any path without touching the filesystem', async () => {
    await startRemoteControlServer({
      port: 0,
      pin: '123456',
      getSnapshot: () => SNAPSHOT,
      onCommand: () => {},
    });
    const port = getRemoteControlServerPort();

    const rootResponse = await fetch(`http://127.0.0.1:${port}/`);
    expect(rootResponse.status).toBe(200);
    expect(rootResponse.headers.get('content-type')).toContain('text/html');
    const rootBody = await rootResponse.text();
    expect(rootBody).toContain('PlayOverlay Remote');

    // A path-traversal-looking request returns the same in-memory page, never
    // a file from disk: there is no static file serving to traverse.
    const traversalResponse = await fetch(
      `http://127.0.0.1:${port}/${encodeURIComponent('../../../../etc/passwd')}`
    );
    expect(traversalResponse.status).toBe(200);
    const traversalBody = await traversalResponse.text();
    expect(traversalBody).toContain('PlayOverlay Remote');
    expect(traversalBody).not.toContain('root:');
  });

  it('pairs with the correct PIN, sends a snapshot, then routes commands from that socket', async () => {
    const onCommand = vi.fn();
    await startRemoteControlServer({
      port: 0,
      pin: '654321',
      getSnapshot: () => SNAPSHOT,
      onCommand,
    });
    const port = getRemoteControlServerPort()!;

    const { client, messages } = await collectUntil(
      port,
      (c) => c.send(JSON.stringify({ type: 'pair', pin: '654321' })),
      (message) => message.type === 'state'
    );

    // paired ack followed by the state snapshot.
    expect(messages.some((m) => m.type === 'paired')).toBe(true);
    const state = messages.find((m) => m.type === 'state');
    expect(state?.payload).toEqual(SNAPSHOT);
    expect(getRemoteControlConnectedCount()).toBe(1);

    client.send(JSON.stringify({ type: 'homeGoal' }));
    client.send(JSON.stringify({ type: 'setScreen', screen: 'scoreboard' }));
    await vi.waitFor(() => expect(onCommand).toHaveBeenCalledTimes(2));

    expect(onCommand).toHaveBeenNthCalledWith(1, { type: 'homeGoal' });
    expect(onCommand).toHaveBeenNthCalledWith(2, {
      type: 'setScreen',
      screen: 'scoreboard',
    });

    client.close();
  });

  it('ignores commands from an unpaired socket', async () => {
    const onCommand = vi.fn();
    await startRemoteControlServer({
      port: 0,
      pin: '111111',
      getSnapshot: () => SNAPSHOT,
      onCommand,
    });
    const port = getRemoteControlServerPort()!;

    const client = new WebSocket(`ws://127.0.0.1:${port}`);
    await new Promise<void>((resolve, reject) => {
      client.on('error', reject);
      client.on('open', () => {
        // No pair frame first: these commands must be ignored entirely.
        client.send(JSON.stringify({ type: 'homeGoal' }));
        client.send(JSON.stringify({ type: 'nextPhase' }));
        resolve();
      });
    });

    // Give the server ample time to (not) process the commands.
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(onCommand).not.toHaveBeenCalled();
    expect(getRemoteControlConnectedCount()).toBe(0);

    client.close();
  });

  it('rejects a wrong PIN and does not route that socket’s commands', async () => {
    const onCommand = vi.fn();
    await startRemoteControlServer({
      port: 0,
      pin: '222222',
      getSnapshot: () => SNAPSHOT,
      onCommand,
    });
    const port = getRemoteControlServerPort()!;

    const { client } = await collectUntil(
      port,
      (c) => c.send(JSON.stringify({ type: 'pair', pin: '000000' })),
      (message) => message.type === 'unauthorized'
    );

    client.send(JSON.stringify({ type: 'homeGoal' }));
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(onCommand).not.toHaveBeenCalled();

    client.close();
  });

  it('only broadcasts state to paired sockets', async () => {
    await startRemoteControlServer({
      port: 0,
      pin: '333333',
      getSnapshot: () => SNAPSHOT,
      onCommand: () => {},
    });
    const port = getRemoteControlServerPort()!;

    // Pair one client and leave a second unpaired.
    const paired = await collectUntil(
      port,
      (c) => c.send(JSON.stringify({ type: 'pair', pin: '333333' })),
      (message) => message.type === 'state'
    );

    const unpaired = new WebSocket(`ws://127.0.0.1:${port}`);
    const unpairedMessages: Record<string, unknown>[] = [];
    await new Promise<void>((resolve, reject) => {
      unpaired.on('error', reject);
      unpaired.on('open', () => resolve());
      unpaired.on('message', (data) =>
        unpairedMessages.push(JSON.parse(data.toString()))
      );
    });

    const next: RemoteControlSnapshot = {
      ...SNAPSHOT,
      scores: { homeTeam: 2, awayTeam: 0 },
    };
    const received = new Promise<Record<string, unknown>>((resolve) => {
      paired.client.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'state') resolve(message);
      });
    });

    broadcastRemoteControlState(next);
    const stateMessage = await received;
    expect(stateMessage.payload).toEqual(next);

    // The unpaired client must not have received the state broadcast (only,
    // at most, heartbeats, which this quick check doesn't trigger).
    expect(unpairedMessages.some((m) => m.type === 'state')).toBe(false);

    paired.client.close();
    unpaired.close();
  });

  it('resolves ok:false instead of throwing when the port is already in use', async () => {
    const blocker = net.createServer();
    await new Promise<void>((resolve) => blocker.listen(0, '0.0.0.0', resolve));
    const port = (blocker.address() as net.AddressInfo).port;

    try {
      const result = await startRemoteControlServer({
        port,
        pin: '123456',
        getSnapshot: () => SNAPSHOT,
        onCommand: () => {},
      });

      expect(result.ok).toBe(false);
      expect(isRemoteControlServerRunning()).toBe(false);
      await expect(stopRemoteControlServer()).resolves.toBeUndefined();
    } finally {
      await new Promise<void>((resolve) => blocker.close(() => resolve()));
    }
  });

  it('stop is idempotent and safe to call when nothing is running', () => {
    expect(() => stopRemoteControlServer()).not.toThrow();
    expect(() => stopRemoteControlServer()).not.toThrow();
  });
});
