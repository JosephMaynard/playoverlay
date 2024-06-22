import { useState } from 'react';
import ManualActivationModal from '../SystemSettingsMenu/ManualActivationModal';
import { LockOpenIcon } from '@heroicons/react/24/outline';

export default function Activation() {
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <div>
      <h1>Welcome</h1>
      <ul role="list" className="-mx-2 space-y-1">
        <li>
          <button
            className="group flex w-full gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
            onClick={() => {
              setModalOpen(true);
            }}
          >
            <LockOpenIcon
              className="'text-gray-400 group-hover:text-indigo-600ch-6 w-6 shrink-0"
              aria-hidden="true"
            />
            Activate
          </button>
        </li>
        <li>
          <button
            className="group flex w-full gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
            onClick={() => {
              setModalOpen(true);
            }}
          >
            <LockOpenIcon
              className="'text-gray-400 group-hover:text-indigo-600ch-6 w-6 shrink-0"
              aria-hidden="true"
            />
            Buy Licence
          </button>
        </li>
        <li>
          <button
            className="group flex w-full gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
            onClick={() => {
              setModalOpen(true);
            }}
          >
            <LockOpenIcon
              className="'text-gray-400 group-hover:text-indigo-600ch-6 w-6 shrink-0"
              aria-hidden="true"
            />
            Manual Activation
          </button>
        </li>
        <li>
          <button
            className="group flex w-full gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
            onClick={() => {
              setModalOpen(true);
            }}
          >
            <LockOpenIcon
              className="'text-gray-400 group-hover:text-indigo-600ch-6 w-6 shrink-0"
              aria-hidden="true"
            />
            Use PlayOverlay in Demo Mode
          </button>
        </li>
      </ul>
      <ManualActivationModal
        open={modalOpen}
        setOpen={() => setModalOpen(false)}
      />
    </div>
  );
}
