import { shell } from 'electron';

import { getEncodedSystemInfo } from './getSystemInfo';

export default async function openActivationLink() {
  const encodedSystemInfo = await getEncodedSystemInfo().then((value) => value);
  shell.openExternal(
    `https://account.playoverlay.com/account/activation/playoverlay/${encodedSystemInfo}`
  );
}
