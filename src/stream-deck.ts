import { getStreamDecks, requestStreamDecks } from '@elgato-stream-deck/webhid';

// @ts-ignore
import logo from './assets/playoverlay-logo.svg';
import { debounce } from './utils';

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

let connectedStreamDecks: Awaited<ReturnType<typeof requestStreamDecks>>;

export async function connectToStreamDeck(
  buttons: {
    text: string;
    textColor: string;
    backgroundColor: string;
    onPress: () => void;
  }[],
  nextScreen: () => void
) {
  if (connectedStreamDecks === undefined) {
    connectedStreamDecks = await requestStreamDecks();
  }

  connectedStreamDecks[0]?.clearPanel();
  connectedStreamDecks[0]?.removeAllListeners('down');

  console.log('connectedStreamDecks', connectedStreamDecks);

  let isHandlingPress = false;

  connectedStreamDecks[0].on('down', async (key: any) => {
    if (isHandlingPress) return; // Skip if already handling a button press
    isHandlingPress = true;

    try {
      if (key.index === 5) {
        nextScreen();
      } else {
        buttons[key.index]?.onPress();
      }
      console.log(key);
    } finally {
      // Set a short timeout to avoid rapid re-pressing
      setTimeout(() => {
        isHandlingPress = false;
      }, 300);
    }
  });

  // Fired whenever an error is detected by the hid device.
  // Always add a listener for this event! If you don't, errors will be silently dropped.
  connectedStreamDecks[0].on('error', (error: any) => {
    console.error(error);
  });

  buttons.forEach(async (button, index) => {
    await connectedStreamDecks[0].fillKeyCanvas(
      index,
      createCanvasWithText(
        button.text,
        button.textColor,
        button.backgroundColor
      )
    );
  });

  const canvas = await createCanvasWithSVGFromFile(logo);

  await connectedStreamDecks[0].fillKeyCanvas(5, canvas);
}
