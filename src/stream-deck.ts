import { requestStreamDecks } from '@elgato-stream-deck/webhid';

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

// Key reserved for the "next button set" logo button
const NEXT_SET_KEY_INDEX = 5;

export async function connectToStreamDeck(
  buttons: {
    text: string;
    textColor: string;
    backgroundColor: string;
    onPress: () => void;
  }[],
  nextScreen: () => void
) {
  if (!connectedStreamDecks[0]) {
    connectedStreamDecks = await requestStreamDecks();
  }

  const streamDeck = connectedStreamDecks[0];

  if (!streamDeck) {
    throw new Error(
      'No Stream Deck found. Make sure it is plugged in and not in use by another application.'
    );
  }

  streamDeck.clearPanel();
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

  buttons.slice(0, Math.min(NEXT_SET_KEY_INDEX, keyCount)).forEach(
    async (button, index) => {
      await streamDeck.fillKeyCanvas(
        index,
        createCanvasWithText(
          button.text,
          button.textColor,
          button.backgroundColor
        )
      );
    }
  );

  if (keyCount > NEXT_SET_KEY_INDEX) {
    const canvas = await createCanvasWithSVGFromFile(logo);
    await streamDeck.fillKeyCanvas(NEXT_SET_KEY_INDEX, canvas);
  }
}
