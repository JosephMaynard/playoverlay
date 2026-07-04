import dns from 'dns/promises';

import compareSemver from './compareSemver';
import { app } from 'electron';
import { updatesSchema } from '../zodSchemas';

const useLocalBackend = false;

const API_BASE_URL =
  useLocalBackend && process.env.NODE_ENV !== 'production'
    ? 'http://localhost:3000/api'
    : 'https://account.playoverlay.com/api';

const API_AUTH_KEY = process.env.VITE_API_AUTH_KEY;

export async function checkInternetConnection(): Promise<boolean> {
  try {
    await dns.lookup('google.com');
    return true;
  } catch (error) {
    return false;
  }
}

export async function checkForUpdates() {
  const isConnected = await checkInternetConnection();
  if (!isConnected) {
    throw new Error('No internet connection');
  }
  try {
    const headers = API_AUTH_KEY
      ? { Authorization: `Bearer ${API_AUTH_KEY}` }
      : undefined;
    const response = await fetch(`${API_BASE_URL}/check-updates`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.success === false) {
      throw new Error('Check for updates fetch failed');
    }

    const parsedUpdateData = updatesSchema.safeParse(data);

    if (parsedUpdateData.success === false) {
      throw new Error(
        `Check for updates parse error ${parsedUpdateData.error}`
      );
    }

    const newVersionAvailable =
      compareSemver(parsedUpdateData.data.latestVersion, app.getVersion()) ===
      1;

    return { ...parsedUpdateData.data, newVersionAvailable };
  } catch (error) {
    console.error('Error checking for updates:', error);
    throw error;
  }
}
