import dns from 'dns/promises';

const API_BASE_URL = 'https://account.playoverlay.com/api';
const AUTH_KEY = 'your-authentication-key';

export async function checkInternetConnection(): Promise<boolean> {
  try {
    await dns.lookup('google.com');
    return true;
  } catch (error) {
    return false;
  }
}

export async function renewLicenceKey(encodedSystemInfo: string) {
  const isConnected = await checkInternetConnection();
  if (!isConnected) {
    throw new Error('No internet connection');
  }
  try {
    const response = await fetch(`${API_BASE_URL}/renew`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AUTH_KEY}`,
      },
      body: JSON.stringify({ machine_id: encodedSystemInfo }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Error renewing license key:', error);
    throw error;
  }
}

export async function deactivateLicenceKey(encodedSystemInfo: string) {
  const isConnected = await checkInternetConnection();
  if (!isConnected) {
    throw new Error('No internet connection');
  }
  try {
    const response = await fetch(`${API_BASE_URL}/deactivate`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AUTH_KEY}`,
      },
      body: JSON.stringify({ machine_id: encodedSystemInfo }),
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
        Authorization: `Bearer ${AUTH_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking for updates:', error);
    throw error;
  }
}
