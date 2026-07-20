import { app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { getCustomScreens, setCustomScreens } from './storage';
import { CustomScreen } from '../types';
import convertFilePathToUrl from './convertFilePathToUrl';

const userDataPath = app.getPath('userData');
export const imagesPath = path.join(userDataPath, 'images');

// Ensure the images directory exists
if (!fs.existsSync(imagesPath)) {
  fs.mkdirSync(imagesPath, { recursive: true });
}

function getUniqueFileName(directory: string, fileName: string): string {
  let uniqueFileName = fileName;
  const extension = path.extname(fileName);
  const baseName = path.basename(fileName, extension);
  let counter = 1;

  while (fs.existsSync(path.join(directory, uniqueFileName))) {
    uniqueFileName = `${baseName}-${counter}${extension}`;
    counter++;
  }

  return uniqueFileName;
}

export function saveImageFile(
  buffer: Buffer,
  fileName: string
): { filePath: string; url: string } | null {
  // fileName can come from an IPC caller, resolve away any directory
  // components so it can't escape the images dir (e.g. via '../../etc').
  const safeFileName = path.basename(fileName);
  if (!safeFileName || safeFileName !== fileName) {
    console.error('Rejected unsafe file name:', fileName);
    return null;
  }

  const uniqueFileName = getUniqueFileName(imagesPath, fileName);
  const destination = path.join(imagesPath, uniqueFileName);

  try {
    fs.writeFileSync(destination, buffer);
    return { filePath: destination, url: convertFilePathToUrl(destination) };
  } catch (error) {
    console.error('Error saving file:', error);
    return null;
  }
}

export async function handleFileUpload(
  buffer: Buffer,
  fileName: string,
  title: string
): Promise<string | null> {
  const saved = saveImageFile(buffer, fileName);
  if (!saved) {
    return null;
  }

  try {
    const screens = getCustomScreens() as CustomScreen[];
    screens.push({
      title,
      filePath: saved.filePath,
      url: saved.url,
      type: 'screen',
      overlayLinks: [],
    });
    setCustomScreens(screens);
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('custom-screens-updated', screens);
    });
    return saved.url;
  } catch (error) {
    console.error('Error saving file:', error);
    return null;
  }
}

export function handleFileDeletion(filePath: string): boolean {
  // filePath comes from an IPC caller, only delete files that actually
  // live inside the images directory. realpath resolves symlinks/junctions
  // first, so a link placed inside the directory can't smuggle the check
  // past a target elsewhere on disk (a link's resolved path falls outside
  // the real base and is refused).
  let realTarget: string;
  let realBase: string;
  try {
    realTarget = fs.realpathSync(path.resolve(filePath));
    realBase = fs.realpathSync(imagesPath);
  } catch (error) {
    console.error('Error resolving path for deletion:', filePath, error);
    return false;
  }
  const relative = path.relative(realBase, realTarget);
  if (
    relative === '' ||
    relative.startsWith('..') ||
    path.isAbsolute(relative)
  ) {
    console.error('Rejected deletion outside the images directory:', filePath);
    return false;
  }

  try {
    fs.unlinkSync(realTarget);
    const screens = getCustomScreens() as CustomScreen[];
    const updatedScreens = screens.filter(
      (screen: CustomScreen) => screen.filePath !== filePath
    );
    setCustomScreens(updatedScreens);
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('custom-screens-updated', updatedScreens);
    });
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}
