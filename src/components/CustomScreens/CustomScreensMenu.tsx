import { useState } from 'react';
import WideModal from '../Modal/WideModal';
import SideMenu from '../SideMenu/SideMenu';
import DragAndDropUploader from './DragAndDropUploader';
import { CustomScreen } from '../../types';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import Modal from '../Modal/Modal';
import { DisplayScreen, screens } from '../../constants';
import { arraysEqual, insertValue, removeValue } from '../../utils';
import EditCustomScreen from './EditCustomScreen';
import Empty from '../MatchSettingsMenu/Empty';

export interface Props {
  open: boolean;
  setOpen: () => void;
  keyColour: string;
  customGraphics: CustomScreen[];
  fetchScreens: () => void;
}

export default function CustomScreensMenu({
  open,
  setOpen,
  keyColour,
  customGraphics,
  fetchScreens,
}: Props) {
  const [showAddCustomScreenModal, setShowAddCustomScreenModal] =
    useState(false);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [customScreenToEdit, setCustomScreenToEdit] =
    useState<CustomScreen | null>(null);
  const [customScreenToDelete, setCustomScreenToDelete] = useState<
    CustomScreen | undefined
  >();

  const handleDelete = (customScreen: CustomScreen) => {
    setShowConfirmDeleteModal(true);
    setCustomScreenToDelete(customScreen);
  };

  const handleSaveChanges = () => {
    if (customScreenToEdit === null) {
      return;
    }
    const updatedCustomGraphics = customGraphics.map((customGraphic) =>
      customScreenToEdit.filePath === customGraphic.filePath
        ? { ...customScreenToEdit }
        : { ...customGraphic }
    );
    window.electronAPI
      .setCustomScreens(updatedCustomGraphics)
      .then((response) => {
        if (response.success) {
          console.log('Custom screens updated successfully');
          fetchScreens();
          setCustomScreenToEdit(null);
        } else {
          console.error('Failed to update custom screens:', response.error);
        }
      })
      .catch((error) => {
        console.error('IPC error:', error);
      });
  };

  const handleOnChange = (change: Partial<CustomScreen>) => {
    if (customScreenToEdit === null) {
      return;
    }
    setCustomScreenToEdit((prev) => ({ ...prev, ...change }));
  };

  return (
    <SideMenu open={open} setOpen={setOpen} title="Custom Graphics">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto" />
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
          {customGraphics?.length === 0 && (
            <Empty
              title="No Custom Grapics"
              description='Click the "Add Custom Graphic" button to add custom graphics'
            />
          )}
          {customGraphics?.map((customScreen) => (
            <li
              key={customScreen.filePath}
              className="flex items-center justify-between gap-x-4 py-4"
            >
              <div
                style={{
                  backgroundImage: `url("${customScreen.url}")`,
                  backgroundColor: keyColour,
                }}
                className="aspect-video w-32 shrink-0 rounded-sm bg-contain bg-center bg-no-repeat shadow-sm"
              />
              <div className="flex min-w-0 flex-auto grow flex-col items-start justify-center">
                <p className="max-w-full truncate text-sm font-semibold leading-6 text-gray-900">
                  {customScreen.title}
                </p>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  Type:{' '}
                  {customScreen.type === 'screen' ||
                  customScreen.type === undefined
                    ? 'Custom Screen'
                    : 'Overlay'}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                onClick={() => setCustomScreenToEdit(customScreen)}
              >
                <PencilIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
                Edit
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-x-1.5 rounded-md bg-red-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
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
      <EditCustomScreen
        customScreenToEdit={customScreenToEdit}
        setCustomScreenToEdit={setCustomScreenToEdit}
        handleSaveChanges={handleSaveChanges}
        handleOnChange={handleOnChange}
        keyColour={keyColour}
      />

      <Modal
        open={showConfirmDeleteModal}
        setOpen={setShowConfirmDeleteModal}
        title="Delete custom screen?"
        actionButtonLabel="Delete custom screen"
        icon="warning"
        action={() => {
          window?.electronAPI?.deleteImage(customScreenToDelete.filePath);
          setShowConfirmDeleteModal(false);
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
