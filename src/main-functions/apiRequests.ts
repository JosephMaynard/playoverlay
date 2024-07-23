import dns from 'dns/promises';

import { getRenewalEncodedSystemInfo } from './getSystemInfo';
import isLicensed from './isLicensed';
import compareSemver from './compareSemver';
import { app } from 'electron';
import { updatesSchema } from '../zodSchemas';
import saveRenewalJWT from './saveRenewalJWT';

let useLocalBackend = false;

const API_BASE_URL = // @ts-ignore
  useLocalBackend === true && process.env.NODE_ENV !== 'production'
    ? 'http://localhost:3000/api'
    : 'https://account.playoverlay.com/api';

// @ts-ignore
const API_AUTH_KEY = import.meta.env.VITE_API_AUTH_KEY || 'authentication-key';

export async function checkInternetConnection(): Promise<boolean> {
  try {
    await dns.lookup('google.com');
    return true;
  } catch (error) {
    return false;
  }
}

export async function renewLicenceKey() {
  const isConnected = await checkInternetConnection();
  if (!isConnected) {
    throw new Error('No internet connection');
  }

  const encodedSystemInfo = await getRenewalEncodedSystemInfo();

  try {
    const response = await fetch(`${API_BASE_URL}/renew-jwt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_AUTH_KEY}`,
      },
      body: JSON.stringify({ encodedSystemInfo }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    const saveLicenceKeyResult = await saveRenewalJWT(data.token);

    if (saveLicenceKeyResult.success !== true) {
      throw new Error(
        `Error saving licence key: ${saveLicenceKeyResult.error}`
      );
    }

    const { licenced } = await isLicensed();

    if (licenced === true) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error renewing license key:', error);
    throw new Error('Error renewing license key:', error);
  }
}

export async function deactivateLicenceKey() {
  const isConnected = await checkInternetConnection();
  if (!isConnected) {
    throw new Error('No internet connection');
  }

  const encodedSystemInfo = await getRenewalEncodedSystemInfo();

  try {
    const response = await fetch(`${API_BASE_URL}/deactivate`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_AUTH_KEY}`,
      },
      body: JSON.stringify({ encodedSystemInfo }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('Error deleting license key:', error);
    throw error;
  }
}

export async function checkForUpdates() {
  const isConnected = await checkInternetConnection();
  if (!isConnected) {
    throw new Error('No internet connection');
  }
  try {
    const response = await fetch(`${API_BASE_URL}/check-updates`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${API_AUTH_KEY}`,
      },
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
