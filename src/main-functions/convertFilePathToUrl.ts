import { URL } from 'url';
import os from 'os';

export default function convertFilePathToUrl(filePath: string): string {
  const platform = os.platform();

  if (platform === 'win32') {
    // Replace backslashes with forward slashes and prepend 'file:///'
    return new URL(`file:///${filePath.replace(/\\/g, '/')}`).href;
  } else {
    // For POSIX systems like macOS and Linux, prepend 'file://'
    return new URL(`file://${filePath}`).href;
  }
}
