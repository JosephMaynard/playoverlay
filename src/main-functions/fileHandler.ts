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
    return `file://${saved.filePath}`;
  } catch (error) {
    console.error('Error saving file:', error);
    return null;
  }
}

export function handleFileDeletion(filePath: string): boolean {
  try {
    fs.unlinkSync(filePath);
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
