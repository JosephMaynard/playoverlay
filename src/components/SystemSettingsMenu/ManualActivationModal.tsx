import { useEffect, useState } from 'react';
import WideModal from '../Modal/WideModal';

export interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
  activationWindow?: boolean;
}

export default function ManualActivationModal({
  open,
  setOpen,
  activationWindow,
}: Props) {
  const [encodedSystemInfo, setEncodedSystemInfo] = useState('');
  const [licencenKey, setLicencenKey] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    activationWindow
      ? window?.electronAPI
          ?.getEncodedSystemInfo()
          .then((encodedSystemInfo) => {
            if (encodedSystemInfo) {
              setEncodedSystemInfo(encodedSystemInfo);
            }
          })
          .catch((error: any) => {
            console.error('Failed to load encoded system info:', error);
            setErrorMessage('Failed to load System Key');
          })
      : window?.electronAPI
          ?.getEncodedSystemInfoActivationWindow()
          .then((encodedSystemInfo) => {
            if (encodedSystemInfo) {
              setEncodedSystemInfo(encodedSystemInfo);
            }
          })
          .catch((error: any) => {
            console.error('Failed to load encoded system info:', error);
            setErrorMessage('Failed to load System Key');
          });
  }, []);

  const handleSetLicencenKey = async () => {
    if (licencenKey) {
      const { error } = activationWindow
        ? await window?.electronAPI?.saveLicenceKeyActivationWindow(licencenKey)
        : await window?.electronAPI?.saveLicenceKey(licencenKey);

      if (error) {
        setErrorMessage(error);
      }
    }
  };

  return (
    <WideModal open={open} setOpen={setOpen} title="Product Activation">
      <div>
        <label
          htmlFor="comment"
          className="block text-sm font-medium leading-6 text-gray-900"
        >
          System Key
        </label>
        <div className="mt-2">
          <textarea
            rows={5}
            name="encodedSystemInfo"
            id="encodedSystemInfo"
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            readOnly
            value={encodedSystemInfo}
          />
        </div>
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={() => navigator.clipboard.writeText(encodedSystemInfo)}
          >
            Copy
          </button>
        </div>
      </div>
      <div>
        <label
          htmlFor="comment"
          className="block text-sm font-medium leading-6 text-gray-900"
        >
          Paste License Key Here:
        </label>
        <div className="mt-2">
          <textarea
            rows={5}
            name="encodedSystemInfo"
            id="encodedSystemInfo"
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            value={licencenKey}
            onChange={(e) => setLicencenKey(e.target.value)}
          />
        </div>
        {errorMessage && <p className="my-4 text-red-600">{errorMessage}</p>}
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={handleSetLicencenKey}
            disabled={licencenKey === ''}
          >
            Save
          </button>
        </div>
      </div>
    </WideModal>
  );
}
