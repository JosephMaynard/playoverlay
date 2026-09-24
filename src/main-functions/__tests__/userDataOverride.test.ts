import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const setPath = vi.hoisted(() => vi.fn());

vi.mock('electron', () => ({ app: { setPath } }));

import { applyUserDataOverride, USER_DATA_DIR_ENV } from '../userDataOverride';

describe('applyUserDataOverride', () => {
  const directories: string[] = [];

  afterEach(() => {
    directories.splice(0).forEach((directory) => {
      fs.rmSync(directory, { recursive: true, force: true });
    });
  });

  it('does nothing when the variable is unset or blank', () => {
    expect(applyUserDataOverride({}, { setPath })).toBeUndefined();
    expect(
      applyUserDataOverride({ [USER_DATA_DIR_ENV]: '  ' }, { setPath })
    ).toBeUndefined();
    expect(setPath).not.toHaveBeenCalled();
  });

  it('creates the directory and points userData at it', () => {
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'playoverlay-ud-'));
    directories.push(parent);
    const target = path.join(parent, 'profile');

    const applied = applyUserDataOverride(
      { [USER_DATA_DIR_ENV]: target },
      { setPath }
    );

    expect(applied).toBe(target);
    expect(fs.existsSync(target)).toBe(true);
    expect(setPath).toHaveBeenCalledWith('userData', target);
  });
});
