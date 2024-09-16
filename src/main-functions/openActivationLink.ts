import { app, shell } from 'electron';

import { getEncodedSystemInfo } from './getSystemInfo';
import { isDev } from '../main';
import { useLocalBackend } from './apiRequests';

export default async function openActivationLink() {
  const encodedSystemInfo = await getEncodedSystemInfo().then((value) => value);
  shell.openExternal(
    `${isDev && useLocalBackend ? 'http://localhost:3000' : 'https://account.playoverlay.com'}/account/activate/${app.getName()}/${encodedSystemInfo}`
  );
}
