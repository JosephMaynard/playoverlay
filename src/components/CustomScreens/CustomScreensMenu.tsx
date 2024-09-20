import { useEffect, useState } from 'react';
import WideModal from '../Modal/WideModal';
import SideMenu from '../SideMenu/SideMenu';
import DragAndDropUploader from './DragAndDropUploader';
import { CustomScreen } from '../../types';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import Modal from '../Modal/Modal';

export interface Props {
  open: boolean;
  setOpen: () => void;
  keyColour: string;
  customGraphics: CustomScreen[];
}

export default function CustomScreensMenu({
  open,
  setOpen,
  keyColour,
  customGraphics,
}: Props) {
  const [showAddCustomScreenModal, setShowAddCustomScreenModal] =
    useState(false);
  const [showAddConfirmDeleteModal, setShowAddConfirmDeleteModal] =
    useState(false);
  const [customScreenToDelete, setCustomScreenToDelete] = useState<
    CustomScreen | undefined
  >();

  const handleDelete = (customScreen: CustomScreen) => {
    setShowAddConfirmDeleteModal(true);
    setCustomScreenToDelete(customScreen);
  };

  return (
    <SideMenu open={open} setOpen={setOpen} title="Custom Graphics">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <p className="mt-2 text-sm text-gray-700">
            Use images to create your own custom graphics
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={() => setShowAddCustomScreenModal(true)}
          >
            Add Custom Graphic
          </button>
        </div>
      </div>
      <div>
        <ul role="list" className="divide-y divide-gray-100">
          {customGraphics?.map((customScreen) => (
            <li
              key={customScreen.filePath}
              className="flex items-center justify-between gap-x-6 py-4"
            >
              <div className="flex min-w-0 grow gap-x-6">
                <div
                  style={{
                    backgroundImage: `url("${customScreen.url}")`,
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
                className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                onClick={() => handleDelete(customScreen)}
              >
                <PencilIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
                Edit
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-x-1.5 rounded-md bg-red-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                onClick={() => handleDelete(customScreen)}
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
          customScreenCount={customGraphics?.length}
          close={() => setShowAddCustomScreenModal(false)}
          keyColour={keyColour}
        />
      </WideModal>
      <Modal
        open={showAddConfirmDeleteModal}
        setOpen={setShowAddConfirmDeleteModal}
        title="Delete custom screen?"
        actionButtonLabel="Delete custom screen"
        icon="warning"
        action={() => {
          window?.electronAPI?.deleteImage(customScreenToDelete.filePath);
          setShowAddConfirmDeleteModal(false);
        }}
      >
        <p className="text-sm text-gray-500">
          Are you sure you want to delete the custom screen "
          {customScreenToDelete?.title}"?
        </p>
      </Modal>
    </SideMenu>
  );
}
