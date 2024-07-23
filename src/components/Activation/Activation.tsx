import { useState } from 'react';
import ManualActivationModal from '../SystemSettingsMenu/ManualActivationModal';

// @ts-ignore
import logo from '../../assets/playoverlay-logo.svg';
// @ts-ignore
import videographer from '../../assets/videographer.svg';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';

export default function Activation() {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (loading === true) {
    return (
      <div className="flex h-screen w-full flex-col justify-between py-16">
        <div className="grow">
          <LoadingSpinner />
        </div>
        <div className="p-8 text-center">
          <h2 className="mb-8 text-2xl font-light">
            Active PlayOverlay in your browser
          </h2>
          <button
            type="button"
            className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={() => setLoading(false)}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8">
          <div className="flex items-center gap-x-6">
            <img className="h-12 w-auto" src={logo} alt="PlayOverlay logo" />
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Welcome to PlayOverlay
            </h1>
          </div>
        </div>
      </header>
      <div className="grid-col-1 grid md:grid-cols-2">
        <div className="hidden md:block">
          <img
            className="w-128 h-auto [max-width:30rem]"
            src={videographer}
            alt="PlayOverlay logo"
          />
        </div>
        <div className="p-8">
          <ul role="list" className="-mx-2 space-y-1">
            <li>
              <button
                className="mt-8 flex h-12 w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-8 py-3 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                onClick={() => {
                  setLoading(true);
                  window?.electronAPI?.openActivationLinkActivationWindow();
                }}
              >
                Activate
              </button>
            </li>
            <li>
              <button
                className="mt-8 flex h-12 w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-8 py-3 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                onClick={() => {
                  window?.electronAPI?.openBuyNowLink();
                }}
              >
                Buy Licence
              </button>
            </li>
            <li>
              <button
                className="mt-8 flex h-12 w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-8 py-3 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                onClick={() => {
                  setModalOpen(true);
                }}
              >
                Manual Activation
              </button>
            </li>
            <li>
              <button
                className="mt-8 flex h-12 w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-8 py-3 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                onClick={() => {
                  window?.electronAPI?.runInDemoMode();
                  console.log('run-in-demo-mode');
                }}
              >
                Use PlayOverlay in Demo Mode
              </button>
            </li>
          </ul>
          <ManualActivationModal
            open={modalOpen}
            setOpen={() => setModalOpen(false)}
            activationWindow
          />
        </div>
      </div>
    </div>
  );
}
