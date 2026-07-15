import dns from 'dns/promises';

import compareSemver from './compareSemver';
import { app } from 'electron';
import { githubReleaseSchema } from '../zodSchemas';

// Update checks use the public GitHub Releases API; release tags are
// expected to be semver, optionally prefixed with a "v" (e.g. v0.14.0).
const GITHUB_RELEASES_API_URL =
  'https://api.github.com/repos/JosephMaynard/playoverlay/releases/latest';

export async function checkInternetConnection(): Promise<boolean> {
  try {
    await dns.lookup('github.com');
    return true;
  } catch {
    return false;
  }
}

export async function checkForUpdates() {
  const isConnected = await checkInternetConnection();
  if (!isConnected) {
    throw new Error('No internet connection');
  }
  try {
    const response = await fetch(GITHUB_RELEASES_API_URL, {
      method: 'GET',
      headers: { Accept: 'application/vnd.github+json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    const parsedRelease = githubReleaseSchema.safeParse(data);

    if (parsedRelease.success === false) {
      throw new Error(`Check for updates parse error ${parsedRelease.error}`);
    }

    const latestVersion = parsedRelease.data.tag_name.replace(/^v/, '');

    const newVersionAvailable =
      compareSemver(latestVersion, app.getVersion()) === 1;

    return {
      latestVersion,
      downloadUrl: parsedRelease.data.html_url,
      newVersionAvailable,
    };
  } catch (error) {
    console.error('Error checking for updates:', error);
    throw error;
  }
}
