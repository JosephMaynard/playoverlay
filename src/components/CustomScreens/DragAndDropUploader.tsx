import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../ButtonGrid/Button';
import { PhotoIcon } from '@heroicons/react/24/outline';

// Mirrors the main process's upload checks in fileHandler.ts (the same
// allowed extensions and 10 MB cap). Checking here first refuses an
// unsuitable file with a specific message before the preload reads the
// whole file into memory and ships it over IPC, instead of a generic
// "upload failed" afterwards. The main process still re-checks everything,
// including that the content really is the claimed image type.
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];
const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
];
const MAX_UPLOAD_SIZE_MB = 10;
const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
// Narrows the file picker to the same types (a drop can still be anything).
const ACCEPTED_FILE_TYPES = [...ALLOWED_EXTENSIONS, ...ALLOWED_MIME_TYPES].join(
  ','
);

function hasAllowedExtension(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  return ALLOWED_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
}

export interface Props {
  customScreenCount: number;
  close: () => void;
  keyColour: string;
}

const DragAndDropUploader: React.FC<Props> = ({
  customScreenCount,
  keyColour,
  close,
}: Props) => {
  const { t } = useTranslation();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [title, setTitle] = useState(
    t('settings:customScreens.uploader.defaultTitle', {
      n: customScreenCount + 1,
    })
  );
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // The ref is the synchronous double-click guard; the state drives the
  // disabled Save button and its "Uploading..." label.
  const [isUploading, setIsUploading] = useState(false);
  const uploadInFlight = useRef(false);

  // Revoke each preview object URL once it's replaced or the uploader
  // unmounts, so previews don't leak blobs for the app's lifetime.
  useEffect(() => {
    if (!imageUrl?.startsWith('blob:')) return;
    return () => URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Why a picked or dropped file can't be used, or null if it can. The
  // extension is authoritative (it's what the main process checks); the
  // MIME type is only checked when the OS reports one, since it's often
  // empty for SVGs.
  const getFileProblem = (candidate: File): string | null => {
    const typeAllowed =
      candidate.type === '' || ALLOWED_MIME_TYPES.includes(candidate.type);
    if (!hasAllowedExtension(candidate.name) || !typeAllowed) {
      return t('settings:customScreens.uploader.unsupportedType', {
        name: candidate.name,
      });
    }
    if (candidate.size > MAX_UPLOAD_SIZE_BYTES) {
      return t('settings:customScreens.uploader.tooLarge', {
        name: candidate.name,
        size: (candidate.size / (1024 * 1024)).toFixed(1),
        max: MAX_UPLOAD_SIZE_MB,
      });
    }
    return null;
  };

  // A rejected file leaves any previously accepted one in place, so a wrong
  // drop doesn't throw away a good selection.
  const acceptFile = (candidate: File) => {
    const problem = getFileProblem(candidate);
    if (problem) {
      setError(problem);
      return;
    }
    setFile(candidate);
    setImageUrl(URL.createObjectURL(candidate)); // Show a preview
    setError(null);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      acceptFile(files[0]);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      acceptFile(files[0]);
    }
    // Let the same file be picked again after a rejection.
    event.target.value = '';
  };

  const handleSave = async () => {
    if (uploadInFlight.current) return;
    if (!file || !title) {
      setError(t('settings:customScreens.uploader.missingFields'));
      return;
    }
    uploadInFlight.current = true;
    setIsUploading(true);
    setError(null);
    try {
      const url = await window?.electronAPI?.uploadImage(file, title);
      // Only close the dialog when the upload actually succeeded,
      // otherwise it would close silently with no graphic added. A null
      // result means the main process refused or couldn't write the file
      // (the renderer checks above already passed).
      if (url) {
        setFile(null);
        close();
      } else {
        setError(t('settings:customScreens.uploader.notSaved'));
      }
    } catch (err) {
      setError(t('settings:customScreens.uploader.uploadFailed'));
      console.error(err);
    } finally {
      uploadInFlight.current = false;
      setIsUploading(false);
    }
  };

  const handleDelete = () => {
    setImageUrl(null);
    setFile(null);
    setError(null);
  };

  return (
    <div>
      <h3 className="mb-2 block text-sm font-medium leading-6 text-gray-900">
        {t('settings:customScreens.uploader.image')}
      </h3>

      {!imageUrl ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="relative flex w-full flex-col items-center gap-4 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center hover:border-gray-400"
          style={{
            border: isDragging ? '2px dashed #000' : '2px dashed #ccc',
          }}
        >
          <PhotoIcon className="h-16 w-16 text-gray-400" />
          {isDragging ? (
            <p>{t('settings:customScreens.uploader.dropHere')}</p>
          ) : (
            <>
              <p>{t('settings:customScreens.uploader.dragDropHint')}</p>
              <button
                type="button"
                className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                onClick={() => fileInputRef.current?.click()}
              >
                {t('settings:customScreens.uploader.selectFile')}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept={ACCEPTED_FILE_TYPES}
                onChange={handleFileChange}
              />
            </>
          )}
        </div>
      ) : (
        <div>
          <h3>{t('settings:customScreens.uploader.uploadedImage')}</h3>
          <div
            style={{
              backgroundImage: `url(${imageUrl})`,
              backgroundColor: keyColour,
            }}
            className="aspect-video w-full bg-contain bg-center bg-no-repeat"
          />
          <button onClick={handleDelete} disabled={isUploading}>
            {t('settings:customScreens.uploader.deleteImage')}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" style={{ color: 'red' }}>
          {error}
        </p>
      )}

      <div className="my-4">
        <label
          htmlFor="add-custom-screen-title"
          className="block text-sm font-medium leading-6 text-gray-900"
        >
          {t('settings:customScreens.uploader.titleLabel')}
        </label>
        <div className="mt-2">
          <input
            type="text"
            id="add-custom-screen-title"
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            onChange={(e) => setTitle(e.target.value)}
            value={title}
          />
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={!file || !title || isUploading}
        label={
          isUploading
            ? t('settings:customScreens.uploader.uploading')
            : t('settings:actions.save')
        }
        className="min-w-32"
      />
    </div>
  );
};

export default DragAndDropUploader;
