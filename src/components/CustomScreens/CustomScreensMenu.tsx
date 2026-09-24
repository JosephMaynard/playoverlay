import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import WideModal from '../Modal/WideModal';
import SideMenu from '../SideMenu/SideMenu';
import DragAndDropUploader from './DragAndDropUploader';
import { CustomScreen, MatchState } from '../../types';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import Modal from '../Modal/Modal';
import EditCustomScreen from './EditCustomScreen';
import Empty from '../MatchSettingsMenu/Empty';
import { useMatchStateStore } from '../../store/matchState';

export interface Props {
  open: boolean;
  setOpen: () => void;
  keyColour: string;
  customGraphics: CustomScreen[];
  fetchScreens: () => void;
}

// Whether a library graphic is currently being shown: as the full-screen
// custom screen (matched by URL, which is what the display renders) or as
// one of the active overlays (matched by file path, the library's identity).
// Both fields are nullable on CustomScreen, and two missing values must not
// count as a match.
function isGraphicOnAir(graphic: CustomScreen, matchState: MatchState) {
  const onAirFullScreen =
    graphic.url !== null &&
    matchState.displayScreen === 'custom' &&
    matchState.customScreenImageUrl === graphic.url;
  const onAirOverlay =
    graphic.filePath !== null &&
    (matchState.overlays ?? []).some(
      (overlay) => overlay.filePath === graphic.filePath
    );
  return onAirFullScreen || onAirOverlay;
}

export default function CustomScreensMenu({
  open,
  setOpen,
  keyColour,
  customGraphics,
  fetchScreens,
}: Props) {
  const { t } = useTranslation();
  const matchState = useMatchStateStore((state) => state.matchState);
  const [showAddCustomScreenModal, setShowAddCustomScreenModal] =
    useState(false);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [customScreenToEdit, setCustomScreenToEdit] =
    useState<CustomScreen | null>(null);
  const [customScreenToDelete, setCustomScreenToDelete] = useState<
    CustomScreen | undefined
  >();
  // Edit and delete keep their dialog (and the edit draft) open until the
  // main process answers, so a failure can be read and retried. The ref is
  // the synchronous double-click guard; the state drives the disabled button.
  const [isWriting, setIsWriting] = useState(false);
  const writeInFlight = useRef(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const runWrite = async (write: () => Promise<void>) => {
    if (writeInFlight.current) return;
    writeInFlight.current = true;
    setIsWriting(true);
    try {
      await write();
    } finally {
      writeInFlight.current = false;
      setIsWriting(false);
    }
  };

  const handleDelete = (customScreen: CustomScreen) => {
    setDeleteError(null);
    setShowConfirmDeleteModal(true);
    setCustomScreenToDelete(customScreen);
  };

  const handleConfirmDelete = () =>
    runWrite(async () => {
      if (!customScreenToDelete?.filePath) {
        setShowConfirmDeleteModal(false);
        return;
      }
      setDeleteError(null);
      let deleted = false;
      try {
        deleted =
          (await window?.electronAPI?.deleteImage(
            customScreenToDelete.filePath
          )) === true;
      } catch (error) {
        console.error('Failed to delete custom graphic:', error);
      }
      if (!deleted) {
        setDeleteError(t('settings:customScreens.deleteError'));
        return;
      }
      setShowConfirmDeleteModal(false);
      // The main process also broadcasts the updated list, but refetching
      // here doesn't depend on that listener being attached.
      fetchScreens();
    });

  const handleEdit = (customScreen: CustomScreen) => {
    setEditError(null);
    setCustomScreenToEdit(customScreen);
  };

  const handleSaveChanges = () =>
    runWrite(async () => {
      if (customScreenToEdit === null) {
        return;
      }
      setEditError(null);
      const updatedCustomGraphics = customGraphics.map((customGraphic) =>
        customScreenToEdit.filePath === customGraphic.filePath
          ? { ...customScreenToEdit }
          : { ...customGraphic }
      );
      let saved = false;
      try {
        const response = await window?.electronAPI?.setCustomScreens(
          updatedCustomGraphics
        );
        saved = response?.success === true;
        if (!saved) {
          console.error('Failed to update custom screens:', response?.error);
        }
      } catch (error) {
        console.error('Failed to update custom screens:', error);
      }
      if (!saved) {
        setEditError(t('settings:customScreens.editModal.saveError'));
        return;
      }
      fetchScreens();
      setCustomScreenToEdit(null);
    });

  const handleOnChange = (change: Partial<CustomScreen>) => {
    if (customScreenToEdit === null) {
      return;
    }
    setCustomScreenToEdit((prev) => (prev ? { ...prev, ...change } : prev));
  };

  const customScreenToDeleteIsOnAir =
    customScreenToDelete !== undefined &&
    isGraphicOnAir(customScreenToDelete, matchState);

  return (
    <SideMenu
      open={open}
      setOpen={setOpen}
      title={t('settings:customScreens.title')}
    >
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto" />
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={() => setShowAddCustomScreenModal(true)}
          >
            {t('settings:customScreens.add')}
          </button>
        </div>
      </div>
      <div>
        <ul role="list" className="divide-y divide-gray-100">
          {customGraphics?.length === 0 && (
            <Empty
              title={t('settings:customScreens.emptyTitle')}
              description={t('settings:customScreens.emptyDescription', {
                action: t('settings:customScreens.add'),
              })}
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
                <div className="flex max-w-full items-center gap-x-2">
                  <p className="truncate text-sm font-semibold leading-6 text-gray-900">
                    {customScreen.title}
                  </p>
                  {isGraphicOnAir(customScreen, matchState) && (
                    <span className="inline-flex shrink-0 items-center rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                      {t('settings:customScreens.onAir')}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  {t('settings:customScreens.typeLine', {
                    type:
                      customScreen.type === 'screen' ||
                      customScreen.type === undefined
                        ? t('settings:customScreens.typeScreen')
                        : t('settings:customScreens.typeOverlay'),
                  })}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                onClick={() => handleEdit(customScreen)}
              >
                <PencilIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
                {t('settings:customScreens.edit')}
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-x-1.5 rounded-md bg-red-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                onClick={() => handleDelete(customScreen)}
              >
                <TrashIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
                {t('settings:actions.delete')}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <WideModal
        open={showAddCustomScreenModal}
        setOpen={setShowAddCustomScreenModal}
        title={t('settings:customScreens.addModalTitle')}
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
        saveError={editError}
        isSaving={isWriting}
      />

      <Modal
        open={showConfirmDeleteModal}
        setOpen={setShowConfirmDeleteModal}
        title={t('settings:customScreens.deleteConfirmTitle')}
        actionButtonLabel={t('settings:customScreens.deleteConfirmAction')}
        icon="warning"
        action={handleConfirmDelete}
        actionDisabled={isWriting}
      >
        <p className="text-sm text-gray-500">
          {t('settings:customScreens.deleteConfirmBody', {
            title: customScreenToDelete?.title,
          })}
        </p>
        {customScreenToDeleteIsOnAir && (
          <p className="mt-2 text-sm font-medium text-red-700">
            {t('settings:customScreens.deleteOnAirWarning')}
          </p>
        )}
        {deleteError && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {deleteError}
          </p>
        )}
      </Modal>
    </SideMenu>
  );
}
