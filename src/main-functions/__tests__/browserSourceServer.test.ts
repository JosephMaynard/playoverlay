import net from 'net';
import { WebSocket } from 'ws';
import { afterEach, describe, expect, it } from 'vitest';
import {
  broadcastToBrowserSources,
  getBrowserSourceServerAddress,
  getBrowserSourceServerPort,
  isBrowserSourceServerRunning,
  rewriteFileUrls,
  startBrowserSourceServer,
  stopBrowserSourceServer,
} from '../browserSourceServer';

describe('rewriteFileUrls', () => {
  it('rewrites every occurrence of the images-dir file:// prefix to /images/', () => {
    const prefix = 'file:///Users/joe/Library/Application Support/playoverlay/images/';
    const payload = {
      homeTeamLogo: `${prefix}home-logo.png`,
      awayTeamLogo: `${prefix}away-logo.png`,
      nested: { customScreenImageUrl: `${prefix}graphic-1.png` },
      overlays: [{ url: `${prefix}overlay.png`, title: 'Overlay' }],
    };

    const result = rewriteFileUrls(payload, prefix);

    expect(result).toEqual({
      homeTeamLogo: '/images/home-logo.png',
      awayTeamLogo: '/images/away-logo.png',
      nested: { customScreenImageUrl: '/images/graphic-1.png' },
      overlays: [{ url: '/images/overlay.png', title: 'Overlay' }],
    });
  });

  it('leaves payloads with no matching prefix unchanged (aside from a deep clone)', () => {
    const payload = { homeTeamNameFull: 'Home Team', score: 3 };

    const result = rewriteFileUrls(payload, 'file:///some/images/dir/');

    expect(result).toEqual(payload);
    expect(result).not.toBe(payload);
  });

  it('handles payloads with no file:// URLs at all, e.g. scores/time', () => {
    const payload = { homeTeam: 2, awayTeam: 1, penalties: [] as string[] };

    expect(rewriteFileUrls(payload, 'file:///images/')).toEqual(payload);
  });
});

describe('browser source server lifecycle', () => {
  afterEach(async () => {
    await stopBrowserSourceServer();
  });

  it('is not running before start and is running after a successful start', async () => {
    expect(isBrowserSourceServerRunning()).toBe(false);

    const result = await startBrowserSourceServer({
      port: 0,
      imagesPath: '/tmp/does-not-matter',
      getSnapshot: () => [],
    });

    expect(result).toEqual({ ok: true });
    expect(isBrowserSourceServerRunning()).toBe(true);
    expect(getBrowserSourceServerPort()).toEqual(expect.any(Number));
  });

  it('sends the snapshot to a newly connected client, then broadcasts further updates', async () => {
    await startBrowserSourceServer({
      port: 0,
      imagesPath: '/tmp/does-not-matter',
      getSnapshot: () => [
        { channel: 'match-settings-updated', payload: { homeTeamNameFull: 'Home' } },
        { channel: 'score-updated', payload: { homeTeam: 0, awayTeam: 0 } },
      ],
    });
    const port = getBrowserSourceServerPort();

    const client = new WebSocket(`ws://127.0.0.1:${port}`);
    const received: unknown[] = [];

    await new Promise<void>((resolve, reject) => {
      client.on('error', reject);
      client.on('message', (data) => {
        received.push(JSON.parse(data.toString()));
        if (received.length === 3) resolve();
      });
      client.on('open', () => {
        // Give the connection handler a tick to send the snapshot before
        // triggering a broadcast, so ordering is deterministic.
        setTimeout(() => {
          broadcastToBrowserSources('score-updated', { homeTeam: 1, awayTeam: 0 });
        }, 50);
      });
    });

    expect(received).toEqual([
      { channel: 'match-settings-updated', payload: { homeTeamNameFull: 'Home' } },
      { channel: 'score-updated', payload: { homeTeam: 0, awayTeam: 0 } },
      { channel: 'score-updated', payload: { homeTeam: 1, awayTeam: 0 } },
    ]);

    client.close();
  });

  it('does not broadcast to anything once stopped', () => {
    expect(() =>
      broadcastToBrowserSources('score-updated', { homeTeam: 0, awayTeam: 0 })
    ).not.toThrow();
  });

  it('resolves ok:false instead of throwing when the port is already in use', async () => {
    const blocker = net.createServer();
    await new Promise<void>((resolve) => blocker.listen(0, '127.0.0.1', resolve));
    const port = (blocker.address() as net.AddressInfo).port;

    try {
      const result = await startBrowserSourceServer({
        port,
        imagesPath: '/tmp/does-not-matter',
        getSnapshot: () => [],
      });

      expect(result.ok).toBe(false);
      expect(isBrowserSourceServerRunning()).toBe(false);

      // Assert the actual resolved value of the shutdown rather than just
      // that it doesn't throw, so a stop that silently resolves the wrong
      // thing would still be caught.
      await expect(stopBrowserSourceServer()).resolves.toBeUndefined();
    } finally {
      // Always close the blocker, even if an assertion above fails, so a
      // failing test doesn't leak a listening socket into the next test.
      await new Promise<void>((resolve) => blocker.close(() => resolve()));
    }
  });

  it('resolves ok:false on a second start without stopping the first', async () => {
    const first = await startBrowserSourceServer({
      port: 0,
      imagesPath: '/tmp/does-not-matter',
      getSnapshot: () => [],
    });
    expect(first.ok).toBe(true);

    const second = await startBrowserSourceServer({
      port: 0,
      imagesPath: '/tmp/does-not-matter',
      getSnapshot: () => [],
    });

    expect(second).toEqual({ ok: false, error: expect.any(String) });
  });

  it('stop is idempotent and safe to call when nothing is running', () => {
    expect(() => stopBrowserSourceServer()).not.toThrow();
    expect(() => stopBrowserSourceServer()).not.toThrow();
  });

  it('binds only to 127.0.0.1, not all interfaces', async () => {
    await startBrowserSourceServer({
      port: 0,
      imagesPath: '/tmp/does-not-matter',
      getSnapshot: () => [],
    });

    expect(getBrowserSourceServerAddress()).toBe('127.0.0.1');
  });

  it('serves /images/<name> from the configured images directory', async () => {
    const fs = await import('fs');
    const os = await import('os');
    const path = await import('path');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'playoverlay-images-'));
    fs.writeFileSync(path.join(dir, 'logo.png'), 'fake-png-bytes');

    await startBrowserSourceServer({
      port: 0,
      imagesPath: dir,
      getSnapshot: () => [],
    });
    const port = getBrowserSourceServerPort();

    const response = await fetch(`http://127.0.0.1:${port}/images/logo.png`);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('fake-png-bytes');

    fs.rmSync(dir, { force: true, recursive: true });
  });

  it('refuses path traversal attempts against the images directory', async () => {
    const fs = await import('fs');
    const os = await import('os');
    const path = await import('path');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'playoverlay-images-'));
    // A file that exists just outside the served images directory — a
    // traversal attempt must never be able to reach it.
    const secretPath = path.join(path.dirname(dir), `secret-${path.basename(dir)}.txt`);
    fs.writeFileSync(secretPath, 'top secret');

    await startBrowserSourceServer({
      port: 0,
      imagesPath: dir,
      getSnapshot: () => [],
    });
    const port = getBrowserSourceServerPort();

    const response = await fetch(
      `http://127.0.0.1:${port}/images/${encodeURIComponent(`../${path.basename(secretPath)}`)}`
    );
    expect(response.status).toBe(404);

    fs.rmSync(secretPath, { force: true });
    fs.rmSync(dir, { force: true, recursive: true });
  });
});
