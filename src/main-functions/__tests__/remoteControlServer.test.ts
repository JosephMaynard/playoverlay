import net from 'net';
import os from 'os';
import { WebSocket } from 'ws';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PairingThrottle,
  RemoteControlSnapshot,
  broadcastRemoteControlState,
  constantTimeEqual,
  getLanIPv4,
  getLanIPv4Candidates,
  getRemoteControlConnectedCount,
  getRemoteControlServerAddress,
  getRemoteControlServerPort,
  isAllowedOrigin,
  isRemoteControlServerRunning,
  parseRemoteCommand,
  startRemoteControlServer,
  stopRemoteControlServer,
} from '../remoteControlServer';
import {
  REMOTE_CONTROL_PAGE,
  REMOTE_HEARTBEAT_INTERVAL_MS,
  REMOTE_WATCHDOG_MS,
} from '../remoteControlPage';

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

  function ipv4(
    address: string,
    mac = 'a4:83:e7:12:34:56'
  ): os.NetworkInterfaceInfo {
    return {
      address,
      family: 'IPv4',
      internal: false,
      mac,
      netmask: '255.255.255.0',
      cidr: `${address}/24`,
    };
  }

  it('skips a WSL/Hyper-V vEthernet adapter listed before the real Wi-Fi', () => {
    // Windows commonly lists the WSL switch first.
    const interfaces = {
      'vEthernet (WSL)': [ipv4('172.25.160.1', '00:15:5d:aa:bb:cc')],
      'Wi-Fi': [ipv4('192.168.1.23')],
    };

    expect(getLanIPv4(interfaces)).toBe('192.168.1.23');
  });

  it('skips link-local (APIPA) addresses entirely', () => {
    const interfaces = {
      Ethernet: [ipv4('169.254.12.34')],
      'Wi-Fi': [ipv4('10.1.2.3')],
    };

    expect(getLanIPv4(interfaces)).toBe('10.1.2.3');
    expect(
      getLanIPv4Candidates(interfaces).map((candidate) => candidate.address)
    ).toEqual(['10.1.2.3']);
  });

  it('ranks VirtualBox host-only, VMware, Docker, and VPN adapters below the real LAN', () => {
    const interfaces = {
      'VirtualBox Host-Only Network': [
        ipv4('192.168.56.1', '0a:00:27:00:00:05'),
      ],
      'VMware Network Adapter VMnet8': [ipv4('192.168.80.1')],
      docker0: [ipv4('172.17.0.1', '02:42:ac:11:00:01')],
      utun4: [ipv4('100.101.102.103')],
      en0: [ipv4('192.168.0.50')],
    };

    const candidates = getLanIPv4Candidates(interfaces);
    expect(candidates[0]).toEqual({
      address: '192.168.0.50',
      interfaceName: 'en0',
      isPrivate: true,
      isLikelyVirtual: false,
    });
    // Private-on-virtual next, in OS order; the non-private tunnel last.
    expect(candidates.map((candidate) => candidate.address)).toEqual([
      '192.168.0.50',
      '192.168.56.1',
      '192.168.80.1',
      '172.17.0.1',
      '100.101.102.103',
    ]);
    expect(candidates.slice(1).every((c) => c.isLikelyVirtual)).toBe(true);
  });

  it('recognises a renamed virtual adapter by its MAC prefix or the VirtualBox host-only range', () => {
    const interfaces = {
      'Ethernet 2': [ipv4('192.168.56.1')],
      'Ethernet 3': [ipv4('10.0.75.1', '00:15:5d:01:02:03')],
      Ethernet: [ipv4('192.168.10.7')],
    };

    expect(getLanIPv4(interfaces)).toBe('192.168.10.7');
  });

  it('prefers a private address over a public one on real adapters', () => {
    const interfaces = {
      eth0: [ipv4('203.0.113.9')],
      eth1: [ipv4('172.20.4.4')],
    };

    expect(getLanIPv4(interfaces)).toBe('172.20.4.4');
    expect(getLanIPv4Candidates(interfaces)[1]).toMatchObject({
      address: '203.0.113.9',
      isPrivate: false,
      isLikelyVirtual: false,
    });
  });

  it('falls back to a virtual adapter when it is the only candidate', () => {
    const interfaces = {
      'vEthernet (Default Switch)': [ipv4('172.30.0.1')],
    };

    expect(getLanIPv4(interfaces)).toBe('172.30.0.1');
  });
});

describe('isAllowedOrigin', () => {
  it('allows a missing Origin (non-browser client)', () => {
    expect(isAllowedOrigin(undefined, '192.168.1.5:3006')).toBe(true);
  });

  it('allows the page served by this server', () => {
    expect(isAllowedOrigin('http://192.168.1.5:3006', '192.168.1.5:3006')).toBe(
      true
    );
    expect(isAllowedOrigin('http://MyPC.local:3006', 'mypc.local:3006')).toBe(
      true
    );
  });

  it('rejects any other origin, the opaque "null" origin, and garbage', () => {
    expect(isAllowedOrigin('http://evil.example', '192.168.1.5:3006')).toBe(
      false
    );
    // Same host, different port: a different site as far as the browser is
    // concerned (e.g. the browser source on 127.0.0.1:3005).
    expect(isAllowedOrigin('http://127.0.0.1:3005', '127.0.0.1:3006')).toBe(
      false
    );
    expect(isAllowedOrigin('null', '192.168.1.5:3006')).toBe(false);
    expect(isAllowedOrigin('not a url', '192.168.1.5:3006')).toBe(false);
    expect(isAllowedOrigin('http://192.168.1.5:3006', undefined)).toBe(false);
  });
});

describe('PairingThrottle', () => {
  const options = {
    maxFailures: 5,
    windowMs: 30000,
    cooldownMs: 30000,
    maxTrackedAddresses: 4,
  };

  it('cools down only the address that failed, never other devices', () => {
    const throttle = new PairingThrottle(options);
    for (let i = 0; i < 4; i += 1) {
      expect(throttle.recordFailure('192.168.1.66', 1000 + i)).toBe(0);
    }
    expect(throttle.recordFailure('192.168.1.66', 1004)).toBe(30000);

    expect(throttle.cooldownRemainingMs('192.168.1.66', 2004)).toBe(29000);
    // The operator's phone is unaffected by the attacker's lockout.
    expect(throttle.cooldownRemainingMs('192.168.1.20', 2004)).toBe(0);
  });

  it('forgets failures outside the window and lifts the cooldown when it expires', () => {
    const throttle = new PairingThrottle(options);
    for (let i = 0; i < 4; i += 1) throttle.recordFailure('a', i);
    // The earlier four fell out of the window, so this is a first failure.
    expect(throttle.recordFailure('a', 40000)).toBe(0);

    for (let i = 0; i < 4; i += 1) throttle.recordFailure('a', 40001 + i);
    expect(throttle.cooldownRemainingMs('a', 40004)).toBe(30000);
    expect(throttle.cooldownRemainingMs('a', 70004)).toBe(0);
  });

  it('clear() forgets an address after a successful pairing', () => {
    const throttle = new PairingThrottle(options);
    for (let i = 0; i < 4; i += 1) throttle.recordFailure('a', i);
    throttle.clear('a');
    expect(throttle.recordFailure('a', 10)).toBe(0);
  });

  it('never tracks more than maxTrackedAddresses, evicting expired then oldest entries', () => {
    const throttle = new PairingThrottle(options);
    for (let i = 0; i < 100; i += 1) {
      throttle.recordFailure(`10.0.0.${i}`, i);
      expect(throttle.trackedAddressCount).toBeLessThanOrEqual(4);
    }
    // The most recent addresses are the ones kept.
    throttle.recordFailure('10.0.0.99', 200);
    expect(throttle.trackedAddressCount).toBe(4);
  });
});

describe('remote control page constants', () => {
  it('uses a short heartbeat and a watchdog of two and a half beats', () => {
    // A half-open socket must not pass for "Connected" for long.
    expect(REMOTE_HEARTBEAT_INTERVAL_MS).toBeLessThanOrEqual(5000);
    expect(REMOTE_WATCHDOG_MS).toBe(REMOTE_HEARTBEAT_INTERVAL_MS * 2.5);
    expect(REMOTE_CONTROL_PAGE).toContain(
      `var WATCHDOG_MS = ${REMOTE_WATCHDOG_MS};`
    );
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

  it('disconnects an unpaired client that sends an oversized message', async () => {
    const onCommand = vi.fn();
    await startRemoteControlServer({
      port: 0,
      pin: '111111',
      getSnapshot: () => SNAPSHOT,
      onCommand,
    });
    const port = getRemoteControlServerPort()!;

    // Well past the 4 KiB protocol limit: ws must refuse it while the frame
    // is arriving rather than buffer it for handleMessage to discard.
    const client = new WebSocket(`ws://127.0.0.1:${port}`);
    const closeCode = await new Promise<number>((resolve, reject) => {
      client.on('error', reject);
      client.on('close', (code) => resolve(code));
      client.on('open', () => client.send('x'.repeat(1024 * 1024)));
    });

    // 1009: message too big.
    expect(closeCode).toBe(1009);
    expect(onCommand).not.toHaveBeenCalled();
    expect(isRemoteControlServerRunning()).toBe(true);
  });

  // Sends one frame on an open client and resolves with the next message of
  // the given type.
  function request(
    client: WebSocket,
    frame: Record<string, unknown>,
    type: string
  ): Promise<Record<string, unknown>> {
    return new Promise((resolve) => {
      const onMessage = (data: WebSocket.RawData) => {
        const message = JSON.parse(data.toString());
        if (message.type !== type) return;
        client.off('message', onMessage);
        resolve(message);
      };
      client.on('message', onMessage);
      client.send(JSON.stringify(frame));
    });
  }

  function openClient(port: number, origin?: string): Promise<WebSocket> {
    const client = new WebSocket(
      `ws://127.0.0.1:${port}`,
      origin ? { origin } : {}
    );
    return new Promise((resolve, reject) => {
      client.on('error', reject);
      client.on('open', () => resolve(client));
    });
  }

  it('explains a wrong PIN, then cools down the failing address even for the correct PIN', async () => {
    await startRemoteControlServer({
      port: 0,
      pin: '424242',
      getSnapshot: () => SNAPSHOT,
      onCommand: () => {},
    });
    const port = getRemoteControlServerPort()!;
    const client = await openClient(port);

    for (let i = 0; i < 4; i += 1) {
      expect(
        await request(client, { type: 'pair', pin: '000000' }, 'unauthorized')
      ).toEqual({ type: 'unauthorized', reason: 'wrongPin' });
    }
    // The fifth wrong PIN trips the cooldown and says so straight away.
    expect(
      await request(client, { type: 'pair', pin: '000000' }, 'unauthorized')
    ).toEqual({
      type: 'unauthorized',
      reason: 'cooldown',
      retryAfterSeconds: 30,
    });

    // A fresh socket from the same address is still cooling down, so a
    // brute-forcer can't reset its allowance by reconnecting.
    const second = await openClient(port);
    expect(
      await request(second, { type: 'pair', pin: '424242' }, 'unauthorized')
    ).toMatchObject({ reason: 'cooldown' });
    expect(getRemoteControlConnectedCount()).toBe(0);

    client.close();
    second.close();
  });

  it('issues a resume token that re-pairs a new socket without the PIN, even during a cooldown', async () => {
    const onCommand = vi.fn();
    await startRemoteControlServer({
      port: 0,
      pin: '135790',
      getSnapshot: () => SNAPSHOT,
      onCommand,
    });
    const port = getRemoteControlServerPort()!;

    const first = await openClient(port);
    const paired = await request(
      first,
      { type: 'pair', pin: '135790' },
      'paired'
    );
    expect(paired.token).toEqual(expect.any(String));
    expect((paired.token as string).length).toBeGreaterThanOrEqual(40);
    first.close();
    await vi.waitFor(() => expect(getRemoteControlConnectedCount()).toBe(0));

    // Trip this address's cooldown from another socket.
    const noisy = await openClient(port);
    for (let i = 0; i < 5; i += 1) {
      await request(noisy, { type: 'pair', pin: '000000' }, 'unauthorized');
    }

    // The reconnecting phone resumes with its token regardless.
    const second = await openClient(port);
    const resumeReply = request(
      second,
      { type: 'resume', token: paired.token },
      'state'
    );
    const state = await resumeReply;
    expect(state.payload).toEqual(SNAPSHOT);
    expect(getRemoteControlConnectedCount()).toBe(1);

    second.send(JSON.stringify({ type: 'awayGoal' }));
    await vi.waitFor(() =>
      expect(onCommand).toHaveBeenCalledWith({ type: 'awayGoal' })
    );

    noisy.close();
    second.close();
  });

  it('rejects an unknown resume token without counting it as a PIN failure', async () => {
    const onCommand = vi.fn();
    await startRemoteControlServer({
      port: 0,
      pin: '246810',
      getSnapshot: () => SNAPSHOT,
      onCommand,
    });
    const port = getRemoteControlServerPort()!;
    const client = await openClient(port);

    // Well past the failure threshold: phones paired before a restart each
    // present a stale token, and none of that may lock the operator out.
    for (let i = 0; i < 10; i += 1) {
      expect(
        await request(
          client,
          { type: 'resume', token: `stale-token-${i}` },
          'unauthorized'
        )
      ).toEqual({ type: 'unauthorized', reason: 'resumeRejected' });
    }

    // Still unpaired, so commands are ignored.
    client.send(JSON.stringify({ type: 'homeGoal' }));

    // And the correct PIN still pairs.
    const paired = await request(
      client,
      { type: 'pair', pin: '246810' },
      'paired'
    );
    expect(paired.type).toBe('paired');
    expect(onCommand).not.toHaveBeenCalled();

    client.close();
  });

  it('does not honour a resume token from a previous server run', async () => {
    await startRemoteControlServer({
      port: 0,
      pin: '112233',
      getSnapshot: () => SNAPSHOT,
      onCommand: () => {},
    });
    let port = getRemoteControlServerPort()!;
    const first = await openClient(port);
    const { token } = await request(
      first,
      { type: 'pair', pin: '112233' },
      'paired'
    );
    await stopRemoteControlServer();

    await startRemoteControlServer({
      port: 0,
      pin: '445566',
      getSnapshot: () => SNAPSHOT,
      onCommand: () => {},
    });
    port = getRemoteControlServerPort()!;
    const second = await openClient(port);
    expect(
      await request(second, { type: 'resume', token }, 'unauthorized')
    ).toMatchObject({ reason: 'resumeRejected' });

    second.close();
  });

  it('refuses a WebSocket upgrade from a foreign Origin but accepts its own page', async () => {
    await startRemoteControlServer({
      port: 0,
      pin: '123456',
      getSnapshot: () => SNAPSHOT,
      onCommand: () => {},
    });
    const port = getRemoteControlServerPort()!;

    const status = await new Promise<number | undefined>((resolve) => {
      const client = new WebSocket(`ws://127.0.0.1:${port}`, {
        origin: 'http://evil.example',
      });
      client.on('unexpected-response', (_req, res) => {
        resolve(res.statusCode);
        client.terminate();
      });
      client.on('open', () => {
        resolve(undefined);
        client.close();
      });
      client.on('error', () => {});
    });
    expect(status).toBe(403);

    const sameOrigin = await openClient(port, `http://127.0.0.1:${port}`);
    expect(sameOrigin.readyState).toBe(WebSocket.OPEN);
    sameOrigin.close();
  });

  it('sends heartbeats and terminates a paired phone that stops answering pings', async () => {
    const onConnectionChange = vi.fn();
    await startRemoteControlServer({
      port: 0,
      pin: '999999',
      getSnapshot: () => SNAPSHOT,
      onCommand: () => {},
      onConnectionChange,
      heartbeatIntervalMs: 40,
    });
    const port = getRemoteControlServerPort()!;
    const client = await openClient(port);
    await request(client, { type: 'pair', pin: '999999' }, 'state');
    await request(client, { type: 'noop' }, 'heartbeat');
    expect(getRemoteControlConnectedCount()).toBe(1);

    // Simulate a half-open connection: the phone's end stops reading, so the
    // server's pings go unanswered while TCP itself stays up.
    (client as unknown as { _socket: net.Socket })._socket.pause();

    await vi.waitFor(() => expect(getRemoteControlConnectedCount()).toBe(0), {
      timeout: 1000,
    });
    expect(onConnectionChange).toHaveBeenLastCalledWith(0);

    client.terminate();
  });

  it('stop is idempotent and safe to call when nothing is running', () => {
    expect(() => stopRemoteControlServer()).not.toThrow();
    expect(() => stopRemoteControlServer()).not.toThrow();
  });
});
