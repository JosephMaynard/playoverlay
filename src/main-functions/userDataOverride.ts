import fs from 'fs';
import path from 'path';
import { app } from 'electron';

// Isolation hook for automated launches (scripts/smoke-test-packaged.mjs):
// when this variable is set, everything the app persists (config.json, the
// images folder, logs, the single-instance lock) lives in that directory
// instead of the operator's real profile, so a test run can never read or
// overwrite a real club's saved matches. Unset in normal use, which makes
// this a no-op.
export const USER_DATA_DIR_ENV = 'PLAYOVERLAY_USER_DATA_DIR';

type PathSetter = Pick<typeof app, 'setPath'>;

export function applyUserDataOverride(
  env: NodeJS.ProcessEnv = process.env,
  electronApp: PathSetter = app
): string | undefined {
  const requested = env[USER_DATA_DIR_ENV]?.trim();
  if (!requested) return undefined;
  const resolved = path.resolve(requested);
  // app.setPath throws for a directory that doesn't exist yet.
  fs.mkdirSync(resolved, { recursive: true });
  electronApp.setPath('userData', resolved);
  return resolved;
}

// Runs at import time on purpose. Several modules read
// app.getPath('userData') while they are being imported (storage.ts creates
// the store, fileHandler.ts creates the images folder, main.ts starts the
// logger), so main.ts imports this module before any of them.
applyUserDataOverride();
