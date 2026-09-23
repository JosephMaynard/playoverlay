import os from 'os';
import { fileURLToPath } from 'url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import convertFilePathToUrl, {
  repairLegacyFileUrl,
} from '../convertFilePathToUrl';

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

  it('encodes "#", "?" and "%" so they stay part of the file name', () => {
    vi.spyOn(os, 'platform').mockReturnValue('darwin');

    const url = convertFilePathToUrl('/images/logo#2 what? 100%.png');

    expect(url).toBe('file:///images/logo%232%20what%3F%20100%25.png');
    const parsed = new URL(url);
    expect(parsed.hash).toBe('');
    expect(parsed.search).toBe('');
    expect(fileURLToPath(url)).toBe('/images/logo#2 what? 100%.png');
  });

  it('encodes the same characters in Windows paths', () => {
    vi.spyOn(os, 'platform').mockReturnValue('win32');

    expect(convertFilePathToUrl('C:\\images\\logo#2 100%.png')).toBe(
      'file:///C:/images/logo%232%20100%25.png'
    );
  });
});

describe('repairLegacyFileUrl', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const existsOnly =
    (...paths: string[]) =>
    (candidate: string) =>
      paths.includes(candidate);

  it('rebuilds a URL whose "#" was treated as a fragment', () => {
    vi.spyOn(os, 'platform').mockReturnValue('darwin');

    expect(
      repairLegacyFileUrl(
        'file:///images/logo#2.png',
        existsOnly('/images/logo#2.png')
      )
    ).toBe('file:///images/logo%232.png');
  });

  it('rebuilds URLs with a "?" or a stray "%", decoding the escapes the old converter added', () => {
    vi.spyOn(os, 'platform').mockReturnValue('darwin');

    expect(
      repairLegacyFileUrl(
        'file:///my%20images/what?.png',
        existsOnly('/my images/what?.png')
      )
    ).toBe('file:///my%20images/what%3F.png');
    expect(
      repairLegacyFileUrl(
        'file:///images/100%.png',
        existsOnly('/images/100%.png')
      )
    ).toBe('file:///images/100%25.png');
  });

  it('keeps a literal "%20" in a file name when only the verbatim path exists', () => {
    vi.spyOn(os, 'platform').mockReturnValue('darwin');

    expect(
      repairLegacyFileUrl(
        'file:///images/a%20b#1.png',
        existsOnly('/images/a%20b#1.png')
      )
    ).toBe('file:///images/a%2520b%231.png');
  });

  it('repairs Windows URLs back to drive-letter paths', () => {
    vi.spyOn(os, 'platform').mockReturnValue('win32');

    expect(
      repairLegacyFileUrl(
        'file:///C:/images/logo#2.png',
        existsOnly('C:\\images\\logo#2.png')
      )
    ).toBe('file:///C:/images/logo%232.png');
  });

  it('leaves a correct URL, a non-file URL, and an unmatched URL untouched', () => {
    vi.spyOn(os, 'platform').mockReturnValue('darwin');
    const exists = existsOnly('/images/logo 1.png');

    expect(repairLegacyFileUrl('file:///images/logo%201.png', exists)).toBe(
      'file:///images/logo%201.png'
    );
    expect(repairLegacyFileUrl('https://example.com/a#b', exists)).toBe(
      'https://example.com/a#b'
    );
    expect(repairLegacyFileUrl('file:///images/gone#2.png', exists)).toBe(
      'file:///images/gone#2.png'
    );
  });
});
