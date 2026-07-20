import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocket, WebSocketServer } from 'ws';

// A single snapshot message sent to a browser source when it first connects,
// mirroring the shape broadcast on every subsequent update.
export interface SnapshotMessage {
  channel: string;
  payload: unknown;
}

export interface StartBrowserSourceServerOptions {
  port: number;
  imagesPath: string;
  getSnapshot: () => SnapshotMessage[];
  // Overridable for tests; see HEARTBEAT_INTERVAL_MS.
  heartbeatIntervalMs?: number;
}

// Browser pages cannot observe protocol-level ping frames, so the server
// sends an application-level heartbeat message on this interval. It keeps
// the client's liveness watchdog fed while no match data is flowing (idle
// connections would otherwise be indistinguishable from half-open ones).
// Must be comfortably shorter than the client watchdog in
// displayTransport.ts, which tolerates one missed beat.
const HEARTBEAT_INTERVAL_MS = 15000;

export type StartBrowserSourceServerResult =
  | { ok: true }
  | { ok: false; error: string };

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.json': 'application/json; charset=utf-8',
};

function contentTypeFor(filePath: string): string {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

// Serves `relativePath` from `baseDir`, refusing to serve anything that
// normalizes outside of `baseDir` (path traversal via `..` segments).
function serveStaticFile(
  res: http.ServerResponse,
  baseDir: string,
  relativePath: string
): void {
  const normalizedBase = path.normalize(baseDir);
  const target = path.normalize(path.join(normalizedBase, relativePath));

  if (target !== normalizedBase && !target.startsWith(normalizedBase + path.sep)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  fs.readFile(target, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentTypeFor(target) });
    res.end(data);
  });
}

export interface RequestListenerOptions {
  port: number;
  imagesPath: string;
  devServerUrl?: string;
  rootDir?: string;
}

export function createRequestListener(
  options: RequestListenerOptions
): http.RequestListener {
  return (req, res) => {
    let requestUrl: URL;
    let pathname: string;
    try {
      requestUrl = new URL(req.url ?? '/', 'http://localhost');
      pathname = decodeURIComponent(requestUrl.pathname);
    } catch {
      res.writeHead(400);
      res.end('Bad request');
      return;
    }

    if (pathname.startsWith('/images/')) {
      const fileName = path.basename(pathname.slice('/images/'.length));
      serveStaticFile(res, options.imagesPath, fileName);
      return;
    }

    if (options.devServerUrl) {
      // Preserve incoming query params (e.g. a browser-source `?screen=`
      // pin) across the redirect to the Vite dev server, merging in the
      // `ws` param it needs to reach this server's WebSocket port.
      const target = pathname === '/' ? '/display.html' : pathname;
      const params = new URLSearchParams(requestUrl.search);
      params.set('ws', String(options.port));
      res.writeHead(302, {
        Location: `${options.devServerUrl}${target}?${params.toString()}`,
      });
      res.end();
      return;
    }

    if (!options.rootDir) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const target = pathname === '/' ? 'display.html' : pathname;
    serveStaticFile(res, options.rootDir, target);
  };
}

// Browser pages can't load file:// URLs (team logos, custom-screen/overlay
// images), so snapshot and broadcast payloads get their images-directory
// file:// prefix rewritten to the server's own /images/ route. The prefix is
// a parameter (rather than computed from Electron's app.getPath here) so
// this stays pure and unit-testable without Electron.
export function rewriteFileUrls<T>(
  payload: T,
  imagesDirUrlPrefix: string
): T {
  const serialized = JSON.stringify(payload);
  if (serialized === undefined) return payload;
  return JSON.parse(serialized.split(imagesDirUrlPrefix).join('/images/'));
}

let server: http.Server | null = null;
let wss: WebSocketServer | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
const sockets = new Set<WebSocket>();

export function isBrowserSourceServerRunning(): boolean {
  return server !== null;
}

export function getBrowserSourceServerPort(): number | null {
  const address = server?.address();
  return address && typeof address === 'object' ? address.port : null;
}

export function getBrowserSourceServerAddress(): string | null {
  const address = server?.address();
  return address && typeof address === 'object' ? address.address : null;
}

// Binds an http+ws server to 127.0.0.1 only. Resolves `{ ok: false, error }`
// on any startup error (e.g. EADDRINUSE) instead of throwing, so a bad port
// can never crash the app.
export function startBrowserSourceServer(
  opts: StartBrowserSourceServerOptions
): Promise<StartBrowserSourceServerResult> {
  if (server) {
    return Promise.resolve({
      ok: false,
      error: 'Browser source server is already running',
    });
  }

  return new Promise((resolve) => {
    // These are Vite/Forge build-time globals (see forge.env.d.ts), textually
    // replaced in the built main bundle. Guarded with `typeof` so this module
    // stays importable (and its pure helpers testable) outside that bundle,
    // e.g. under vitest, where they're simply undeclared.
    const devServerUrl =
      typeof DISPLAY_WINDOW_VITE_DEV_SERVER_URL !== 'undefined'
        ? DISPLAY_WINDOW_VITE_DEV_SERVER_URL
        : undefined;
    const viteName =
      typeof DISPLAY_WINDOW_VITE_NAME !== 'undefined'
        ? DISPLAY_WINDOW_VITE_NAME
        : undefined;
    const rootDir =
      !devServerUrl && viteName
        ? path.join(__dirname, `../renderer/${viteName}`)
        : undefined;

    const httpServer = http.createServer(
      createRequestListener({
        port: opts.port,
        imagesPath: opts.imagesPath,
        devServerUrl,
        rootDir,
      })
    );

    const onError = (error: NodeJS.ErrnoException) => {
      httpServer.removeAllListeners();
      resolve({ ok: false, error: error.message ?? String(error) });
    };

    const onListening = () => {
      httpServer.removeListener('error', onError);
      server = httpServer;
      wss = new WebSocketServer({ server: httpServer });
      wss.on('connection', (socket) => {
        sockets.add(socket);
        socket.on('close', () => sockets.delete(socket));

        try {
          opts.getSnapshot().forEach(({ channel, payload }) => {
            socket.send(JSON.stringify({ channel, payload }));
          });
        } catch (error) {
          console.error('Error sending browser-source snapshot:', error);
        }
      });
      // Runtime errors after a successful bind must not crash the app either.
      httpServer.on('error', (error) => {
        console.error('Browser source server error:', error);
      });
      heartbeatInterval = setInterval(() => {
        broadcastToBrowserSources('heartbeat', null);
      }, opts.heartbeatIntervalMs ?? HEARTBEAT_INTERVAL_MS);
      resolve({ ok: true });
    };

    httpServer.once('error', onError);
    httpServer.once('listening', onListening);
    httpServer.listen(opts.port, '127.0.0.1');
  });
}

// Resolves once the underlying socket is actually released, so callers that
// intend to immediately restart on the same port (e.g. a settings change)
// don't race the OS into a transient EADDRINUSE.
export function stopBrowserSourceServer(): Promise<void> {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  sockets.forEach((socket) => socket.terminate());
  sockets.clear();
  wss?.close();
  wss = null;

  const serverToClose = server;
  server = null;
  if (!serverToClose) return Promise.resolve();

  return new Promise((resolve) => {
    serverToClose.close(() => resolve());
  });
}

export function broadcastToBrowserSources(
  channel: string,
  payload: unknown
): void {
  if (!wss) return;
  const message = JSON.stringify({ channel, payload });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
