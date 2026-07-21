import { app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { getCustomScreens, setCustomScreens } from './storage';
import { CustomScreen } from '../types';
import convertFilePathToUrl from './convertFilePathToUrl';
import { logFailedOperation, sanitizeLogPath } from './logger';

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

// Team logos and custom-screen/overlay graphics are typically well under a
// megabyte; 10 MB comfortably covers a large source photo or a dense SVG
// while still bounding how much an IPC-supplied buffer can make the main
// process write to disk in a single call.
export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// Mirrors the image extensions browserSourceServer.ts's CONTENT_TYPES map
// knows how to serve (its non-image entries, .html/.js/.css/.woff2/.json,
// are never valid upload targets).
const ALLOWED_IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.svg',
]);

// Pure and testable: takes only the claimed file name, no filesystem access.
export function hasAllowedImageExtension(fileName: string): boolean {
  return ALLOWED_IMAGE_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

// Minimal magic-byte signatures for the raster formats accepted above. This
// doesn't attempt full format validation, just enough to catch a mislabeled
// or non-image file (e.g. a renamed executable) before it ever reaches disk.
const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);
const RIFF_HEADER = Buffer.from('RIFF', 'ascii');
const WEBP_HEADER = Buffer.from('WEBP', 'ascii');

function looksLikePng(buffer: Buffer): boolean {
  return buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE);
}

function looksLikeJpeg(buffer: Buffer): boolean {
  return buffer.subarray(0, JPEG_SIGNATURE.length).equals(JPEG_SIGNATURE);
}

function looksLikeWebp(buffer: Buffer): boolean {
  // WebP is a RIFF container: 'RIFF' + 4-byte size + 'WEBP'.
  return (
    buffer.subarray(0, 4).equals(RIFF_HEADER) &&
    buffer.subarray(8, 12).equals(WEBP_HEADER)
  );
}

// SVG is XML text, not a binary format with a magic number: it's treated as
// an image only if it decodes as UTF-8 and its content contains an `<svg`
// root tag, never executed or otherwise parsed.
function looksLikeSvg(buffer: Buffer): boolean {
  // buffer.toString('utf8') never throws (invalid sequences become the
  // replacement character), so no guarding is needed around the decode.
  return /<svg[\s>]/i.test(buffer.toString('utf8'));
}

// Confirms the buffer's actual content matches the claimed image extension,
// so a mislabeled or non-image file is refused even when its file name ends
// in an allowed extension. Pure and testable: no filesystem access.
export function isValidImageBuffer(buffer: Buffer, fileName: string): boolean {
  switch (path.extname(fileName).toLowerCase()) {
    case '.png':
      return looksLikePng(buffer);
    case '.jpg':
    case '.jpeg':
      return looksLikeJpeg(buffer);
    case '.webp':
      return looksLikeWebp(buffer);
    case '.svg':
      return looksLikeSvg(buffer);
    default:
      return false;
  }
}

export function saveImageFile(
  buffer: Buffer,
  fileName: string
): { filePath: string; url: string } | null {
  // fileName can come from an IPC caller, resolve away any directory
  // components so it can't escape the images dir (e.g. via '../../etc').
  const safeFileName = path.basename(fileName);
  if (!safeFileName || safeFileName !== fileName) {
    logFailedOperation(
      `Rejected unsafe file name: ${sanitizeLogPath(fileName)}`
    );
    return null;
  }

  if (!hasAllowedImageExtension(fileName)) {
    logFailedOperation(
      `Rejected upload with a disallowed file extension: ${sanitizeLogPath(fileName)}`
    );
    return null;
  }

  if (buffer.length > MAX_UPLOAD_SIZE_BYTES) {
    logFailedOperation(
      `Rejected upload exceeding the maximum upload size: ${sanitizeLogPath(fileName)} (${buffer.length} bytes)`
    );
    return null;
  }

  if (!isValidImageBuffer(buffer, fileName)) {
    logFailedOperation(
      `Rejected upload whose content does not match its file extension: ${sanitizeLogPath(fileName)}`
    );
    return null;
  }

  const uniqueFileName = getUniqueFileName(imagesPath, fileName);
  const destination = path.join(imagesPath, uniqueFileName);

  try {
    fs.writeFileSync(destination, buffer);
    return { filePath: destination, url: convertFilePathToUrl(destination) };
  } catch (error) {
    logFailedOperation(`Error saving file: ${String(error)}`);
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
    logFailedOperation(`Error saving file: ${String(error)}`);
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
    logFailedOperation(
      `Error resolving path for deletion: ${sanitizeLogPath(filePath)} (${String(error)})`
    );
    return false;
  }
  const relative = path.relative(realBase, realTarget);
  if (
    relative === '' ||
    relative.startsWith('..') ||
    path.isAbsolute(relative)
  ) {
    logFailedOperation(
      `Rejected deletion outside the images directory: ${sanitizeLogPath(filePath)}`
    );
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
    logFailedOperation(`Error deleting file: ${String(error)}`);
    return false;
  }
}
