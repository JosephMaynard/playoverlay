import os from 'os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import convertFilePathToUrl from '../convertFilePathToUrl';

describe('convertFilePathToUrl', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('converts POSIX paths into encoded file URLs', () => {
    vi.spyOn(os, 'platform').mockReturnValue('darwin');

    expect(convertFilePathToUrl('/Users/play overlay/image 1.png')).toBe(
      'file:///Users/play%20overlay/image%201.png'
    );
  });

  it('converts Windows paths into encoded file URLs with forward slashes', () => {
    vi.spyOn(os, 'platform').mockReturnValue('win32');

    expect(convertFilePathToUrl('C:\\Users\\Play Overlay\\image 1.png')).toBe(
      'file:///C:/Users/Play%20Overlay/image%201.png'
    );
  });
});
