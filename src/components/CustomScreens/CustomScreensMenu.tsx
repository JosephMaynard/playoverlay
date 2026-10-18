import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import WideModal from '../Modal/WideModal';
import SideMenu from '../SideMenu/SideMenu';
import DragAndDropUploader from './DragAndDropUploader';
import {
  CustomScreen,
  MatchState,
  useMatchSettingsStore,
  useMatchStateStore,
} from '@playoverlay/core';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import Modal from '../Modal/Modal';
import EditCustomScreen from './EditCustomScreen';
import Empty from '../MatchSettingsMenu/Empty';
import ActionButton from '../ui/ActionButton';
import { errorTextClassName } from '../ui/fields';

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
  const matchSettings = useMatchSettingsStore((state) => state.matchSettings);
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
      <ActionButton
        variant="primary"
        size="md"
        block
        onClick={() => setShowAddCustomScreenModal(true)}
      >
        {t('settings:customScreens.add')}
      </ActionButton>
      <div className="mt-2">
        <ul role="list" className="divide-y divide-line">
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
              className="flex flex-wrap items-center gap-3 py-4"
            >
              {/* Shown on the key colour so a transparent overlay looks as
                  it will on air. */}
              <div
                style={{
                  backgroundImage: `url("${customScreen.url}")`,
                  backgroundColor: keyColour,
                }}
                className="aspect-video w-32 shrink-0 rounded-lg bg-contain bg-center bg-no-repeat ring-1 ring-inset ring-line"
              />
              <div className="flex min-w-0 flex-1 basis-40 flex-col items-start justify-center">
                <div className="flex max-w-full items-center gap-x-2">
                  <p className="truncate text-base font-semibold text-fg">
                    {customScreen.title}
                  </p>
                  {isGraphicOnAir(customScreen, matchState) && (
                    <span className="inline-flex shrink-0 items-center rounded-md bg-live-soft px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-live-ink">
                      {t('settings:customScreens.onAir')}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-muted">
                  {t('settings:customScreens.typeLine', {
                    type:
                      customScreen.type === 'screen' ||
                      customScreen.type === undefined
                        ? t('settings:customScreens.typeScreen')
                        : t('settings:customScreens.typeOverlay'),
                  })}
                </p>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-3">
                <ActionButton
                  size="md"
                  icon={
                    <PencilIcon
                      className="-ml-0.5 h-5 w-5"
                      aria-hidden="true"
                    />
                  }
                  onClick={() => handleEdit(customScreen)}
                >
                  {t('settings:customScreens.edit')}
                </ActionButton>
                <ActionButton
                  variant="danger"
                  size="md"
                  icon={
                    <TrashIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
                  }
                  onClick={() => handleDelete(customScreen)}
                >
                  {t('settings:actions.delete')}
                </ActionButton>
              </div>
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
        matchSettings={matchSettings}
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
        <p className="text-sm text-muted">
          {t('settings:customScreens.deleteConfirmBody', {
            title: customScreenToDelete?.title,
          })}
        </p>
        {customScreenToDeleteIsOnAir && (
          <p className={errorTextClassName}>
            {t('settings:customScreens.deleteOnAirWarning')}
          </p>
        )}
        {deleteError && (
          <p role="alert" className={errorTextClassName}>
            {deleteError}
          </p>
        )}
      </Modal>
    </SideMenu>
  );
}
