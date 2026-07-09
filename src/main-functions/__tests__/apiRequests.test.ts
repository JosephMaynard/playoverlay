import dns from 'dns/promises';
import { app } from 'electron';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkForUpdates, checkInternetConnection } from '../apiRequests';

vi.mock('dns/promises', () => ({
  default: {
    lookup: vi.fn(),
  },
}));

vi.mock('electron', () => ({
  app: {
    getVersion: vi.fn(),
  },
}));

function mockSuccessfulFetch(body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(body),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('apiRequests', () => {
  beforeEach(() => {
    vi.mocked(dns.lookup).mockResolvedValue({
      address: '140.82.112.4',
      family: 4,
    });
    vi.mocked(app.getVersion).mockReturnValue('0.14.0');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('checkInternetConnection', () => {
    it('returns true when github.com resolves', async () => {
      await expect(checkInternetConnection()).resolves.toBe(true);
      expect(dns.lookup).toHaveBeenCalledWith('github.com');
    });

    it('returns false when DNS lookup fails', async () => {
      vi.mocked(dns.lookup).mockRejectedValue(new Error('offline'));

      await expect(checkInternetConnection()).resolves.toBe(false);
    });
  });

  describe('checkForUpdates', () => {
    it('fetches the latest GitHub release and reports a newer version', async () => {
      const fetchMock = mockSuccessfulFetch({
        tag_name: 'v0.15.0',
        html_url:
          'https://github.com/JosephMaynard/playoverlay/releases/tag/v0.15.0',
      });

      await expect(checkForUpdates()).resolves.toEqual({
        latestVersion: '0.15.0',
        downloadUrl:
          'https://github.com/JosephMaynard/playoverlay/releases/tag/v0.15.0',
        newVersionAvailable: true,
      });
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.github.com/repos/JosephMaynard/playoverlay/releases/latest',
        {
          method: 'GET',
          headers: { Accept: 'application/vnd.github+json' },
        }
      );
    });

    it('reports no new version when the latest release equals the app version', async () => {
      mockSuccessfulFetch({
        tag_name: '0.14.0',
        html_url:
          'https://github.com/JosephMaynard/playoverlay/releases/tag/v0.14.0',
      });

      await expect(checkForUpdates()).resolves.toMatchObject({
        latestVersion: '0.14.0',
        newVersionAvailable: false,
      });
    });

    it('throws before fetching when offline', async () => {
      vi.mocked(dns.lookup).mockRejectedValue(new Error('offline'));
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      await expect(checkForUpdates()).rejects.toThrow('No internet connection');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('throws for non-OK GitHub responses', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
        })
      );

      await expect(checkForUpdates()).rejects.toThrow('HTTP error! Status: 500');
    });

    it('throws when the GitHub response does not match the expected release shape', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSuccessfulFetch({
        name: 'Release without tag',
      });

      await expect(checkForUpdates()).rejects.toThrow(
        'Check for updates parse error'
      );
    });
  });
});
