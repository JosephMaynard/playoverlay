import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';
import Modal from '../Modal/Modal';
import { MatchSettings } from '../../zodSchemas';
import { defaultMatchSettings } from '../../constants';
import WideModal from '../Modal/WideModal';
import Empty from './Empty';
import { nanoid } from 'nanoid';
import { ArrowUpOnSquareIcon, TrashIcon } from '@heroicons/react/24/outline';

export interface Props {
  matchSettings: MatchSettings;
  replaceMatchSettings: (matchSettings: MatchSettings) => void;
}

export default function SavedMatchSettings({
  matchSettings,
  replaceMatchSettings,
}: Props) {
  const { t } = useTranslation();
  const [savedMatchSettingsToDelete, setSavedMatchSettingsToDelete] =
    useState<MatchSettings | null>(null);
  const [savedMatchSettingsToRestore, setSavedMatchSettingsToRestore] =
    useState<MatchSettings | null>(null);
  const [savedMatchSettings, setSavedMatchSettings] = useState<MatchSettings[]>(
    []
  );
  const [modal, setModal] = useState<
    null | 'save-current-match-settings' | 'show-saved-match-settings'
  >(null);
  const [savedMatchName, setSavedMatchName] = useState('');
  // Save and delete keep their dialog open until the main process answers,
  // so a failed write can be retried without retyping anything. The ref is
  // the synchronous double-click guard; the state drives the disabled button.
  const [isWriting, setIsWriting] = useState(false);
  const writeInFlight = useRef(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchSavedMatchSettings = async () => {
    try {
      const storedMatchSettings =
        await window?.electronAPI?.getSavedMatchSettings();
      // Rows saved before saveId existed get one assigned here, so
      // delete-by-saveId can't remove multiple rows and React keys are stable.
      setSavedMatchSettings(
        (storedMatchSettings ?? []).map((settings) =>
          settings.saveId ? settings : { ...settings, saveId: nanoid() }
        )
      );
    } catch (error) {
      // The list just stays as it was; the write that preceded this (if
      // any) has already been confirmed.
      console.error('Failed to load saved match settings:', error);
    }
  };

  // Writes the whole saved-fixtures list and resolves true only once the
  // main process confirms it. A missing API or response counts as a failure
  // rather than a silent success.
  const writeSavedMatchSettings = async (
    updatedList: MatchSettings[]
  ): Promise<boolean> => {
    try {
      const response =
        await window?.electronAPI?.setSavedMatchSettings(updatedList);
      if (response?.success) return true;
      console.error('Failed to write saved match settings:', response?.error);
    } catch (error) {
      console.error('Failed to write saved match settings:', error);
    }
    return false;
  };

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

  const handleSave = () =>
    runWrite(async () => {
      setSaveError(null);
      const saved = await writeSavedMatchSettings([
        ...savedMatchSettings,
        {
          ...matchSettings,
          saveTitle: savedMatchName,
          saveDate: new Date().toISOString(),
          saveId: nanoid(),
        },
      ]);
      if (!saved) {
        setSaveError(t('settings:matchMenu.saved.saveError'));
        return;
      }
      setModal(null);
      await fetchSavedMatchSettings();
    });

  const handleDelete = () =>
    runWrite(async () => {
      if (!savedMatchSettingsToDelete) {
        return;
      }
      setDeleteError(null);
      const deleted = await writeSavedMatchSettings(
        savedMatchSettings.filter(
          (matchSettings) =>
            matchSettings.saveId !== savedMatchSettingsToDelete.saveId
        )
      );
      if (!deleted) {
        setDeleteError(t('settings:matchMenu.saved.deleteError'));
        return;
      }
      setSavedMatchSettingsToDelete(null);
      await fetchSavedMatchSettings();
    });

  // Suggest a name from the current teams each time the save dialog opens,
  // not on every settings change, so a name the operator has typed survives
  // while the dialog is open (including across a failed save and retry).
  const openSaveDialog = () => {
    setSavedMatchName(
      t('settings:matchMenu.saved.defaultName', {
        home: matchSettings.homeTeamNameFull,
        away: matchSettings.awayTeamNameFull,
      })
    );
    setSaveError(null);
    setModal('save-current-match-settings');
  };

  useEffect(() => {
    fetchSavedMatchSettings();
  }, []);

  return (
    <>
      <CollapsiblePanel title={t('settings:matchMenu.saved.title')}>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={openSaveDialog}
          >
            {t('settings:matchMenu.saved.saveCurrent')}
          </button>
          <button
            type="button"
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={() => setModal('show-saved-match-settings')}
          >
            {t('settings:matchMenu.saved.openSaved')}
          </button>
        </div>
      </CollapsiblePanel>
      <WideModal
        open={modal === 'show-saved-match-settings'}
        setOpen={() => setModal(null)}
        title={t('settings:matchMenu.saved.openSaved')}
      >
        {savedMatchSettings.length === 0 ? (
          <Empty
            title={t('settings:matchMenu.saved.emptyTitle')}
            description={t('settings:matchMenu.saved.emptyDescription', {
              action: t('settings:matchMenu.saved.saveCurrent'),
            })}
          />
        ) : (
          <ul role="list" className="divide-y divide-gray-100">
            {savedMatchSettings.map((savedMatchSetting) => (
              <li
                key={savedMatchSetting.saveId}
                className="flex items-center justify-between gap-x-4 py-4"
              >
                <div className="flex min-w-0 flex-auto grow flex-col items-start justify-center">
                  <p className="max-w-full truncate text-sm font-semibold leading-6 text-gray-900">
                    {savedMatchSetting.saveTitle}
                  </p>
                  {savedMatchSetting.saveDate && (
                    <p className="mt-1 text-xs leading-6 text-gray-600">
                      {t('settings:matchMenu.saved.savedAt', {
                        date: new Date(
                          savedMatchSetting.saveDate
                        ).toLocaleString(),
                      })}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  className="inline-flex items-center gap-x-1.5 rounded-md bg-green-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  onClick={() =>
                    setSavedMatchSettingsToRestore(savedMatchSetting)
                  }
                >
                  <ArrowUpOnSquareIcon
                    className="-ml-0.5 h-5 w-5"
                    aria-hidden="true"
                  />
                  {t('settings:matchMenu.saved.restore')}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-x-1.5 rounded-md bg-red-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  onClick={() => {
                    setDeleteError(null);
                    setSavedMatchSettingsToDelete(savedMatchSetting);
                  }}
                >
                  <TrashIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
                  {t('settings:actions.delete')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </WideModal>
      <Modal
        open={!!savedMatchSettingsToDelete}
        setOpen={() => setSavedMatchSettingsToDelete(null)}
        title={t('settings:matchMenu.saved.deleteModalTitle')}
        actionButtonLabel={t('settings:actions.delete')}
        icon="warning"
        action={handleDelete}
        actionDisabled={isWriting}
      >
        <p className="text-sm text-gray-500">
          {t('settings:matchMenu.saved.deleteConfirmBody', {
            title: savedMatchSettingsToDelete?.saveTitle,
          })}
        </p>
        {deleteError && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {deleteError}
          </p>
        )}
      </Modal>
      <Modal
        open={!!savedMatchSettingsToRestore}
        setOpen={() => setSavedMatchSettingsToRestore(null)}
        title={t('settings:matchMenu.saved.restoreModalTitle')}
        actionButtonLabel={t('settings:matchMenu.saved.restore')}
        actionButtonColor="green"
        icon="warning"
        action={() => {
          if (savedMatchSettingsToRestore) {
            // Restore as a replace against the defaults (not a merge into the
            // current settings, so an optional field the fixture omits, like
            // a logo or venue, doesn't survive from the previous one), and
            // keep the save-slot metadata out of the live match settings.
            const restoredSettings = {
              ...defaultMatchSettings,
              ...savedMatchSettingsToRestore,
            };
            delete restoredSettings.saveTitle;
            delete restoredSettings.saveDate;
            delete restoredSettings.saveId;
            replaceMatchSettings(restoredSettings);
          }
          setSavedMatchSettingsToRestore(null);
          setModal(null);
        }}
      >
        <p className="text-sm text-gray-500">
          {t('settings:matchMenu.saved.restoreConfirmBody')}
        </p>
      </Modal>
      <Modal
        open={modal === 'save-current-match-settings'}
        setOpen={() => setModal(null)}
        title={t('settings:matchMenu.saved.saveModalTitle')}
        actionButtonLabel={t('settings:actions.save')}
        actionButtonColor="green"
        icon="playoverlay-logo"
        action={handleSave}
        actionDisabled={isWriting}
      >
        <div className="my-4">
          <label
            htmlFor="saved-match-settings-name"
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            {t('settings:matchMenu.saved.nameLabel')}
          </label>
          <div className="mt-2">
            <input
              type="text"
              id="saved-match-settings-name"
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              value={savedMatchName}
              onChange={(e) => setSavedMatchName(e.target.value)}
            />
          </div>
          {saveError && (
            <p role="alert" className="mt-2 text-sm text-red-600">
              {saveError}
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
