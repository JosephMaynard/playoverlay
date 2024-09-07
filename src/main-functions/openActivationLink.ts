import { app, shell } from 'electron';

import { getEncodedSystemInfo } from './getSystemInfo';
import { useLocalBackend } from 'src/main';

export default async function openActivationLink() {
  const encodedSystemInfo = await getEncodedSystemInfo().then((value) => value);
  shell.openExternal(
    `${useLocalBackend ? 'http://localhost:3000' : 'https://account.playoverlay.com'}/account/activate/${app.getName()}/${encodedSystemInfo}`
  );
}
