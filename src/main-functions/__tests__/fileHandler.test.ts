import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CustomScreen } from '../../types';
import convertFilePathToUrl from '../convertFilePathToUrl';

// A real PNG magic-byte header, so tests exercising saveImageFile's happy
// path (and its failure modes unrelated to the content sniff) pass the
// image-content check the same way a genuine upload would.
const PNG_HEADER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
function validPngBuffer(payload: string): Buffer {
  return Buffer.concat([PNG_HEADER, Buffer.from(payload)]);
}

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
      validPngBuffer('new-logo'),
      'logo.png'
    );
    const expectedPath = path.join(imagesPath, 'logo-1.png');

    expect(result).toEqual({
      filePath: expectedPath,
      url: convertFilePathToUrl(expectedPath),
    });
    expect(fs.readFileSync(expectedPath)).toEqual(validPngBuffer('new-logo'));
    expect(getScreens()).toEqual([]);
    expect(setCustomScreens).not.toHaveBeenCalled();
  });

  it('saveImageFile returns null when the write fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { fileHandler, imagesPath } = await loadFileHandler();
    fs.rmSync(imagesPath, { force: true, recursive: true });
    fs.writeFileSync(imagesPath, 'not a directory');

    expect(
      fileHandler.saveImageFile(validPngBuffer('uploaded'), 'logo.png')
    ).toBeNull();
  });

  it('saveImageFile rejects a buffer over the maximum upload size', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { fileHandler, imagesPath } = await loadFileHandler();
    const oversized = Buffer.concat([
      PNG_HEADER,
      Buffer.alloc(fileHandler.MAX_UPLOAD_SIZE_BYTES),
    ]);

    const result = fileHandler.saveImageFile(oversized, 'huge.png');

    expect(result).toBeNull();
    expect(fs.readdirSync(imagesPath)).toEqual([]);
  });

  it('saveImageFile rejects a disallowed file extension', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { fileHandler, imagesPath } = await loadFileHandler();

    const result = fileHandler.saveImageFile(
      validPngBuffer('not-really-an-executable'),
      'payload.exe'
    );

    expect(result).toBeNull();
    expect(fs.readdirSync(imagesPath)).toEqual([]);
  });

  it('saveImageFile rejects a file whose content does not match its claimed extension', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { fileHandler, imagesPath } = await loadFileHandler();

    const result = fileHandler.saveImageFile(
      Buffer.from('definitely not a png'),
      'fake.png'
    );

    expect(result).toBeNull();
    expect(fs.readdirSync(imagesPath)).toEqual([]);
  });

  it('saveImageFile accepts a well-formed SVG', async () => {
    const { fileHandler } = await loadFileHandler();
    const svg = Buffer.from(
      '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>'
    );

    const result = fileHandler.saveImageFile(svg, 'graphic.svg');

    expect(result).not.toBeNull();
  });

  it('saveImageFile rejects a file named .svg whose content is not actually SVG', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { fileHandler, imagesPath } = await loadFileHandler();

    const result = fileHandler.saveImageFile(
      Buffer.from('<html>not an svg</html>'),
      'fake.svg'
    );

    expect(result).toBeNull();
    expect(fs.readdirSync(imagesPath)).toEqual([]);
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
      validPngBuffer('uploaded'),
      'graphic.png',
      'Uploaded Graphic'
    );
    const uploadedPath = path.join(imagesPath, 'graphic-1.png');

    // handleFileUpload returns saveImageFile's already-encoded `url`, not a
    // hand-rolled `file://` string.
    expect(result).toBe(convertFilePathToUrl(uploadedPath));
    expect(fs.readFileSync(uploadedPath)).toEqual(validPngBuffer('uploaded'));
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
    const {
      fileHandler,
      imagesPath,
      setCustomScreens,
      webContentsSend,
      getScreens,
    } = await loadFileHandler();
    const deletedFilePath = path.join(imagesPath, 'delete-me.png');
    const keptFilePath = path.join(imagesPath, 'keep-me.png');
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
    // Seed the mocked storage with both screens, then forget the seeding
    // call so assertions below only see handleFileDeletion's own calls.
    setCustomScreens([deletedScreen, keptScreen]);
    setCustomScreens.mockClear();

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
        validPngBuffer('uploaded'),
        'graphic.png',
        'Broken Upload'
      )
    ).resolves.toBeNull();
    expect(setCustomScreens).not.toHaveBeenCalled();
  });

  it('returns false when deletion fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { fileHandler, imagesPath, setCustomScreens } =
      await loadFileHandler();

    expect(
      fileHandler.handleFileDeletion(path.join(imagesPath, 'missing.png'))
    ).toBe(false);
    expect(setCustomScreens).not.toHaveBeenCalled();
  });

  it('refuses to delete a file outside the images directory', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { fileHandler, setCustomScreens } = await loadFileHandler();
    const outsideDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'playoverlay-outside-')
    );
    temporaryDirectories.push(outsideDirectory);
    const outsideFilePath = path.join(outsideDirectory, 'outside.png');
    fs.writeFileSync(outsideFilePath, 'outside');

    expect(fileHandler.handleFileDeletion(outsideFilePath)).toBe(false);
    expect(fs.existsSync(outsideFilePath)).toBe(true);
    expect(setCustomScreens).not.toHaveBeenCalled();
  });

  it('refuses a traversal path that resolves outside the images directory', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { fileHandler, imagesPath, setCustomScreens } =
      await loadFileHandler();
    const userDataPath = path.dirname(imagesPath);
    const configPath = path.join(userDataPath, 'config.json');
    fs.writeFileSync(configPath, '{}');
    const traversalPath = path.join(imagesPath, '..', 'config.json');

    expect(fileHandler.handleFileDeletion(traversalPath)).toBe(false);
    expect(fs.existsSync(configPath)).toBe(true);
    expect(setCustomScreens).not.toHaveBeenCalled();
  });

  it('refuses to delete through a symlink inside images that targets an outside file', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { fileHandler, imagesPath, setCustomScreens } =
      await loadFileHandler();
    const outsideDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'playoverlay-outside-')
    );
    temporaryDirectories.push(outsideDirectory);
    const outsideFilePath = path.join(outsideDirectory, 'target.png');
    fs.writeFileSync(outsideFilePath, 'outside');
    const linkPath = path.join(imagesPath, 'sneaky-link.png');
    fs.symlinkSync(outsideFilePath, linkPath);

    expect(fileHandler.handleFileDeletion(linkPath)).toBe(false);
    expect(fs.existsSync(outsideFilePath)).toBe(true);
    expect(fs.lstatSync(linkPath).isSymbolicLink()).toBe(true);
    expect(setCustomScreens).not.toHaveBeenCalled();
  });

  describe('hasAllowedImageExtension', () => {
    it('accepts every extension the browser-source server can serve as an image', async () => {
      const { fileHandler } = await loadFileHandler();

      [
        'photo.png',
        'photo.JPG',
        'photo.jpeg',
        'photo.webp',
        'photo.svg',
      ].forEach((fileName) => {
        expect(fileHandler.hasAllowedImageExtension(fileName)).toBe(true);
      });
    });

    it('rejects extensions outside the image allowlist', async () => {
      const { fileHandler } = await loadFileHandler();

      ['payload.exe', 'archive.zip', 'noextension', 'script.js'].forEach(
        (fileName) => {
          expect(fileHandler.hasAllowedImageExtension(fileName)).toBe(false);
        }
      );
    });
  });

  describe('isValidImageBuffer', () => {
    it('confirms a PNG buffer against a .png name', async () => {
      const { fileHandler } = await loadFileHandler();

      expect(
        fileHandler.isValidImageBuffer(validPngBuffer('data'), 'photo.png')
      ).toBe(true);
    });

    it('confirms a JPEG buffer against a .jpg/.jpeg name', async () => {
      const { fileHandler } = await loadFileHandler();
      const jpeg = Buffer.concat([
        Buffer.from([0xff, 0xd8, 0xff]),
        Buffer.from('rest'),
      ]);

      expect(fileHandler.isValidImageBuffer(jpeg, 'photo.jpg')).toBe(true);
      expect(fileHandler.isValidImageBuffer(jpeg, 'photo.jpeg')).toBe(true);
    });

    it('confirms a WebP (RIFF/WEBP) buffer against a .webp name', async () => {
      const { fileHandler } = await loadFileHandler();
      const webp = Buffer.concat([
        Buffer.from('RIFF', 'ascii'),
        Buffer.from([0, 0, 0, 0]), // 4-byte RIFF chunk size, unchecked here
        Buffer.from('WEBP', 'ascii'),
      ]);

      expect(fileHandler.isValidImageBuffer(webp, 'photo.webp')).toBe(true);
    });

    it('confirms a well-formed SVG against a .svg name', async () => {
      const { fileHandler } = await loadFileHandler();
      const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>');

      expect(fileHandler.isValidImageBuffer(svg, 'graphic.svg')).toBe(true);
    });

    it('rejects a buffer whose content does not match the claimed extension', async () => {
      const { fileHandler } = await loadFileHandler();
      const notAnImage = Buffer.from('just some text');

      expect(fileHandler.isValidImageBuffer(notAnImage, 'photo.png')).toBe(
        false
      );
      expect(fileHandler.isValidImageBuffer(notAnImage, 'photo.jpg')).toBe(
        false
      );
      expect(fileHandler.isValidImageBuffer(notAnImage, 'photo.webp')).toBe(
        false
      );
      expect(fileHandler.isValidImageBuffer(notAnImage, 'photo.svg')).toBe(
        false
      );
    });

    it('rejects an unsupported extension outright', async () => {
      const { fileHandler } = await loadFileHandler();

      expect(
        fileHandler.isValidImageBuffer(validPngBuffer('data'), 'photo.gif')
      ).toBe(false);
    });
  });
});
