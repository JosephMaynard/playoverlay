import React, { useState, useRef } from 'react';
import Button from '../ButtonGrid/Button';
import { PhotoIcon } from '@heroicons/react/24/outline';

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
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [title, setTitle] = useState(`Custom Screen ${customScreenCount + 1}`);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      const droppedFile = files[0];
      setFile(droppedFile);
      setImageUrl(URL.createObjectURL(droppedFile)); // Show a preview
      setError(null);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const selectedFile = files[0];
      setFile(selectedFile);
      setImageUrl(URL.createObjectURL(selectedFile)); // Show a preview
      setError(null);
    }
  };

  const handleSave = async () => {
    if (!file || !title) {
      setError('Please provide both a file and a title.');
      return;
    }
    try {
      const url = await window?.electronAPI?.uploadImage(file, title);
      if (url) {
        setImageUrl(url);
        setFile(null);
        setTitle('');
        setError(null); // Clear any previous error
      }
      close();
    } catch (err) {
      setError('Failed to upload the image. Please try again.');
      console.error(err);
    }
  };

  const handleDelete = () => {
    setImageUrl(null);
    setFile(null);
  };

  return (
    <div>
      <h3 className="mb-2 block text-sm font-medium leading-6 text-gray-900">
        Image
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
          <PhotoIcon className="h-16 w-16  text-gray-400" />
          {isDragging ? (
            <p>Drop the file here...</p>
          ) : (
            <>
              <p>Drag & Drop an image file here, or click to select one</p>
              <button
                type="button"
                className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                onClick={() => fileInputRef.current?.click()}
              >
                Click to select one
              </button>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleFileChange}
              />
            </>
          )}
        </div>
      ) : (
        <div>
          <h3>Uploaded Image:</h3>
          <div
            style={{
              backgroundImage: `url(${imageUrl})`,
              backgroundColor: keyColour,
            }}
            className="aspect-video w-full bg-contain bg-center bg-no-repeat"
          />
          <button onClick={handleDelete}>Delete Image</button>
        </div>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div className="my-4">
        <label
          htmlFor="custom-screen-title"
          className="block text-sm font-medium leading-6 text-gray-900"
        >
          Title
        </label>
        <div className="mt-2">
          <input
            type="text"
            id="custom-screen-title"
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            onChange={(e) => setTitle(e.target.value)}
            value={title}
          />
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={!file || !title}
        label="Save"
        className="min-w-32"
      />
    </div>
  );
};

export default DragAndDropUploader;
