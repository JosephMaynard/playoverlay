// Smoke test: launch the PACKAGED app and confirm it actually starts and
// renders a window. This exists because `electron-forge package` can produce a
// build that compiles fine but crashes the instant the main process runs (for
// example "Cannot find module 'zod'" when a dependency is not bundled). The
// normal test suite runs against source with node_modules present, so it can
// never catch a packaging fault. This launches the real built binary the way a
// user would and fails loudly if it does not come up.
//
// Cross-platform so it can be run locally (macOS/Windows) as well as on the
// Linux CI runner (under xvfb, with --no-sandbox).

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DEBUG_PORT = 9222;
const STARTUP_TIMEOUT_MS = 45000;
const POLL_INTERVAL_MS = 1000;
// Bound for each CDP round trip so a half-open socket cannot hang the poll.
const CDP_TIMEOUT_MS = 5000;
const OUT_DIR = 'out';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// electron-forge writes to out/<ProductName>-<platform>-<arch>/. The binary is
// PlayOverlay.app on macOS and the lowercase executableName elsewhere.
function findPackagedBinary() {
  if (!existsSync(OUT_DIR)) return null;
  for (const entry of readdirSync(OUT_DIR)) {
    const dir = path.join(OUT_DIR, entry);
    const candidates =
      process.platform === 'darwin'
        ? [path.join(dir, 'PlayOverlay.app/Contents/MacOS/playoverlay')]
        : process.platform === 'win32'
          ? [path.join(dir, 'playoverlay.exe')]
          : [path.join(dir, 'playoverlay')];
    for (const candidate of candidates) {
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

// Wraps a promise so it rejects after CDP_TIMEOUT_MS or when the socket
// closes, whichever comes first. The timer is cleared on settlement.
function withCdpBound(ws, label, promise) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`CDP ${label} timed out`)),
      CDP_TIMEOUT_MS
    );
    const onClose = () =>
      reject(new Error(`CDP socket closed during ${label}`));
    ws.addEventListener('close', onClose);
    promise.then(resolve, reject).finally(() => {
      clearTimeout(timer);
      ws.removeEventListener('close', onClose);
    });
  });
}

// One-shot CDP eval over the target's WebSocket, resolving the returned value.
async function evaluateInPage(webSocketDebuggerUrl, expression) {
  const ws = new WebSocket(webSocketDebuggerUrl);
  try {
    await withCdpBound(
      ws,
      'connect',
      new Promise((resolve, reject) => {
        ws.onopen = resolve;
        ws.onerror = () => reject(new Error('CDP socket error'));
      })
    );
    return await withCdpBound(
      ws,
      'Runtime.evaluate',
      new Promise((resolve, reject) => {
        const id = 1;
        ws.addEventListener('message', (event) => {
          const data = JSON.parse(event.data);
          if (data.id !== id) return;
          if (data.error) reject(new Error(JSON.stringify(data.error)));
          else resolve(data.result?.result?.value);
        });
        ws.send(
          JSON.stringify({
            id,
            method: 'Runtime.evaluate',
            params: { expression, returnByValue: true },
          })
        );
      })
    );
  } finally {
    ws.close();
  }
}

// Waits until the control window exists and its React root has mounted content,
// which proves the main process started AND the renderer loaded the real app
// (not a blank page or an error dialog). Throws if the app exits early or the
// window never renders within the timeout.
async function waitForRenderedWindow(child) {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    // A signal-killed process (e.g. SIGSEGV) has a null exitCode, so check
    // both or the loop would keep polling a dead app until the timeout.
    if (child.exitCode !== null || child.signalCode !== null) {
      const how =
        child.signalCode !== null
          ? `signal ${child.signalCode}`
          : `code ${child.exitCode}`;
      throw new Error(`App exited before a window appeared (${how})`);
    }
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`, {
        signal: AbortSignal.timeout(
          Math.max(1, Math.min(CDP_TIMEOUT_MS, deadline - Date.now()))
        ),
      });
      const targets = await res.json();
      // The control window titles itself "PlayOverlay"; the display window is
      // "PlayOverlay - Display Window". Prefer the control window.
      const page =
        targets.find((t) => t.type === 'page' && t.title === 'PlayOverlay') ||
        targets.find(
          (t) => t.type === 'page' && /PlayOverlay/.test(t.title || '')
        );
      if (page?.webSocketDebuggerUrl) {
        const rootChildren = await evaluateInPage(
          page.webSocketDebuggerUrl,
          "document.querySelector('#root')?.children.length ?? 0"
        );
        if (typeof rootChildren === 'number' && rootChildren > 0) {
          return { title: page.title, rootChildren };
        }
      }
    } catch {
      // Debug endpoint not up yet, or window still loading. Keep polling.
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error('Timed out waiting for the app window to render');
}

async function main() {
  const binary = findPackagedBinary();
  if (!binary) {
    console.error(
      `No packaged binary found under ${OUT_DIR}/. Run \`npm run package\` first.`
    );
    process.exit(1);
  }
  console.log(`Launching packaged app: ${binary}`);

  const args = [`--remote-debugging-port=${DEBUG_PORT}`];
  // The bundled chrome-sandbox needs a SUID root helper that CI containers do
  // not have; user machines do not need this flag.
  if (process.platform !== 'darwin') args.push('--no-sandbox');

  // The app gets a throwaway profile (see src/main-functions/
  // userDataOverride.ts), so a local run never reads or overwrites the
  // developer's real settings, saved matches, images or logs, and never
  // collides with a copy of PlayOverlay that is already open.
  const userDataDir = mkdtempSync(
    path.join(os.tmpdir(), 'playoverlay-smoke-test-')
  );
  const child = spawn(binary, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PLAYOVERLAY_USER_DATA_DIR: userDataDir },
  });
  let output = '';
  child.stdout.on('data', (d) => (output += d));
  child.stderr.on('data', (d) => (output += d));
  // A failed spawn (ENOENT, EACCES, ...) surfaces as an 'error' event. Route it
  // into the same failure path as a crash instead of an unhandled event.
  const spawnFailed = new Promise((_, reject) => {
    child.on('error', (err) =>
      reject(new Error(`Failed to launch app: ${err.message}`))
    );
  });

  try {
    const result = await Promise.race([
      waitForRenderedWindow(child),
      spawnFailed,
    ]);
    console.log(
      `OK: window "${result.title}" rendered (#root has ${result.rootChildren} children).`
    );
    process.exitCode = 0;
  } catch (error) {
    console.error(`SMOKE TEST FAILED: ${error.message}`);
    if (output.trim()) {
      console.error('--- app output ---');
      console.error(output.trim());
      console.error('------------------');
    }
    process.exitCode = 1;
  } finally {
    child.kill('SIGKILL');
    await removeUserDataDir(child, userDataDir);
  }
}

// Waits for the killed app to exit (on Windows its files stay locked until
// then) and deletes the throwaway profile. A leftover temp folder is not
// worth failing the smoke test over, so errors are only reported.
async function removeUserDataDir(child, userDataDir) {
  if (child.exitCode === null && child.signalCode === null) {
    await Promise.race([
      new Promise((resolve) => child.once('exit', resolve)),
      sleep(5000),
    ]);
  }
  try {
    rmSync(userDataDir, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 200,
    });
  } catch (error) {
    console.warn(
      `Could not remove the smoke test profile ${userDataDir}: ${error.message}`
    );
  }
}

main().catch((error) => {
  console.error(`SMOKE TEST FAILED: ${error?.stack ?? error}`);
  process.exitCode = 1;
});
