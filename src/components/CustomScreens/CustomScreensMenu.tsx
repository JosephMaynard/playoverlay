import { useEffect, useState } from 'react';
import WideModal from '../Modal/WideModal';
import SideMenu from '../SideMenu/SideMenu';
import DragAndDropUploader from './DragAndDropUploader';
import { CustomScreen } from 'src/types';
import { ChevronDownIcon, TrashIcon } from '@heroicons/react/24/outline';
import Modal from '../Modal/Modal';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react';

export interface Props {
  open: boolean;
  setOpen: () => void;
  keyColour: string;
}

export default function CustomScreensMenu({ open, setOpen, keyColour }: Props) {
  const [showAddCustomScreenModal, setShowAddCustomScreenModal] =
    useState(false);
  const [showAddConfirmDeleteModal, setShowAddConfirmDeleteModal] =
    useState(false);
  const [customScreens, setCustomScreens] = useState<CustomScreen[]>([]);
  const [customScreenToDelete, setCustomScreenToDelete] = useState<
    CustomScreen | undefined
  >();

  useEffect(() => {
    const fetchScreens = async () => {
      try {
        const storedScreens = await window?.electronAPI?.getCustomScreens();
        setCustomScreens(storedScreens || []);
      } catch (error) {
        console.error('Failed to fetch custom screens:', error);
      }
    };

    fetchScreens();

    const unsubscribe = window?.electronAPI?.onCustomScreensUpdated(
      (updatedScreens) => {
        setCustomScreens(updatedScreens || []);
      }
    );

    // Clean up the listener on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  const handleDelete = (customScreen: CustomScreen) => {
    setShowAddConfirmDeleteModal(true);
    setCustomScreenToDelete(customScreen);
  };

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
              <Menu as="div" className="relative inline-block text-left">
                <div>
                  <MenuButton className="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                    Options
                    <ChevronDownIcon
                      aria-hidden="true"
                      className="-mr-1 h-5 w-5 text-gray-400"
                    />
                  </MenuButton>
                </div>

                <MenuItems
                  transition
                  className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in"
                >
                  <div className="py-1">
                    <MenuItem>
                      <a
                        href="#"
                        className="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900"
                      >
                        Account settings
                      </a>
                    </MenuItem>
                    <MenuItem>
                      <a
                        href="#"
                        className="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900"
                      >
                        Support
                      </a>
                    </MenuItem>
                    <MenuItem>
                      <a
                        href="#"
                        className="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900"
                      >
                        License
                      </a>
                    </MenuItem>
                    <form action="#" method="POST">
                      <MenuItem>
                        <button
                          type="submit"
                          className="block w-full px-4 py-2 text-left text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900"
                        >
                          Sign out
                        </button>
                      </MenuItem>
                    </form>
                  </div>
                </MenuItems>
              </Menu>
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
          customScreenCount={customScreens?.length}
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
