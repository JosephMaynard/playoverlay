import { fileURLToPath, pathToFileURL } from 'url';
import os from 'os';

// pathToFileURL percent-encodes every character that means something in a
// URL. The previous `new URL('file://' + path)` did not: a logo saved as
// "logo#2.png" became a URL whose "#2.png" was a fragment (so the display
// and OBS asked for "logo"), "?" started a query the same way, and a stray
// "%" was left as a broken escape. The platform is passed explicitly so
// Windows drive-letter paths convert the same way on any host (the tests
// run on POSIX and simulate win32 via os.platform).
export default function convertFilePathToUrl(filePath: string): string {
  return pathToFileURL(filePath, { windows: os.platform() === 'win32' }).href;
}

// Decodes each run of valid %XX escapes and leaves anything else (a stray
// "%" from a file name like "100%.png") exactly as it is.
function decodeValidEscapes(value: string): string {
  return value.replace(/(?:%[0-9A-Fa-f]{2})+/g, (escapes) => {
    try {
      return decodeURIComponent(escapes);
    } catch {
      return escapes;
    }
  });
}

// Turns what follows "file://" in a legacy URL back into a native path:
// "/C:/Users/..." on Windows loses its leading slash and uses backslashes.
function toNativePath(urlPath: string, windows: boolean): string {
  if (!windows) return urlPath;
  const withoutLeadingSlash = /^\/[A-Za-z]:/.test(urlPath)
    ? urlPath.slice(1)
    : urlPath;
  return withoutLeadingSlash.replace(/\//g, '\\');
}

// Image URLs saved before the pathToFileURL fix can point at the wrong file
// ("logo#2.png" stored as file:///.../logo#2.png, whose "#2.png" is a
// fragment). Team logos are stored only as a URL, with no separate file
// path, so the original path is recovered from the URL text itself: first
// with the escapes the old converter added (spaces, accents) decoded, then
// verbatim. A candidate is only trusted if that file exists, and the URL is
// rebuilt from it. A URL that already resolves to an existing file, or that
// no candidate matches, is returned unchanged.
export function repairLegacyFileUrl(
  url: string,
  fileExists: (filePath: string) => boolean
): string {
  if (!url.startsWith('file://')) return url;

  const windows = os.platform() === 'win32';
  try {
    const parsed = new URL(url);
    if (
      !parsed.search &&
      !parsed.hash &&
      fileExists(fileURLToPath(url, { windows }))
    ) {
      return url;
    }
  } catch {
    // Not a URL fileURLToPath accepts: fall through to the legacy
    // candidates below.
  }

  const urlPath = url.slice('file://'.length);
  const candidates = [decodeValidEscapes(urlPath), urlPath].map((candidate) =>
    toNativePath(candidate, windows)
  );
  for (const candidate of candidates) {
    if (fileExists(candidate)) {
      return convertFilePathToUrl(candidate);
    }
  }
  return url;
}
