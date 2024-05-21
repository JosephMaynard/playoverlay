import { useEffect, useState } from 'react';
import WideModal from '../Modal/WideModal';
import SideMenu from '../SideMenu/SideMenu';
import DragAndDropUploader from './DragAndDropUploader';
import { CustomScreen } from 'src/types';
import { TrashIcon } from '@heroicons/react/24/outline';

export interface Props {
  open: boolean;
  setOpen: () => void;
  keyColour: string;
}

export default function CustomScreens({ open, setOpen, keyColour }: Props) {
  const [showAddCustomScreenModal, setShowAddCustomScreenModal] =
    useState(false);
  const [customScreens, setCustomScreens] = useState<CustomScreen[]>([]);

  useEffect(() => {
    const fetchScreens = async () => {
      try {
        const storedScreens = await window?.electronAPI?.getCustomScreens();
        setCustomScreens(storedScreens || []);
        console.log('storedScreens', storedScreens);
      } catch (error) {
        console.error('Failed to fetch custom screens:', error);
      }
    };

    fetchScreens();

    const unsubscribe = window?.electronAPI?.onCustomScreensUpdated(
      (updatedScreens) => {
        console.log('updatedScreens', updatedScreens); // Should now log the correct array
        setCustomScreens(updatedScreens || []);
      }
    );

    // Clean up the listener on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <SideMenu open={open} setOpen={setOpen} title="Custom Screens">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <p className="mt-2 text-sm text-gray-700">
            Use images to create your own custom screens
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={() => setShowAddCustomScreenModal(true)}
          >
            Add Custom Screen
          </button>
        </div>
      </div>
      <div>
        <ul role="list" className="divide-y divide-gray-100">
          {customScreens?.map((customScreen) => (
            <li
              key={customScreen.filePath}
              className="flex items-center justify-between gap-x-6 py-4"
            >
              <div className="flex min-w-0 gap-x-6">
                <div
                  style={{
                    backgroundImage: `url("file://${customScreen.filePath}")`,
                    backgroundColor: keyColour,
                  }}
                  className="aspect-video w-32 rounded-sm bg-contain bg-center bg-no-repeat shadow-sm"
                />
                <div className="flex min-w-0 flex-auto items-center ">
                  <p className="text-sm font-semibold leading-6 text-gray-900">
                    {customScreen.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-x-1.5 rounded-md bg-red-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                <TrashIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
      <WideModal
        open={showAddCustomScreenModal}
        setOpen={setShowAddCustomScreenModal}
        title="Add Custom Screen"
      >
        <DragAndDropUploader
          customScreenCount={customScreens?.length}
          close={() => setShowAddCustomScreenModal(false)}
          keyColour={keyColour}
        />
      </WideModal>
    </SideMenu>
  );
}
