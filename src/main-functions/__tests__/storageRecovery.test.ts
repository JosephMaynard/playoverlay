import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

// These tests exercise createStorage against the REAL electron-store (the
// tests in storage.test.ts substitute a MockStore), because the failure they
// guard against lives inside electron-store/conf: with clearInvalidConfig
// defaulting to false, constructing a Store over a non-JSON config.json
// throws a SyntaxError at module load, e.g. a 0.14 user with an encrypted
// config upgrading to a keyless build would crash-loop before app.ready.
//
// electron-store natively requires 'electron' from node_modules (vitest
// module mocks don't reach externalized packages), so a stub electron module
// is injected straight into Node's require cache instead.

const nodeRequire = createRequire(import.meta.url);
const electronModulePath = nodeRequire.resolve('electron');
const originalElectronModule = nodeRequire.cache[electronModulePath];

// Points at the current test's temporary userData directory. The stub reads
// it lazily, so every `new Store()` picks up the active test's directory.
let currentUserDataDir = '';

// Drop any cached copies of electron-store/conf so they (re-)require the
// stubbed electron module rather than a previously captured binding.
for (const cachedId of Object.keys(nodeRequire.cache)) {
  if (
    cachedId.includes(`${path.sep}electron-store${path.sep}`) ||
    cachedId.includes(`${path.sep}conf${path.sep}`)
  ) {
    delete nodeRequire.cache[cachedId];
  }
}

nodeRequire.cache[electronModulePath] = {
  id: electronModulePath,
  filename: electronModulePath,
  path: path.dirname(electronModulePath),
  loaded: true,
  exports: {
    app: {
      getPath: () => currentUserDataDir,
      getVersion: () => '0.0.0-test',
    },
    ipcMain: {
      on: (): void => {
        // electron-store registers a data listener; nothing to do here.
      },
    },
  },
  children: [],
  paths: [],
} as unknown as NodeModule;

const temporaryDirectories: string[] = [];

async function loadStorageWithRealStore() {
  vi.resetModules();
  // storage.ts's own `import { app } from 'electron'` goes through vitest's
  // module runner, which the require-cache stub does not cover.
  vi.doMock('electron', () => ({
    app: {
      getPath: vi.fn(() => currentUserDataDir),
      getVersion: vi.fn(() => '0.0.0-test'),
    },
  }));
  return import('../storage');
}

describe('storage with the real electron-store', () => {
  beforeEach(() => {
    currentUserDataDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'playoverlay-real-store-')
    );
    temporaryDirectories.push(currentUserDataDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    temporaryDirectories.splice(0).forEach((temporaryDirectory) => {
      fs.rmSync(temporaryDirectory, { force: true, recursive: true });
    });
  });

  afterAll(() => {
    if (originalElectronModule) {
      nodeRequire.cache[electronModulePath] = originalElectronModule;
    } else {
      delete nodeRequire.cache[electronModulePath];
    }
  });

  it('reads an existing valid config.json', async () => {
    const configPath = path.join(currentUserDataDir, 'config.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        APP_SETTINGS: { keyColour: '#abcdef', autoSwitchScreens: false },
      })
    );

    const storage = await loadStorageWithRealStore();

    expect(storage.getAppSettings()).toEqual(
      expect.objectContaining({
        keyColour: '#abcdef',
        autoSwitchScreens: false,
      })
    );
    expect(fs.existsSync(`${configPath}.bak`)).toBe(false);
  });

  it('recovers from a non-JSON config.json by preserving it as config.json.bak and starting fresh', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const configPath = path.join(currentUserDataDir, 'config.json');
    // Binary garbage, e.g. a legacy encrypted config in a keyless build.
    const garbage = Buffer.from([0x00, 0x92, 0xff, 0xfe, 0x13, 0x37, 0x00]);
    fs.writeFileSync(configPath, garbage);

    // Module load must not throw (this was the crash loop before app.ready).
    const storage = await loadStorageWithRealStore();
    expect(consoleError).toHaveBeenCalled();

    // The unreadable config is preserved byte-for-byte for a keyed rescue.
    expect(fs.readFileSync(`${configPath}.bak`)).toEqual(garbage);

    // The replacement store is fully functional.
    storage.setAppSettings({ keyColour: '#123456', autoSwitchScreens: true });
    expect(storage.getAppSettings()).toEqual(
      expect.objectContaining({
        keyColour: '#123456',
        autoSwitchScreens: true,
      })
    );

    // And it persists valid JSON to a fresh config.json.
    const rewritten = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    expect(rewritten.APP_SETTINGS).toEqual({
      keyColour: '#123456',
      autoSwitchScreens: true,
    });
  });
});
