import { useEffect, useState } from 'react';
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
  setMatchSettings: (matchSettings: MatchSettings) => void;
}

export default function SavedMatchSettings({
  matchSettings,
  setMatchSettings,
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

  const fetchSavedMatchSettings = async () => {
    const storedMatchSettings =
      await window?.electronAPI?.getSavedMatchSettings();
    // Rows saved before saveId existed get one assigned here, so
    // delete-by-saveId can't remove multiple rows and React keys are stable.
    setSavedMatchSettings(
      (storedMatchSettings ?? []).map((settings) =>
        settings.saveId ? settings : { ...settings, saveId: nanoid() }
      )
    );
  };

  const handleSave = async () => {
    const response = await window?.electronAPI?.setSavedMatchSettings([
      ...savedMatchSettings,
      {
        ...matchSettings,
        saveTitle: savedMatchName,
        saveDate: new Date().toISOString(),
        saveId: nanoid(),
      },
    ]);
    if (response.success) {
      fetchSavedMatchSettings();
    }
  };

  const handleDelete = async () => {
    if (!savedMatchSettingsToDelete) {
      return;
    }
    const response = await window?.electronAPI?.setSavedMatchSettings([
      ...savedMatchSettings.filter(
        (matchSettings) =>
          matchSettings.saveId !== savedMatchSettingsToDelete.saveId
      ),
    ]);
    if (response.success) {
      fetchSavedMatchSettings();
    }
  };

  useEffect(() => {
    fetchSavedMatchSettings();
  }, []);

  useEffect(() => {
    setSavedMatchName(
      `${matchSettings.homeTeamNameFull} vs ${matchSettings.awayTeamNameFull}`
    );
  }, [matchSettings]);

  return (
    <>
      <CollapsiblePanel title={t('settings:matchMenu.saved.title')}>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={() => setModal('save-current-match-settings')}
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
                  onClick={() =>
                    setSavedMatchSettingsToDelete(savedMatchSetting)
                  }
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
        action={() => {
          handleDelete();
          setSavedMatchSettingsToDelete(null);
        }}
      >
        <p className="text-sm text-gray-500">
          {t('settings:matchMenu.saved.deleteConfirmBody', {
            title: savedMatchSettingsToDelete?.saveTitle,
          })}
        </p>
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
            // current settings), and keep the save-slot metadata out of the
            // live match settings.
            const restoredSettings = {
              ...defaultMatchSettings,
              ...savedMatchSettingsToRestore,
            };
            delete restoredSettings.saveTitle;
            delete restoredSettings.saveDate;
            delete restoredSettings.saveId;
            setMatchSettings(restoredSettings);
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
        action={() => {
          handleSave();
          setModal(null);
        }}
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
        </div>
      </Modal>
    </>
  );
}
