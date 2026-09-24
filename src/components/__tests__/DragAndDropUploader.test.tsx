import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DragAndDropUploader from '../CustomScreens/DragAndDropUploader';

let uploadImage: ReturnType<typeof vi.fn>;

beforeEach(() => {
  uploadImage = vi.fn().mockResolvedValue('file:///images/graphic.png');
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: { uploadImage } as unknown as Window['electronAPI'],
  });
  // jsdom has no object URLs; the preview only needs a string.
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});

function makeFile(name: string, type: string, size = 1024): File {
  const file = new File(['x'], name, { type });
  // Fake the size rather than allocating megabytes in the test.
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

function renderUploader() {
  const close = vi.fn();
  const { container } = render(
    <DragAndDropUploader
      customScreenCount={0}
      close={close}
      keyColour="#0000FF"
    />
  );
  const dropZone = screen
    .getByText('Drag & Drop an image file here, or click to select one')
    .closest('div');
  if (!dropZone) throw new Error('No drop zone');
  return { close, container, dropZone };
}

function drop(dropZone: HTMLElement, file: File) {
  fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });
}

const saveButton = () => screen.getByRole('button', { name: 'Save' });

describe('DragAndDropUploader file checks', () => {
  it('refuses a video file up front and keeps Save disabled', () => {
    const { dropZone } = renderUploader();

    drop(dropZone, makeFile('match.mp4', 'video/mp4'));

    expect(screen.getByRole('alert')).toHaveTextContent(
      '"match.mp4" isn\'t a supported image. Use a PNG, JPEG, WebP or SVG file.'
    );
    expect(saveButton()).toBeDisabled();
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it('refuses an image type the main process would reject (e.g. GIF)', () => {
    const { dropZone } = renderUploader();

    drop(dropZone, makeFile('logo.gif', 'image/gif'));

    expect(screen.getByRole('alert')).toHaveTextContent(
      '"logo.gif" isn\'t a supported image.'
    );
    expect(saveButton()).toBeDisabled();
  });

  it('refuses a file over 10 MB before it is read or sent to the main process', () => {
    const { container } = renderUploader();
    const input = container.querySelector('input[type="file"]');
    if (!input) throw new Error('No file input');

    fireEvent.change(input, {
      target: {
        files: [makeFile('big.png', 'image/png', 11 * 1024 * 1024)],
      },
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      '"big.png" is 11.0 MB. Images must be 10 MB or smaller.'
    );
    expect(saveButton()).toBeDisabled();
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it('accepts an SVG whose MIME type the OS left empty', () => {
    const { dropZone } = renderUploader();

    drop(dropZone, makeFile('crest.svg', ''));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
  });

  it('limits the file picker to the supported types', () => {
    const { container } = renderUploader();

    expect(container.querySelector('input[type="file"]')).toHaveAttribute(
      'accept',
      '.png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml'
    );
  });
});

describe('DragAndDropUploader saving', () => {
  it('uploads only once when Save is double-clicked, and shows progress meanwhile', async () => {
    let resolveUpload: (url: string | null) => void = () => undefined;
    uploadImage.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveUpload = resolve;
        })
    );
    const { close, dropZone } = renderUploader();
    drop(dropZone, makeFile('graphic.png', 'image/png'));

    fireEvent.click(saveButton());
    fireEvent.click(screen.getByRole('button', { name: 'Uploading…' }));

    expect(uploadImage).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Uploading…' })).toBeDisabled();

    await act(async () => resolveUpload('file:///images/graphic.png'));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('keeps the dialog open with a specific message when the main process refuses the file', async () => {
    uploadImage.mockResolvedValueOnce(null);
    const { close, dropZone } = renderUploader();
    drop(dropZone, makeFile('renamed.png', 'image/png'));

    await act(async () => {
      fireEvent.click(saveButton());
    });

    expect(close).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      "The image couldn't be saved. Check it's a real PNG, JPEG, WebP or SVG file and try again."
    );
    // Retry is possible straight away.
    expect(saveButton()).toBeEnabled();
  });
});
