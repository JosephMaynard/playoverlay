import {
  CORSAIR_VENDOR_ID,
  requestStreamDecks,
  VENDOR_ID,
} from '@elgato-stream-deck/webhid';

import logo from './assets/playoverlay-logo.svg';

function createCanvasWithText(
  text: string,
  textColor: string,
  backgroundColor: string
): HTMLCanvasElement {
  // Create a canvas element and set its dimensions
  const canvas = document.createElement('canvas');
  canvas.width = 80;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get 2D context');
  }

  // Set the background color
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Set the text properties
  ctx.fillStyle = textColor;
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Split the text into lines if it exceeds the width of the canvas
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + ' ' + word).width;
    if (width < canvas.width - 10) {
      // Adding some padding
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);

  // Calculate the vertical position to center the text
  const lineHeight = 18;
  const totalTextHeight = lines.length * lineHeight;
  let y = (canvas.height - totalTextHeight) / 2 + lineHeight / 2;

  // Draw each line of text
  for (const line of lines) {
    ctx.fillText(line, canvas.width / 2, y);
    y += lineHeight;
  }

  return canvas;
}

async function createCanvasWithSVGFromFile(
  svgUrl: string
): Promise<HTMLCanvasElement> {
  // Create a canvas element and set its dimensions
  const canvas = document.createElement('canvas');
  canvas.width = 80;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get 2D context');
  }

  // Set the background color to white
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Create an image from the SVG URL
  return new Promise((resolve, reject) => {
    const img = new Image();

    const imageSize = 70;

    img.onload = function () {
      // Draw the SVG image with fixed size (60x60) centered in the canvas
      const drawX = (canvas.width - imageSize) / 2;
      const drawY = (canvas.height - imageSize) / 2;
      ctx.drawImage(img, drawX, drawY, imageSize, imageSize);
      resolve(canvas);
    };

    img.onerror = function () {
      reject(new Error('Failed to load SVG image'));
    };

    img.src = svgUrl;
  });
}

let connectedStreamDecks: Awaited<ReturnType<typeof requestStreamDecks>> = [];

// Drops the cached device so the next Connect asks the browser for a fresh
// handle. The cache used to live for the whole session, so after an unplug
// or a sleep/wake the app kept writing to a dead handle and Connect could
// never recover. Closing is best effort: an unplugged device can't be closed
// cleanly and that must not stop the reset.
async function resetConnectedStreamDecks() {
  const decks = connectedStreamDecks;
  connectedStreamDecks = [];
  await Promise.all(decks.map((deck) => deck.close().catch(() => undefined)));
}

// WebHID reports an unplug (and a device dropped over sleep) as a
// 'disconnect' event on navigator.hid. Registered once, lazily, because the
// module is imported before any Stream Deck is used and some environments
// (tests, a browser without WebHID) have no navigator.hid at all.
let listeningForDisconnects = false;

// Told when a connected Stream Deck goes away, so the UI can stop saying
// "connected" straight away instead of when the next redraw fails.
const disconnectListeners = new Set<() => void>();

export function onStreamDeckDisconnected(listener: () => void): () => void {
  disconnectListeners.add(listener);
  listenForDisconnects();
  return () => {
    disconnectListeners.delete(listener);
  };
}

function listenForDisconnects() {
  if (listeningForDisconnects) return;
  if (typeof navigator === 'undefined' || !navigator.hid) return;
  listeningForDisconnects = true;
  navigator.hid.addEventListener('disconnect', (event) => {
    const vendorId = event.device.vendorId;
    if (vendorId !== VENDOR_ID && vendorId !== CORSAIR_VENDOR_ID) return;
    void resetConnectedStreamDecks();
    disconnectListeners.forEach((listener) => listener());
  });
}

// Bumped on every connectToStreamDeck call. A redraw paints keys one at a
// time with awaits in between, and the caller re-runs the redraw whenever the
// phase, match settings, or button set changes (potentially before a previous
// redraw has finished writing to the device). Each redraw captures its own
// generation and bails the moment a newer redraw supersedes it, so two paints
// can never interleave their writes on the single HID device and leave the
// panel in a mix of the old and new button set.
let renderGeneration = 0;

// Key reserved for the "next button set" logo button. Since usable buttons
// occupy indices 0..NEXT_SET_KEY_INDEX-1, this also doubles as the number of
// buttons per set, shared with SystemSettingsMenu's deck-page chunking so
// the two stay in sync.
export const NEXT_SET_KEY_INDEX = 5;

export async function connectToStreamDeck(
  buttons: {
    text: string;
    textColor: string;
    backgroundColor: string;
    onPress: () => void;
  }[],
  nextScreen: () => void
) {
  const generation = ++renderGeneration;
  listenForDisconnects();

  if (!connectedStreamDecks[0]) {
    connectedStreamDecks = await requestStreamDecks();
  }

  // A newer redraw took over while we were requesting the device. Bail before
  // clearing or repainting so we do not wipe the panel it has already drawn.
  if (generation !== renderGeneration) return;

  const streamDeck = connectedStreamDecks[0];

  if (!streamDeck) {
    throw new Error(
      'No Stream Deck found. Make sure it is plugged in and not in use by another application.'
    );
  }

  try {
    await paintStreamDeck(streamDeck, generation, buttons, nextScreen);
  } catch (error) {
    // A write failed, most likely because the device was unplugged or went
    // away over sleep. Forget it so the caller's next Connect starts from a
    // fresh request instead of reusing the dead handle, then let the caller
    // show it as disconnected.
    await resetConnectedStreamDecks();
    throw error;
  }
}

async function paintStreamDeck(
  streamDeck: (typeof connectedStreamDecks)[number],
  generation: number,
  buttons: {
    text: string;
    textColor: string;
    backgroundColor: string;
    onPress: () => void;
  }[],
  nextScreen: () => void
) {
  // Awaited: a failed clear on a dead device otherwise surfaced as an
  // unhandled promise rejection instead of reaching the catch above.
  await streamDeck.clearPanel();
  if (generation !== renderGeneration) return;
  streamDeck.removeAllListeners('down');
  streamDeck.removeAllListeners('error');

  const keyCount = streamDeck.CONTROLS.filter(
    (control) => control.type === 'button'
  ).length;

  let isHandlingPress = false;

  streamDeck.on('down', async (key) => {
    if (isHandlingPress) return; // Skip if already handling a button press
    isHandlingPress = true;

    try {
      if (key.index === NEXT_SET_KEY_INDEX) {
        nextScreen();
      } else {
        buttons[key.index]?.onPress();
      }
    } finally {
      // Set a short timeout to avoid rapid re-pressing
      setTimeout(() => {
        isHandlingPress = false;
      }, 300);
    }
  });

  // Fired whenever an error is detected by the hid device.
  // Always add a listener for this event! If you don't, errors will be silently dropped.
  streamDeck.on('error', (error) => {
    console.error(error);
  });

  // Paint the button keys sequentially and await each write. A bare
  // forEach(async ...) would fire every fillKeyCanvas concurrently and let
  // connectToStreamDeck resolve before any of them landed, so the caller (and
  // a following redraw) could not tell when the panel was actually ready.
  const paintCount = Math.min(NEXT_SET_KEY_INDEX, keyCount);
  for (let index = 0; index < paintCount; index++) {
    const button = buttons[index];
    if (!button) continue;
    await streamDeck.fillKeyCanvas(
      index,
      createCanvasWithText(
        button.text,
        button.textColor,
        button.backgroundColor
      )
    );
    // A newer redraw superseded this one mid-paint: stop writing keys so the
    // two do not leave a half-old, half-new panel.
    if (generation !== renderGeneration) return;
  }

  if (keyCount > NEXT_SET_KEY_INDEX) {
    const canvas = await createCanvasWithSVGFromFile(logo);
    if (generation !== renderGeneration) return;
    await streamDeck.fillKeyCanvas(NEXT_SET_KEY_INDEX, canvas);
  }
}
