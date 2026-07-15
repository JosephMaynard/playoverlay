import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CustomScreen } from '../../types';
import convertFilePathToUrl from '../convertFilePathToUrl';

const temporaryDirectories: string[] = [];

async function loadFileHandler(initialScreens: CustomScreen[] = []) {
  vi.resetModules();
  const temporaryDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'playoverlay-file-handler-')
  );
  temporaryDirectories.push(temporaryDirectory);

  let screens = [...initialScreens];
  const webContentsSend = vi.fn();
  const setCustomScreens = vi.fn((updatedScreens: CustomScreen[]) => {
    screens = updatedScreens;
  });

  vi.doMock('electron', () => ({
    app: {
      getPath: vi.fn(() => temporaryDirectory),
    },
    BrowserWindow: {
      getAllWindows: vi.fn(() => [
        {
          webContents: {
            send: webContentsSend,
          },
        },
      ]),
    },
  }));
  vi.doMock('../storage', () => ({
    getCustomScreens: vi.fn(() => screens),
    setCustomScreens,
  }));

  const fileHandler = await import('../fileHandler');

  return {
    fileHandler,
    imagesPath: path.join(temporaryDirectory, 'images'),
    setCustomScreens,
    webContentsSend,
    getScreens: () => screens,
  };
}

describe('fileHandler', () => {
  afterEach(() => {
    temporaryDirectories.splice(0).forEach((temporaryDirectory) => {
      fs.rmSync(temporaryDirectory, { force: true, recursive: true });
    });
  });

  it('creates the images directory during module initialization', async () => {
    const { imagesPath } = await loadFileHandler();

    expect(fs.existsSync(imagesPath)).toBe(true);
  });

  it('saveImageFile writes a unique file and returns its path and url without touching custom screens', async () => {
    const { fileHandler, imagesPath, setCustomScreens, getScreens } =
      await loadFileHandler();
    fs.writeFileSync(path.join(imagesPath, 'logo.png'), 'existing');

    const result = fileHandler.saveImageFile(
      Buffer.from('new-logo'),
      'logo.png'
    );
    const expectedPath = path.join(imagesPath, 'logo-1.png');

    expect(result).toEqual({
      filePath: expectedPath,
      url: `file://${expectedPath}`,
    });
    expect(fs.readFileSync(expectedPath, 'utf8')).toBe('new-logo');
    expect(getScreens()).toEqual([]);
    expect(setCustomScreens).not.toHaveBeenCalled();
  });

  it('saveImageFile returns null when the write fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { fileHandler, imagesPath } = await loadFileHandler();
    fs.rmSync(imagesPath, { force: true, recursive: true });
    fs.writeFileSync(imagesPath, 'not a directory');

    expect(fileHandler.saveImageFile(Buffer.from('uploaded'), 'logo.png')).toBeNull();
  });

  it('saveImageFile rejects a file name that would escape the images directory', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { fileHandler, imagesPath } = await loadFileHandler();

    const result = fileHandler.saveImageFile(
      Buffer.from('malicious'),
      '../../etc/passwd.png'
    );

    expect(result).toBeNull();
    expect(fs.readdirSync(imagesPath)).toEqual([]);
  });

  it('uploads files with unique names, persists custom screen data, and notifies windows', async () => {
    const existingScreen: CustomScreen = {
      title: 'Existing',
      filePath: '/tmp/existing.png',
      url: 'file:///tmp/existing.png',
      type: 'screen',
      overlayLinks: [],
    };
    const {
      fileHandler,
      imagesPath,
      setCustomScreens,
      webContentsSend,
      getScreens,
    } = await loadFileHandler([existingScreen]);
    fs.writeFileSync(path.join(imagesPath, 'graphic.png'), 'existing');

    const result = await fileHandler.handleFileUpload(
      Buffer.from('uploaded'),
      'graphic.png',
      'Uploaded Graphic'
    );
    const uploadedPath = path.join(imagesPath, 'graphic-1.png');

    // handleFileUpload returns saveImageFile's already-encoded `url`, not a
    // hand-rolled `file://` string.
    expect(result).toBe(convertFilePathToUrl(uploadedPath));
    expect(fs.readFileSync(uploadedPath, 'utf8')).toBe('uploaded');
    expect(getScreens()).toEqual([
      existingScreen,
      {
        title: 'Uploaded Graphic',
        filePath: uploadedPath,
        url: `file://${uploadedPath}`,
        type: 'screen',
        overlayLinks: [],
      },
    ]);
    expect(setCustomScreens).toHaveBeenCalledWith(getScreens());
    expect(webContentsSend).toHaveBeenCalledWith(
      'custom-screens-updated',
      getScreens()
    );
  });

  it('deletes a file, removes the matching custom screen, and notifies windows', async () => {
    const temporaryDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'playoverlay-existing-file-')
    );
    temporaryDirectories.push(temporaryDirectory);
    const deletedFilePath = path.join(temporaryDirectory, 'delete-me.png');
    const keptFilePath = path.join(temporaryDirectory, 'keep-me.png');
    fs.writeFileSync(deletedFilePath, 'delete');
    fs.writeFileSync(keptFilePath, 'keep');
    const deletedScreen: CustomScreen = {
      title: 'Delete me',
      filePath: deletedFilePath,
      url: `file://${deletedFilePath}`,
      type: 'screen',
      overlayLinks: [],
    };
    const keptScreen: CustomScreen = {
      title: 'Keep me',
      filePath: keptFilePath,
      url: `file://${keptFilePath}`,
      type: 'overlay',
      overlayLinks: ['scoreBug'],
    };
    const {
      fileHandler,
      setCustomScreens,
      webContentsSend,
      getScreens,
    } = await loadFileHandler([deletedScreen, keptScreen]);

    expect(fileHandler.handleFileDeletion(deletedFilePath)).toBe(true);

    expect(fs.existsSync(deletedFilePath)).toBe(false);
    expect(getScreens()).toEqual([keptScreen]);
    expect(setCustomScreens).toHaveBeenCalledWith([keptScreen]);
    expect(webContentsSend).toHaveBeenCalledWith('custom-screens-updated', [
      keptScreen,
    ]);
  });

  it('returns null when upload persistence fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { fileHandler, imagesPath, setCustomScreens } =
      await loadFileHandler();
    fs.rmSync(imagesPath, { force: true, recursive: true });
    fs.writeFileSync(imagesPath, 'not a directory');

    await expect(
      fileHandler.handleFileUpload(
        Buffer.from('uploaded'),
        'graphic.png',
        'Broken Upload'
      )
    ).resolves.toBeNull();
    expect(setCustomScreens).not.toHaveBeenCalled();
  });

  it('returns false when deletion fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { fileHandler, setCustomScreens } = await loadFileHandler();

    expect(fileHandler.handleFileDeletion('/does/not/exist.png')).toBe(false);
    expect(setCustomScreens).not.toHaveBeenCalled();
  });
});
